// Prüft, dass kompass-rechnen.js genau so rechnet wie index.html.
// Aufruf:  node scripts/rechnen-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KR = require(join(ROOT, "kompass-rechnen.js"));
const html = readFileSync(join(ROOT, "index.html"), "utf8");

function holeFunktion(name) {
  const start = html.indexOf("function " + name + "(");
  if (start < 0) throw new Error("Funktion fehlt in index.html: " + name);
  let tiefe = 0, i = html.indexOf("{", start);
  for (; i < html.length; i++) {
    if (html[i] === "{") tiefe++;
    else if (html[i] === "}") { tiefe--; if (tiefe === 0) break; }
  }
  return html.slice(start, i + 1);
}
const artenZeile = html.match(/const FS_BUERO_ARTEN=\[[^\]]*\];/)[0];
const original = new Function(artenZeile + holeFunktion("hm2min") + holeFunktion("ueOf") + "return {ueOf};")();

let fehler = 0, faelle = 0;
function gleich(name, a, b) {
  faelle++;
  if (a !== b) { fehler++; console.log("ABWEICHUNG", name, "index.html:", a, "kompass-rechnen.js:", b); }
}

const arten = ["fahrstunde", "sonder", "nacht", "pruefung", "theorie", "schalt", "block", "beratung", "ersthilfe", "vortest", "simulator", "unbekannt", undefined];
const zeiten = [[null, null], ["08:00", "08:45"], ["08:00", "09:30"], ["08:00", "10:15"], ["10:00", "09:00"], ["07:15", "07:30"], ["18:00", "21:00"]];
const dauern = [undefined, 0, 45, 90, 30, -5, "90"];
for (const art of arten) for (const [von, bis] of zeiten) for (const d of dauern) {
  gleich(`ueOf(${art},${von},${bis},${d})`, original.ueOf(art, von, bis, d), KR.ueOf(art, von, bis, d));
}

// Datumsregeln (für Fristen und Reaktivierung)
const datum = [
  ["2025-10-08", 12, "2026-10-08"],
  ["2024-02-29", 12, "2025-02-28"],
  ["2025-01-31", 1, "2025-02-28"],
  ["2025-03-31", -1, "2025-02-28"],
  ["2025-12-15", 24, "2027-12-15"],
];
for (const [von, m, soll] of datum) gleich(`addMonthsISO(${von},${m})`, soll, KR.addMonthsISO(von, m));
gleich("daysBetweenISO Sommerzeit", 1, KR.daysBetweenISO("2026-03-28", "2026-03-29"));
gleich("daysBetweenISO rückwärts", -30, KR.daysBetweenISO("2026-10-31", "2026-10-01"));
gleich("addDaysISO Jahreswechsel", "2027-01-02", KR.addDaysISO("2026-12-31", 2));

// Fristen: Reaktivierung und Theorie
const H = "2026-10-08";
const fall = (s) => KR.reaktInfo(s, H);
gleich("Reakt ohne Datum", "ohne_datum", fall({ reakt_status: "pruefen" }).stufe);
gleich("Reakt befreit", "befreit", fall({ reakt_status: "befreit", vertrag_am: "2020-01-01" }).stufe);
gleich("Reakt Vertrag vor 13 Monaten, ungeprüft", "pruefen_faellig", fall({ reakt_status: "pruefen", vertrag_am: "2025-09-08" }).stufe);
gleich("Reakt Vertrag vor 13 Monaten, bezahlt-Status ohne Datum", "gesperrt", fall({ reakt_status: "bezahlt", vertrag_am: "2025-09-08" }).stufe);
gleich("Reakt fällig heute = nicht gesperrt", "bald", fall({ reakt_status: "bezahlt", vertrag_am: "2025-10-08" }).stufe);
gleich("Reakt fällig gestern = gesperrt", true, fall({ reakt_status: "bezahlt", vertrag_am: "2025-10-07" }).gesperrt);
gleich("Reakt fällig in 30 Tagen", "bald", fall({ reakt_status: "bezahlt", reakt_bezahlt_bis: "2026-11-07" }).stufe);
gleich("Reakt fällig in 31 Tagen", "demnaechst", fall({ reakt_status: "bezahlt", reakt_bezahlt_bis: "2026-11-08" }).stufe);
gleich("Reakt fällig in 61 Tagen", "ok", fall({ reakt_status: "bezahlt", reakt_bezahlt_bis: "2026-12-08" }).stufe);
gleich("Reakt bezahlt_bis hat Vorrang", "2027-05-01", KR.reaktFaellig({ reakt_status: "bezahlt", vertrag_am: "2025-01-01", reakt_bezahlt_bis: "2027-05-01" }));
gleich("Zahlung: +12 Monate ab Fälligkeit", "2026-09-08", KR.reaktNachZahlung({ reakt_status: "pruefen", vertrag_am: "2024-09-08" }));
gleich("Zahlung bei 2 Jahren Rückstand bleibt überfällig", "gesperrt", fall({ reakt_status: "bezahlt", reakt_bezahlt_bis: KR.reaktNachZahlung({ vertrag_am: "2023-09-08" }) }).stufe);
gleich("Schaltjahr-Vertrag", "2025-02-28", KR.reaktFaellig({ reakt_status: "bezahlt", vertrag_am: "2024-02-29" }));
const th = (s) => KR.theorieInfo(s, H);
gleich("Theorie ohne Datum", "ohne_datum", th({}).stufe);
gleich("Theorie Unterricht vor 11 Monaten", "bald", th({ theorie_abgeschlossen_am: "2025-11-01" }).stufe);
gleich("Theorie Unterricht vor 13 Monaten", "abgelaufen", th({ theorie_abgeschlossen_am: "2025-09-01" }).stufe);
gleich("Theorie bestanden verlängert", "ok", th({ theorie_abgeschlossen_am: "2025-09-01", theorie_bestanden_am: "2026-08-01" }).stufe);
gleich("Theorie Ablauf nach Prüfung", "2027-08-01", th({ theorie_abgeschlossen_am: "2025-09-01", theorie_bestanden_am: "2026-08-01" }).ablauf);

// Büro-Seite muss dieselbe Version der Nutzungsbedingungen verlangen wie die App
const agbApp = (html.match(/const AGB_VERSION="([^"]+)"/) || [])[1];
const agbBuero = (readFileSync(join(ROOT, "buero.js"), "utf8").match(/const AGB_VERSION = "([^"]+)"/) || [])[1];
gleich("AGB_VERSION index.html = buero.js", agbApp, agbBuero);

console.log(fehler ? `Rechen-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Rechen-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
