// Termin-Export v4 (25.11.2026): reine Rechenlogik von kompass-termine-export (termine.ts), ohne Datenbank, erfundene Nummern.
// Aufruf:  node --experimental-strip-types scripts/termine-export-test.mjs   (Node 22; Gegenprobe: die Fassung aus der Akademie-Anleitung fällt bei T2 durch)
import { bestandenBauen, termineBauen, mehrdeutigeNummern, telefonNorm } from "../supabase/functions/kompass-termine-export/termine.ts";
import { readFile } from "node:fs/promises";
let ok = 0, fehler = 0;
const pruefe = (id, text, r) => { if (r === true) { ok++; console.log(`ok  ${id} ${text}`); } else { fehler++; console.log(`FEHLER  ${id} ${text}: ${r}`); } };
const j = (x) => JSON.stringify(x);
const AB = "2026-07-28", HEUTE = "2026-11-25";
const alle = [
  { id: "a", telefon: "0171 1111111", klasse: "B" },
  { id: "b", telefon: "0171-2222222", klasse: "B" },   // Geschwister von c (andere Schreibweise)
  { id: "c", telefon: "01712222222", klasse: "B" },    // c hat keine Pruefung -> trotzdem mehrdeutig
  { id: "d", telefon: "0172 3333333", klasse: "CE" },
  { id: "e", telefon: "", klasse: "B" },
  { id: "f", telefon: "0173 4444444", klasse: null },
];
const pb = [
  { schueler_id: "a", datum: "2026-11-20", klasse: "B" },
  { schueler_id: "a", datum: "2026-10-01", klasse: "BE" },  // aelter
  { schueler_id: "b", datum: "2026-11-10", klasse: "B" },
  { schueler_id: "d", datum: "2026-09-01", klasse: null },  // Klasse vom Schueler
  { schueler_id: "e", datum: "2026-11-01", klasse: "B" },   // ohne Telefon
  { schueler_id: "f", datum: "2026-07-27", klasse: "B" },   // vor dem Zeitraum
  { schueler_id: "f", datum: "2026-11-26", klasse: "B" },   // in der Zukunft
  { schueler_id: "x", datum: "2026-11-02", klasse: "B" },   // nicht im Export
  { schueler_id: "a", datum: "kaputt", klasse: "B" },
];
const r = bestandenBauen(pb, alle, AB, HEUTE);
const nach = Object.fromEntries(r.map((x) => [telefonNorm(x.telefon), x]));
pruefe("T1", "juengste Pruefung je Nummer, Klasse aus der Pruefung", j(nach["01711111111"]) === j({ telefon: "0171 1111111", datum: "2026-11-20", klasse: "B" }) || j(nach["01711111111"]));
pruefe("T2", "Geschwister (gleiche Nummer, andere Schreibweise, Geschwister ohne Pruefung) weggelassen", !nach["01712222222"] || j(nach["01712222222"]));
pruefe("T3", "Klasse fehlt an der Pruefung -> Klasse des Schuelers", nach["01723333333"]?.klasse === "CE" || j(nach["01723333333"]));
pruefe("T4", "ohne Telefon, ausserhalb 120 Tage, Zukunft, nicht im Export, kaputtes Datum: nichts", r.length === 2 || j(r));
pruefe("T5", "keine Namen, nur telefon/datum/klasse", r.every((x) => j(Object.keys(x).sort()) === j(["datum", "klasse", "telefon"])) || j(r));
pruefe("T6", "Reihenfolge egal (aufsteigend sortiert gleiches Ergebnis)", j(bestandenBauen([...pb].reverse(), alle, AB, HEUTE).sort((x, y) => x.telefon < y.telefon ? -1 : 1)) === j([...r].sort((x, y) => x.telefon < y.telefon ? -1 : 1)) || "anders");
pruefe("T7", "leere Eingaben -> leere Liste", j(bestandenBauen([], [], AB, HEUTE)) === "[]" || "nicht leer");
pruefe("T8", "Klasse leer ueberall -> null", j(bestandenBauen([{ schueler_id: "f", datum: "2026-11-01", klasse: "" }], alle, AB, HEUTE)) === j([{ telefon: "0173 4444444", datum: "2026-11-01", klasse: null }]) || "falsch");
pruefe("T15", "+49 und 0 gelten als dieselbe Nummer (Geschwister erkannt)", j(bestandenBauen([{ schueler_id: "g", datum: "2026-11-01", klasse: "B" }], [{ id: "g", telefon: "+49 175 5555555" }, { id: "h", telefon: "0175 5555555" }, { id: "i", telefon: "0049 175 6666666" }], AB, HEUTE)) === "[]" || "nicht erkannt");
pruefe("T16", "Bestanden-Teil hat ein Zeitlimit (Termine kommen auch, wenn er haengt)", /Promise\.race\(\[\s*bestandenLaden/.test(await readFile(new URL("../supabase/functions/kompass-termine-export/index.ts", import.meta.url), "utf8")) || "fehlt");
// Termine (v3) unveraendert
const t = termineBauen([{ schueler_id: "a", datum: "2026-12-03" }], [{ id: "a", telefon: "0171 1111111", status: "aktiv" }], HEUTE, mehrdeutigeNummern([]));
pruefe("T9", "Termine wie bisher", j(t) === j([{ telefon: "0171 1111111", datum: "2026-12-03" }]) || j(t));
// Quelltext: keine \u- oder \x-Escapes (Deploy-Weg der Hauptsitzung), Bestanden-Teil fehlertolerant, Antwort mit bestanden
for (const f of ["index.ts", "termine.ts"]) {
  const q = await readFile(new URL("../supabase/functions/kompass-termine-export/" + f, import.meta.url), "utf8");
  pruefe("T10", `${f}: keine \\u- oder \\x-Escapes`, !/\\u|\\x/.test(q) || "gefunden");
}
const idx = await readFile(new URL("../supabase/functions/kompass-termine-export/index.ts", import.meta.url), "utf8");
pruefe("T11", "Antwort enthaelt termine und bestanden", /antwort\(200, \{ termine, bestanden \}\)/.test(idx) || "fehlt");
const teil = idx.slice(idx.indexOf("async function bestandenLaden"), idx.indexOf("Deno.serve"));
pruefe("T12", "Bestanden-Teil: jeder Fehler -> [] (try/catch, kein 500)", /try \{/.test(teil) && /catch/.test(teil) && !/antwort\(/.test(teil) || "nicht abgesichert");
pruefe("T13", "Bestanden-Teil liest nur (kein insert/update/delete/upsert/rpc)", !/\.(insert|update|delete|upsert|rpc)\(/.test(teil) || "schreibt");
pruefe("T14", "Sicht ohne Filter in_ausbildung im Bestanden-Teil", !/in_ausbildung/.test(teil) || "Filter drin");
console.log(`\nTermin-Export-Test: ${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
