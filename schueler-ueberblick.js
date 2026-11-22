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
  let daten = null, kollegen = [], laedt = false, suche = "";
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
      kollegen = Array.isArray(r.data) ? r.data : []; merkSchreiben(true);
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
    if (r.theorie_bestanden_am) return { t: "Theorie bestanden", ok: true };
    if (!window.KR || !KR.theorieSoll || !KR.theorieStand) return { t: "", ok: false };
    try {
      const soll = KR.theorieSoll({ klasse: r.klasse || r.form || "B", form: r.form, vorbesitz: Array.isArray(r.vorbesitz) ? r.vorbesitz : [], ausbildungsart: r.umschreiber ? "umschreibung" : r.ausbildungsart });
      if (!soll.pflicht) return { t: "Theorie: keine Pflicht", ok: true };
      const st = KR.theorieStand(soll, r.theorie_lektionen || []);
      return st.fertig ? { t: "Theorie komplett", ok: true } : { t: `Theorie ${st.ist} von ${st.soll}`, ok: false };
    } catch (e) { return { t: "", ok: false }; }
  }
  function karte(r) {
    const pct = typeof r.stand_pct === "number" ? r.stand_pct : null;
    const th = theorieText(r);
    const lok = r.eigen && typeof DB !== "undefined" && DB && (DB.students || []).some((s) => s.id === r.id);
    return `<div class="su-karte${r.eigen ? " su-eigen" : ""}" data-sid="${e_(r.id)}">
      <${lok ? `button type="button" class="su-kopf" data-akte="${e_(r.id)}"` : `div class="su-kopf"`}>
        <span class="su-name">${e_(r.name || "—")}</span>
        <span class="su-fl">${r.eigen ? "Dein Schüler" : r.fahrlehrer_name ? "bei " + e_(r.fahrlehrer_name) : "ohne Fahrlehrer"}${r.eigen ? "" : ' · <span aria-label="Akte gesperrt">🔒</span>'}</span>
      </${lok ? "button" : "div"}>
      <div class="su-stand"><div class="su-balken" aria-hidden="true"><i style="width:${pct == null ? 0 : pct}%"></i></div><b>${pct == null ? "–" : pct + " %"}</b></div>
      ${th.t ? `<div class="su-theorie${th.ok ? " ok" : ""}">${e_(th.t)}</div>` : ""}
      ${r.eigen ? `<button type="button" class="su-weiter" data-weiter="${e_(r.id)}">Weitergeben →</button>` : ""}
    </div>`;
  }
  function zeichne() {
    const view = document.getElementById("view"); if (!view) return;
    const t = document.getElementById("tbTitle"); if (!t || t.textContent !== "Alle Schüler") return;
    const box = document.getElementById("suListe"); if (!box) return;
    if (!daten) { box.innerHTML = `<p class="muted-p" style="text-align:center;padding:20px;">${laedt ? "Lädt …" : "Gerade nicht erreichbar. Bitte mit Internet nochmal."}</p>`; return; }
    const q = suche.trim().toLowerCase();
    const liste = daten.filter((r) => !q || String(r.name || "").toLowerCase().includes(q) || String(r.fahrlehrer_name || "").toLowerCase().includes(q));
    const eigen = liste.filter((r) => r.eigen), andere = liste.filter((r) => !r.eigen);
    const gruppen = {}; andere.forEach((r) => { const k = r.fahrlehrer_name || "Ohne Fahrlehrer"; (gruppen[k] = gruppen[k] || []).push(r); });
    let h = "";
    if (eigen.length) h += `<div class="su-gruppe">Deine Schüler (${eigen.length})</div>` + eigen.map(karte).join("");
    Object.keys(gruppen).sort((a, b) => a.localeCompare(b, "de")).forEach((k) => { h += `<div class="su-gruppe">${e_(k)} (${gruppen[k].length})</div>` + gruppen[k].map(karte).join(""); });
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
      if (!b.error && Array.isArray(b.data)) kollegen = b.data;
    } catch (e) {}
    laedt = false; zeichne();
  }
  SU.route = function () {
    if (typeof _seiteVerlassenOk === "function" && !_seiteVerlassenOk()) return;
    const view = document.getElementById("view"); if (!view) return;
    document.getElementById("tbTitle").textContent = "Alle Schüler";
    if (typeof setFab === "function") setFab(false);
    view.scrollTop = 0; suche = "";
    const zurueck = typeof ICN !== "undefined" && ICN.back ? ICN.back : "‹";
    view.innerHTML = `<div class="view-inner view-read fade-up">
      <div class="back-row"><button class="back-btn" id="suZurueck">${zurueck} Meine Schüler</button></div>
      <div class="sec-h">Alle <span class="o">Schüler</span></div>
      <p class="muted-p" style="font-size:12.5px;margin:2px 0 12px;">Überblick der ganzen Fahrschule. Die Akte öffnet nur der eigene Fahrlehrer.</p>
      <div class="search-wrap" style="margin:0 0 12px;"><input id="suSuche" type="search" placeholder="Name oder Fahrlehrer suchen" autocomplete="off" aria-label="Suchen"></div>
      <div id="suListe"></div>
    </div>`;
    document.getElementById("suZurueck").addEventListener("click", () => { if (typeof routeHome === "function") routeHome(); });
    document.getElementById("suSuche").addEventListener("input", (ev) => { suche = ev.target.value; zeichne(); });
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
    openSheet(`<div class="sheet-h">${e_(r.name)} weitergeben an …</div>
      <p class="muted-p" style="font-size:13px;margin:-4px 0 12px;">Künftige Termine gehen mit. Danach sieht und bearbeitet der neue Fahrlehrer alles. Zurückholen geht über das Büro.</p>
      <div class="su-wahl">${liste.length ? liste.map(({ k, passt }) => `<button type="button" class="su-an" data-an="${e_(k.id)}">An ${e_(k.name)}${passt ? "" : ` <small>unterrichtet ${e_(klasse)} nicht</small>`}</button>`).join("") : `<p class="h2-nichts">Kein anderer Fahrlehrer in der Fahrschule.</p>`}</div>
      <div class="btn-row"><button class="btn btn-ghost" id="suAbbrechen" type="button">Abbrechen</button></div>`);
    const ab = document.getElementById("suAbbrechen"); if (ab) ab.addEventListener("click", () => { if (typeof closeSheet === "function") closeSheet(); });
    document.querySelectorAll("[data-an]").forEach((b) => b.addEventListener("click", async () => {
      document.querySelectorAll("[data-an]").forEach((x) => { x.disabled = true; });
      const k = kollegen.find((x) => x.id === b.dataset.an);
      await SU.weitergeben(sid, b.dataset.an, r.name, k ? k.name : "");
      if (typeof closeSheet === "function") closeSheet();
    }));
  }
  SU.weitergeben = async function (sid, an, name, anName) {
    const s = supa(); if (!s) return false;
    // Eigene, noch nicht hochgeladene Änderungen zuerst senden, damit der neue Fahrlehrer den letzten Stand bekommt
    try { if (typeof _brueckenSofort === "function") { _brueckenSofort(); await new Promise((ok) => setTimeout(ok, 1500)); } } catch (e) {}
    let r;
    try { r = await s.rpc("schueler_weitergeben", { p_schueler: sid, p_an: an }); } catch (e) { r = { error: e }; }
    const f = r && r.data && r.data.fehler;
    if (r.error || !r.data || f) {
      hinweis(f === "nicht_deiner" ? "Das ist nicht (mehr) dein Schüler." : f === "empfaenger" ? "Dieser Fahrlehrer ist nicht mehr aktiv." : "Nicht weitergegeben – bitte mit Internet nochmal.");
      return false;
    }
    const wer = r.data.an_name || anName || "Kollegen";
    // Gerät aufräumen wie bei einer Übergabe durch das Büro (Schüler und künftige Termine gehen weg),
    // danach der eigene Hinweis (er ersetzt den allgemeinen „wurde umverteilt“)
    try { if (typeof pullSchuelerZuweisungen === "function") await pullSchuelerZuweisungen(); } catch (e) {}
    try { if (typeof pullTermineZuweisungen === "function") await pullTermineZuweisungen(); } catch (e) {}
    hinweis(`${name} ist jetzt bei ${wer}${r.data.termine ? ` (mit ${r.data.termine} Termin${r.data.termine === 1 ? "" : "en"})` : ""}. Zurückholen geht über das Büro.`);
    const z = (daten || []).find((x) => x.id === sid);
    if (z) { z.eigen = false; z.fahrlehrer_id = an; z.fahrlehrer_name = wer; }
    zeichne(); laden();
    return true;
  };

  // Aussehen (hier statt in index.html, damit parallele Arbeiten dort nicht kollidieren)
  try {
    const css = document.createElement("style"); css.id = "suCss";
    css.textContent = ".su-oeffnen{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;width:100%;min-height:52px;margin:16px 0 6px;padding:11px 14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;color:var(--txt);font:inherit;font-weight:700;font-size:14.5px;text-align:left;cursor:pointer}"
      + ".su-oeffnen small{flex-basis:100%;order:3;font-weight:500;font-size:12px;color:var(--muted)}.su-oeffnen .su-pfeil{margin-left:auto;color:var(--muted);font-size:20px}"
      + ".su-gruppe{font-size:12px;font-weight:800;color:var(--muted);letter-spacing:.04em;padding:14px 0 6px}"
      + ".su-karte{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:11px 13px;margin-bottom:9px}"
      + ".su-kopf{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;background:none;border:0;padding:0;color:inherit;font:inherit;text-align:left;min-height:44px;justify-content:center}"
      + "button.su-kopf{cursor:pointer}.su-name{font-weight:700;font-size:15px;overflow-wrap:anywhere}.su-fl{font-size:12px;color:var(--muted)}"
      + ".su-stand{display:flex;align-items:center;gap:10px;margin-top:6px}.su-stand b{font-size:13px;min-width:44px;text-align:right}"
      + ".su-balken{flex:1;height:8px;border-radius:5px;background:var(--line);overflow:hidden}.su-balken i{display:block;height:100%;background:var(--accent,#e0702e);border-radius:5px}"
      + ".su-theorie{font-size:12.5px;color:var(--muted);margin-top:5px}.su-theorie.ok{color:#4a8b45}"
      + ".su-weiter{margin-top:8px;min-height:44px;width:100%;border-radius:11px;border:1px solid var(--line);background:none;color:var(--txt);font:inherit;font-weight:700;font-size:14px;cursor:pointer}"
      + ".su-wahl{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.su-an{min-height:48px;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--txt);font:inherit;font-weight:700;font-size:15px;text-align:left;cursor:pointer}"
      + ".su-an small{display:block;font-weight:500;font-size:12px;color:var(--muted)}.su-an:disabled{opacity:.55}";
    (document.head || document.documentElement).appendChild(css);
  } catch (e) {}
})();
