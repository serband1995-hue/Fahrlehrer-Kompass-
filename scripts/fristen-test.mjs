// W15 Schritt 3: einstellbare Fristen in kompass-rechnen.js (ohne Browser, ohne Netz, erfundene Daten).
// 1. Ohne Einstellung rechnet alles genau wie vorher (Vergleich mit den alten festen Zahlen, Zufall).
// 2. Mit Einstellung: Dauer und Warnzeiten wirken; gesetzliche Fristen (§ 18 FeV, § 29 FeV) bleiben fest.
// 3. Ungültige Werte = Standard (gleiche Grenzen wie der Server), Vorwarnung nie vor der Warnung.
// Aufruf: node scripts/fristen-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const KR = require("../kompass-rechnen.js");

let faelle = 0, fehler = 0;
function gleich(name, erwartet, ist) {
  faelle++;
  const a = JSON.stringify(erwartet), b = JSON.stringify(ist);
  if (a !== b) { fehler++; console.log("ABWEICHUNG " + name + "\n  erwartet: " + a + "\n  ist:      " + b); }
}
const H = "2026-11-25";
const tag = (n) => KR.addDaysISO(H, n), mon = (n) => KR.addMonthsISO(H, n);

// ---------- 1. Standard = alte feste Zahlen ----------
const alt = {
  stufe3: (t) => (t <= 30 ? "bald" : t <= 60 ? "demnaechst" : "ok"),
  reakt(s) { const r = KR.reaktInfo(s, H, null); return r; },
  theorie(s) {
    let ablauf = null, grund = null;
    if (s.theorie_bestanden_am) { ablauf = KR.addMonthsISO(s.theorie_bestanden_am, 12); grund = "praxis"; }
    else if (s.theorie_abgeschlossen_am) { ablauf = KR.addMonthsISO(s.theorie_abgeschlossen_am, 12); grund = "unterricht"; }
    if (!ablauf) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    const tage = KR.daysBetweenISO(H, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : alt.stufe3(tage), ablauf, tage, grund };
  },
  antrag(s) {
    if (!s.antrag_am) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    let ablauf = KR.addMonthsISO(s.antrag_am, 12), grund = "antrag";
    if (s.theorie_bestanden_am) { const v = KR.addMonthsISO(s.theorie_bestanden_am, 12); if (v > ablauf) { ablauf = v; grund = "theorie"; } }
    const tage = KR.daysBetweenISO(H, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : tage <= 60 ? "bald" : "ok", ablauf, tage, grund };
  },
  frist(s) {
    if (s.theorie_bestanden_am) return { stufe: "erledigt", ablauf: s.theorie_frist_bis || null, tage: null };
    if (!s.theorie_frist_bis) return { stufe: "ohne_datum", ablauf: null, tage: null };
    const tage = KR.daysBetweenISO(H, s.theorie_frist_bis);
    return { stufe: tage < 0 ? "abgelaufen" : alt.stufe3(tage), ablauf: s.theorie_frist_bis, tage };
  },
  fc(d) { const bis = KR.addMonthsISO(d, 12), tage = KR.daysBetweenISO(H, bis); return { stufe: tage < 0 ? "verfallen" : tage <= 60 ? "bald" : "ok", bis, tage }; },
};
let seed = 20261125;
const zufall = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; }; // obere Bits: die unteren wiederholen sich (bei % 2 immer abwechselnd)
const vielleicht = (f) => (zufall(3) ? f() : null);
KR.setzeFristen(null);
gleich("Standard: Werte", { reaktivierung: { monate: 12, bald_tage: 30, vorwarn_tage: 60 }, theorie: { monate: 12, bald_tage: 30, vorwarn_tage: 60 }, antrag: { monate: 12, bald_tage: 60 },
  fc_zettel: { monate: 12, bald_tage: 60 }, behoerde: { bald_tage: 30, vorwarn_tage: 60 }, umschreiber: { bald_tage: 30 }, fahrlehrer: { bald_tage: 90 } }, KR.holeFristen());
for (let i = 0; i < 400; i++) {
  const s = { reakt_status: ["bezahlt", "pruefen", "befreit"][zufall(3)], vertrag_am: vielleicht(() => tag(-zufall(800))), reakt_bezahlt_bis: zufall(4) ? null : tag(zufall(200) - 100),
    theorie_abgeschlossen_am: vielleicht(() => tag(-zufall(500))), theorie_bestanden_am: zufall(3) ? null : tag(-zufall(500)), antrag_am: vielleicht(() => tag(-zufall(500))),
    theorie_frist_bis: vielleicht(() => tag(zufall(200) - 50)) };
  const r = KR.reaktInfo(s, H, null);
  const fa = r.faellig ? KR.daysBetweenISO(H, r.faellig) : null;
  if (fa !== null && fa >= 0) gleich(`Zufall ${i}: Reaktivierung wie vorher`, alt.stufe3(fa), r.stufe);
  gleich(`Zufall ${i}: Theorie wie vorher`, alt.theorie(s), KR.theorieInfo(s, H));
  gleich(`Zufall ${i}: Antrag wie vorher`, alt.antrag(s), KR.antragInfo(s, H));
  gleich(`Zufall ${i}: Behörden-Frist wie vorher`, alt.frist(s), KR.theorieFristInfo(s, H));
  const d = tag(-zufall(500));
  gleich(`Zufall ${i}: Fahrcheck-Zettel wie vorher`, alt.fc(d), KR.fcGueltigkeit(d, H));
  const p = { sz95_bis: tag(zufall(300) - 50) }, t = KR.daysBetweenISO(H, p.sz95_bis);
  gleich(`Zufall ${i}: Fahrlehrer wie vorher`, t < 0 ? "abgelaufen" : t <= 90 ? "bald" : "ok", KR.fahrlehrerFristen(p, H)[0].stufe);
}
const um = (wohnsitz) => ({ ausbildungsart: "umschreibung", auslands_fs: [{ land: "Türkei" }], wohnsitz_de_seit: wohnsitz });
gleich("Standard: Umschreiber 6 Monate, bald ≤ 30", { stufe: "bald", bis: tag(30), tage: 30, drittstaat: true }, KR.umschreibInfo(um(KR.addMonthsISO(tag(30), -6)), H));

// ---------- 2. Mit Einstellung ----------
const EIN = { reaktivierung: { monate: 24, bald_tage: 14, vorwarn_tage: 45 }, theorie: { monate: 6, bald_tage: 20, vorwarn_tage: 90 }, antrag: { monate: 18, bald_tage: 30 },
  fc_zettel: { monate: 6, bald_tage: 10 }, behoerde: { bald_tage: 7, vorwarn_tage: 21 }, umschreiber: { bald_tage: 60 }, fahrlehrer: { bald_tage: 30 } };
KR.setzeFristen(EIN);
gleich("Einstellung: übernommen", EIN, KR.holeFristen());
const b = { reakt_status: "bezahlt" };
gleich("Reakt: 14 Tage = bald", "bald", KR.reaktInfo(Object.assign({ reakt_bezahlt_bis: tag(14) }, b), H, null).stufe);
gleich("Reakt: 15 Tage = demnächst", "demnaechst", KR.reaktInfo(Object.assign({ reakt_bezahlt_bis: tag(15) }, b), H, null).stufe);
gleich("Reakt: 45 Tage = demnächst", "demnaechst", KR.reaktInfo(Object.assign({ reakt_bezahlt_bis: tag(45) }, b), H, null).stufe);
gleich("Reakt: 46 Tage = ok", "ok", KR.reaktInfo(Object.assign({ reakt_bezahlt_bis: tag(46) }, b), H, null).stufe);
gleich("Reakt: Monate NICHT aus den Einstellungen (nur aus reakt_regel)", KR.addMonthsISO(mon(-13), 12), KR.reaktInfo(Object.assign({ vertrag_am: mon(-13) }, b), H, null).faellig);
gleich("Reakt: Monate aus reakt_regel", KR.addMonthsISO(mon(-13), 24), KR.reaktInfo(Object.assign({ vertrag_am: mon(-13) }, b), H, { monate: 24, frei: [] }).faellig);
gleich("Theorie Unterricht: 6 Monate", { stufe: "bald", ablauf: tag(20), tage: 20, grund: "unterricht" }, KR.theorieInfo({ theorie_abgeschlossen_am: KR.addMonthsISO(tag(20), -6) }, H));
gleich("Theorie Unterricht: Vorwarnung 90", "demnaechst", KR.theorieInfo({ theorie_abgeschlossen_am: KR.addMonthsISO(tag(90), -6) }, H).stufe);
gleich("Theorie bestanden: Praxis 12 Monate fest (§ 18 FeV)", { stufe: "bald", ablauf: tag(20), tage: 20, grund: "praxis" }, KR.theorieInfo({ theorie_bestanden_am: KR.addMonthsISO(tag(20), -12), theorie_abgeschlossen_am: tag(-400) }, H));
gleich("Antrag: 18 Monate", { stufe: "bald", ablauf: tag(30), tage: 30, grund: "antrag" }, KR.antragInfo({ antrag_am: KR.addMonthsISO(tag(30), -18) }, H));
gleich("Antrag: 31 Tage = ok", "ok", KR.antragInfo({ antrag_am: KR.addMonthsISO(tag(31), -18) }, H).stufe);
gleich("Antrag nach Theorie: 12 Monate fest", { stufe: "ok", ablauf: KR.addMonthsISO(tag(-10), 12), tage: KR.daysBetweenISO(H, KR.addMonthsISO(tag(-10), 12)), grund: "theorie" },
  KR.antragInfo({ antrag_am: mon(-17), theorie_bestanden_am: tag(-10) }, H));
gleich("Behörden-Frist: 7 = bald", "bald", KR.theorieFristInfo({ theorie_frist_bis: tag(7) }, H).stufe);
gleich("Behörden-Frist: 21 = demnächst", "demnaechst", KR.theorieFristInfo({ theorie_frist_bis: tag(21) }, H).stufe);
gleich("Behörden-Frist: 22 = ok", "ok", KR.theorieFristInfo({ theorie_frist_bis: tag(22) }, H).stufe);
gleich("Umschreiber: 6 Monate fest, Warnung 60", { stufe: "bald", bis: tag(60), tage: 60, drittstaat: true }, KR.umschreibInfo(um(KR.addMonthsISO(tag(60), -6)), H));
gleich("Fahrcheck-Zettel: 6 Monate", KR.addMonthsISO("2026-05-01", 6), KR.fcGueltigBis("2026-05-01"));
gleich("Fahrcheck-Zettel: Warnung 10", ["bald", "ok"], [KR.fcGueltigkeit(KR.addMonthsISO(tag(10), -6), H).stufe, KR.fcGueltigkeit(KR.addMonthsISO(tag(11), -6), H).stufe]);
gleich("Fahrlehrer: Warnung 30", ["bald", "ok"], KR.fahrlehrerFristen({ sz95_bis: tag(30), fortbildung_bis: tag(31) }, H).map((x) => x.stufe));
// Argument „fr“ geht vor (null = Standard)
gleich("Argument geht vor: Standard", "demnaechst", KR.theorieFristInfo({ theorie_frist_bis: tag(40) }, H, null).stufe);
gleich("Argument geht vor: eigene Werte", "bald", KR.theorieFristInfo({ theorie_frist_bis: tag(40) }, H, { behoerde: { bald_tage: 40 } }).stufe);
gleich("Argument: reaktInfo 4. Wert", "bald", KR.reaktInfo(Object.assign({ reakt_bezahlt_bis: tag(50) }, b), H, null, { reaktivierung: { bald_tage: 50 } }).stufe);
KR.setzeFristen(null);
gleich("Zurück auf Standard", "demnaechst", KR.theorieFristInfo({ theorie_frist_bis: tag(40) }, H).stufe);

// ---------- 3. Ungültige Werte ----------
const N = (w) => KR.normFristen(w);
gleich("ungültig: 0 Monate", 12, N({ theorie: { monate: 0 } }).theorie.monate);
gleich("ungültig: 61 Monate", 12, N({ antrag: { monate: 61 } }).antrag.monate);
gleich("Grenze: 60 Monate", 60, N({ antrag: { monate: 60 } }).antrag.monate);
gleich("Grenze: 1 Monat", 1, N({ fc_zettel: { monate: 1 } }).fc_zettel.monate);
gleich("ungültig: Kommazahl", 30, N({ umschreiber: { bald_tage: 7.5 } }).umschreiber.bald_tage);
gleich("ungültig: 366 Tage", 90, N({ fahrlehrer: { bald_tage: 366 } }).fahrlehrer.bald_tage);
gleich("Grenze: 365 Tage", 365, N({ fahrlehrer: { bald_tage: 365 } }).fahrlehrer.bald_tage);
gleich("ungültig: 0 Tage", 30, N({ behoerde: { bald_tage: 0 } }).behoerde.bald_tage);
gleich("Text-Zahl geht", 40, N({ behoerde: { bald_tage: "40" } }).behoerde.bald_tage);
gleich("ungültig: Text", 60, N({ antrag: { bald_tage: "viel" } }).antrag.bald_tage);
gleich("ungültig: negativ", 60, N({ antrag: { bald_tage: -5 } }).antrag.bald_tage);
gleich("ungültig: null/true/Liste", [30, 30, 30], [N({ umschreiber: { bald_tage: null } }), N({ umschreiber: { bald_tage: true } }), N({ umschreiber: { bald_tage: [5] } })].map((x) => x.umschreiber.bald_tage));
gleich("Vorwarnung vor Warnung → gleich Warnung", { monate: 12, bald_tage: 50, vorwarn_tage: 50 }, N({ theorie: { bald_tage: 50, vorwarn_tage: 20 } }).theorie);
gleich("Vorwarnung ungültig, Warnung über 60 → Vorwarnung = Warnung", { bald_tage: 90, vorwarn_tage: 90 }, N({ behoerde: { bald_tage: 90, vorwarn_tage: 0 } }).behoerde);
gleich("fremde Felder fallen weg", { bald_tage: 30 }, N({ umschreiber: { bald_tage: 30, monate: 3 } }).umschreiber);
gleich("kein Objekt = Standard", N(null), N("kaputt"));
gleich("Werte sind eingefroren", true, Object.isFrozen(N(null)) && Object.isFrozen(N(null).theorie));
gleich("Zeilen der Tabelle", { theorie: { monate: 9 }, fahrlehrer: { bald_tage: 60 } }, KR.fristenAusZeilen([
  { schluessel: "fristen.theorie", wert: { monate: 9 } }, { schluessel: "fristen.fahrlehrer", wert: { bald_tage: 60 } },
  { schluessel: "fristen.gibtsnicht", wert: { monate: 1 } }, { schluessel: "vorlagen.reaktivierung", wert: { text: "x" } }, { schluessel: "fristen.antrag", wert: "kein Objekt" }, null]));
gleich("fristZahl wie der Server", [18, 12, 12, 1, 12], [KR.fristZahl("18", 12, 1, 60), KR.fristZahl(" 18", 12, 1, 60), KR.fristZahl(1234567, 12, 1, 60), KR.fristZahl(1, 12, 1, 60), KR.fristZahl(undefined, 12, 1, 60)]);

// ---------- 4. Werte aus den Einstellungen (KE von Werkstatt 11, hier eine Attrappe mit derselben Schnittstelle) ----------
const ablage = { "fristen.theorie": { monate: 6 }, "fristen.fahrlehrer": { bald_tage: "45" }, "fristen.antrag": { monate: 99 } };
const KE = { wert: (k, std) => Object.assign({}, std, ablage[k] || {}) };
const ausKE = KR.normFristen(KR.fristenAusKE(KE));
gleich("aus KE: Theorie 6, Fahrlehrer 45 (Text-Zahl), Antrag 99 ungültig = 12", [6, 45, 12, 30], [ausKE.theorie.monate, ausKE.fahrlehrer.bald_tage, ausKE.antrag.monate, ausKE.umschreiber.bald_tage]);
gleich("ohne KE = Standard", KR.normFristen(null), KR.normFristen(KR.fristenAusKE(undefined)));
gleich("KE wirft bei einem Schlüssel: dort Standard, Rest bleibt", [12, 6], (() => { const k = { wert: (s, std) => { if (s === "fristen.antrag") throw new Error("x"); return Object.assign({}, std, ablage[s] || {}); } }; const f = KR.normFristen(KR.fristenAusKE(k)); return [f.antrag.monate, f.theorie.monate]; })());
gleich("KE bekommt eine Kopie des Standards (kein eingefrorenes Objekt)", true, (() => { let ok = true; KR.fristenAusKE({ wert: (s, std) => { if (Object.isFrozen(std)) ok = false; return std; } }); return ok; })());

console.log(fehler ? `Fristen-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Fristen-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
