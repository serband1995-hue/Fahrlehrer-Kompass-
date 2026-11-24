// Test Werkstatt 13 Schritt 2: „noch offen“ je Posten (KR.paketVerbrauch, paketQuelleAusTerminen, paketSonderAusPlan). Ohne Browser.
// Regel (🗣 Serband 24.11.2026): Eine Fahrstunde zählt im Paket erst mit dem Fahrcheck-Haken des Büros (buero_fc_status „abgegeben“),
// je Fahrcheck (45 min = 1). Gelöschte, geplatzte, abgebrochene … zählen nie. Der Ausbildungsplan der App zählt fürs Paket nicht.
// Aufruf:  node scripts/paket-stand-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const KR = require("../kompass-rechnen.js");
let ok = 0, fehler = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { fehler++; console.log("FEHLER  " + name + (info ? " · " + JSON.stringify(info) : "")); } }
const HEUTE = "2026-11-24";
const T = (art, datum, von, bis, x) => Object.assign({ art, datum, von, bis }, x || {});
const AB = { bueroFc: "abgegeben" };
const termine = [
  T("fahrstunde", "2026-11-01", "10:00", "11:30", AB),                                  // 2 Fahrchecks
  T("fahrstunde", "2026-11-02", "10:00", "10:45", AB),                                  // 1
  T("fahrstunde", "2026-11-03", "10:00", "11:30", { bueroFc: "offen" }),                // ohne Haken: zählt nicht, wartet
  T("fahrstunde", "2026-11-03", "12:00", "12:45", { bueroFc: "fehlt" }),                // Fahrcheck fehlt: zählt nicht, wartet
  T("fahrstunde", "2026-11-03", "14:00", "14:45"),                                      // ohne Feld = offen: wartet
  T("fahrstunde", "2026-11-04", "10:00", "11:30", { bueroFc: "abgegeben", status: "abgebrochen" }),
  T("fahrstunde", "2026-11-04", "12:00", "13:30", { bueroFc: "abgegeben", status: "nicht erschienen" }),
  T("fahrstunde", "2026-11-04", "14:00", "15:30", { bueroFc: "abgegeben", status: "geplatzt" }),
  T("fahrstunde", "2026-11-04", "16:00", "17:30", { bueroFc: "abgegeben", status: "abgesagt" }),
  T("sonder", "2026-11-05", "10:00", "11:30", { bueroFc: "abgegeben", sonderArt: "ueberland" }),   // 2
  T("sonder", "2026-11-05", "12:00", "12:45", { bueroFc: "abgegeben", srcSonder: "s1:autobahn:0" }), // 1 (Art aus dem Plan-Schlüssel)
  T("sonder", "2026-11-06", "10:00", "11:30", { bueroFc: "abgegeben" }),                // ohne Art: keinem Posten zuzuordnen
  T("nacht", "2026-11-07", "18:00", "19:30", AB),                                       // 2 Nacht
  T("pruefung", "2026-11-08", "09:00", "10:00"),
  T("simulator", "2026-11-09", "09:00", "09:45"),
  T("fahrstunde", HEUTE, "08:00", "09:30", AB),                                         // heute vorbei (jetzt 10:00): 2
  T("fahrstunde", HEUTE, "11:00", "12:30", AB),                                         // heute noch nicht vorbei
  T("fahrstunde", "2026-12-01", "10:00", "11:30", AB),                                  // Zukunft
];
const q = KR.paketQuelleAusTerminen(termine, HEUTE, 600);
pruefe("S1 Fahrstunden nur mit Büro-Haken, je Fahrcheck: 2 + 1 + 2 (heute vorbei) = 5", q.fahrstunden === 5, q);
pruefe("S1b ohne Haken (offen, fehlt, kein Feld): 3 Termine warten, abgebrochen/nicht erschienen/geplatzt/abgesagt nicht", q.ohneHaken === 3, q);
pruefe("S2 Sonderfahrten: Überland 2, Autobahn 1 (aus srcSonder), Nacht 2, ohne Art zählt nicht", q.sonder.ueberland === 2 && q.sonder.autobahn === 1 && q.sonder.nacht === 2, q.sonder);
pruefe("S3 Prüfung 1, Simulator 1 (ohne Haken, wie bisher)", q.pruefungen === 1 && q.simulator === 1, q);
const q0 = KR.paketQuelleAusTerminen([T("fahrstunde", "2026-11-01", "10:00", "11:30", { bueroFc: "offen" })], HEUTE, 600);
pruefe("S1c ohne Haken: 0 gefahren", q0.fahrstunden === 0 && q0.ohneHaken === 1, q0);
const posten = [
  { art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1 },
  { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 3 },
  { art: "fahrstunde", bezeichnung: "Übungsstunden Teil 2", anzahl: 1 },
  { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5 },
  { art: "sonderfahrt", bezeichnung: "Fahrt bei Dämmerung oder Dunkelheit", anzahl: 1 },
  { art: "pruefung_praxis", bezeichnung: "Vorstellung zur praktischen Prüfung", anzahl: 1 },
  { art: "lernapp", bezeichnung: "Fahr-Akademie Lernapp", anzahl: 1 },
  { art: "sonstiges", bezeichnung: "Erste Hilfe", anzahl: 1 },
];
const v = KR.paketVerbrauch(posten, q);
pruefe("S4 Grundbetrag, Lernapp, Sonstiges ohne Zähler", v[0].verbraucht === null && v[6].verbraucht === null && v[7].verbraucht === null);
pruefe("S5 Übungsstunden der Reihe nach: 3 von 3, dann 1 von 1, Rest 1 als „mehr“", v[1].verbraucht === 3 && v[1].offen === 0 && v[2].verbraucht === 1 && v[2].mehr === 1, [v[1], v[2]]);
pruefe("S6 Überland 2 von 5 (3 offen), Nacht 1 von 1 (+1 mehr)", v[3].verbraucht === 2 && v[3].offen === 3 && v[4].verbraucht === 1 && v[4].mehr === 1, [v[3], v[4]]);
pruefe("S7 Prüfung 1 von 1", v[5].verbraucht === 1 && v[5].offen === 0);
const plan = KR.paketSonderAusPlan({ sonder: { ueberland: [{ iso: "2026-11-01" }, null, { iso: "2026-11-03" }], autobahn: [], nacht: [{ iso: "2026-11-05" }] } });
pruefe("S8 Sonderfahrten aus dem Plan der App (ausgefüllte Felder, für andere Zähler)", plan.ueberland === 2 && plan.autobahn === 0 && plan.nacht === 1, plan);
pruefe("S9 ohne Plan → null; ohne Quelle → kein Zähler", KR.paketSonderAusPlan(null) === null && KR.paketVerbrauch(posten, {})[1].verbraucht === null);
pruefe("S10 unbekannte Sonderfahrt-Bezeichnung → kein Zähler", KR.paketVerbrauch([{ art: "sonderfahrt", bezeichnung: "Irgendwas", anzahl: 2 }], q)[0].verbraucht === null);
// Prüfungen von der Tafel, Plan zählt fürs Paket nicht
const q2 = KR.paketQuelleAusTerminen([
  T("pruefung", "2026-11-10", "09:00", "10:00"),                                  // Kalendertermin …
], HEUTE, 600, {
  pruefDaten: ["2026-11-11", "2026-11-25", "2026-11-20"],                         // … Ergebnis am Tag danach = dieselbe; 20.11. Wiederholung; 25.11. Zukunft
  plan: { sonder: { ueberland: [{ iso: "2026-11-04" }, { iso: "2026-11-05" }, { iso: "2026-10-01" }], autobahn: [], nacht: [] } },
});
pruefe("S11 Prüfungen: Kalender + Ergebnis am Tag danach = 1, Wiederholung = 2, Zukunft zählt nicht", q2.pruefungen === 2, q2);
pruefe("S12 Plan der App zählt fürs Paket nicht mehr (dort hakt niemand vom Büro ab)", q2.sonder.ueberland === 0, q2.sonder);
// Fahrcheck-Zahl: 45 min = 1, 90 = 2, 60 = 1 (gerundet wie die Fahrcheck-Kontrolle)
const q3 = KR.paketQuelleAusTerminen([T("fahrstunde", "2026-11-01", "10:00", "11:00", AB), T("fahrstunde", "2026-11-02", "10:00", "12:15", AB)], HEUTE, 600);
pruefe("S13 Fahrchecks wie die Fahrcheck-Kontrolle: 60 min = 1, 135 min = 3", q3.fahrstunden === 4, q3);
console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
