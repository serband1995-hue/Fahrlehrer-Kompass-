// Test Werkstatt 13 Schritt 2: „noch offen“ je Posten (KR.paketVerbrauch, paketQuelleAusTerminen, paketSonderAusPlan). Ohne Browser.
// Aufruf:  node scripts/paket-stand-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const KR = require("../kompass-rechnen.js");
let ok = 0, fehler = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { fehler++; console.log("FEHLER  " + name + (info ? " · " + JSON.stringify(info) : "")); } }
const HEUTE = "2026-11-24";
const T = (art, datum, von, bis, x) => Object.assign({ art, datum, von, bis }, x || {});
const termine = [
  T("fahrstunde", "2026-11-01", "10:00", "11:30"),                       // 2 UE
  T("fahrstunde", "2026-11-02", "10:00", "10:45", { status: "abgebrochen" }),
  T("fahrstunde", "2026-11-03", "10:00", "10:45", { status: "nicht erschienen" }),
  T("fahrstunde", "2026-11-04", "10:00", "10:45", { tatsaechlicheDauer: 30 }), // 0,67 UE (wie ueOf)
  T("sonder", "2026-11-05", "10:00", "11:30", { sonderArt: "ueberland" }),  // 2
  T("sonder", "2026-11-06", "10:00", "11:30"),                             // ohne Art: zählt nicht
  T("nacht", "2026-11-07", "18:00", "19:30"),                              // 2 Nacht
  T("pruefung", "2026-11-08", "09:00", "10:00"),
  T("simulator", "2026-11-09", "09:00", "09:45"),
  T("fahrstunde", HEUTE, "08:00", "09:30"),                                 // heute vorbei (jetzt 10:00)
  T("fahrstunde", HEUTE, "11:00", "12:30"),                                 // heute noch nicht vorbei
  T("fahrstunde", "2026-12-01", "10:00", "11:30"),                          // Zukunft
  T("fahrstunde", "2026-11-10", "10:00", "11:30", { status: "abgesagt" }),
];
const q = KR.paketQuelleAusTerminen(termine, HEUTE, 600);
pruefe("S1 Fahrstunden: 2 + 0,67 + 2 (heute vorbei) = 4,67 UE", q.fahrstunden === 4.67, q);
pruefe("S2 Sonderfahrten: Überland 2, Nacht 2, ohne Art zählt nicht", q.sonder.ueberland === 2 && q.sonder.nacht === 2 && q.sonder.autobahn === 0, q.sonder);
pruefe("S3 Prüfung 1, Simulator 1", q.pruefungen === 1 && q.simulator === 1, q);
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
pruefe("S5 Übungsstunden der Reihe nach: 3 von 3, dann 1 von 1, Rest 0,67 als „mehr“", v[1].verbraucht === 3 && v[1].offen === 0 && v[2].verbraucht === 1 && v[2].mehr === 0.67, [v[1], v[2]]);
pruefe("S6 Überland 2 von 5 (3 offen), Nacht 1 von 1 (+1 mehr)", v[3].verbraucht === 2 && v[3].offen === 3 && v[4].verbraucht === 1 && v[4].mehr === 1, [v[3], v[4]]);
pruefe("S7 Prüfung 1 von 1", v[5].verbraucht === 1 && v[5].offen === 0);
const plan = KR.paketSonderAusPlan({ sonder: { ueberland: [{ iso: "2026-11-01" }, null, { iso: "2026-11-03" }], autobahn: [], nacht: [{ iso: "2026-11-05" }] } });
pruefe("S8 Sonderfahrten aus dem Plan der App (ausgefüllte Felder)", plan.ueberland === 2 && plan.autobahn === 0 && plan.nacht === 1, plan);
pruefe("S9 ohne Plan → null; ohne Quelle → kein Zähler", KR.paketSonderAusPlan(null) === null && KR.paketVerbrauch(posten, {})[1].verbraucht === null);
pruefe("S10 unbekannte Sonderfahrt-Bezeichnung → kein Zähler", KR.paketVerbrauch([{ art: "sonderfahrt", bezeichnung: "Irgendwas", anzahl: 2 }], q)[0].verbraucht === null);
console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
