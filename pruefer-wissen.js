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
  let ladeLaeuft = false, abglT = null, abglLaeuft = false, nochmal = false, abglProm = null, schreibZaehler = 0;
  function leer() { return { aktiv: false, uid: null, fs: null, verwalten: false, pruefer: [], notizen: [], ergebnisse: [], basis: {}, bekannt: [], geloescht: [], zeit: 0 }; }
  const ich = () => (typeof _authUser !== "undefined" && _authUser ? _authUser : null);
  const prof = () => (typeof _authProfile !== "undefined" && _authProfile ? _authProfile : null);
  const supa = () => { try { return typeof getSupa === "function" ? getSupa() : null; } catch (e) { return null; } };
  const klein = (s) => String(s || "").trim().toLowerCase();
  const fehltTabelle = (e) => !!e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202" || e.code === "42883" || /does not exist|Could not find/i.test(e.message || ""));
  const verwaltenRolle = (p) => !!p && ["buero", "fahrschule_admin", "super_admin"].includes(p.rolle);

  PW.aktiv = function () { const u = ich(), p = prof(); const agg = typeof _fsAgg !== "undefined" && _fsAgg; if (agg && agg.fahrschuleId && agg.fahrschuleId !== (p && p.fahrschule_id)) return false; // Super-Admin in fremder Fahrschule
    return !!(st.aktiv && u && st.uid === u.id && p && p.fahrschule_id && st.fs === p.fahrschule_id); };
  PW.darfVerwalten = function () { return PW.aktiv() && verwaltenRolle(prof()); };

  function cacheSchreiben() {
    try { localStorage.setItem(CACHE, JSON.stringify({ uid: st.uid, fs: st.fs, pruefer: st.pruefer, notizen: st.notizen, ergebnisse: st.ergebnisse, basis: st.basis, bekannt: st.bekannt, geloescht: st.geloescht, zeit: st.zeit })); } catch (e) {}
  }
  function cacheLesen() {
    const u = ich(), p = prof(); if (!u || !p || !p.fahrschule_id) return false;
    try {
      const o = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (!o || o.uid !== u.id || o.fs !== p.fahrschule_id) return false;
      st = Object.assign(leer(), o, { aktiv: true, verwalten: verwaltenRolle(p) });
      // Rolle gewechselt (z. B. Leitung → Fahrlehrer): fremde Schülernamen aus dem alten Zwischenspeicher nicht zeigen
      if (!st.verwalten) st.ergebnisse = (st.ergebnisse || []).map((r) => (r.eigen ? r : Object.assign({}, r, { schueler_name: null, schueler_id: null })));
      return true;
    } catch (e) { return false; }
  }
  /* E2 (Fable K5): angefangene Notiz je Prüfer merken (nur in dieser Sitzung), damit sie beim Zurück nicht verloren geht */
  const entwurf = {};
  PW.vergessen = function () {
    for (const k of Object.keys(entwurf)) delete entwurf[k]; // E2: angefangene Notizen gehören zum Konto
    st = leer();
    try { localStorage.removeItem(CACHE); for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.indexOf("kompass-pw-hoch-") === 0) localStorage.removeItem(k); } } catch (e) {}
  };

  function serverPruefer(nm) { const k = klein(nm); return st.pruefer.find((p) => klein(p.name) === k) || null; }
  const kopie = (x) => JSON.parse(JSON.stringify(x == null ? null : x));

  /* Gemeinsamen Stand in die Prüfer-Akte des Geräts übernehmen (der Server gewinnt). */
  function inDBuebernehmen() {
    if (typeof DB === "undefined" || !DB) return false;
    if (!Array.isArray(DB.pruefer)) DB.pruefer = [];
    if (!DB.prueferData || typeof DB.prueferData !== "object") DB.prueferData = {};
    if (!Array.isArray(DB.prueferTags)) DB.prueferTags = [];
    let geaendert = false, offen = false;
    const serverNamen = new Set(st.pruefer.map((p) => klein(p.name)));
    // Von jemand anderem gelöscht: nur Namen, die das Gerät schon vom Server kannte.
    // Leere Antwort, obwohl Prüfer bekannt waren (z. B. Konto gerade gesperrt): nichts aufräumen.
    if (st.pruefer.length || !(st.bekannt || []).length) (st.bekannt || []).forEach((k) => {
      if (serverNamen.has(k)) return;
      const nm = Object.keys(DB.prueferData).find((x) => klein(x) === k) || DB.pruefer.find((x) => klein(x) === k);
      if (!st.geloescht.includes(k)) st.geloescht.push(k);
      if (!nm) return;
      delete DB.prueferData[nm]; DB.pruefer = DB.pruefer.filter((x) => x !== nm); delete st.basis[k]; geaendert = true;
    });
    st.pruefer.forEach((p) => {
      const k = klein(p.name);
      st.geloescht = st.geloescht.filter((x) => x !== k);
      const lokalName = DB.pruefer.find((x) => klein(x) === k) || Object.keys(DB.prueferData).find((x) => klein(x) === k);
      const nm = lokalName || p.name;
      if (!DB.pruefer.includes(nm)) { DB.pruefer.push(nm); geaendert = true; }
      if (!DB.prueferData[nm]) { DB.prueferData[nm] = { behoerde: "", tags: [], routen: [], notiz: "", created: Date.now() }; geaendert = true; }
      const pd = DB.prueferData[nm];
      const sTags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string") : [];
      const sRouten = Array.isArray(p.routen) ? p.routen.filter(Array.isArray) : [];
      // Dreiwege: eigene, noch nicht gesendete Änderungen (gegenüber dem letzten bekannten Serverstand) bleiben stehen
      const b = st.basis[k];
      let tags = sTags.slice(), routen = kopie(sRouten), beh = p.behoerde || "";
      if (b) {
        const tl = pd.tags || [], rl = (pd.routen || []).map((x) => JSON.stringify(x)), rb = (b.routen || []).map((x) => JSON.stringify(x));
        const tPlus = tl.filter((t) => !b.tags.includes(t)), tMinus = b.tags.filter((t) => !tl.includes(t));
        const rPlus = rl.filter((x) => !rb.includes(x)), rMinus = rb.filter((x) => !rl.includes(x));
        if (tPlus.length || tMinus.length || rPlus.length || rMinus.length || (pd.behoerde || "") !== (b.behoerde || "")) offen = true;
        tags = tags.filter((t) => !tMinus.includes(t)).concat(tPlus.filter((t) => !tags.includes(t)));
        const sr = routen.map((x) => JSON.stringify(x));
        routen = sr.filter((x) => !rMinus.includes(x)).concat(rPlus.filter((x) => !sr.includes(x))).map((x) => JSON.parse(x));
        if ((pd.behoerde || "") !== (b.behoerde || "")) beh = pd.behoerde || "";
        // Neue Basis = Serverstand: der Abgleich schickt dann genau die eigenen offenen Änderungen
      }
      st.basis[k] = { tags: sTags.slice(), routen: kopie(sRouten), behoerde: p.behoerde || "" };
      if (JSON.stringify(pd.tags || []) !== JSON.stringify(tags)) { pd.tags = tags; geaendert = true; }
      if (JSON.stringify(pd.routen || []) !== JSON.stringify(routen)) { pd.routen = routen; geaendert = true; }
      if ((pd.behoerde || "") !== beh) { pd.behoerde = beh; geaendert = true; }
      tags.forEach((t) => { if (!DB.prueferTags.includes(t)) DB.prueferTags.push(t); });
    });
    if (offen) setTimeout(() => PW.nachSpeichern(), 0);
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
      // Erst eigene, noch nicht gesendete Änderungen schicken, dann den Stand holen
      if (abglT) { clearTimeout(abglT); abglT = null; await abgleichen(); }
      else if (abglLaeuft && abglProm) await abglProm;
      const zaehler = schreibZaehler;
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
      // Hat das Gerät währenddessen geschrieben, ist die Antwort schon veraltet: Runde verwerfen, gleich nochmal
      if (zaehler !== schreibZaehler || abglLaeuft) { setTimeout(() => PW.laden({ sofort: true }), 1200); return st.aktiv; }
      const vorher = st.uid === u.id && st.fs === fs ? st : leer();
      st = Object.assign(leer(), {
        aktiv: true, uid: u.id, fs, verwalten: verwaltenRolle(p),
        pruefer: Array.isArray(a.data) ? a.data : [],
        notizen: Array.isArray(b.data) ? b.data : [],
        ergebnisse: !c.error && Array.isArray(c.data) ? c.data : vorher.ergebnisse || [],
        basis: vorher.basis || {}, bekannt: vorher.bekannt || [], geloescht: vorher.geloescht || [], zeit: Date.now(),
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
    const mitInhalt = (pd) => pd && ((pd.tags || []).length || (pd.routen || []).length || String(pd.notiz || "").trim() || pd.behoerde);
    const namen = [...new Set([...(DB.pruefer || []), ...Object.keys(daten).filter((n) => mitInhalt(daten[n]))])].filter((n) => n && String(n).trim());
    let fehler = false;
    schreibZaehler++;
    // Eigene Notizen samt gelöschten: eine gelöschte alte Notiz wird nicht neu veröffentlicht (zweites Gerät, neu anmelden)
    let eigene = st.notizen.filter((n) => n.verfasser_id === u.id);
    try {
      const e = await s.from("fahrschule_pruefer_notizen").select("pruefer_name,text").eq("fahrschule_id", st.fs).eq("verfasser_id", u.id);
      if (e.error) return; // lieber später nochmal als doppelt
      if (Array.isArray(e.data)) eigene = eigene.concat(e.data);
    } catch (err) { return; }
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
      if (text && !eigene.some((n) => klein(n.pruefer_name) === klein(nm) && String(n.text).trim() === text)) {
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
  function abgleichen() {
    if (!PW.aktiv()) return Promise.resolve();
    if (abglLaeuft) { nochmal = true; return abglProm || Promise.resolve(); }
    abglLaeuft = true;
    abglProm = abgleichenLauf();
    return abglProm;
  }
  async function abgleichenLauf() {
    const u = ich(), s = supa();
    try {
      const daten = DB.prueferData || {};
      // je Name (Groß/klein egal) nur ein Eintrag; Namen aus der Prüfer-Auswahl zuerst
      const jeK = {};
      [...(DB.pruefer || []), ...Object.keys(daten)].forEach((n) => { if (n && String(n).trim() && !jeK[klein(n)]) jeK[klein(n)] = n; });
      let neu = false;
      for (const k of Object.keys(jeK)) {
        const nm = jeK[k], sp = serverPruefer(nm), pd = daten[nm] || daten[Object.keys(daten).find((x) => klein(x) === k)];
        if (!sp) {
          // Neu angelegt wird nur, was in der Prüfer-Auswahl steht (+ Prüfer, Ergebnis eintragen) – nicht jede geöffnete Akte.
          // Gelöschte Prüfer stehen dort nicht mehr; wer ihn wieder hinzufügt, legt ihn bewusst neu an.
          if (!(DB.pruefer || []).some((x) => klein(x) === k)) continue;
          if ((st.bekannt || []).includes(k)) continue; // gerade von jemandem gelöscht – beim Laden räumt das Gerät auf
          st.geloescht = (st.geloescht || []).filter((x) => x !== k);
          schreibZaehler++;
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
        schreibZaehler++;
        const f = await s.from("fahrschule_pruefer").select("*").eq("id", sp.id).maybeSingle();
        if (f.error || !f.data) continue;
        const z = f.data;
        const tags = (z.tags || []).filter((t) => !tagsMinus.includes(t)).concat(tagsPlus.filter((t) => !(z.tags || []).includes(t)));
        const zr = (z.routen || []).map((x) => JSON.stringify(x));
        const routen = zr.filter((x) => !rMinus.includes(x)).concat(rPlus.filter((x) => !zr.includes(x))).map((x) => JSON.parse(x));
        const upd = { tags, routen }; if (behNeu) upd.behoerde = pd.behoerde || null;
        const r = await s.from("fahrschule_pruefer").update(upd).eq("id", sp.id).select("*");
        // Basis = mein gesendeter Stand (nicht der Serverstand): Änderungen anderer gelten sonst beim nächsten Übernehmen als meine Streichung (Fable 22.11.2026)
        if (!r.error && r.data && r.data[0]) { Object.assign(sp, r.data[0]); st.basis[k] = { tags: tl.slice(), routen: rl.map((x) => JSON.parse(x)), behoerde: behNeu ? (pd.behoerde || "") : (b.behoerde || "") }; neu = true; }
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

  function listeHTML(nm) {
    const liste = PW.notizenFuer(nm);
    return liste.length ? liste.map((n) => `<div class="pw-notiz" data-nid="${e_(n.id)}">
        <div class="pw-text">${e_(n.text)}</div>
        <div class="pw-meta"><span><b>${e_(n.verfasser_name || "Fahrlehrer")}</b> · ${e_(datumDE(n.erstellt_am))}</span>${darfNotiz(n) ? `<button class="pw-weg" type="button" data-weg="${e_(n.id)}" aria-label="Notiz löschen">Löschen</button>` : ""}</div>
      </div>`).join("") : `<p class="h2-nichts">Noch keine Notiz zu ${e_(nm)}.</p>`;
  }
  /* Liste zuerst (Wissen der Kollegen sofort sehen), darunter „Notiz hinzufügen“ */
  PW.notizBlockHTML = function (nm) {
    const mic = typeof micIcon === "function" ? micIcon() : "";
    return `<div class="pf-block" id="pwNotizen" data-pw-nm="${e_(nm)}">
      <div class="pf-block-h">Notizen der Fahrlehrer</div>
      <div class="pw-liste" id="pwListe">${listeHTML(nm)}</div>
      <div class="pw-neu-h">Notiz hinzufügen</div>
      <p class="pw-hinweis">Alle Fahrlehrer deiner Fahrschule sehen das. Bitte sachlich.</p>
      <div class="mic-wrap"><textarea id="pwNeu" rows="3" maxlength="2000" placeholder="Worauf achtet ${e_(nm)}?">\n${e_(entwurf[klein(nm)] || "")}</textarea>${mic}</div>
      <button class="btn btn-primary pw-senden" id="pwSenden" type="button">Notiz speichern</button>
    </div>`;
  };
  /* Nur die Liste neu zeichnen: Ansicht und angefangener Text bleiben stehen */
  function listeNeu(nm) {
    const box = document.getElementById("pwListe"), blk = document.getElementById("pwNotizen");
    if (!box || !blk || blk.dataset.pwNm !== nm) return;
    box.innerHTML = listeHTML(nm);
    bindeListe(nm);
  }
  function bindeListe(nm) {
    document.querySelectorAll("#pwListe [data-weg]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.weg; b.disabled = true;
      const ok = await PW.notizLoeschen(id, true);
      if (!ok) { b.disabled = false; if (typeof toast === "function") toast("Nicht gelöscht – bitte mit Internet nochmal"); return; }
      listeNeu(nm);
      const undo = async () => { if (await PW.notizLoeschen(id, false)) listeNeu(nm); };
      if (typeof toastUndo === "function") toastUndo("Notiz gelöscht", undo); else if (typeof toast === "function") toast("Notiz gelöscht");
    }));
  }
  PW.bindeNotizBlock = function (nm) {
    const btn = document.getElementById("pwSenden"), ta = document.getElementById("pwNeu");
    if (ta) ta.addEventListener("input", () => { const v = ta.value; if (v.trim()) entwurf[klein(nm)] = v; else delete entwurf[klein(nm)]; });
    if (btn && ta) btn.addEventListener("click", async () => {
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      btn.disabled = true;
      const ok = await PW.notizSchreiben(nm, text);
      btn.disabled = false;
      if (ok) {
        // Während des Speicherns weitergetippt: das Neue bleibt stehen
        if (ta.value.trim() === text) { ta.value = ""; delete entwurf[klein(nm)]; } else { ta.value = ta.value.replace(text, "").trim(); entwurf[klein(nm)] = ta.value; }
        listeNeu(nm);
        const erste = document.querySelector("#pwListe .pw-notiz"); if (erste && erste.scrollIntoView) erste.scrollIntoView({ block: "nearest" });
        if (typeof toast === "function") toast("Notiz gespeichert ✓");
      } else if (typeof toast === "function") toast("Notiz nicht gespeichert – bitte mit Internet nochmal");
    });
    bindeListe(nm);
  };
  PW.notizSchreiben = async function (nm, text) {
    const u = ich(), s = supa(); if (!PW.aktiv() || !s) return false;
    try {
      schreibZaehler++;
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
      schreibZaehler++;
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
    delete entwurf[klein(nm)];
    const sp = serverPruefer(nm), s = supa(); if (!PW.aktiv() || !sp) return true;
    try {
      const r = await s.from("fahrschule_pruefer").update({ geloescht: true }).eq("id", sp.id).select("id");
      if (r.error || !r.data || !r.data.length) return false;
      st.pruefer = st.pruefer.filter((p) => p.id !== sp.id); delete st.basis[klein(nm)];
      st.bekannt = st.bekannt.filter((k) => k !== klein(nm));
      if (!st.geloescht.includes(klein(nm))) st.geloescht.push(klein(nm));
      schreibZaehler++; cacheSchreiben();
      return true;
    } catch (e) { return false; }
  };
  /* Umbenennen / zusammenführen für die ganze Fahrschule (Server), danach wie bisher auf dem Gerät */
  PW.umbenennen = async function (alt, neu) {
    const s = supa(); if (!PW.aktiv() || !s) { delete entwurf[klein(alt)]; return true; }
    try {
      schreibZaehler++;
      const r = await s.rpc("fs_pruefer_umbenennen", { p_alt: alt, p_neu: neu });
      if (r.error || !r.data) return false;
      if (r.data.fehler) return r.data.fehler; // z. B. "keine_berechtigung"
      delete entwurf[klein(alt)]; // erst nach Erfolg: Entwurf gehört zum alten Namen
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
      // angefangene Notiz nie wegwerfen: dann nur die Liste auffrischen
      const ta = document.getElementById("pwNeu"), blk = document.getElementById("pwNotizen");
      if (ta && ta.value.trim()) { if (blk) listeNeu(blk.dataset.pwNm); return; }
      const held = v.querySelector(".pf-hero-name");
      if (held && typeof routePrueferAkte === "function") { const sc = v.scrollTop; routePrueferAkte(held.textContent); v.scrollTop = sc; }
      else if (v.querySelector("#addPruefer") && typeof routePrueferListe === "function") routePrueferListe();
    } catch (e) {}
  }

  // Aussehen der gemeinsamen Notizen (hier statt in index.html, damit parallele Arbeiten dort nicht kollidieren)
  try {
    const css = document.createElement("style"); css.id = "pwCss";
    css.textContent = ".pw-hinweis{font-size:13px;color:var(--muted);margin:0 0 8px;line-height:1.45}"
      + ".pw-neu-h{font-size:14px;font-weight:700;margin:18px 0 4px}"
      + "#pwNeu{font-size:14.5px;min-height:84px}#pwNeu::placeholder{font-size:14.5px;color:var(--muted);opacity:1}"
      + ".pw-senden{width:100%;min-height:46px;margin-top:8px}"
      + ".pw-liste{margin-top:6px;display:flex;flex-direction:column;gap:9px}"
      + ".pw-notiz{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px}"
      + ".pw-text{font-size:14.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}"
      + ".pw-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;font-size:13px;color:var(--muted)}.pw-meta b{color:var(--txt);font-weight:700}"
      + ".pw-weg{background:none;border:0;color:var(--muted);font:inherit;font-size:12.5px;text-decoration:underline;min-height:44px;min-width:44px;padding:0 4px;cursor:pointer}"
      + ".pw-andere .pe-name{flex:1}";
    (document.head || document.documentElement).appendChild(css);
  } catch (e) {}
  // Nach jedem Speichern den Abgleich anstoßen (Hülle wie beim Fenster-Stapel in index.html)
  if (typeof save === "function") { const _s = save; save = function () { const r = _s.apply(this, arguments); try { PW.nachSpeichern(); } catch (e) {} return r; }; }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && PW.aktiv()) PW.laden(); });
})();
