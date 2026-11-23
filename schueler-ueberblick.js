/* K6 Schüler-Überblick und Weitergeben (🗣 Serband, Boost-Termin 21.11.2026)
   - Jeder Fahrlehrer sieht alle Schüler der Fahrschule als Überblick: Name, Fahrlehrer, Prozent-Stand, Stand Theorie.
     Akte, Ausbildungsplan, Prüfungsreife, Notizen bleiben gesperrt – die Datenbank liefert über
     fs_schueler_ueberblick() gar nichts anderes (Migration supabase/migrations/20261122_k6_01_schueler_ueberblick.sql).
   - Eigene Schüler: Knopf „Weitergeben“ → Kollege antippen → schueler_weitergeben() (künftige Termine gehen mit,
     Spur in schueler_verschiebungen). Kein Bestätigen-Fenster, nur ein kurzer Hinweis; zurückholen geht über das Büro.
   - Fehlen die Funktionen (alte Datenbank) oder gibt es keine Fahrschule: kein Knopf, alles wie bisher. */
(function () {
  "use strict";
  const SU = (window.SU = {});
  const MERK = "kompass-su-v1";
  let daten = null, kollegen = [], kollegenOk = false, laedt = false, suche = "";
  // K15: Ordnung (🗣 Serband 23.11.2026 „bitte ordnen“): Standard eigene zuerst, dann Fahrlehrer A–Z, dann Name A–Z.
  // „Stand“ = Fortschritt in % (höchster zuerst); einen Prüfungstermin liefert fs_schueler_ueberblick() nicht (Prüfungsdaten bleiben gesperrt).
  const SORT_KEY = "kompass-su-sort-v1";
  const SORTEN = { fahrlehrer: "Fahrlehrer", name: "Name", stand: "Stand" };
  let sortWahl = "fahrlehrer", filterFl = "";
  (function () { try { const o = JSON.parse(localStorage.getItem(SORT_KEY) || "null"); if (o && SORTEN[o.sort]) sortWahl = o.sort; if (o && typeof o.fl === "string") filterFl = o.fl; } catch (e) {} })();
  function sortMerken() { try { localStorage.setItem(SORT_KEY, JSON.stringify({ sort: sortWahl, fl: filterFl })); } catch (e) {} }
  const nameKey = (r) => String(r.name || "");
  const flKey = (r) => r.fahrlehrer_name || "Ohne Fahrlehrer";
  const nachName = (a, b) => nameKey(a).localeCompare(nameKey(b), "de");
  const laeuft = new Set(); // Schüler, deren Weitergabe gerade läuft (kein zweiter Versuch)
  const ich = () => (typeof _authUser !== "undefined" && _authUser ? _authUser : null);
  const prof = () => (typeof _authProfile !== "undefined" && _authProfile ? _authProfile : null);
  const supa = () => { try { return typeof getSupa === "function" ? getSupa() : null; } catch (e) { return null; } };
  const e_ = (s) => (typeof esc === "function" ? esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const hinweis = (t) => { if (typeof toast === "function") toast(t); };
  const fehltFunktion = (e) => !!e && (e.code === "PGRST202" || e.code === "42883" || /Could not find the function|does not exist/i.test(e.message || ""));

  function merkLesen() { try { const o = JSON.parse(localStorage.getItem(MERK) || "null"); const u = ich(), p = prof(); return o && u && p && o.uid === u.id && o.fs === p.fahrschule_id ? o : null; } catch (e) { return null; } }
  function merkSchreiben(ok) { const u = ich(), p = prof(); if (!u || !p) return; try { localStorage.setItem(MERK, JSON.stringify({ uid: u.id, fs: p.fahrschule_id, ok: !!ok })); } catch (e) {} }

  /* Knopf nur in der eigenen Fahrlehrer-Ansicht mit Fahrschule und neuer Datenbank */
  SU.verfuegbar = function () {
    const p = prof(); if (!ich() || !p || !p.fahrschule_id || (typeof _fsAgg !== "undefined" && _fsAgg)) return false;
    const m = merkLesen(); return !!(m && m.ok);
  };
  /* Beim Anmelden einmal nachsehen, ob die Datenbank den Überblick schon kann (kleine Abfrage) */
  SU.pruefen = async function () {
    const p = prof(), s = supa(); if (!ich() || !p || !p.fahrschule_id || !s) return false;
    try {
      const r = await s.rpc("fs_kollegen");
      if (r.error) { if (fehltFunktion(r.error)) merkSchreiben(false); return SU.verfuegbar(); }
      kollegen = Array.isArray(r.data) ? r.data : []; kollegenOk = true; merkSchreiben(true);
      const t = document.getElementById("tbTitle");
      if (t && (t.textContent || "").trim() === "Schüler" && !document.getElementById("suOeffnen") && typeof routeHome === "function" && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) routeHome();
      return true;
    } catch (e) { return SU.verfuegbar(); }
  };
  SU.knopfHTML = function () {
    if (!SU.verfuegbar()) return "";
    return `<button class="su-oeffnen" id="suOeffnen" type="button" onclick="SU.route()"><span>Alle Schüler der Fahrschule</span><small>Nur Überblick · eigene weitergeben</small><span class="su-pfeil" aria-hidden="true">›</span></button>`;
  };

  function theorieText(r) {
    if (r.theorie_bestanden_am) return { t: "✓ Theorie bestanden", ok: true };
    if (!window.KR || !KR.theorieSoll || !KR.theorieStand) return { t: "", ok: false };
    try {
      const soll = KR.theorieSoll({ klasse: r.klasse || r.form || "B", form: r.form, weg: r.lkw_weg || null, vorbesitz: Array.isArray(r.vorbesitz) ? r.vorbesitz : [], ausbildungsart: r.umschreiber ? "umschreibung" : r.ausbildungsart });
      if (!soll.pflicht) return { t: "✓ Theorie: keine Pflicht", ok: true };
      const lek = r.theorie_lektionen || [];
      if (!lek.length) return { t: "", ok: false }; // noch nichts erfasst: kein Alarm (wie im Büro)
      const st = KR.theorieStand(soll, lek);
      return st.fertig ? { t: "✓ Theorie komplett", ok: true } : { t: `Theorie ${st.ist} von ${st.soll}`, ok: false };
    } catch (e) { return { t: "", ok: false }; }
  }
  function karte(r) {
    const pct = typeof r.stand_pct === "number" ? r.stand_pct : null;
    const th = theorieText(r);
    const lok = r.eigen && typeof DB !== "undefined" && DB && (DB.students || []).some((s) => s.id === r.id);
    return `<div class="su-karte${r.eigen ? " su-eigen" : ""}" data-sid="${e_(r.id)}">
      <${lok ? `button type="button" class="su-kopf" data-akte="${e_(r.id)}"` : `div class="su-kopf"`}>
        <span class="su-name">${e_(r.name || "—")}</span>
        ${r.eigen ? (lok ? "" : `<span class="su-fl">Kommt gleich auf dein Gerät</span>`) : `<span class="su-fl">${r.fahrlehrer_name ? "bei " + e_(r.fahrlehrer_name) : "ohne Fahrlehrer"} · <span aria-hidden="true">🔒</span> Nur Überblick</span>`}
      </${lok ? "button" : "div"}>
      <div class="su-stand">${pct == null ? `<span class="su-leer">Noch kein Stand</span>` : `<b>${pct} %</b><div class="su-balken" aria-hidden="true"><i style="width:${pct}%"></i></div>`}</div>
      ${th.t ? `<div class="su-theorie${th.ok ? " ok" : ""}">${e_(th.t)}</div>` : ""}
      ${r.eigen && lok ? `<button type="button" class="su-weiter" data-weiter="${e_(r.id)}">Weitergeben</button>` : ""}
    </div>`;
  }
  function zeichne() {
    const view = document.getElementById("view"); if (!view) return;
    const t = document.getElementById("tbTitle"); if (!t || t.textContent !== "Alle Schüler") return;
    if (!document.getElementById("suListe")) return;
    const box = document.getElementById("suListe"); if (!box) return;
    if (!daten) { box.innerHTML = `<p class="muted-p" style="text-align:center;padding:20px;">${laedt ? "Lädt …" : "Gerade nicht erreichbar. Bitte mit Internet nochmal."}</p>`; return; }
    const q = suche.trim().toLowerCase();
    const fls = Array.from(new Set(daten.map(flKey))).sort((x, y) => x.localeCompare(y, "de"));
    if (filterFl && !fls.includes(filterFl)) filterFl = ""; // der Fahrlehrer ist nicht mehr da: wieder alle zeigen
    const liste = daten.filter((r) => (!q || String(r.name || "").toLowerCase().includes(q) || String(r.fahrlehrer_name || "").toLowerCase().includes(q)) && (!filterFl || flKey(r) === filterFl));
    const wahl = document.getElementById("suFl");
    if (wahl) { wahl.innerHTML = `<option value="">Alle Fahrlehrer</option>` + fls.map((k) => `<option value="${e_(k)}"${k === filterFl ? " selected" : ""}>${e_(k)}</option>`).join(""); wahl.value = filterFl; }
    document.querySelectorAll("#suSort [data-sort]").forEach((b) => { const an = b.dataset.sort === sortWahl; b.classList.toggle("on", an); b.setAttribute("aria-pressed", an ? "true" : "false"); });
    let h = "";
    if (sortWahl === "fahrlehrer") {
      const eigen = liste.filter((r) => r.eigen).sort(nachName), andere = liste.filter((r) => !r.eigen);
      const gruppen = {}; andere.forEach((r) => { const k = flKey(r); (gruppen[k] = gruppen[k] || []).push(r); });
      if (eigen.length) h += `<div class="su-gruppe">Deine Schüler (${eigen.length})</div>` + eigen.map(karte).join("");
      Object.keys(gruppen).sort((a, b) => a.localeCompare(b, "de")).forEach((k) => { h += `<div class="su-gruppe">${e_(k)} (${gruppen[k].length})</div>` + gruppen[k].sort(nachName).map(karte).join(""); });
    } else if (sortWahl === "name") {
      h = liste.slice().sort(nachName).map(karte).join("");
    } else {
      h = liste.slice().sort((a, b) => ((typeof b.stand_pct === "number" ? b.stand_pct : -1) - (typeof a.stand_pct === "number" ? a.stand_pct : -1)) || nachName(a, b)).map(karte).join("");
    }
    box.innerHTML = h || `<p class="muted-p" style="text-align:center;padding:20px;">${q ? "Kein Treffer." : "Noch keine Schüler in der Fahrschule."}</p>`;
    box.querySelectorAll("[data-akte]").forEach((b) => b.addEventListener("click", () => { if (typeof routeDetail === "function") routeDetail(b.dataset.akte); }));
    box.querySelectorAll("[data-weiter]").forEach((b) => b.addEventListener("click", () => weitergebenWahl(b.dataset.weiter)));
  }
  async function laden() {
    const s = supa(); if (!s) return;
    laedt = true; zeichne();
    try {
      const [a, b] = await Promise.all([s.rpc("fs_schueler_ueberblick"), s.rpc("fs_kollegen")]);
      if (a.error) { if (fehltFunktion(a.error)) merkSchreiben(false); }
      else daten = Array.isArray(a.data) ? a.data : [];
      if (!b.error && Array.isArray(b.data)) { kollegen = b.data; kollegenOk = true; }
    } catch (e) {}
    laedt = false; zeichne();
  }
  SU.route = function () {
    if (typeof _seiteVerlassenOk === "function" && !_seiteVerlassenOk()) return;
    const view = document.getElementById("view"); if (!view) return;
    // Fable K6 E3: in der Gesamtansicht (oder ohne Server-Funktion) gibt es den Überblick nicht – auch nicht per Zurück
    if (!SU.verfuegbar() || (typeof _fsAgg !== "undefined" && _fsAgg)) { if (typeof routeHome === "function") routeHome(); return; }
    const zurueckFahrt = typeof _navFahrt !== "undefined" && !!_navFahrt;
    // Zurück (Android-Taste, Pfeil) führt hierher zurück: wie die route…-Seiten in den Stapel eintragen
    try {
      if (typeof _navStack !== "undefined" && !zurueckFahrt) {
        const l = _navStack[_navStack.length - 1];
        if (!l || l.name !== "routeSchuelerUeberblick") {
          // K10: Stelle und Titel der Seite merken, die man verlässt (Zurück führt genau dorthin)
          if (l) { l.y = view.scrollTop; l.titel = ((document.getElementById("tbTitle") || {}).textContent || "").trim(); }
          _navStack.push({ name: "routeSchuelerUeberblick", fn: SU.route, args: [], agg: false });
        }
      }
      if (typeof _navAktualisiereKnopf === "function") _navAktualisiereKnopf();
    } catch (e) {}
    document.getElementById("tbTitle").textContent = "Alle Schüler";
    if (typeof setFab === "function") setFab(false);
    view.scrollTop = 0;
    if (!zurueckFahrt) suche = ""; // Fable K6 E5: beim Zurück aus der Akte bleibt die Suche (die gemerkte Stelle passt dann)
    const zurueck = typeof ICN !== "undefined" && ICN.back ? ICN.back : "‹";
    view.innerHTML = `<div class="view-inner view-read fade-up">
      <div class="back-row"><button class="back-btn su-zurueck" id="suZurueck">${zurueck} Schüler</button></div>
      <p class="muted-p" style="font-size:12.5px;margin:2px 0 12px;">Überblick der ganzen Fahrschule. Die Akte öffnet nur der eigene Fahrlehrer.</p>
      <div class="search-wrap" style="margin:0 0 12px;"><input id="suSuche" type="search" placeholder="Name oder Fahrlehrer suchen" autocomplete="off" aria-label="Suchen" value="${suche.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c])}"></div>
      <div class="su-ordnung"><div class="su-sort" id="suSort" role="group" aria-label="Sortieren">${Object.keys(SORTEN).map((k) => `<button type="button" class="su-sortbtn" data-sort="${k}">${SORTEN[k]}</button>`).join("")}</div>
        <select id="suFl" class="su-fl-wahl" aria-label="Fahrlehrer"><option value="">Alle Fahrlehrer</option></select></div>
      <div id="suListe"></div>
    </div>`;
    // Fable K6 E2: wie überall in der App einen Schritt zurück (nicht neu „Schüler“ öffnen, sonst springt der Pfeil wieder hierher)
    document.getElementById("suZurueck").addEventListener("click", () => {
      if (typeof _navStack !== "undefined" && _navStack.length > 1 && typeof navZurueck === "function") navZurueck();
      else if (typeof routeHome === "function") routeHome();
    });
    document.getElementById("suSuche").addEventListener("input", (ev) => { suche = ev.target.value; zeichne(); });
    document.querySelectorAll("#suSort [data-sort]").forEach((b) => b.addEventListener("click", () => { sortWahl = b.dataset.sort; sortMerken(); zeichne(); }));
    document.getElementById("suFl").addEventListener("change", (ev) => { filterFl = ev.target.value; sortMerken(); zeichne(); });
    zeichne(); laden();
  };

  /* Weitergeben: Kollegen antippen, fertig (kein Bestätigen-Fenster) */
  function weitergebenWahl(sid) {
    const r = (daten || []).find((x) => x.id === sid); if (!r || typeof openSheet !== "function") return;
    const u = ich();
    const klasse = String(r.klasse || r.form || "B");
    const basisKl = ["B78", "Automatik", "B197", "B96"].includes(klasse) ? "B" : klasse;
    const liste = kollegen.filter((k) => k.id !== (u && u.id)).map((k) => ({ k, passt: !Array.isArray(k.klassen) || !k.klassen.length || k.klassen.includes(basisKl) || k.klassen.includes(klasse) }))
      .sort((a, b) => (b.passt - a.passt) || String(a.k.name).localeCompare(String(b.k.name), "de"));
    const leerText = kollegenOk ? "Kein anderer Fahrlehrer in der Fahrschule." : "Kollegen nicht geladen – bitte mit Internet nochmal.";
    openSheet(`<div class="sheet-h">Weitergeben</div><div class="su-sheet-name">${e_(r.name)}</div>
      <p class="muted-p" style="font-size:13px;margin:-4px 0 12px;">Künftige Termine gehen mit. Danach sieht und bearbeitet der neue Fahrlehrer alles. Zurückholen geht über das Büro.</p>
      <div class="su-wahl">${liste.length ? liste.map(({ k, passt }) => `<button type="button" class="su-an" data-an="${e_(k.id)}">An ${e_(k.name)}${passt ? "" : ` <small class="su-warn">⚠ unterrichtet ${e_(klasse)} nicht</small>`}</button>`).join("") : `<p class="h2-nichts">${leerText}</p>`}</div>
      <div class="btn-row"><button class="btn btn-ghost" id="suAbbrechen" data-su-sid="${e_(sid)}" type="button">Abbrechen</button></div>`);
    const ab = document.getElementById("suAbbrechen"); if (ab) ab.addEventListener("click", () => { if (typeof closeSheet === "function") closeSheet(); });
    const eigenesFenster = () => { const a = document.getElementById("suAbbrechen"); return a && a.dataset.suSid === sid; };
    document.querySelectorAll("[data-an]").forEach((b) => b.addEventListener("click", async () => {
      if (laeuft.has(sid)) return;
      document.querySelectorAll("[data-an]").forEach((x) => { x.disabled = true; });
      const k = kollegen.find((x) => x.id === b.dataset.an);
      const ok = await SU.weitergeben(sid, b.dataset.an, r.name, k ? k.name : "");
      // Nur das eigene Fenster schließen (inzwischen kann ein anderes offen sein); bei Fehlschlag offen lassen
      if (!eigenesFenster()) return;
      if (ok) { if (typeof closeSheet === "function") closeSheet(); }
      else document.querySelectorAll("[data-an]").forEach((x) => { x.disabled = false; });
    }));
  }
  /* Noch nicht hochgeladene Änderungen an diesem Schüler und seinen Terminen (Abgleich-Gedächtnis wie die Brücken) */
  function offen(sid) {
    try {
      if (typeof _abglLaden !== "function" || typeof _abglWertVon !== "function" || typeof DB === "undefined" || !DB) return 0;
      const m = _abglLaden(); let n = 0;
      const st = (DB.students || []).find((x) => x.id === sid);
      if (st && m.schueler[sid] !== _abglWertVon("schueler", st)) n++;
      // nur Termine, die mitgehen (noch nicht vorbei); Vergangenes bleibt beim bisherigen Fahrlehrer und darf später hoch
      const jetzt = new Date(), tag = jetzt.toLocaleDateString("sv-SE"), zeit = jetzt.toTimeString().slice(0, 5);
      (DB.lessons || []).forEach((l) => {
        if (!l || l.sid !== sid || !l.id || l.admin_entfernt_am) return;
        if (!(String(l.date) > tag || (String(l.date) === tag && String(l.bis || "23:59") > zeit))) return;
        if (m.termine[l.id] !== _abglWertVon("termine", l)) n++;
      });
      return n;
    } catch (e) { return 0; }
  }
  const warte = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const ZEIT = 15000;
  async function nachher() {
    // Gerät aufräumen wie bei einer Übergabe durch das Büro (Schüler und künftige Termine gehen weg)
    try { if (typeof pullSchuelerZuweisungen === "function") await pullSchuelerZuweisungen(); } catch (e) {}
    try { if (typeof pullTermineZuweisungen === "function") await pullTermineZuweisungen(); } catch (e) {}
  }
  SU.weitergeben = async function (sid, an, name, anName) {
    const s = supa(); if (!s || laeuft.has(sid)) return false;
    laeuft.add(sid);
    let freigeben = true; // bei fehlender Antwort erst freigeben, wenn sie doch noch kommt
    try {
      // Eigene Änderungen zuerst hochladen und abwarten – sonst bekäme der neue Fahrlehrer einen alten Stand
      // und die späte Änderung würde abgelehnt (der Schüler gehört dann nicht mehr diesem Gerät).
      // Immer anstoßen und kurz warten: auch ein eben gelöschter Termin muss oben sein (offen() sieht Löschungen nicht)
      try { if (typeof _brueckenSofort === "function") _brueckenSofort(); } catch (e) {}
      await warte(1500);
      if (offen(sid)) {
        const bis = Date.now() + 10000;
        while (offen(sid) && Date.now() < bis) await warte(400);
        if (offen(sid)) { hinweis("Noch nicht alles hochgeladen – bitte gleich nochmal."); return false; }
      }
      let r, zuSpaet = false;
      const anfrage = Promise.resolve(s.rpc("schueler_weitergeben", { p_schueler: sid, p_an: an })).catch((e) => ({ error: e }));
      r = await Promise.race([anfrage, warte(ZEIT).then(() => { zuSpaet = true; return null; })]);
      if (zuSpaet) {
        hinweis("Keine Antwort vom Server. Bitte gleich in der Liste nachsehen.");
        // Kommt die Antwort doch noch, Gerät und Liste nachziehen (ohne fremde Fenster zu schließen)
        freigeben = false;
        anfrage.then(async (x) => { if (x && x.data && x.data.ok) { await nachher(); laden(); } }).finally(() => laeuft.delete(sid));
        return false;
      }
      return await auswerten(r, sid, an, name, anName);
    } finally { if (freigeben) laeuft.delete(sid); }
  };
  async function auswerten(r, sid, an, name, anName) {
    const f = r && r.data && r.data.fehler;
    if (!r || r.error || !r.data || f) {
      hinweis(f === "nicht_deiner" ? "Das ist nicht (mehr) dein Schüler." : f === "empfaenger" ? "Dieser Fahrlehrer ist nicht mehr aktiv." : "Nicht weitergegeben – bitte mit Internet nochmal.");
      return false;
    }
    const wer = r.data.an_name || anName || "Kollegen";
    await nachher(); // danach der eigene Hinweis (er ersetzt den allgemeinen „wurde umverteilt“)
    // Richter K6 (B1): auch ein Prüfungstermin im Kalender geht mit – kein Hinweis „Prüfung bleibt bei dir“
    hinweis(`${name} ist jetzt bei ${wer}${r.data.termine ? ` (${r.data.termine === 1 ? "1 Termin geht" : r.data.termine + " Termine gehen"} mit)` : ""}.`);
    const z = (daten || []).find((x) => x.id === sid);
    if (z) { z.eigen = false; z.fahrlehrer_id = an; z.fahrlehrer_name = wer; }
    zeichne(); laden();
    return true;
  }

  // Aussehen (hier statt in index.html, damit parallele Arbeiten dort nicht kollidieren)
  try {
    const css = document.createElement("style"); css.id = "suCss";
    css.textContent = ".su-oeffnen{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;width:100%;min-height:52px;margin:16px 0 6px;padding:11px 14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;color:var(--txt);font:inherit;font-weight:700;font-size:14.5px;text-align:left;cursor:pointer}"
      + ".su-oeffnen small{flex-basis:100%;order:3;font-weight:500;font-size:12px;color:var(--muted)}.su-oeffnen .su-pfeil{margin-left:auto;color:var(--muted);font-size:20px}"
      + ".su-ordnung{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px}.su-sort{display:flex;gap:6px}.su-sortbtn{min-height:44px;padding:8px 14px;border-radius:11px;border:1px solid var(--line);background:var(--surface);color:var(--txt);font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}.su-sortbtn.on{border-color:var(--txt)}"
      + ".su-fl-wahl{flex:1 1 150px;min-width:0;min-height:44px;padding:8px 10px;border-radius:11px;border:1px solid var(--line);background:var(--surface);color:var(--txt);font:inherit;font-size:13.5px}"
      + ".su-gruppe{font-size:13.5px;font-weight:800;color:var(--txt);letter-spacing:.02em;padding:22px 0 8px}.su-zurueck{min-height:44px}.su-sheet-name{font-weight:700;font-size:15px;margin:-2px 0 6px;overflow-wrap:anywhere}"
      + ".su-karte{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:11px 13px;margin-bottom:9px}"
      + ".su-kopf{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;background:none;border:0;padding:0;color:inherit;font:inherit;text-align:left;min-height:44px;justify-content:center}"
      + "button.su-kopf{cursor:pointer}.su-name{font-weight:700;font-size:15px;overflow-wrap:anywhere}.su-fl{font-size:12px;color:var(--muted)}"
      + ".su-stand{display:flex;align-items:center;gap:10px;margin-top:6px}.su-stand b{font-size:13px;min-width:44px}.su-leer{font-size:12.5px;color:var(--muted)}"
      + ".su-balken{flex:1;height:8px;border-radius:5px;background:var(--surface-2);overflow:hidden}.su-balken i{display:block;height:100%;background:var(--akzent,#3a7350);border-radius:5px}"
      + ".su-theorie{font-size:12.5px;color:var(--muted);margin-top:5px}.su-theorie.ok{color:var(--mint,#2f5d3f)}"
      + ".su-weiter{margin-top:8px;min-height:44px;width:100%;border-radius:11px;border:1px solid var(--line);background:none;color:var(--txt);font:inherit;font-weight:700;font-size:14px;cursor:pointer}"
      + ".su-wahl{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.su-an{min-height:48px;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--txt);font:inherit;font-weight:700;font-size:15px;text-align:left;cursor:pointer}"
      + ".su-an small{display:block;font-weight:600;font-size:12.5px;color:var(--gelb,#9a6a12)}.su-an:disabled{opacity:.55}";
    (document.head || document.documentElement).appendChild(css);
  } catch (e) {}
})();
