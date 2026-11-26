// Termin-Export v4 (25.11.2026): reine Rechenlogik von kompass-termine-export (termine.ts), ohne Datenbank, erfundene Nummern.
// Aufruf:  node --experimental-strip-types scripts/termine-export-test.mjs   (Node 22; Gegenprobe: die Fassung aus der Akademie-Anleitung fällt bei T2 durch)
import { bestandenBauen, termineBauen, mehrdeutigeNummern, telefonNorm, appBestanden, klasseNorm } from "../supabase/functions/kompass-termine-export/termine.ts";
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
  { schueler_id: "a", datum: "2026-10-01", klasse: "BE" },  // andere Klasse -> eigener Eintrag
  { schueler_id: "a", datum: "2026-09-15", klasse: "b" },   // gleiche Klasse B, aelter -> weg
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
const vonA = r.filter((x) => telefonNorm(x.telefon) === "01711111111").sort((x, y) => x.datum < y.datum ? -1 : 1);
pruefe("T1", "je Nummer UND Klasse die juengste (B und BE = zwei Eintraege, aeltere B weg, b = B)", j(vonA) === j([{ telefon: "0171 1111111", datum: "2026-10-01", klasse: "BE" }, { telefon: "0171 1111111", datum: "2026-11-20", klasse: "B" }]) || j(vonA));
pruefe("T2", "Geschwister (gleiche Nummer, andere Schreibweise, Geschwister ohne Pruefung) weggelassen", !nach["01712222222"] || j(nach["01712222222"]));
pruefe("T3", "Klasse fehlt an der Pruefung -> Klasse des Schuelers", nach["01723333333"]?.klasse === "CE" || j(nach["01723333333"]));
pruefe("T4", "ohne Telefon, ausserhalb 120 Tage, Zukunft, nicht im Export, kaputtes Datum: nichts", r.length === 3 || j(r));
pruefe("T5", "keine Namen, nur telefon/datum/klasse", r.every((x) => j(Object.keys(x).sort()) === j(["datum", "klasse", "telefon"])) || j(r));
pruefe("T6", "Reihenfolge egal (aufsteigend sortiert gleiches Ergebnis)", j(bestandenBauen([...pb].reverse(), alle, AB, HEUTE).sort((x, y) => x.telefon < y.telefon ? -1 : 1)) === j([...r].sort((x, y) => x.telefon < y.telefon ? -1 : 1)) || "anders");
pruefe("T7", "leere Eingaben -> leere Liste", j(bestandenBauen([], [], AB, HEUTE)) === "[]" || "nicht leer");
pruefe("T8", "Klasse leer ueberall -> null", j(bestandenBauen([{ schueler_id: "f", datum: "2026-11-01", klasse: "" }], alle, AB, HEUTE)) === j([{ telefon: "0173 4444444", datum: "2026-11-01", klasse: null }]) || "falsch");
pruefe("T17", "Lkw und Pkw derselben Nummer: beide, jeweils juengste", j(bestandenBauen([{ schueler_id: "f", datum: "2026-10-01", klasse: "CE" }, { schueler_id: "f", datum: "2026-11-01", klasse: "CE" }, { schueler_id: "f", datum: "2026-09-01", klasse: "B" }], alle, AB, HEUTE).map((x) => x.klasse + x.datum).sort()) === j(["B2026-09-01", "CE2026-11-01"]) || "falsch");
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
// v4 Nachtrag: Seiten lückenlos, Abbruch erst bei leerer Seite, +490 gleich 0
{
  const idx2 = await readFile(new URL("../supabase/functions/kompass-termine-export/index.ts", import.meta.url), "utf8");
  pruefe("T20", "derselbe Schueler doppelt geladen = keine Geschwister", j(bestandenBauen([{ schueler_id: "z", datum: "2026-11-01", klasse: "B" }], [{ id: "z", telefon: "0176 7" }, { id: "z", telefon: "0176 7" }], AB, HEUTE)) === j([{ telefon: "0176 7", datum: "2026-11-01", klasse: "B" }]) || "weggelassen");
  pruefe("T18", "Schueler-Seiten lueckenlos (Versatz = geladene Zeilen, Ende bei leerer Seite)", (/\.range\(alle\.length, alle\.length \+ 999\)/.test(idx2) && /length === 0\) break/.test(idx2)) || "fehlt");
  pruefe("T19", "+49 0171 gilt wie 0171", telefonNorm("+49 (0)171 1") === telefonNorm("0171 1") && telefonNorm("+490171 1") === "01711" || "anders");
}
// v4.1: zweite Quelle Fahrlehrer-App (kalender_pruefungen)
{
  const S = [{ id: "p", telefon: "0160 1000001", klasse: "B" }, { id: "q", telefon: "0160 1000002", klasse: "A2" }, { id: "g1", telefon: "0160 1000003", klasse: "B" }, { id: "g2", telefon: "+49 160 1000003", klasse: "B" }];
  const tafel = [{ schueler_id: "q", datum: "2026-11-10", klasse: "A2" }];
  const roh = [
    { schueler_id: "p", datum: "2026-11-05", result: "pass", payload: {}, geloescht: false },          // nur App -> kommt
    { schueler_id: "q", datum: "2026-11-10", result: "pass", payload: null, geloescht: false },        // gleicher Tag wie Tafel -> weg
    { schueler_id: "p", datum: "2026-11-06", result: "pass", payload: { b197: true }, geloescht: false },   // B197 -> weg
    { schueler_id: "p", datum: "2026-11-07", result: "pass", payload: { b197: "ja" }, geloescht: false },   // unbekannt -> weg
    { schueler_id: "p", datum: "2026-11-08", result: "pass", payload: {}, geloescht: true },            // geloescht -> weg
    { schueler_id: "p", datum: "2026-11-09", result: "pass", payload: {}, geloescht: "nein" },          // unbekannt -> weg
    { schueler_id: "p", datum: "2026-11-11", result: "fail", payload: {}, geloescht: false },           // nicht bestanden -> weg
    { schueler_id: "p", datum: "11.11.2026", result: "pass", payload: {}, geloescht: false },           // Datum unbekannt -> weg
    { schueler_id: "p", datum: "2026-11-12", result: "pass", payload: "x", geloescht: false },          // payload unbekannt -> weg
    { schueler_id: "g1", datum: "2026-11-02T09:30:00+00:00", result: "bestanden", geloescht: null },    // Zeitstempel ok, aber Geschwister
  ];
  const a = appBestanden(roh, tafel);
  pruefe("T21", "App: nur gueltige bestandene Eintraege, Tafel-Doppel/B197/geloescht/unbekannt weg", j(a) === j([{ schueler_id: "p", datum: "2026-11-05", klasse: null }, { schueler_id: "g1", datum: "2026-11-02", klasse: null }]) || j(a));
  const r2 = bestandenBauen(tafel.concat(a), S, AB, HEUTE).sort((x, y) => x.telefon < y.telefon ? -1 : 1);
  pruefe("T22", "Tafel + App zusammen: App-only kommt mit Klasse aus der Sicht, Geschwister weg, kein Doppel", j(r2) === j([{ telefon: "0160 1000001", datum: "2026-11-05", klasse: "B" }, { telefon: "0160 1000002", datum: "2026-11-10", klasse: "A2" }]) || j(r2));
  pruefe("T23", "App: kaputte Eingaben werfen nicht", j(appBestanden([null, 5, "x", {}], [])) === "[]" && j(appBestanden(undefined, [])) === "[]" || "wirft/liefert");
  const r3 = bestandenBauen(appBestanden([{ schueler_id: "au", datum: "2026-11-03", result: "pass", payload: {}, geloescht: false }, { schueler_id: "bb", datum: "2026-11-04", result: "pass", payload: {}, geloescht: false }], []), [{ id: "au", telefon: "0160 2000001", klasse: "Automatik" }, { id: "bb", telefon: "0160 2000002", klasse: "B197" }], AB, HEUTE).map((x) => x.klasse);
  pruefe("T25", "App-Eintrag: Fahrform Automatik wird B, B197 bleibt B197", j(r3) === j(["B", "B197"]) || j(r3));
  const sperr = appBestanden([{ schueler_id: "n", datum: "2026-11-14", result: "pass", payload: {}, geloescht: false }], [{ schueler_id: "n", datum: "2026-11-14", klasse: "B", status: "nicht_bestanden" }]);
  pruefe("T26", "Tafel nicht_bestanden + App pass am selben Tag -> kein Eintrag", j(sperr) === "[]" || j(sperr));
  // Klasse vereinheitlichen: jeder Wert, den Tafel (buero.js KLASSEN) und App (index.html FORMS) anbieten
  const tabelle = { "B": "B", "B78": "B", "B197": "B197", "BE": "BE", "B+BE": "BE", "C1": "C1", "C1E": "C1E", "C": "C", "CE": "CE", "BKF": "BKF", "Automatik": "B",
    " b 78 ": "B", "b + be": "BE", "B96": "B96", "C+CE": "CE", "C1+C1E": "C1E", "B+C": "C", "BE+C1E": "C1E", "B+CE+C1": "CE", "A": "A", "AM": "AM", "C+BKF": "C+BKF", "": null };
  const falsch = Object.entries(tabelle).filter(([k, w]) => klasseNorm(k) !== w).map(([k, w]) => k + "->" + klasseNorm(k) + " statt " + w);
  pruefe("T28", "Klasse: feste Tabelle aller angebotenen Werte + Kombinationen", !falsch.length || falsch.join(", "));
  pruefe("T29", "Klasse: null/undefined -> null", klasseNorm(null) === null && klasseNorm(undefined) === null || "falsch");
  const r4 = bestandenBauen([{ schueler_id: "k", datum: "2026-11-01", klasse: "B78" }, { schueler_id: "k", datum: "2026-11-09", klasse: "B" }, { schueler_id: "k", datum: "2026-10-01", klasse: "B+BE" }], [{ id: "k", telefon: "0160 3000001", klasse: "B" }], AB, HEUTE).map((x) => x.klasse + x.datum).sort();
  pruefe("T30", "B78 und B fallen zusammen (juengste), B+BE wird BE", j(r4) === j(["B2026-11-09", "BE2026-10-01"]) || j(r4));
  const idx3 = await readFile(new URL("../supabase/functions/kompass-termine-export/index.ts", import.meta.url), "utf8");
  const teil3 = idx3.slice(idx3.indexOf("async function bestandenLaden"), idx3.indexOf("Deno.serve"));
  pruefe("T27", "Tafel laedt bestanden und nicht_bestanden, App nur mit funktionierender Tafel", /in\("status", \["bestanden", "nicht_bestanden"\]\)/.test(teil3) && /!tafelOk/.test(teil3) && /appBestanden\(\(kp \|\| \[\]\) as AppPruefung\[\], tafelAlle\)/.test(teil3) || "fehlt");
  pruefe("T24", "App-Teil eigener try/catch, liest nur kalender_pruefungen", /Quelle 2[\s\S]*try \{[\s\S]*kalender_pruefungen[\s\S]*catch/.test(teil3) && !/\.(insert|update|delete|upsert|rpc)\(/.test(teil3) || "fehlt");
}
console.log(`\nTermin-Export-Test: ${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
