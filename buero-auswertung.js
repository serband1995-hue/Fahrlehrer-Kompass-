/* Kompass Büro – Durchfallgründe und Verschiebungs-Verlauf (Werkstatt 20, Teil 4).
   Beides gab es bisher nur in der App-Gesamtansicht (Statistik › „Fehleranalyse“ und „Verschiebungs-Verlauf“).
   Durchfallgründe: gleiche Daten wie die App. Die App schreibt jede Prüfung nach kalender_pruefungen (Spalte result =
   pass/fail, Fehler-Kennungen in payload.faults); die Büro-Seite lädt diese Tabelle schon (S.pruefungen). Beschriftungen aus
   kompass-fehler.js (FAULT_LABEL), derselben Datei wie in der App. Verlauf: schueler_verschiebungen, die letzten 100 Einträge
   der Fahrschule; Lesen braucht die Regel aus supabase/migrations/20261201_w20_03 (ohne sie liefert die Datenbank eine leere Liste).
   Eingehängt als Unterseiten der Statistik (BEREICHE in buero.js: #fehler, #verlauf). Für Büro, Leitung und Super-Admin. */
"use strict";

// Die zwei Seiten stehen unter „Statistik“: Reiterzeile oben, damit man zwischen Zahlen, Durchfallgründen und Verschiebungen wechselt
function awReiter(aktiv) {
  const r = [["zahlen", "Statistik"], ["fehler", "Durchfallgründe"], ["verlauf", "Verschiebungen"]];
  return `<div class="aw-reiter nicht-drucken"><div class="tabs">${r.map(([id, n]) => `<a class="tab" href="#${id}"${id === aktiv ? ' aria-current="page"' : ""}>${esc(n)}</a>`).join("")}</div></div>`;
}
// Kleine Karte am Ende der Statistik: führt zu den beiden Seiten
function awStatistikKarte() {
  return `<div class="karte nicht-drucken" id="awKarte"><h2>Weitere Auswertungen</h2>
    <p class="leise klein">Warum Schüler durchgefallen sind, und wer wen zu einem anderen Fahrlehrer verschoben hat.</p>
    <div class="knopfreihe"><a class="knopf" href="#fehler">Durchfallgründe</a><a class="knopf" href="#verlauf">Verschiebungen</a></div></div>`;
}

/* ---------- Durchfallgründe ---------- */
// Alle durchgefallenen Praxisprüfungen der Fahrschule (App-Einträge), gefiltert nach Zeitraum und Fahrlehrer
function awDurchfaelle(zeit, lehrerId) {
  const ab = zeit === "alle" ? "" : KR.addDaysISO(KR.todayISO(), -365);
  return S.pruefungen.filter((e) => (e.result === "fail" || e.result === "nicht_bestanden") && !(e.payload || {}).b197
    && (!ab || (e.datum && e.datum >= ab)) && (!lehrerId || e.fahrlehrer_id === lehrerId));
}
function awFehlerListe(durchgefallen) {
  const z = {};
  for (const e of durchgefallen) for (const f of ((e.payload || {}).faults || [])) z[f] = (z[f] || 0) + 1;
  return Object.entries(z).sort((a, b) => b[1] - a[1] || String(FAULT_LABEL[a[0]] || a[0]).localeCompare(String(FAULT_LABEL[b[0]] || b[0]), "de"));
}
function renderFehler() {
  const zeit = fristenParam("zeit") === "alle" ? "alle" : "12";
  const lehrerId = S.lehrer.some((l) => l.id === fristenParam("lehrer")) ? fristenParam("lehrer") : "";
  const durch = awDurchfaelle(zeit, lehrerId);
  const liste = awFehlerListe(durch);
  const mitAngabe = durch.filter((e) => ((e.payload || {}).faults || []).length).length;
  const gesamt = liste.reduce((a, [, n]) => a + n, 0);
  const filter = `<div class="filterzeile nicht-drucken">
      <label class="aw-filter"><span>Zeitraum</span><select class="suche" id="awZeit"><option value="12"${zeit === "12" ? " selected" : ""}>Letzte 12 Monate</option><option value="alle"${zeit === "alle" ? " selected" : ""}>Alles, was geladen ist</option></select></label>
      <label class="aw-filter"><span>Fahrlehrer</span><select class="suche" id="awLehrer">${lehrerFilterOptionen(lehrerId, "Alle Fahrlehrer")}</select></label>
      ${zeit !== "12" || lehrerId ? `<a class="knopf klein" href="#fehler">Filter löschen</a>` : ""}</div>`;
  // Zahlen neutral (Rot heißt im Büro „dringend“); kurze Namen, damit die drei Kacheln am Handy nebeneinander passen
  const kacheln = `<div class="kacheln aw-kacheln">
      <div class="kachel"><div class="wert">${durch.length}</div><div class="name">nicht bestanden</div></div>
      <div class="kachel"><div class="wert">${mitAngabe}</div><div class="name">mit Grund erfasst</div></div>
      <div class="kachel"><div class="wert">${gesamt}</div><div class="name">Gründe genannt</div></div></div>`;
  const zeilen = liste.map(([id, n]) => ({ name: FAULT_LABEL[id] || id, wert: n, text: n + "×", tip: `${FAULT_LABEL[id] || id}: ${n}× genannt (${Math.round(n / (mitAngabe || 1) * 100)} % der Prüfungen mit Gründen)` }));
  const inhalt = zeilen.length
    ? `<div class="aw-grund">${balkenListe(zeilen)}</div>` + tabelleAus(["Grund", "Anzahl"], liste.map(([id, n]) => [FAULT_LABEL[id] || id, n])) + `<div id="tip" class="tip" hidden></div>`
    : `<p class="leer">${durch.length ? "Bei diesen Prüfungen wurde kein Grund eingetragen." : "Noch keine Durchfälle erfasst."}</p>`;
  return awReiter("fehler") + filter + kacheln + `<div class="karte"><h2>Häufigste Durchfallgründe</h2>
    <p class="leise klein">${lehrerId ? esc(lehrerName(lehrerId)) : "Alle Fahrlehrer der Fahrschule"} · ${zeit === "alle" ? "alle geladenen Prüfungen" : "letzte 12 Monate"}. Ein Grund zählt einmal je Prüfung, in der er genannt wurde. Gezählt werden Praxisprüfungen, die die Fahrlehrer in der Kompass-App eingetragen haben.</p>${inhalt}</div>`;
}
function bindeFehler(ziel) {
  const z = ziel.querySelector("#awZeit"), l = ziel.querySelector("#awLehrer");
  if (z) z.addEventListener("change", (e) => setzeFilter("fehler", { zeit: e.target.value === "alle" ? "alle" : "" }));
  if (l) l.addEventListener("change", (e) => setzeFilter("fehler", { lehrer: e.target.value }));
  const tip = ziel.querySelector("#tip");
  if (tip) ziel.querySelectorAll("[data-tip]").forEach((el) => {
    const zeig = (x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = x + 14 + "px"; tip.style.top = y + 14 + "px"; };
    el.addEventListener("mousemove", (e) => zeig(e.clientX, e.clientY));
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
    el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); zeig(r.left, r.top); });
    el.addEventListener("blur", () => { tip.hidden = true; });
  });
}

/* ---------- Verschiebungs-Verlauf ---------- */
function awLadeVerlauf(neu) {
  vwSchule();
  return vwLaden("verlauf", () => supa.from("schueler_verschiebungen").select("*").eq("fahrschule_id", S.fsId).order("erstellt_am", { ascending: false }).limit(100), neu);
}
function awPerson(id) {
  if (!id) return "— Pool —";
  const l = S.lehrer.find((x) => x.id === id) || (S.team || []).find((x) => x.id === id);
  return l ? lehrerName(id) : "Unbekannt"; // wie überall im Büro: gelöschter Fahrlehrer = „Ehemaliger Fahrlehrer“, nie die anonyme Adresse
}
function renderVerlauf() {
  vwSchule();
  const kopf = awReiter("verlauf");
  if (!VW.verlauf) return kopf + `<div class="karte"><h2>Verschiebungen</h2>${vwFehlerKarte("verlauf", "Der Verlauf")}</div>`;
  const zeilen = VW.verlauf.map((v) => {
    const s = S.schueler.find((x) => x.id === v.schueler_id);
    const wann = v.erstellt_am ? new Date(v.erstellt_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "";
    const wer = v.verschoben_von ? awPerson(v.verschoben_von) : "";
    return `<tr><td class="zeitspalte"><span class="vw-nowrap">${esc(wann)}</span></td>
      <td>${s ? `<b>${esc(s.name)}</b>` : '<span class="leise">(gelöschter Schüler)</span>'}</td>
      <td data-l="Von → zu"><span class="vw-nowrap">${esc(awPerson(v.von_fahrlehrer_id))}</span> → <span class="vw-nowrap">${esc(awPerson(v.zu_fahrlehrer_id))}</span></td>
      <td data-l="Verschoben von">${wer ? esc(wer) : '<span class="leise">–</span>'}</td></tr>`;
  }).join("");
  const inhalt = VW.verlauf.length
    ? `<table class="tabelle aw-liste" id="awVerlauf"><thead><tr><th>Wann</th><th>Schüler</th><th>Von → zu Fahrlehrer</th><th>Verschoben von</th></tr></thead><tbody>${zeilen}</tbody></table>`
    : `<p class="leer">Noch keine Verschiebungen.</p>`;
  return kopf + `<div class="karte"><h2>Verschiebungen</h2>
    <p class="leise klein">Die letzten 100 Einträge: Wer hat welchen Schüler zu welchem Fahrlehrer verschoben. „— Pool —“ heißt: ohne Fahrlehrer.</p>
    ${vwAltHinweis("verlauf")}${inhalt}</div>`;
}
function bindeVerlauf(ziel) {
  if (vwVeraltet("verlauf")) awLadeVerlauf();
  vwBindeNeuLaden(ziel, "verlauf", () => awLadeVerlauf(true));
}
