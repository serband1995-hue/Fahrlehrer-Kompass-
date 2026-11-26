// W15 Schritt 4: Nachrichten-Vorlagen (kompass-vorlagen.js) und die Zahlungs-Mail (mail.js), ohne Browser und ohne Netz.
// Prüft: Kopie in der Edge-Funktion Byte für Byte gleich, Standard = die Sätze von vorher, Platzhalter, Säubern (Steuerzeichen,
// unsichtbare Zeichen, Länge), Prüfung für das Büro, Eltern-Text, HTML maskiert, Betreff fest (nie Name/Betrag/Vorlagentext).
// Aufruf: node scripts/vorlagen-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KV = require(join(ROOT, "kompass-vorlagen.js"));
const MAIL = await import(pathToFileURL(join(ROOT, "supabase/functions/zahlungs-mail/mail.js")).href);
let faelle = 0, fehler = 0;
function gleich(name, erwartet, ist) {
  faelle++;
  const a = JSON.stringify(erwartet), b = JSON.stringify(ist);
  if (a !== b) { fehler++; console.log("ABWEICHUNG " + name + "\n  erwartet: " + a + "\n  ist:      " + b); }
}

// ---------- 1. Eine Datei für Büro und Server ----------
const quelle = readFileSync(join(ROOT, "kompass-vorlagen.js"), "utf8");
for (const f of ["zahlungs-mail", "erinnerungs-mail"]) gleich("Kopie in der Edge-Funktion " + f + " ist Byte für Byte gleich", quelle, readFileSync(join(ROOT, "supabase/functions", f, "vorlagen.js"), "utf8"));
gleich("keine unsichtbaren Zeichen im Quelltext", [], [...quelle].filter((c) => { const o = c.codePointAt(0); return (o < 32 && c !== "\n") || (o >= 0x7f && o <= 0x9f) || (o >= 0x200b && o <= 0x200f) || (o >= 0x2028 && o <= 0x202e) || (o >= 0x2066 && o <= 0x2069) || o === 0xfeff; }).map((c) => c.codePointAt(0).toString(16)));
// HS7 25.11.2026: Der Deploy-Weg machte aus der Backslash-u-Schreibweise im Quelltext echte Zeilentrenner
// („Unterminated regexp literal“). Darum in den Dateien der Edge-Funktionen und in kompass-vorlagen.js: keine Backslash-u-
// oder Backslash-x-Schreibweise, keine rohen Trenner. Die alte Fassung von saeubere() wird hier zur Laufzeit nachgebaut.
{
  const { readdirSync } = await import("node:fs");
  const BS = String.fromCharCode(92), ch = (n) => String.fromCharCode(n);
  // alle Edge-Funktionen (auch künftige), jeweils alle Dateien
  const fn = readdirSync(join(ROOT, "supabase/functions"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const dateien = ["kompass-vorlagen.js", ...fn.flatMap((f) => readdirSync(join(ROOT, "supabase/functions", f), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => "supabase/functions/" + f + "/" + e.name))];
  const funde = [], uMuster = new RegExp(BS + BS + "u[0-9a-fA-F{]"), xMuster = new RegExp(BS + BS + "x[0-9a-fA-F]");
  for (const d of dateien) {
    const t = readFileSync(join(ROOT, d), "utf8");
    if (uMuster.test(t)) funde.push(d + ": Backslash-u");
    if (xMuster.test(t)) funde.push(d + ": Backslash-x");
    for (const c of [0x85, 0xa0, 0x2028, 0x2029, 0xfeff]) if (t.includes(ch(c))) funde.push(d + ": Zeichen " + c.toString(16));
  }
  gleich("Edge-Dateien und kompass-vorlagen.js: keine Backslash-u/-x-Schreibweise, keine rohen Trenner (" + dateien.length + " Dateien)", [], funde);
  const u = (h) => BS + "u" + h; // nur hier im Test: alte Zeichenklassen als Text
  const ALT_TRENNER = new RegExp("[" + ["0085", "2028", "2029"].map(u).join("") + "]", "g");
  const ALT_UNSICHTBAR = new RegExp("[" + u("0000") + "-" + u("0008") + u("000B") + "-" + u("001F") + u("007F") + "-" + u("009F") + u("200B") + "-" + u("200F") + u("202A") + "-" + u("202E") + u("2066") + "-" + u("2069") + u("FEFF") + "]", "g");
  const alt = (text) => {
    let t = String(text == null ? "" : text).replace(/\r\n?/g, "\n").replace(ALT_TRENNER, "\n").replace(/\t/g, " ");
    t = t.replace(ALT_UNSICHTBAR, "");
    t = t.split("\n").map((z) => z.replace(/ {2,}/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const a = Array.from(t);
    return a.length > KV.MAX_ZEICHEN ? a.slice(0, KV.MAX_ZEICHEN).join("").trim() : t;
  };
  gleich("Nachbau der alten Fassung greift (Zeilentrenner, Richtungszeichen)", ["a\nb", "ab"], [alt("a" + ch(0x2028) + "b"), alt("a" + ch(0x202e) + "b")]);
  const abw = [];
  for (let cp = 0; cp <= 0xffff; cp++) { const x = "a" + ch(cp) + "b" + ch(cp) + ch(cp) + "c"; if (alt(x) !== KV.saeubere(x)) abw.push(cp.toString(16)); }
  const sonder = [String.fromCodePoint(0x1f600) + ch(0x2028) + "x", "  a " + ch(0x2029).repeat(3) + " b  ", ch(0xfeff) + ch(0x202e) + "abc" + ch(0x2066), "x".repeat(1200) + ch(0x2028), "z\r\n\r\n\r\n\r\nz\t\tq"];
  for (const x of sonder) if (alt(x) !== KV.saeubere(x)) abw.push(JSON.stringify(x).slice(0, 20));
  gleich("Säubern wie vorher: alle 65536 Zeichen und Sonderfälle gleich", [], abw.slice(0, 10));
}
gleich("mail.js lädt die Kopie", true, /import "\.\/vorlagen\.js";/.test(readFileSync(join(ROOT, "supabase/functions/zahlungs-mail/mail.js"), "utf8")));
gleich("global KV (Büro/Deno) hat dieselben Teile wie das Modul (Node)", Object.keys(KV), Object.keys(globalThis.KV || {}));

// ---------- 2. Standard-Sätze (seit 26.11.2026 an Schüler mit „du“, 🗣 Serband; an Eltern weiter „Sie“) ----------
const ALT = {
  pruefung: ["für deine Prüfung bitten wir um folgende Zahlung:", "für die Prüfung von Lena bitten wir um folgende Zahlung:"],
  reaktivierung: ["deine Reaktivierung ist fällig. Bitte zahl:", "die Reaktivierung von Lena ist fällig. Bitte zahlen Sie:"],
  zahlung_offen: ["bei dir ist noch eine Zahlung offen. Bis zum Eingang können keine neuen Fahrstunden gebucht werden.",
    "für die Ausbildung von Lena ist noch eine Zahlung offen. Bis zum Eingang können keine neuen Fahrstunden gebucht werden."],
};
const basis = { modus: "test", betrag_cent: 24000, wofuer: "Reaktivierung", verwendungszweck: "Lena Muster, Reaktivierung", schueler_name: "Lena Muster",
  fahrschule: "Fahrschule Muster", kontoinhaber: "Fahrschule Muster", iban: "DE89370400440532013000" };
for (const [art, [schueler, eltern]] of Object.entries(ALT)) {
  gleich("Standard " + art + " an Schüler", schueler, MAIL.satz(Object.assign({}, basis, { art, an: "schueler" })));
  gleich("Standard " + art + " an Eltern", eltern, MAIL.satz(Object.assign({}, basis, { art, an: "eltern" })));
  gleich("Standard " + art + " an beide", eltern, MAIL.satz(Object.assign({}, basis, { art, an: "beide" })));
  gleich("Standard " + art + " Eltern ohne Vorname = Schüler-Text", schueler, MAIL.satz(Object.assign({}, basis, { art, an: "eltern", schueler_name: "" })));
  gleich("Standard " + art + " mit leerer Vorlage", schueler, MAIL.satz(Object.assign({}, basis, { art, an: "schueler", vorlage: { text: " \n ", text_eltern: "" } })));
}
gleich("Bald-Standard mit Datum", "deine Reaktivierung wird am 15.12.2026 fällig. Damit es danach ohne Pause weitergeht, zahl bitte rechtzeitig:",
  MAIL.satz(Object.assign({}, basis, { art: "reaktivierung", vorlage_art: "reaktivierung_bald", faellig_am: "2026-12-15", tage: 20, an: "schueler" })));
// 🗣 Serband 26.11.2026: Mails an Schüler sagen „du“ – kein „Sie/Ihr/Ihnen“ in den Schüler-Texten, Eltern-Texte bleiben „Sie“
gleich("Schüler-Texte duzen (kein Sie/Ihr/Ihnen)", [], Object.entries(KV.VORLAGEN).filter(([, v]) => /\b(Sie|Ihr\w*|Ihnen)\b/.test(v.text)).map(([k]) => k));
gleich("Schüler-Texte duzen (jeder hat du/dein/dir/dich)", [], Object.entries(KV.VORLAGEN).filter(([, v]) => !/\b(du|dein\w*|dir|dich|zahl|melde|darfst)\b/.test(v.text)).map(([k]) => k));
gleich("Eltern-Texte siezen (kein du/dein)", [], Object.entries(KV.VORLAGEN).filter(([, v]) => v.text_eltern && /\b(du|dein\w*|dir|dich)\b/.test(v.text_eltern)).map(([k]) => k));

// ---------- 3. Platzhalter ----------
const W = { Vorname: "Lena", Datum: "2026-12-15", Betrag: 24000, Tage: 20, Fahrschule: "Fahrschule Muster" };
gleich("alle Platzhalter", "Lena 15.12.2026 240,00 € 20 Fahrschule Muster", KV.fuelle("{Vorname} {Datum} {Betrag} {Tage} {Fahrschule}", W));
gleich("Groß/klein und Leerzeichen egal", "Lena Lena Lena", KV.fuelle("{vorname} {VORNAME} { Vorname }", W));
gleich("unbekannter Platzhalter bleibt", "Hallo {Nachname}", KV.fuelle("Hallo {Nachname}", W));
gleich("fehlende Werte leer", "am  ()", KV.fuelle("am {Datum} ({Tage})", { Vorname: "Lena" }).replace(/\s+$/, ""));
gleich("Tage nie negativ", "0", KV.fuelle("{Tage}", { Tage: -12 }));
gleich("Betrag mit Tausenderpunkt", "1.250,50 €", KV.fuelle("{Betrag}", { Betrag: 125050 }));
gleich("Werte einzeilig, ohne Steuerzeichen", "Lena X", KV.fuelle("{Vorname}", { Vorname: "Lena\n\u0007X" }));
gleich("Platzhalter-Wert erzeugt keinen neuen Platzhalter", "{Betrag}", KV.fuelle("{Vorname}", { Vorname: "{Betrag}", Betrag: 100 }));

// ---------- 4. Säubern ----------
gleich("Steuerzeichen raus, Zeilenumbruch bleibt", "a\nb", KV.saeubere("a\u0000\r\nb\u0007"));
gleich("unsichtbare und Richtungs-Zeichen raus", "abcde", KV.saeubere("a\u200Bb\u202Ec\u2066d\uFEFFe"));
gleich("höchstens eine Leerzeile", "a\n\nb", KV.saeubere("a\n\n\n\n\nb"));
gleich("Zeilen-Trenner als Umbruch", "a\nb", KV.saeubere("a\u2028b"));
gleich("doppelte Leerzeichen zusammen, Ränder weg", "a b", KV.saeubere("   a    b   "));
gleich("höchstens 1000 Zeichen", 1000, Array.from(KV.saeubere("ä".repeat(1500))).length);
gleich("Emoji zählt als ein Zeichen", 1000, Array.from(KV.saeubere("🚗".repeat(1200))).length);

// ---------- 5. Prüfung im Büro ----------
gleich("leer", false, KV.pruefe("   ", "pruefung").ok);
gleich("zu lang", ["Höchstens 1000 Zeichen."], KV.pruefe("x".repeat(1001), "pruefung").fehler);
gleich("unbekannter Platzhalter: Hinweis", ["{Nachname} gibt es nicht und bleibt so stehen."], KV.pruefe("Hallo {Nachname}", "pruefung").hinweise);
gleich("Platzhalter ohne Wert in dieser Mail: Hinweis", ["{Datum} hat in dieser Mail keinen Wert und bleibt leer."], KV.pruefe("am {Datum}", "zahlung_offen").hinweise);
gleich("gültig ohne Hinweis", { ok: true, fehler: [], hinweise: [] }, KV.pruefe("Hallo {Vorname}, am {Datum} in {Tage} Tagen.", "reaktivierung_bald"));
gleich("jede Standard-Vorlage ist gültig und ohne Hinweis", [], KV.ARTEN.flatMap((a) => ["text", "text_eltern"].map((k) => KV.pruefe(KV.VORLAGEN[a][k], a)).filter((p) => !p.ok || p.hinweise.length)));

// ---------- 6. Vorlage aus den Einstellungen ----------
gleich("kein Objekt = Standard", KV.VORLAGEN.pruefung.text, KV.vorlageAus("pruefung", "kaputt").text);
gleich("Text keine Zeichenkette = Standard", KV.VORLAGEN.pruefung.text, KV.vorlageAus("pruefung", { text: 5 }).text);
gleich("nur Eltern-Text gesetzt", { text: KV.VORLAGEN.pruefung.text, text_eltern: "E" }, KV.vorlageAus("pruefung", { text_eltern: "E" }));
gleich("unbekannte Art = null", null, KV.vorlageAus("gibtsnicht", {}));
gleich("Eltern-Text ohne {Vorname} geht auch ohne Vornamen", "E", KV.textFuer({ text: "S", text_eltern: "E" }, "eltern", ""));

// ---------- 7. Mail: maskiert, Betreff fest, keine fremde Vorlage ----------
const boese = Object.assign({}, basis, { art: "reaktivierung", vorlage_art: "reaktivierung", an: "schueler",
  vorlage: { text: "<script>alert(1)</script> <a href=\"https://x.example\">Klick</a>\nZeile 2 {Vorname} {Betrag}" } });
const html = MAIL.mailHtml(boese), text = MAIL.mailText(boese);
gleich("HTML: Vorlage maskiert", true, html.includes("&lt;script&gt;alert(1)&lt;/script&gt;") && !html.includes("<script>") && !html.includes('<a href="https://x.example"'));
gleich("HTML: Zeilenumbruch als <br>", true, html.includes("&lt;/a&gt;<br>Zeile 2 Lena 240,00 €"));
gleich("Text: Platzhalter gefüllt", true, text.includes("Zeile 2 Lena 240,00 €"));
for (const d of [boese, Object.assign({}, boese, { an: "eltern" }), Object.assign({}, boese, { vorlage_art: "reaktivierung_bald", faellig_am: "2026-12-15" })]) {
  const b = MAIL.betreff(d);
  gleich("Betreff ohne Name, Betrag, Vorlagentext (" + b + ")", false, /Lena|Muster,|240|Klick|script|DE89/.test(b.replace("Fahrschule Muster", "")));
}
gleich("Betreff „bald“", "[TEST] Fahrschule Muster: Erinnerung zur Reaktivierung", MAIL.betreff(Object.assign({}, boese, { vorlage_art: "reaktivierung_bald" })));
gleich("fremde vorlage_art wird nicht übernommen (Prüfung-Vorlage für Reaktivierung)", ALT.reaktivierung[0],
  MAIL.satz(Object.assign({}, basis, { art: "reaktivierung", vorlage_art: "pruefung", an: "schueler" })));
gleich("„bald“ nur bei der Reaktivierung", ALT.pruefung[0], MAIL.satz(Object.assign({}, basis, { art: "pruefung", vorlage_art: "reaktivierung_bald", an: "schueler" })));
gleich("Fällig-Zeile nur mit Datum vom Server", [false, true, true], [
  MAIL.mailText(Object.assign({}, basis, { art: "reaktivierung", an: "schueler" })).includes("Fällig"),
  MAIL.mailText(Object.assign({}, basis, { art: "reaktivierung", an: "schueler", faellig_am: "2026-11-01" })).includes("Fällig seit: 01.11.2026"),
  MAIL.mailText(Object.assign({}, basis, { art: "reaktivierung", vorlage_art: "reaktivierung_bald", an: "schueler", faellig_am: "2026-12-15" })).includes("Fällig am: 15.12.2026")]);
gleich("Prüfung: keine Fällig-Zeile", false, MAIL.mailText(Object.assign({}, basis, { art: "pruefung", an: "schueler", faellig_am: "2026-12-15" })).includes("Fällig"));

console.log(fehler ? `Vorlagen-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Vorlagen-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
