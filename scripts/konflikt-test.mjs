// P1.4a/b (W25): Prüft den gemeinsamen Überschneidungs-Baustein (kompass-rechnen.js) und die Anschlüsse in App und Büro.
// Aufruf:  node scripts/konflikt-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const KR = createRequire(import.meta.url)(join(ROOT, "kompass-rechnen.js"));
let fehler = 0, faelle = 0;
const ok = (name, bed) => { faelle++; if (!bed) { fehler++; console.log("FEHLER:", name); } };
const T = (o) => Object.assign({ datum: "2026-12-01", von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", fahrlehrer: "A", schueler: "", fahrzeug: "" }, o);
const gr = (a, b) => KR.konfliktGruende(T(a), T(b)).join(",");

// Fahrlehrer, Schüler, Fahrzeug
ok("gleicher Fahrlehrer überlappt", gr({ id: 1 }, { id: 2, von: "11:00", bis: "12:30" }) === "fahrlehrer");
ok("anderer Fahrlehrer, kein Schüler/Fahrzeug: kein Konflikt", gr({ id: 1 }, { id: 2, fahrlehrer: "B" }) === "");
ok("gleicher Schüler bei anderem Fahrlehrer", gr({ id: 1, schueler: "s1" }, { id: 2, fahrlehrer: "B", schueler: "s1" }) === "schueler");
ok("gleiches Fahrzeug, Name normalisiert", gr({ id: 1, fahrzeug: "Golf  GTI" }, { id: 2, fahrlehrer: "B", fahrzeug: " golf gti " }) === "fahrzeug");
ok("alle drei Gründe", gr({ id: 1, schueler: "s", fahrzeug: "X" }, { id: 2, schueler: "s", fahrzeug: "x" }) === "fahrlehrer,schueler,fahrzeug");
ok("verschiedene Fahrzeuge: kein Konflikt", gr({ id: 1, fahrlehrer: "A", fahrzeug: "Golf" }, { id: 2, fahrlehrer: "B", fahrzeug: "Polo" }) === "");
ok("leeres Fahrzeug zählt nicht", gr({ id: 1, fahrlehrer: "A" }, { id: 2, fahrlehrer: "B" }) === "");
ok("unbekannter Fahrlehrer (null) vergleicht nicht", gr({ id: 1, fahrlehrer: null }, { id: 2, fahrlehrer: null }) === "");
// Grenzfälle
ok("Ende = Anfang ist KEIN Konflikt", gr({ id: 1 }, { id: 2, von: "11:30", bis: "13:00" }) === "");
ok("Anfang = Ende ist KEIN Konflikt", gr({ id: 1, von: "11:30", bis: "13:00" }, { id: 2 }) === "");
ok("eine Minute Überlappung ist Konflikt", gr({ id: 1 }, { id: 2, von: "11:29", bis: "13:00" }) === "fahrlehrer");
ok("innen liegend", gr({ id: 1, von: "09:00", bis: "13:00" }, { id: 2 }) === "fahrlehrer");
ok("anderer Tag", gr({ id: 1 }, { id: 2, datum: "2026-12-02" }) === "");
ok("derselbe Termin (gleiche id) zählt nicht", gr({ id: 7 }, { id: 7 }) === "");
for (const st of ["abgesagt", "abgebrochen", "geplatzt", "storniert"]) {
  ok(`Status ${st} zählt nicht (vorhanden)`, gr({ id: 1 }, { id: 2, status: st }) === "");
  ok(`Status ${st} zählt nicht (neu)`, gr({ id: 1, status: st }, { id: 2 }) === "");
}
ok("gelöschter Termin zählt nicht", gr({ id: 1 }, { id: 2, geloescht: true }) === "");
ok("ohne Zeit zählt nicht", gr({ id: 1 }, { id: 2, von: "", bis: "" }) === "");
ok("„nicht erschienen“ belegt die Zeit weiter", gr({ id: 1 }, { id: 2, status: "nicht erschienen" }) === "fahrlehrer");

// terminKonflikte: neu ohne id, sortiert, mehrere Treffer
const liste = [T({ id: "b", von: "12:00", bis: "13:30", schueler: "s1", fahrlehrer: "B" }), T({ id: "a", von: "10:30", bis: "11:15" }), T({ id: "c", von: "13:30", bis: "15:00" }), T({ id: "d", status: "abgesagt" })];
const k = KR.terminKonflikte(T({ von: "10:00", bis: "13:00", schueler: "s1" }), liste);
ok("terminKonflikte findet a und b, sortiert", k.map((x) => x.t.id).join(",") === "a,b");
ok("terminKonflikte Gründe", k[1].gruende.join(",") === "schueler");
ok("konfliktText", KR.konfliktText(k, (t) => "N" + t.id) === "10:30–11:15 Na (gleicher Fahrlehrer)\n12:00–13:30 Nb (gleicher Schüler)");
ok("konfliktText mit Datum", KR.konfliktText(k.slice(0, 1), null, true) === "01.12. 10:30–11:15 (gleicher Fahrlehrer)");
// konfliktIds
const ids = KR.konfliktIds([T({ id: 1 }), T({ id: 2, von: "11:00", bis: "12:00" }), T({ id: 3, von: "12:00", bis: "13:00" }), T({ id: 4, fahrlehrer: "B" })]);
ok("konfliktIds: 1 und 2, nicht 3 (Ende=Anfang), nicht 4 (anderer Fahrlehrer)", [...ids].sort().join(",") === "1,2");

// spaltenLayout
const L = KR.spaltenLayout([{ id: "a", von: "10:00", bis: "11:30" }, { id: "b", von: "11:00", bis: "12:30" }, { id: "c", von: "11:30", bis: "13:00" }, { id: "d", von: "14:00", bis: "15:00" }, { id: "e", von: "10:00", bis: "10:45" }]);
const s = (id) => L.get(id).spalte + "/" + L.get(id).spalten;
ok("Spalten: Kette a,b,c,e braucht nur 2 Spalten (freie Spalte wird wiederverwendet)", ["a", "b", "c", "e"].every((x) => L.get(x).spalten === 2));
ok("Spalten: keine zwei gleichzeitigen in derselben Spalte", s("a") !== s("e") && s("a") !== s("b") && s("b") !== s("c"));
ok("Spalten: drei gleichzeitig = 3 Spalten", (() => { const m = KR.spaltenLayout([{ id: 1, von: "10:00", bis: "11:00" }, { id: 2, von: "10:00", bis: "11:00" }, { id: 3, von: "10:30", bis: "11:30" }]); return [1, 2, 3].every((x) => m.get(x).spalten === 3) && new Set([1, 2, 3].map((x) => m.get(x).spalte)).size === 3; })());
ok("Spalten: allein stehender Termin volle Breite", s("d") === "0/1");
ok("Spalten: Ende = Anfang nebeneinander nicht nötig", (() => { const m = KR.spaltenLayout([{ id: 1, von: "10:00", bis: "11:00" }, { id: 2, von: "11:00", bis: "12:00" }]); return m.get(1).spalten === 1 && m.get(2).spalten === 1; })());

// Anschlüsse: jeder Weg nutzt den gemeinsamen Baustein
const html = readFileSync(join(ROOT, "index.html"), "utf8"), buero = readFileSync(join(ROOT, "buero.js"), "utf8"), luecken = readFileSync(join(ROOT, "buero-luecken.js"), "utf8");
const block = (src, name) => { const i = src.indexOf("function " + name + "("); if (i < 0) return ""; let t = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") t++; else if (src[j] === "}" && --t === 0) break; } return src.slice(i, j + 1); };
ok("App: Eintragen prüft", /_kfFrage\(_kfFinde\(neue\)/.test(block(html, "openAddLessonSheet")));
ok("App: Termin vergeben prüft", /_kfFrage\(_kfFinde\(neu\)/.test(block(html, "openAssignSlotSheet")));
ok("App: Bearbeiten prüft", /_kfFrage\(kf,/.test(block(html, "openEventEdit")));
ok("App: Ziehen prüft", /_kfFinde\(/.test(block(html, "wireCalendarDrag")));
ok("App: Serie prüft", /_kfFinde\(rows\.map/.test(html));
ok("App: Tagesansicht nutzt Spalten", /KR\.spaltenLayout/.test(block(html, "calDayHTML")));
ok("App: Abbrechen ist Hauptknopf", /id="kfJa"[^>]*>Speichern<\/button><button class="btn btn-primary" id="kfNein"/.test(html));
ok("Büro: Termin-Dialog prüft", /kfFrage\(kfFinde\(/.test(block(buero, "terminDialog")));
ok("Büro: Serie prüft", /kfFrage\(kfFinde\(/.test(block(luecken, "luSerienDialog")));
ok("Büro: Kalender nutzt Spalten", /KR\.spaltenLayout/.test(block(buero, "kSpaltenBloecke")));
ok("Büro: Rückfrage vorsichtig (Abbrechen Hauptknopf)", /"Trotzdem speichern", "Abbrechen", true\)/.test(block(buero, "kfFrage")));

ok("App: Schutz gegen alte Rechendatei", /function _kfDa\(/.test(html) && /if\(!_kfDa\(\)\)return \[\]/.test(block(html, "_kfFinde")));
ok("Büro: Schutz gegen alte Rechendatei", /function kfDa\(/.test(buero) && /if \(!kfDa\(\)\) return \[\]/.test(block(buero, "kfFinde")));
ok("App: Doppeltipp auf Speichern gesperrt", /if\(erledigt\)return; erledigt=true; setTimeout\(\(\)=>\{ erledigt=false; \},600\); weiter\(\)/.test(block(html, "_kfFrage")));
ok("App: Fokus auf Abbrechen holt Knöpfe ins Bild (kein preventScroll)", !/preventScroll/.test(block(html, "_kfFrage")));
console.log(fehler ? `❌ ${fehler} von ${faelle} Prüfungen fehlgeschlagen` : `✅ Konflikt-Test: alle ${faelle} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
