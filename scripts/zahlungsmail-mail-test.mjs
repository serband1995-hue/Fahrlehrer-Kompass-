// Zahlungsmail-Test: reine Mail-Bausteine der Edge-Funktion zahlungs-mail (supabase/functions/zahlungs-mail/mail.js).
// Prüft Betrag, EPC-GiroCode-Text, PayPal-Link, Betreff, HTML/Text (Escapen, Testkasten) und liest den erzeugten QR-Code
// (PNG) zurück: er muss genau den EPC-Text ergeben. Der QR-Leser (jsqr, pngjs) liegt NUR für den Test außerhalb des Repos:
//   npm i --prefix /tmp/claude-0/zm-qr jsqr pngjs        (oder ZM_QR_DIR=/anderer/pfad)
// Fehlt er (z. B. in CI), wird der QR-Teil als „übersprungen“ gemeldet. Nur erfundene Daten, kein Netz.
// Aufruf:  node scripts/zahlungsmail-mail-test.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const hier = dirname(fileURLToPath(import.meta.url));
const M = await import(join(hier, "..", "supabase", "functions", "zahlungs-mail", "mail.js"));
let ok = 0, fehler = 0;
const pruefe = (name, bedingung, info = "") => { if (bedingung) { ok++; console.log("ok  " + name); } else { fehler++; console.log("FEHLER " + name + (info ? " – " + info : "")); } };
const gleich = (name, ist, soll) => pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), "ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));

// ---- Betrag ----
gleich("betragText 12000", M.betragText(12000), "120,00 €");
gleich("betragText 5", M.betragText(5), "0,05 €");
gleich("betragText 123456789", M.betragText(123456789), "1.234.567,89 €");

// ---- W14 Eltern: Anrede und Satz je Empfänger ----
{
  const d = { art: "pruefung", betrag_cent: 12000, wofuer: "Praktische Prüfung", schueler_name: "Lena Muster", kontoinhaber: "Fahrschule Boost", iban: "DE89370400440532013000", verwendungszweck: "Lena Muster, Prüfung", modus: "echt" };
  const t = (x) => M.mailText({ ...d, ...x });
  pruefe("W14 ohne an: wie bisher „Hallo Lena,“ und „Ihre Prüfung“", /^Hallo Lena,$/m.test(t({})) && /für Ihre Prüfung/.test(t({})));
  pruefe("W14 an=schueler: wie bisher", t({ an: "schueler" }) === t({}));
  pruefe("W14 an=eltern: „Guten Tag,“ und „Prüfung von Lena“", /^Guten Tag,$/m.test(t({ an: "eltern" })) && /für die Prüfung von Lena/.test(t({ an: "eltern" })) && !/Hallo Lena/.test(t({ an: "eltern" })));
  pruefe("W14 an=beide: Lena und Eltern angesprochen", /Hallo Lena, guten Tag liebe Eltern,/.test(t({ an: "beide" })) && /Prüfung von Lena/.test(t({ an: "beide" })));
  pruefe("W14 Reaktivierung an Eltern", /die Reaktivierung von Lena ist fällig/.test(M.mailText({ ...d, art: "reaktivierung", an: "eltern" })));
  pruefe("W14 Zahlung offen an Eltern", /für die Ausbildung von Lena ist noch eine Zahlung offen/.test(M.mailText({ ...d, art: "zahlung_offen", an: "eltern" })));
  pruefe("W14 Test-Mail nennt, an wen sie echt ginge (Text)", /Im Echt-Modus ginge diese Mail an Schüler und Eltern\./.test(t({ modus: "test", an: "beide" })));
  pruefe("W14 Test-Mail nennt, an wen sie echt ginge (HTML)", /Im Echt-Modus ginge diese Mail an die Eltern\./.test(M.mailHtml({ ...d, modus: "test", an: "eltern" })));
  pruefe("W14 Echt-Mail ohne Test-Zeile", !/Echt-Modus/.test(t({ an: "beide" })) && !/Echt-Modus/.test(M.mailHtml({ ...d, an: "beide" })));
  pruefe("W14 HTML-Anrede escaped", !/<script/.test(M.mailHtml({ ...d, schueler_name: "<script>x", an: "beide" })));
}

// ---- EPC ----// ---- EPC ----
const basis = { kontoinhaber: "Fahrschule Boost", iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", betrag_cent: 12000, verwendungszweck: "Max Muster, Prüfung B" };
gleich("epcText Beispiel", M.epcText(basis), "BCD\n002\n1\nSCT\nCOBADEFFXXX\nFahrschule Boost\nDE89370400440532013000\nEUR120.00\n\n\nMax Muster, Prüfung B");
gleich("epcText ohne BIC", M.epcText({ ...basis, bic: null }).split("\n")[4], "");
gleich("epcText 5 Cent", M.epcText({ ...basis, betrag_cent: 5 }).split("\n")[7], "EUR0.05");
gleich("epcText 11 Zeilen, kein Schlusszeilenumbruch", [M.epcText(basis).split("\n").length, M.epcText(basis).endsWith("\n")], [11, false]);
const lang = M.epcText({ ...basis, kontoinhaber: "N".repeat(100), verwendungszweck: "Z".repeat(300) }).split("\n");
gleich("epcText Name auf 70 gekürzt", lang[5].length, 70);
gleich("epcText Zweck auf 140 gekürzt", lang[10].length, 140);
gleich("epcText Zeilenumbruch im Zweck wird Leerzeichen", M.epcText({ ...basis, verwendungszweck: "a\nb" }).split("\n")[10], "a b");
const umlaut = M.epcText({ ...basis, kontoinhaber: "Ä".repeat(70), verwendungszweck: "ü".repeat(140) });
pruefe("epcText mit Umlauten höchstens 331 Byte", new TextEncoder().encode(umlaut).length <= 331, String(new TextEncoder().encode(umlaut).length));
let wirft = false; try { M.epcText({ ...basis, betrag_cent: 0 }); } catch { wirft = true; }
pruefe("epcText Betrag 0 wird abgelehnt", wirft);

// ---- PayPal ----
gleich("paypalLink", M.paypalLink("fahrschule.boost", 12050), "https://www.paypal.me/fahrschule.boost/120.50EUR");
gleich("paypalLink ohne Namen", M.paypalLink(null, 100), null);
gleich("paypalLink Name wird kodiert", M.paypalLink("a b/c", 100), "https://www.paypal.me/a%20b%2Fc/1.00EUR");

// ---- Mail ----
const d = { modus: "echt", art: "pruefung", betrag_cent: 12000, wofuer: "Prüfung B", verwendungszweck: "Max Muster, Prüfung B", schueler_name: "Max Muster",
  fahrschule: "Fahrschule Boost", kontoinhaber: "Fahrschule Boost", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "boost", impressum: "Fahrschule Boost\nMusterstr. 1" };
for (const [art, betreffSoll] of [["pruefung", "Zahlungsinformation zu Ihrer Prüfung"], ["reaktivierung", "Zahlungsinformation: Reaktivierung"], ["zahlung_offen", "Wichtige Information zu Ihren Terminen"]]) {
  gleich("Betreff " + art, M.betreff({ ...d, art }), "Fahrschule Boost: " + betreffSoll);
  gleich("Betreff " + art + " im Test", M.betreff({ ...d, art, modus: "test" }), "[TEST] Fahrschule Boost: " + betreffSoll);
}
for (const art of ["pruefung", "reaktivierung", "zahlung_offen"]) {
  const b = M.betreff({ ...d, art });
  pruefe("Betreff " + art + " ohne Betrag/IBAN/Name", !/\d/.test(b) && !b.includes("Muster") && !b.includes("DE89"), b);
}
const boese = { ...d, schueler_name: "<script>alert(1)</script> X", wofuer: "<img src=x onerror=1>", verwendungszweck: "<b>z</b>", kontoinhaber: "<i>K</i>", impressum: "<u>I</u>\nzwei", fahrschule: "A<b>\"B" };
const html = M.mailHtml(boese);
pruefe("HTML ohne ungeescapte Eingaben", !/<script|<img src=x|<b>z|<i>K|<u>I/.test(html) && html.includes("&lt;script&gt;"));
pruefe("HTML: Impressum-Zeilenumbruch als <br>", html.includes("&lt;u&gt;I&lt;/u&gt;<br>zwei"));
gleich("Absender-Name gesäubert", M.absender(boese), "A b B <termine@fahr-akademie.info>");
gleich("Absender-Vorgabe", M.absender({}), "Fahrschule Boost <termine@fahr-akademie.info>");
pruefe("Anrede nutzt Vornamen", M.mailHtml(d).includes("Hallo Max,") && M.mailText(d).startsWith("Hallo Max,"));
pruefe("HTML: GiroCode per cid, 160x160", M.mailHtml(d).includes('<img src="cid:girocode" width="160" height="160" alt="GiroCode">'));
pruefe("HTML: keine externen Bilder/Schriften/Style-Block", !/<style|<link|src="https?:/i.test(M.mailHtml(d)));
pruefe("HTML: Breite höchstens 600 px", M.mailHtml(d).includes("max-width:600px"));
pruefe("HTML: IBAN in 4er-Gruppen", M.mailHtml(d).includes("DE89 3704 0044 0532 0130 00"));
pruefe("HTML: Betrag groß", M.mailHtml(d).includes("font-size:38px") && M.mailHtml(d).includes("120,00 €"));
pruefe("HTML: Satz je Art", M.mailHtml({ ...d, art: "reaktivierung" }).includes("Ihre Reaktivierung ist fällig. Bitte zahlen Sie:") && M.mailHtml({ ...d, art: "zahlung_offen" }).includes("keine neuen Fahrstunden gebucht werden"));
pruefe("Testkasten nur im Testmodus (HTML)", M.mailHtml({ ...d, modus: "test" }).includes("Test-Mail – nicht bezahlen") && !M.mailHtml(d).includes("Test-Mail"));
pruefe("Testkasten nur im Testmodus (Text)", M.mailText({ ...d, modus: "test" }).startsWith("TEST-MAIL") && !M.mailText(d).includes("TEST-MAIL"));
pruefe("PayPal-Knopf nur mit PayPal", M.mailHtml(d).includes("https://www.paypal.me/boost/120.00EUR") && !M.mailHtml({ ...d, paypal: null }).includes("paypal"));
pruefe("BIC nur wenn vorhanden", M.mailHtml(d).includes(">BIC<") && !M.mailHtml({ ...d, bic: null }).includes(">BIC<") && !M.mailText({ ...d, bic: null }).includes("BIC:"));
pruefe("Text: alle Zahlungsdaten", ["Kontoinhaber: Fahrschule Boost", "IBAN: DE89 3704 0044 0532 0130 00", "Verwendungszweck: Max Muster, Prüfung B", "120,00 €", "https://www.paypal.me/boost/120.00EUR", "Musterstr. 1"].every((s) => M.mailText(d).includes(s)));
pruefe("Base64 ohne Buffer", M.base64(new Uint8Array([72, 105, 33])) === "SGkh" && M.base64(new Uint8Array(100000)).length === Math.ceil(100000 / 3) * 4);

// ---- QR: PNG zurücklesen ----
const qrDir = process.env.ZM_QR_DIR || "/tmp/claude-0/zm-qr";
if (!existsSync(join(qrDir, "node_modules", "jsqr"))) {
  console.log("uebersprungen  QR-Rundlauf (jsqr/pngjs nicht in " + qrDir + ")");
} else {
  const req = createRequire(join(qrDir, "x.js"));
  const jsQR = req("jsqr"), { PNG } = req("pngjs");
  const lesen = async (text) => {
    const png = await M.qrPng(text);
    const bild = PNG.sync.read(Buffer.from(png));
    const r = jsQR(new Uint8ClampedArray(bild.data), bild.width, bild.height);
    return { r, breite: bild.width, text: r ? new TextDecoder().decode(Uint8Array.from(r.binaryData)) : null };
  };
  const faelle = [
    ["kurz", "BCD\n002\n1\nSCT\n\nA\nDE89370400440532013000\nEUR1.00\n\n\nx"],
    ["Beispiel", M.epcText(basis)],
    ["Umlaute", M.epcText({ ...basis, kontoinhaber: "Jürgen Müller-Lüdenscheidt ÄÖÜß", verwendungszweck: "Größe – Prüfung € äöü" })],
    ["ca. 200 Byte", M.epcText({ ...basis, verwendungszweck: "V".repeat(95) })],
    ["331 Byte", M.epcText({ ...basis, kontoinhaber: "N".repeat(70), verwendungszweck: "Z".repeat(140) })],
  ];
  const sonder = M.epcText({ ...basis, kontoinhaber: "N".repeat(70), verwendungszweck: "Z".repeat(140) });
  // genau 331 Byte erzeugen (Hilfsfall, nicht von epcText): Auffüllen mit Zeichen
  let t331 = sonder; while (new TextEncoder().encode(t331).length < 331) t331 += "q";
  faelle.push(["exakt 331 Byte", t331]);
  for (const [name, text] of faelle) {
    const bytes = new TextEncoder().encode(text).length;
    const { r, breite, text: gelesen } = await lesen(text);
    pruefe(`QR ${name} (${bytes} Byte) liest sich exakt zurück`, gelesen === text, r ? "anderer Text" : "nicht lesbar");
    pruefe(`QR ${name}: Bildbreite 240 bis 330 px`, breite >= 240 && breite <= 330, String(breite));
  }
  // viele Längen quer durch alle Versionen
  let schlecht = [];
  for (let n = 1; n <= 331; n += 7) { const t = "A".repeat(n); const { text: g } = await lesen(t); if (g !== t) schlecht.push(n); }
  pruefe("QR Längen 1 bis 331 (Schritt 7) alle lesbar", schlecht.length === 0, "Fehler bei " + schlecht.join(","));
  let wirft332 = false; try { await M.qrPng("A".repeat(332)); } catch { wirft332 = true; }
  pruefe("QR 332 Byte wird abgelehnt", wirft332);
}

console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
