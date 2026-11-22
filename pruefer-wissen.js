/* K5 Prüfer-Wissen gemeinsam je Fahrschule (🗣 Serband, Boost-Termin 21.11.2026)
   Prüfer, Tags, Strecken, Notizen und Ergebnisse sehen alle Fahrlehrer derselben Fahrschule.
   - Datenbank: fahrschule_pruefer, fahrschule_pruefer_notizen, fs_pruefer_ergebnisse(), fs_pruefer_umbenennen()
     (Migration supabase/migrations/20261122_k5_01_pruefer_gemeinsam.sql). Die Sperre liegt auf dem Server:
     fremde Schülernamen liefert die Datenbank einem Fahrlehrer gar nicht erst.
   - Fehlen Tabellen/Funktion (alte Datenbank) oder gibt es keine Fahrschule: alles wie bisher (Akte je Gerät).
   - Die bestehende Prüfer-Akte (DB.pruefer / DB.prueferData) bleibt die Anzeige-Quelle. Dieses Modul
     übernimmt den gemeinsamen Stand dorthin und schickt eigene Änderungen (neuer Prüfer, Tags, Strecken)
     als Unterschied zurück. Gelöscht wird nie aus einem Vergleich, nur auf ausdrücklichen Tipp. */
(function () {
  "use strict";
  const PW = (window.PW = {});
  const CACHE = "kompass-pw-v1";
  let st = leer();
  let ladeLaeuft = false, abglT = null, abglLaeuft = false, nochmal = false;
  function leer() { return { aktiv: false, uid: null, fs: null, verwalten: false, pruefer: [], notizen: [], ergebnisse: [], basis: {}, bekannt: [], zeit: 0 }; }
  const ich = () => (typeof _authUser !== "undefined" && _authUser ? _authUser : null);
  const prof = () => (typeof _authProfile !== "undefined" && _authProfile ? _authProfile : null);
  const supa = () => { try { return typeof getSupa === "function" ? getSupa() : null; } catch (e) { return null; } };
  const klein = (s) => String(s || "").trim().toLowerCase();
  const fehltTabelle = (e) => !!e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202" || e.code === "42883" || /does not exist|Could not find/i.test(e.message || ""));
  const verwaltenRolle = (p) => !!p && ["buero", "fahrschule_admin", "super_admin"].includes(p.rolle);

  PW.aktiv = function () { const u = ich(), p = prof(); return !!(st.aktiv && u && st.uid === u.id && p && p.fahrschule_id && st.fs === p.fahrschule_id); };
  PW.darfVerwalten = function () { return PW.aktiv() && verwaltenRolle(prof()); };

  function cacheSchreiben() {
    try { localStorage.setItem(CACHE, JSON.stringify({ uid: st.uid, fs: st.fs, pruefer: st.pruefer, notizen: st.notizen, ergebnisse: st.ergebnisse, basis: st.basis, bekannt: st.bekannt, zeit: st.zeit })); } catch (e) {}
  }
  function cacheLesen() {
    const u = ich(), p = prof(); if (!u || !p || !p.fahrschule_id) return false;
    try {
      const o = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (!o || o.uid !== u.id || o.fs !== p.fahrschule_id) return false;
      st = Object.assign(leer(), o, { aktiv: true, verwalten: verwaltenRolle(p) });
      return true;
    } catch (e) { return false; }
  }
  PW.vergessen = function () { st = leer(); try { localStorage.removeItem(CACHE); } catch (e) {} };

  function serverPruefer(nm) { const k = klein(nm); return st.pruefer.find((p) => klein(p.name) === k) || null; }
  const kopie = (x) => JSON.parse(JSON.stringify(x == null ? null : x));

  /* Gemeinsamen Stand in die Prüfer-Akte des Geräts übernehmen (der Server gewinnt). */
  function inDBuebernehmen() {
    if (typeof DB === "undefined" || !DB) return false;
    if (!Array.isArray(DB.pruefer)) DB.pruefer = [];
    if (!DB.prueferData || typeof DB.prueferData !== "object") DB.prueferData = {};
    if (!Array.isArray(DB.prueferTags)) DB.prueferTags = [];
    let geaendert = false;
    const serverNamen = new Set(st.pruefer.map((p) => klein(p.name)));
    // Von jemand anderem gelöscht: nur Namen, die das Gerät schon vom Server kannte
    (st.bekannt || []).forEach((k) => {
      if (serverNamen.has(k)) return;
      const nm = Object.keys(DB.prueferData).find((x) => klein(x) === k) || DB.pruefer.find((x) => klein(x) === k);
      if (!nm) return;
      delete DB.prueferData[nm]; DB.pruefer = DB.pruefer.filter((x) => x !== nm); delete st.basis[k]; geaendert = true;
    });
    st.pruefer.forEach((p) => {
      const lokalName = DB.pruefer.find((x) => klein(x) === klein(p.name)) || Object.keys(DB.prueferData).find((x) => klein(x) === klein(p.name));
      const nm = lokalName || p.name;
      if (!DB.pruefer.includes(nm)) { DB.pruefer.push(nm); geaendert = true; }
      if (!DB.prueferData[nm]) { DB.prueferData[nm] = { behoerde: "", tags: [], routen: [], notiz: "", created: Date.now() }; geaendert = true; }
      const pd = DB.prueferData[nm];
      const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string") : [];
      const routen = Array.isArray(p.routen) ? p.routen.filter(Array.isArray) : [];
      if (JSON.stringify(pd.tags || []) !== JSON.stringify(tags)) { pd.tags = tags.slice(); geaendert = true; }
      if (JSON.stringify(pd.routen || []) !== JSON.stringify(routen)) { pd.routen = kopie(routen); geaendert = true; }
      if ((pd.behoerde || "") !== (p.behoerde || "")) { pd.behoerde = p.behoerde || ""; geaendert = true; }
      tags.forEach((t) => { if (!DB.prueferTags.includes(t)) DB.prueferTags.push(t); });
      st.basis[klein(p.name)] = { tags: tags.slice(), routen: kopie(routen), behoerde: p.behoerde || "" };
    });
    DB.pruefer.sort((a, b) => a.localeCompare(b, "de"));
    st.bekannt = [...serverNamen];
    // Eigene Prüfungen, die jemand für die ganze Fahrschule umbenannt hat: neuen Namen übernehmen
    const perId = {}; st.ergebnisse.forEach((r) => { if (r.eigen) perId[r.id] = r.pruefer; });
    (DB.exams || []).forEach((e) => {
      const neu = perId[e.id];
      if (neu && e.pruefer && neu !== e.pruefer && !serverNamen.has(klein(e.pruefer)) && serverNamen.has(klein(neu))) { e.pruefer = neu; geaendert = true; }
    });
    return geaendert;
  }

  /* Laden: beim Anmelden, beim Öffnen der Prüfer-Seiten (höchstens alle 30 s) und wenn die App wieder sichtbar wird. */
  PW.laden = async function (opts) {
    opts = opts || {};
    const u = ich(), p = prof(), s = supa();
    if (!u || !p || !p.fahrschule_id || !s) { st.aktiv = false; return false; }
    if (!st.aktiv || st.uid !== u.id) cacheLesen();
    if (ladeLaeuft) return st.aktiv;
    if (!opts.sofort && st.aktiv && Date.now() - (st.zeit || 0) < 30000) return true;
    ladeLaeuft = true;
    try {
      const fs = p.fahrschule_id;
      const [a, b, c] = await Promise.all([
        s.from("fahrschule_pruefer").select("*").eq("fahrschule_id", fs).eq("geloescht", false),
        s.from("fahrschule_pruefer_notizen").select("*").eq("fahrschule_id", fs).eq("geloescht", false).order("erstellt_am", { ascending: false }),
        s.rpc("fs_pruefer_ergebnisse"),
      ]);
      if (a.error || b.error) {
        if (fehltTabelle(a.error) || fehltTabelle(b.error)) PW.vergessen(); // alte Datenbank: wie bisher
        return st.aktiv; // sonst (z. B. offline): letzten Stand behalten
      }
      if (!ich() || ich().id !== u.id) return false; // inzwischen abgemeldet
      const vorher = st.uid === u.id && st.fs === fs ? st : leer();
      st = Object.assign(leer(), {
        aktiv: true, uid: u.id, fs, verwalten: verwaltenRolle(p),
        pruefer: Array.isArray(a.data) ? a.data : [],
        notizen: Array.isArray(b.data) ? b.data : [],
        ergebnisse: !c.error && Array.isArray(c.data) ? c.data : vorher.ergebnisse || [],
        basis: vorher.basis || {}, bekannt: vorher.bekannt || [], zeit: Date.now(),
      });
      await einmalHochladen();
      const g = inDBuebernehmen();
      cacheSchreiben();
      if (g && typeof save === "function") save();
      neuZeichnen();
      return true;
    } catch (e) {
      console.warn("[Kompass] Prüfer-Wissen nicht geladen:", e && e.message);
      return st.aktiv;
    } finally { ladeLaeuft = false; }
  };

  /* Einmal je Konto: die bisher nur auf dem Gerät gesammelten Prüfer-Infos für die Fahrschule hochladen.
     Doppelte Notizen (zweites Gerät) werden am gleichen Text erkannt. */
  async function einmalHochladen() {
    const u = ich(), s = supa(); if (!u || !s || typeof DB === "undefined" || !DB) return;
    const key = "kompass-pw-hoch-" + u.id + "-" + st.fs;
    try { if (localStorage.getItem(key)) return; } catch (e) { return; }
    const daten = DB.prueferData || {};
    const namen = [...new Set([...(DB.pruefer || []), ...Object.keys(daten)])].filter((n) => n && String(n).trim());
    let fehler = false;
    for (const nm of namen) {
      const pd = daten[nm] || {};
      const sp = serverPruefer(nm);
      if (!sp) {
        const r = await s.from("fahrschule_pruefer").insert({ fahrschule_id: st.fs, name: String(nm).trim().slice(0, 80), behoerde: pd.behoerde || null,
          tags: Array.isArray(pd.tags) ? pd.tags : [], routen: Array.isArray(pd.routen) ? pd.routen : [], angelegt_von: u.id }).select("*");
        if (r.error && r.error.code !== "23505") fehler = true;
        else if (r.data && r.data[0]) st.pruefer.push(r.data[0]);
      } else {
        // schon da: eigene Tags/Strecken dazu (nichts wegnehmen)
        const tags = [...new Set([...(sp.tags || []), ...((pd.tags || []))])];
        const roh = (sp.routen || []).map((x) => JSON.stringify(x));
        const routen = (sp.routen || []).concat((pd.routen || []).filter((x) => Array.isArray(x) && !roh.includes(JSON.stringify(x))));
        if (tags.length !== (sp.tags || []).length || routen.length !== (sp.routen || []).length) {
          const r = await s.from("fahrschule_pruefer").update({ tags, routen }).eq("id", sp.id).select("*");
          if (r.error) fehler = true; else if (r.data && r.data[0]) Object.assign(sp, r.data[0]);
        }
      }
      const text = String(pd.notiz || "").trim();
      if (text && !st.notizen.some((n) => n.verfasser_id === u.id && klein(n.pruefer_name) === klein(nm) && String(n.text).trim() === text)) {
        const r = await s.from("fahrschule_pruefer_notizen").insert({ fahrschule_id: st.fs, pruefer_name: String(nm).trim().slice(0, 80), text: text.slice(0, 2000), verfasser_id: u.id }).select("*");
        if (r.error) fehler = true; else if (r.data && r.data[0]) st.notizen.unshift(r.data[0]);
      }
    }
    if (!fehler) try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
  }

  /* Nach jedem Speichern (verzögert): neue Prüfer anlegen, geänderte Tags/Strecken/Behörde als Unterschied senden. */
  PW.nachSpeichern = function () {
    if (!PW.aktiv()) return;
    clearTimeout(abglT); abglT = setTimeout(abgleichen, 1500);
  };
  async function abgleichen() {
    if (!PW.aktiv()) return;
    if (abglLaeuft) { nochmal = true; return; }
    abglLaeuft = true;
    const u = ich(), s = supa();
    try {
      const daten = DB.prueferData || {};
      const namen = [...new Set([...(DB.pruefer || []), ...Object.keys(daten)])].filter((n) => n && String(n).trim());
      let neu = false;
      for (const nm of namen) {
        const k = klein(nm), sp = serverPruefer(nm), pd = daten[nm];
        if (!sp) {
          if ((st.bekannt || []).includes(k)) continue; // gerade von jemandem gelöscht – beim Laden räumt das Gerät auf
          const r = await s.from("fahrschule_pruefer").insert({ fahrschule_id: st.fs, name: String(nm).trim().slice(0, 80), behoerde: (pd && pd.behoerde) || null,
            tags: (pd && pd.tags) || [], routen: (pd && pd.routen) || [], angelegt_von: u.id }).select("*");
          if (!r.error && r.data && r.data[0]) { st.pruefer.push(r.data[0]); st.basis[k] = { tags: kopie(r.data[0].tags || []), routen: kopie(r.data[0].routen || []), behoerde: r.data[0].behoerde || "" }; st.bekannt.push(k); neu = true; }
          else if (r.error && r.error.code === "23505") neu = true; // legt gerade jemand anderes an: beim Laden übernehmen
          continue;
        }
        const b = st.basis[k]; if (!b || !pd) continue;
        const tl = (pd.tags || []), rl = (pd.routen || []).map((x) => JSON.stringify(x)), rb = (b.routen || []).map((x) => JSON.stringify(x));
        const tagsPlus = tl.filter((t) => !b.tags.includes(t)), tagsMinus = b.tags.filter((t) => !tl.includes(t));
        const rPlus = rl.filter((x) => !rb.includes(x)), rMinus = rb.filter((x) => !rl.includes(x));
        const behNeu = (pd.behoerde || "") !== (b.behoerde || "");
        if (!tagsPlus.length && !tagsMinus.length && !rPlus.length && !rMinus.length && !behNeu) continue;
        // frischen Stand holen und nur den eigenen Unterschied anwenden (zwei Fahrlehrer gleichzeitig)
        const f = await s.from("fahrschule_pruefer").select("*").eq("id", sp.id).maybeSingle();
        if (f.error || !f.data) continue;
        const z = f.data;
        const tags = (z.tags || []).filter((t) => !tagsMinus.includes(t)).concat(tagsPlus.filter((t) => !(z.tags || []).includes(t)));
        const zr = (z.routen || []).map((x) => JSON.stringify(x));
        const routen = zr.filter((x) => !rMinus.includes(x)).concat(rPlus.filter((x) => !zr.includes(x))).map((x) => JSON.parse(x));
        const upd = { tags, routen }; if (behNeu) upd.behoerde = pd.behoerde || null;
        const r = await s.from("fahrschule_pruefer").update(upd).eq("id", sp.id).select("*");
        if (!r.error && r.data && r.data[0]) { Object.assign(sp, r.data[0]); st.basis[k] = { tags: kopie(sp.tags || []), routen: kopie(sp.routen || []), behoerde: sp.behoerde || "" }; neu = true; }
      }
      if (neu) { inDBuebernehmen(); cacheSchreiben(); }
    } catch (e) { console.warn("[Kompass] Prüfer-Abgleich:", e && e.message); }
    finally { abglLaeuft = false; if (nochmal) { nochmal = false; PW.nachSpeichern(); } }
  }

  /* Prüfungen eines Prüfers: eigene vom Gerät (immer aktuell) + die der anderen Fahrlehrer vom Server.
     Fremde Einträge haben _fremd, _von (Fahrlehrer-Name) und nur für Büro/Leitung einen Schülernamen. */
  PW.examsFuer = function (nm) {
    const lokal = (typeof DB !== "undefined" && DB && DB.exams ? DB.exams : []).filter((e) => e.pruefer === nm);
    if (!PW.aktiv()) return lokal;
    const ids = new Set((DB.exams || []).map((e) => e.id));
    const fremd = st.ergebnisse.filter((r) => r.pruefer === nm && !r.eigen && !ids.has(r.id)).map((r) => ({
      id: r.id, pruefer: r.pruefer, date: r.datum || "", result: r.result, attempt: r.attempt, b197: !!r.b197,
      note: r.note || "", faults: Array.isArray(r.faults) ? r.faults : [], eingriff: !!r.eingriff, eingNote: r.eing_note || "",
      name: r.schueler_name || "", sid: r.schueler_id || "", _fremd: true, _von: r.fahrlehrer_name || "Fahrlehrer", _vonId: r.fahrlehrer_id,
    }));
    return lokal.concat(fremd);
  };
  /* Prüfer-Namen aus den Prüfungen der anderen Fahrlehrer (für die Liste) */
  PW.fremdeNamen = function () { return PW.aktiv() ? [...new Set(st.ergebnisse.filter((r) => !r.eigen && r.pruefer).map((r) => r.pruefer))] : []; };

  /* Notizen über einen Prüfer, neueste zuerst */
  PW.notizenFuer = function (nm) { return PW.aktiv() ? st.notizen.filter((n) => klein(n.pruefer_name) === klein(nm) && !n.geloescht) : []; };
  PW.letzteNotiz = function (nm) { const n = PW.notizenFuer(nm)[0]; return n ? n.text : ""; };
  const datumDE = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); };
  const e_ = (s) => (typeof esc === "function" ? esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const darfNotiz = (n) => { const u = ich(); return !!u && (n.verfasser_id === u.id || PW.darfVerwalten()); };

  PW.notizBlockHTML = function (nm) {
    const liste = PW.notizenFuer(nm);
    const mic = typeof micIcon === "function" ? micIcon() : "";
    return `<div class="pf-block" id="pwNotizen">
      <div class="pf-block-h">Notizen zum Prüfer</div>
      <p class="pw-hinweis">Alle Fahrlehrer deiner Fahrschule sehen das.</p>
      <div class="mic-wrap"><textarea id="pwNeu" rows="3" maxlength="2000" placeholder="Sachlich bleiben: worauf achtet ${e_(nm)}, was prüft er gern?"></textarea>${mic}</div>
      <button class="btn btn-primary pw-senden" id="pwSenden" type="button">Notiz speichern</button>
      <div class="pw-liste">${liste.length ? liste.map((n) => `<div class="pw-notiz" data-nid="${e_(n.id)}">
        <div class="pw-text">${e_(n.text)}</div>
        <div class="pw-meta"><span>${e_(n.verfasser_name || "Fahrlehrer")} · ${e_(datumDE(n.erstellt_am))}</span>${darfNotiz(n) ? `<button class="pw-weg" type="button" data-weg="${e_(n.id)}" aria-label="Notiz löschen">Löschen</button>` : ""}</div>
      </div>`).join("") : `<p class="h2-nichts">Noch keine Notiz zu ${e_(nm)}.</p>`}</div>
    </div>`;
  };
  PW.bindeNotizBlock = function (nm, neu) {
    const btn = document.getElementById("pwSenden"), ta = document.getElementById("pwNeu");
    if (btn && ta) btn.addEventListener("click", async () => {
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      btn.disabled = true;
      const ok = await PW.notizSchreiben(nm, text);
      btn.disabled = false;
      if (ok) { ta.value = ""; if (typeof toast === "function") toast("Notiz gespeichert ✓"); neu && neu(); }
      else if (typeof toast === "function") toast("Notiz nicht gespeichert – bitte mit Internet nochmal");
    });
    document.querySelectorAll("#pwNotizen [data-weg]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.weg; const ok = await PW.notizLoeschen(id, true);
      if (!ok) { if (typeof toast === "function") toast("Nicht gelöscht – bitte mit Internet nochmal"); return; }
      neu && neu();
      const undo = async () => { if (await PW.notizLoeschen(id, false)) neu && neu(); };
      if (typeof toastUndo === "function") toastUndo("Notiz gelöscht", undo); else if (typeof toast === "function") toast("Notiz gelöscht");
    }));
  };
  PW.notizSchreiben = async function (nm, text) {
    const u = ich(), s = supa(); if (!PW.aktiv() || !s) return false;
    try {
      const r = await s.from("fahrschule_pruefer_notizen").insert({ fahrschule_id: st.fs, pruefer_name: String(nm).trim().slice(0, 80), text: String(text).slice(0, 2000), verfasser_id: u.id }).select("*");
      if (r.error || !r.data || !r.data[0]) return false;
      st.notizen.unshift(r.data[0]); cacheSchreiben();
      if (!serverPruefer(nm)) PW.nachSpeichern();
      return true;
    } catch (e) { return false; }
  };
  PW.notizLoeschen = async function (id, weg) {
    const s = supa(); if (!PW.aktiv() || !s) return false;
    try {
      const r = await s.from("fahrschule_pruefer_notizen").update({ geloescht: !!weg }).eq("id", id).select("*");
      if (r.error || !r.data || !r.data[0]) return false;
      const i = st.notizen.findIndex((n) => n.id === id);
      if (weg) { if (i >= 0) st.notizen.splice(i, 1); } else if (i < 0) { st.notizen.unshift(r.data[0]); st.notizen.sort((a, b) => String(b.erstellt_am).localeCompare(String(a.erstellt_am))); }
      cacheSchreiben(); return true;
    } catch (e) { return false; }
  };

  /* Prüfer löschen: gemeinsam nur Ersteller, Büro, Leitung (prüft auch der Server). */
  PW.darfLoeschen = function (nm) {
    if (!PW.aktiv()) return true;
    const sp = serverPruefer(nm), u = ich();
    return !sp || PW.darfVerwalten() || (u && sp.angelegt_von === u.id);
  };
  PW.loeschen = async function (nm) {
    const sp = serverPruefer(nm), s = supa(); if (!PW.aktiv() || !sp) return true;
    try {
      const r = await s.from("fahrschule_pruefer").update({ geloescht: true }).eq("id", sp.id).select("id");
      if (r.error || !r.data || !r.data.length) return false;
      st.pruefer = st.pruefer.filter((p) => p.id !== sp.id); delete st.basis[klein(nm)];
      st.bekannt = st.bekannt.filter((k) => k !== klein(nm)); cacheSchreiben();
      return true;
    } catch (e) { return false; }
  };
  /* Umbenennen / zusammenführen für die ganze Fahrschule (Server), danach wie bisher auf dem Gerät */
  PW.umbenennen = async function (alt, neu) {
    const s = supa(); if (!PW.aktiv() || !s) return true;
    try {
      const r = await s.rpc("fs_pruefer_umbenennen", { p_alt: alt, p_neu: neu });
      if (r.error || !r.data || r.data.fehler) return false;
      st.bekannt = st.bekannt.filter((k) => k !== klein(alt));
      st.ergebnisse.forEach((x) => { if (x.pruefer === alt) x.pruefer = neu; });
      st.notizen.forEach((x) => { if (klein(x.pruefer_name) === klein(alt)) x.pruefer_name = neu; });
      const ziel = serverPruefer(neu), quelle = serverPruefer(alt);
      if (quelle && ziel && quelle !== ziel) st.pruefer = st.pruefer.filter((p) => p !== quelle);
      else if (quelle) quelle.name = neu;
      delete st.basis[klein(alt)];
      cacheSchreiben(); setTimeout(() => PW.laden({ sofort: true }), 800);
      return true;
    } catch (e) { return false; }
  };

  /* Die Prüfer-Seiten neu zeichnen, wenn der gemeinsame Stand ankommt und man gerade dort ist */
  function neuZeichnen() {
    try {
      const t = document.getElementById("tbTitle"); if (!t || (t.textContent || "").trim() !== "Prüfer") return;
      const v = document.getElementById("view"); if (!v || v.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName)) return;
      const held = v.querySelector(".pf-hero-name");
      if (held && typeof routePrueferAkte === "function") { const sc = v.scrollTop; routePrueferAkte(held.textContent); v.scrollTop = sc; }
      else if (v.querySelector("#addPruefer") && typeof routePrueferListe === "function") routePrueferListe();
    } catch (e) {}
  }

  // Aussehen der gemeinsamen Notizen (hier statt in index.html, damit parallele Arbeiten dort nicht kollidieren)
  try {
    const css = document.createElement("style"); css.id = "pwCss";
    css.textContent = ".pw-hinweis{font-size:12.5px;color:var(--muted);margin:-2px 0 8px;line-height:1.45}"
      + ".pw-senden{width:100%;min-height:46px;margin-top:8px}"
      + ".pw-liste{margin-top:14px;display:flex;flex-direction:column;gap:9px}"
      + ".pw-notiz{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px}"
      + ".pw-text{font-size:14.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}"
      + ".pw-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;font-size:12px;color:var(--muted)}"
      + ".pw-weg{background:none;border:0;color:var(--muted);font:inherit;font-size:12.5px;text-decoration:underline;min-height:44px;min-width:44px;padding:0 4px;cursor:pointer}"
      + ".pw-andere .pe-name{flex:1}";
    (document.head || document.documentElement).appendChild(css);
  } catch (e) {}
  // Nach jedem Speichern den Abgleich anstoßen (Hülle wie beim Fenster-Stapel in index.html)
  if (typeof save === "function") { const _s = save; save = function () { const r = _s.apply(this, arguments); try { PW.nachSpeichern(); } catch (e) {} return r; }; }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && PW.aktiv()) PW.laden(); });
})();
