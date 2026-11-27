// Test W15 PR 3: Thema „Nachrichten-Vorlagen“ in den Büro-Einstellungen (buero-vorlagen.js), erfundene Daten, keine Datenbank.
//   V1 Thema an Stelle 50, Platzhalter weg   V2 9 Vorlagen in 2 Gruppen, Öffnen/Schließen (nur eine offen)
//   V3 Vorschau (Beispielwerte, Anrede, graue Zeile, Schüler/Eltern)   V4 Prüfung: leer = Fehler, unbekannter Platzhalter = Hinweis
//   V5 Speichern → Zeile in fahrschule_einstellungen, „geändert“, Rückgängig, „Standard“ → Zeile weg
//   V6 Neuzeichnen und Verlassen mit Eingabe   V7 nur lesen   V8 Platzhalter-Knopf   V9 Handy 360/412 und quer, Tippflächen
//   V10 dunkel   V11 Rollen Büro und Leitung   V12 keine Konsolenfehler
// Aufruf: NODE_PATH=$(npm root -g) node scripts/vorlagen-thema-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const KV = require("../kompass-vorlagen.js");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let ok = 0, bad = 0;
function pruefe(id, text, f) {
  const fl = f === true || f == null ? [] : [].concat(f);
  if (!fl.length) { ok++; console.log(`ok  ${id} ${text}`); } else { bad++; console.log(`FEHLER  ${id} ${text}: ${fl.join(" · ")}`); }
}
const warte = (p, ms = 300) => p.waitForTimeout(ms);
async function oeffne({ hash = "#einstellungen?thema=vorlagen", breite = 1366, hoehe = 900, nutzer = "ad-1", vorher = "", dunkel = false } = {}) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? "dark" : "light" });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000);
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  page.on("dialog", (d) => { konsole.push("echtes Browser-Fenster: " + d.type()); d.dismiss().catch(() => {}); });
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  if (vorher) await page.addInitScript(vorher);
  await page.addInitScript(([d, s]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; }, [daten, session]);
  await page.goto(basis + "buero.html" + hash);
  await warte(page, 800);
  if (await page.$("#wer:not([hidden])")) {
    await page.click('#werListe button:has-text("Paula Muster")');
    await page.keyboard.type("7352", { delay: 20 });
    await warte(page, 500);
  }
  return { page, ctx, konsole };
}
const themenListe = (page) => page.$$eval(".es-thema", (l) => l.map((a) => a.textContent.trim()));
const zeilen = (page) => page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).filter((z) => /^vorlagen\./.test(z.schluessel)).map((z) => ({ s: z.schluessel, w: z.wert, f: z.fahrschule_id })));
const oeffneArt = async (page, art) => { if ((await page.locator(`[data-esv-kopf="${art}"]`).getAttribute("aria-expanded")) !== "true") { await page.click(`[data-esv-kopf="${art}"]`); await warte(page, 150); } };
const feld = (art, f) => `#esv-${art}-${f}`;
const STD = (art) => KV.VORLAGEN[art];

try {
  // V1/V2 Liste, Gruppen, Öffnen/Schließen
  {
    const { page, ctx, konsole } = await oeffne();
    const l = await themenListe(page);
    const i = l.indexOf("Nachrichten-Vorlagen");
    pruefe("V1a", "Thema an Stelle 50: nach „Fristen“, vor „Fahrstunden & Kalender“", i > 0 && l[i - 1] === "Fristen" && l[i + 1] === "Fahrstunden & Kalender" ? null : l.join(" / "));
    const txt = await page.locator("#esBox").innerText();
    pruefe("V1b", "Platzhalter „Hier kommt bald“ ist weg, Überschrift = Themenname", !/Hier kommt bald/.test(txt) && (await page.locator("#esBox > h2.es-abschnitt").innerText()) === "Nachrichten-Vorlagen" ? null : txt.slice(0, 80));
    const g = await page.$$eval("[data-esv-liste]", (l2) => l2.map((u) => [u.dataset.esvListe, u.querySelectorAll("[data-esv-art]").length]));
    const gh = await page.$$eval("[data-esv-gruppe]", (l2) => l2.map((h) => h.textContent));
    pruefe("V2a", "9 Vorlagen in 2 Gruppen: Zahlungen (4) und Erinnerungen an Fristen (5)", JSON.stringify(g) === '[["zahlungen",4],["erinnerungen",5]]' && gh.join("|") === "Zahlungen|Erinnerungen an Fristen" ? null : JSON.stringify([g, gh]));
    const reihe = await page.$$eval("[data-esv-art]", (l2) => l2.map((e) => e.dataset.esvArt));
    pruefe("V2b", "Reihenfolge Zahlungen: pruefung, reaktivierung_bald, reaktivierung, zahlung_offen", reihe.slice(0, 4).join() === "pruefung,reaktivierung_bald,reaktivierung,zahlung_offen" ? null : reihe.join());
    const t0 = await page.$$eval(".esv-titel", (l2) => l2.map((e) => e.textContent));
    pruefe("V2c", "jede Zeile zeigt Titel und „wann“", t0.length === 9 && (await page.$$eval(".esv-wann", (l2) => l2.every((e) => e.textContent.length > 10))) && t0.includes("Prüfung bezahlen") ? null : t0.join());
    pruefe("V2d", "zu Beginn ist keine Vorlage offen, keine Marke, Speichern aus", (await page.locator(".esv-editor").count()) === 0 && (await page.locator(".esv-marke").count()) === 0 && (await page.locator("[data-esv-speichern]").isDisabled()) ? null : "offen/Marke");
    await page.click('[data-esv-kopf="pruefung"]'); await warte(page, 150);
    pruefe("V2e", "Klick öffnet die Vorlage: aria-expanded, zwei Textfelder mit dem Standardtext", (await page.locator('[data-esv-kopf="pruefung"]').getAttribute("aria-expanded")) === "true" && (await page.inputValue(feld("pruefung", "text"))) === STD("pruefung").text && (await page.inputValue(feld("pruefung", "text_eltern"))) === STD("pruefung").text_eltern ? null : await page.inputValue(feld("pruefung", "text")));
    await page.click('[data-esv-kopf="zahlung_offen"]'); await warte(page, 150);
    pruefe("V2f", "nur eine offen: die zweite öffnet, die erste schließt", (await page.locator(".esv-editor").count()) === 1 && (await page.locator('[data-esv-kopf="pruefung"]').getAttribute("aria-expanded")) === "false" && (await page.locator('[data-esv-kopf="zahlung_offen"]').getAttribute("aria-expanded")) === "true" ? null : "mehrere offen");
    await page.click('[data-esv-kopf="zahlung_offen"]'); await warte(page, 150);
    pruefe("V2g", "nochmal tippen schließt", (await page.locator(".esv-editor").count()) === 0 ? null : "noch offen");
    pruefe("V12a", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V3 Vorschau
  {
    const { page, ctx, konsole } = await oeffne();
    await oeffneArt(page, "pruefung");
    const vs = () => page.evaluate(() => { const b = document.querySelector("[data-esv-vorschau]"); return [b.querySelector(".esv-anrede").textContent, b.querySelector(".esv-satz").textContent, b.querySelector(".esv-auto").textContent]; });
    let v = await vs();
    pruefe("V3a", "Vorschau Schüler: „Hallo Lena,“, Standardsatz, graue Zeile mit Betrag/Konto/QR-Code", v[0] === "Hallo Lena," && v[1] === STD("pruefung").text && v[2] === "Danach folgen automatisch Betrag, Konto und QR-Code zum Bezahlen." ? null : JSON.stringify(v));
    await page.click('[data-esv-an="eltern"]'); await warte(page, 100);
    v = await vs();
    pruefe("V3b", "Umschalter „An die Eltern“: „Guten Tag,“ und Eltern-Satz mit Vornamen „Lena“", v[0] === "Guten Tag," && v[1] === "für die Prüfung von Lena bitten wir um folgende Zahlung:" ? null : JSON.stringify(v));
    await page.fill(feld("pruefung", "text_eltern"), "Hallo Eltern von {Vorname},\nbitte zahlen {Betrag} bis {Datum}.");
    v = await vs();
    pruefe("V3c", "Tippen: Vorschau aktualisiert sofort, {Vorname} ersetzt, Zeilenumbruch bleibt, {Betrag} 240,00 €, {Datum} ohne Wert (nicht in dieser Mail) bleibt leer", v[1] === "Hallo Eltern von Lena,\nbitte zahlen 240,00 € bis ." ? null : JSON.stringify(v));
    pruefe("V3d", "Zeilenumbruch wird angezeigt (white-space pre-line)", (await page.evaluate(() => getComputedStyle(document.querySelector(".esv-satz")).whiteSpace)) === "pre-line" ? null : "kein pre-line");
    await page.fill(feld("pruefung", "text"), "<b>Hallo</b> {Vorname} <img src=x onerror=window.__XSS=1>");
    await page.click('[data-esv-an="schueler"]'); await warte(page, 100);
    v = await vs();
    pruefe("V3e", "Nutzertext wird nie als HTML gelesen (Vorschau zeigt die Zeichen, kein <b>/<img> im Kasten, kein Skript)", v[1] === "<b>Hallo</b> Lena <img src=x onerror=window.__XSS=1>" && (await page.locator("[data-esv-vorschau] b, [data-esv-vorschau] img").count()) === 0 && !(await page.evaluate(() => window.__XSS)) ? null : JSON.stringify(v));
    await page.click(feld("pruefung", "text_eltern")); await warte(page, 100);
    pruefe("V3f", "Klick ins Eltern-Feld schaltet die Vorschau auf „An die Eltern“", (await page.locator('[data-esv-an="eltern"]').getAttribute("aria-pressed")) === "true" ? null : "nicht umgeschaltet");
    // Erinnerung: Frist-Zeile mit Beispieldatum
    await oeffneArt(page, "erinnerung_theorie");
    await page.click('[data-esv-an="schueler"]'); await warte(page, 100);
    v = await vs();
    pruefe("V3g", "Erinnerung: Satz mit {Datum} = 15.12.2026, graue Zeile „Theorieunterricht gilt bis: 15.12.2026“", /gilt bis zum 15\.12\.2026\./.test(v[1]) && /^Theorieunterricht gilt bis: 15\.12\.2026/.test(v[2]) ? null : JSON.stringify(v));
    await oeffneArt(page, "reaktivierung");
    v = await vs();
    pruefe("V3h", "Reaktivierung fällig: Satz enthält keinen unersetzten Platzhalter", !/[{}]/.test(v[1]) ? null : v[1]);
    pruefe("V12b", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V4 Prüfung
  {
    const { page, ctx, konsole } = await oeffne();
    await oeffneArt(page, "pruefung");
    const sp = page.locator("[data-esv-speichern]");
    await page.fill(feld("pruefung", "text"), "");
    pruefe("V4a", "leerer Text: Fehler „Der Text ist leer“ (rot), Feld markiert, Speichern gesperrt, Marke „Fehler“", /Der Text ist leer/.test(await page.locator('[data-esv-fehler="text"]').innerText()) && (await page.locator(feld("pruefung", "text")).getAttribute("aria-invalid")) === "true" && (await sp.isDisabled()) && /Fehler/.test(await page.locator('[data-esv-marken="pruefung"]').innerText()) ? null : "kein Fehler");
    const farbe = await page.evaluate(() => getComputedStyle(document.querySelector('[data-esv-fehler="text"]')).color);
    pruefe("V4b", "Fehlertext ist rot (--rot)", farbe === "rgb(192, 80, 63)" ? null : farbe);
    await page.fill(feld("pruefung", "text"), "Bitte zahlen {Vornam} und {Betrag}.");
    const w = await page.locator('[data-esv-warn="text"]').innerText();
    pruefe("V4c", "unbekannter Platzhalter: gelber Hinweis „{Vornam} gibt es nicht“, kein Fehler, Speichern erlaubt", /\{Vornam\} gibt es nicht/.test(w) && (await page.locator('[data-esv-fehler="text"]').isHidden()) && !(await sp.isDisabled()) ? null : w);
    await page.fill(feld("pruefung", "text"), "Bitte zahlen bis {Datum}.");
    pruefe("V4d", "Platzhalter ohne Wert in dieser Mail ({Datum} bei Prüfung): Hinweis, kein Fehler", /\{Datum\} hat in dieser Mail keinen Wert/.test(await page.locator('[data-esv-warn="text"]').innerText()) && !(await sp.isDisabled()) ? null : "kein Hinweis");
    await page.fill(feld("pruefung", "text"), "x".repeat(1001));
    pruefe("V4e", "über 1000 Zeichen: Fehler, Speichern gesperrt, Zähler „1001 von 1000“", /1000 Zeichen/.test(await page.locator('[data-esv-fehler="text"]').innerText()) && (await sp.isDisabled()) && /1001 von 1000/.test(await page.locator('[data-esv-zaehler="text"]').innerText()) ? null : "kein Fehler");
    await page.fill(feld("pruefung", "text"), STD("pruefung").text);
    pruefe("V4f", "wieder der Standard: Fehler weg, nichts geändert, Speichern aus", (await sp.isDisabled()) && (await page.locator(".esv-marke").count()) === 0 && /Nichts geändert/.test(await page.locator("[data-esv-status]").innerText()) ? null : await page.locator("[data-esv-status]").innerText());
    await page.fill(feld("pruefung", "text"), "");
    await oeffneArt(page, "reaktivierung");
    pruefe("V4g", "Fehler in einer anderen (jetzt geschlossenen) Vorlage sperrt Speichern weiter, Marke „Fehler“ in der Liste", (await sp.isDisabled()) && /Fehler/.test(await page.locator('[data-esv-marken="pruefung"]').innerText()) ? null : "nicht gesperrt");
    pruefe("V12c", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V5 Speichern, Marke, Rückgängig, Standard
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1" });
    await oeffneArt(page, "pruefung");
    const NEU = "Für Ihre Prüfung zahlen Sie bitte {Betrag}.";
    await page.fill(feld("pruefung", "text"), NEU);
    pruefe("V5a", "Änderung: Marke „nicht gespeichert“, Speichern aktiv, Status nennt 1 Vorlage", /nicht gespeichert/.test(await page.locator('[data-esv-marken="pruefung"]').innerText()) && !(await page.locator("[data-esv-speichern]").isDisabled()) && /1 Vorlage geändert/.test(await page.locator("[data-esv-status]").innerText()) ? null : "falsch");
    await page.click("[data-esv-speichern]"); await warte(page, 400);
    let z = await zeilen(page);
    pruefe("V5b", "Speichern: Zeile vorlagen.pruefung nur mit dem geänderten Text (Eltern-Text = Standard bleibt weg, damit spätere Verbesserungen am Standard ankommen), richtige Fahrschule", z.length === 1 && z[0].s === "vorlagen.pruefung" && z[0].f === "fs-test-1" && z[0].w.text === NEU && Object.keys(z[0].w).join() === "text" ? null : JSON.stringify(z));
    const t = await page.locator(".toast-undo").innerText().catch(() => "");
    pruefe("V5c", "Hinweis „Vorlage „Prüfung bezahlen“ gespeichert“ mit Rückgängig, kein Bestätigen-Fenster", /Vorlage „Prüfung bezahlen“ gespeichert/.test(t) && /Rückgängig/.test(t) ? null : t);
    pruefe("V5d", "danach Marke „geändert“ (nicht mehr „nicht gespeichert“), Speichern aus, Feld zeigt den gespeicherten Text, Vorlage bleibt offen", (await page.locator('[data-esv-marken="pruefung"]').innerText()).trim() === "geändert" && (await page.locator("[data-esv-speichern]").isDisabled()) && (await page.inputValue(feld("pruefung", "text"))) === NEU ? null : await page.locator('[data-esv-marken="pruefung"]').innerText());
    pruefe("V5e", "Vorlage zu: Marke „geändert“ bleibt in der Liste", await (async () => { await page.click('[data-esv-kopf="pruefung"]'); await warte(page, 100); return (await page.locator('[data-esv-marken="pruefung"]').innerText()).trim() === "geändert" ? null : "Marke fehlt"; })());
    await page.click(".toast-undo [data-undo]"); await warte(page, 500);
    z = await zeilen(page);
    pruefe("V5f", "Rückgängig: Zeile wieder weg (Stand wie vorher = Standard), Marke weg", z.length === 0 && (await page.locator(".esv-marke").count()) === 0 ? null : JSON.stringify(z));
    // zweimal ändern, Rückgängig stellt den vorigen GESPEICHERTEN Stand her
    await oeffneArt(page, "erinnerung_antrag");
    await page.fill(feld("erinnerung_antrag", "text"), "Erster Text {Datum}");
    await page.click("[data-esv-speichern]"); await warte(page, 400);
    await page.fill(feld("erinnerung_antrag", "text_eltern"), "Eltern Text {Vorname}");
    await page.fill(feld("erinnerung_antrag", "text"), "Zweiter Text {Datum}");
    await page.click("[data-esv-speichern]"); await warte(page, 400);
    z = await zeilen(page);
    pruefe("V5g", "zweites Speichern überschreibt die Zeile (eine Zeile, beide Texte neu)", z.length === 1 && z[0].w.text === "Zweiter Text {Datum}" && z[0].w.text_eltern === "Eltern Text {Vorname}" ? null : JSON.stringify(z));
    await page.click(".toast-undo [data-undo]"); await warte(page, 500);
    z = await zeilen(page);
    pruefe("V5h", "Rückgängig stellt den vorigen Stand her (erster Text, Eltern-Text weiter Standard = nicht gespeichert)", z.length === 1 && z[0].w.text === "Erster Text {Datum}" && Object.keys(z[0].w).join() === "text" && (await page.inputValue(feld("erinnerung_antrag", "text"))) === "Erster Text {Datum}" ? null : JSON.stringify(z));
    // Standard-Knopf: beide Texte, danach speichern → Zeile gelöscht
    pruefe("V5i", "Standard-Knopf ist aktiv (Text weicht ab)", !(await page.locator('[data-esv-standard="erinnerung_antrag"]').isDisabled()) ? null : "aus");
    await page.click('[data-esv-standard="erinnerung_antrag"]'); await warte(page, 100);
    pruefe("V5j", "„Standard“ setzt beide Felder auf den Standardtext, Knopf danach aus, Speichern aktiv (noch nichts gelöscht)", (await page.inputValue(feld("erinnerung_antrag", "text"))) === STD("erinnerung_antrag").text && (await page.inputValue(feld("erinnerung_antrag", "text_eltern"))) === STD("erinnerung_antrag").text_eltern && (await page.locator('[data-esv-standard="erinnerung_antrag"]').isDisabled()) && !(await page.locator("[data-esv-speichern]").isDisabled()) && (await zeilen(page)).length === 1 ? null : "falsch");
    await page.click("[data-esv-speichern]"); await warte(page, 400);
    pruefe("V5k", "Speichern nach „Standard“: Zeile gelöscht (nicht als Text gespeichert), Marke weg", (await zeilen(page)).length === 0 && (await page.locator(".esv-marke").count()) === 0 ? null : JSON.stringify(await zeilen(page)));
    await page.click(".toast-undo [data-undo]"); await warte(page, 500);
    pruefe("V5l", "Rückgängig nach „Standard“: der geänderte Text ist wieder gespeichert", (await zeilen(page)).length === 1 && (await zeilen(page))[0].w.text === "Erster Text {Datum}" ? null : JSON.stringify(await zeilen(page)));
    // mehrere Vorlagen auf einmal
    await oeffneArt(page, "zahlung_offen"); await page.fill(feld("zahlung_offen", "text"), "A {Vorname}");
    await oeffneArt(page, "reaktivierung"); await page.fill(feld("reaktivierung", "text"), "B {Betrag}");
    pruefe("V5m", "Entwürfe in zwei Vorlagen: Status „2 Vorlagen geändert“, beide Marken „nicht gespeichert“", /2 Vorlagen geändert/.test(await page.locator("[data-esv-status]").innerText()) && /nicht gespeichert/.test(await page.locator('[data-esv-marken="zahlung_offen"]').innerText()) ? null : await page.locator("[data-esv-status]").innerText());
    await page.click("[data-esv-speichern]"); await warte(page, 500);
    z = await zeilen(page);
    pruefe("V5n", "ein Speichern schreibt beide, Hinweis „2 Vorlagen gespeichert“", z.length === 3 && /2 Vorlagen gespeichert/.test(await page.locator(".toast-undo").innerText()) ? null : JSON.stringify(z.map((x) => x.s)));
    // Fehler beim Speichern
    await page.evaluate(() => { window.__FAKE.fehler = { fahrschule_einstellungen: "Failed to fetch" }; });
    await page.fill(feld("reaktivierung", "text"), "C {Betrag}");
    await page.click("[data-esv-speichern]"); await warte(page, 500);
    pruefe("V5o", "Speichern schlägt fehl: Fehlerzeile, Eingabe bleibt, nichts Neues in der Tabelle", !(await page.locator("#esMeldung").isHidden()) && /Speichern ging nicht/.test(await page.locator("#esMeldung").innerText()) && (await page.inputValue(feld("reaktivierung", "text"))) === "C {Betrag}" && (await zeilen(page)).find((x) => x.s === "vorlagen.reaktivierung").w.text === "B {Betrag}" ? null : await page.locator("#esMeldung").innerText());
    await page.evaluate(() => { window.__FAKE.fehler = {}; });
    pruefe("V12d", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V6 Neuzeichnen, Verlassen, Themenwechsel
  {
    const { page, ctx, konsole } = await oeffne();
    await oeffneArt(page, "pruefung");
    await page.click(feld("pruefung", "text")); await page.keyboard.press("End"); await page.keyboard.type(" Zusatz");
    await page.evaluate(() => window.zeichne()); await warte(page, 400);
    const f = await page.evaluate(() => [document.activeElement && document.activeElement.id, document.querySelector("#esv-pruefung-text").value, document.querySelector('[data-esv-kopf="pruefung"]').getAttribute("aria-expanded")]);
    await page.keyboard.type("!");
    pruefe("V6a", "Neuzeichnen durch den Rahmen (zeichne): Eingabe bleibt, Vorlage bleibt offen, Cursor noch im Feld, weiter tippen geht", f[0] === "esv-pruefung-text" && f[1] === STD("pruefung").text + " Zusatz" && f[2] === "true" && (await page.inputValue(feld("pruefung", "text"))) === STD("pruefung").text + " Zusatz!" ? null : JSON.stringify(f));
    await page.evaluate(() => ladeDaten()); await warte(page, 900);
    pruefe("V6b", "Auffrischen im Hintergrund (ladeDaten): Eingabe bleibt", (await page.inputValue(feld("pruefung", "text"))).endsWith(" Zusatz!") ? null : await page.inputValue(feld("pruefung", "text")));
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    const dlg = await page.locator("dialog[open]").innerText().catch(() => "");
    pruefe("V6c", "Verlassen mit ungespeicherter Eingabe: Rückfrage „Änderungen verwerfen?“, Thema bleibt", /Änderungen verwerfen\?/.test(dlg) && (await page.$$eval('.es-thema[aria-current="page"]', (l) => l.map((a) => a.dataset.esThema).join())) === "vorlagen" ? null : dlg);
    await page.click('dialog[open] button:has-text("Weiter bearbeiten")'); await warte(page, 300);
    pruefe("V6d", "„Weiter bearbeiten“: Eingabe noch da", (await page.inputValue(feld("pruefung", "text"))).endsWith(" Zusatz!") ? null : "weg");
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    await page.click('dialog[open] button:has-text("Ja, verwerfen")'); await warte(page, 500);
    await page.click('.es-thema[data-es-thema="vorlagen"]'); await warte(page, 400);
    await oeffneArt(page, "pruefung");
    pruefe("V6e", "„Ja, verwerfen“: beim Zurückkommen ist die Eingabe weg (Standard), nichts gespeichert", (await page.inputValue(feld("pruefung", "text"))) === STD("pruefung").text && (await zeilen(page)).length === 0 ? null : await page.inputValue(feld("pruefung", "text")));
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    pruefe("V6f", "ohne Änderung: Wechsel ohne Rückfrage", (await page.locator("dialog[open]").count()) === 0 ? null : "Rückfrage");
    // geänderte Eingabe, dann wieder wie gespeichert: keine Rückfrage
    await page.click('.es-thema[data-es-thema="vorlagen"]'); await warte(page, 300);
    await oeffneArt(page, "pruefung");
    await page.fill(feld("pruefung", "text"), "anders"); await page.fill(feld("pruefung", "text"), STD("pruefung").text);
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    pruefe("V6g", "Eingabe zurück auf den gespeicherten Stand: keine Rückfrage mehr", (await page.locator("dialog[open]").count()) === 0 ? null : "Rückfrage");
    // Einstellungen woanders geändert (ke:geladen): ohne Eingabe wird neu gezeichnet
    await page.click('.es-thema[data-es-thema="vorlagen"]'); await warte(page, 300);
    await page.evaluate(async () => { await window.KE.setze(supa, S.fsId, "vorlagen.zahlung_offen", { text: "Von jemand anderem.", text_eltern: "Auch." }); });
    await warte(page, 300);
    pruefe("V6h", "KE ändert sich von außen (ke:geladen), keine Eingabe: Marke „geändert“ erscheint von selbst", (await page.locator('[data-esv-marken="zahlung_offen"]').innerText()).trim() === "geändert" ? null : await page.locator('[data-esv-marken="zahlung_offen"]').innerText());
    pruefe("V12e", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V7 nur lesen (Hook: Thema direkt ohne Schreibrecht zeichnen) und V11 Rollen
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1" });
    await page.evaluate(() => {
      const t = window.BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === "vorlagen");
      const d = document.createElement("div"); d.id = "nurlesen"; document.body.appendChild(d);
      t.render(d, { sb: supa, fahrschuleId: S.fsId, rolle: "buero", darfSchreiben: false, meldung() {} });
      document.querySelector('#nurlesen [data-esv-kopf="pruefung"]').click();
    });
    await warte(page, 200);
    const r = await page.evaluate(() => { const d = document.getElementById("nurlesen"); return { felder: [...d.querySelectorAll("textarea")].map((x) => x.disabled), speichern: d.querySelectorAll("[data-esv-speichern]").length, platz: d.querySelectorAll("[data-esv-platz]").length, std: d.querySelectorAll("[data-esv-standard]").length, hinweis: d.querySelector(".es-fuss").textContent, vorschau: !!d.querySelector("[data-esv-vorschau] .esv-satz").textContent }; });
    pruefe("V7", "ohne Schreibrecht: Felder gesperrt, kein Speichern/Platzhalter/Standard-Knopf, Hinweis „Ändern dürfen Büro, Leitung und Super-Admin.“, Vorschau da", r.felder.length === 2 && r.felder.every(Boolean) && !r.speichern && !r.platz && !r.std && /Ändern dürfen Büro, Leitung und Super-Admin\./.test(r.hinweis) && r.vorschau ? null : JSON.stringify(r));
    pruefe("V11a", "Büro (bu-1) sieht das Thema und darf speichern", (await themenListe(page)).includes("Nachrichten-Vorlagen") && (await page.locator("[data-esv-speichern]").count()) === 1 ? null : "fehlt");
    pruefe("V12f", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
    const s = await oeffne({ nutzer: "sa-1" });
    pruefe("V11b", "Super-Admin sieht das Thema", (await themenListe(s.page)).includes("Nachrichten-Vorlagen") && (await s.page.locator("[data-esv-speichern]").count()) === 1 ? null : "fehlt");
    await s.ctx.close();
  }

  // V8 Platzhalter-Knopf
  {
    const { page, ctx, konsole } = await oeffne();
    await oeffneArt(page, "reaktivierung_bald");
    const knoepfe = await page.$$eval("[data-esv-platz]", (l) => l.map((b) => b.textContent));
    pruefe("V8a", "Knöpfe = erlaubte Platzhalter dieser Vorlage ({Vorname} {Datum} {Tage} {Betrag} {Fahrschule})", knoepfe.join(" ") === STD("reaktivierung_bald").platzhalter.map((p) => "{" + p + "}").join(" ") ? null : knoepfe.join(" "));
    await page.fill(feld("reaktivierung_bald", "text"), "Anfang Ende");
    await page.evaluate(() => { const t = document.querySelector("#esv-reaktivierung_bald-text"); t.focus(); t.setSelectionRange(7, 7); });
    await page.click('[data-esv-platz="Tage"]'); await warte(page, 100);
    pruefe("V8b", "Klick fügt an der Cursor-Stelle ein („Anfang {Tage}Ende“), Fokus bleibt im Feld", (await page.inputValue(feld("reaktivierung_bald", "text"))) === "Anfang {Tage}Ende" && (await page.evaluate(() => document.activeElement.id)) === "esv-reaktivierung_bald-text" ? null : await page.inputValue(feld("reaktivierung_bald", "text")));
    pruefe("V8c", "Vorschau zeigt „… 20Ende“ (Tage = 20) und Marke „nicht gespeichert“", /^Anfang 20Ende$/.test(await page.locator(".esv-satz").innerText()) && /nicht gespeichert/.test(await page.locator('[data-esv-marken="reaktivierung_bald"]').innerText()) ? null : await page.locator(".esv-satz").innerText());
    await page.click(feld("reaktivierung_bald", "text_eltern")); await page.keyboard.press("Control+Home");
    await page.click('[data-esv-platz="Vorname"]'); await warte(page, 100);
    pruefe("V8d", "zuletzt fokussiertes Feld (Eltern) bekommt den Platzhalter am Anfang, das andere bleibt", (await page.inputValue(feld("reaktivierung_bald", "text_eltern"))).startsWith("{Vorname}") && (await page.inputValue(feld("reaktivierung_bald", "text"))) === "Anfang {Tage}Ende" ? null : await page.inputValue(feld("reaktivierung_bald", "text_eltern")));
    pruefe("V12g", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V9 Handy und quer, Tablet, PC: nichts ragt heraus, Tippflächen
  for (const [b, h] of [[360, 740], [412, 740], [740, 360], [820, 1100], [1366, 900]]) {
    const { page, ctx, konsole } = await oeffne({ breite: b, hoehe: h, hash: b < 900 ? "#einstellungen" : "#einstellungen?thema=vorlagen" });
    if (b < 900) { await page.click('.es-thema[data-es-thema="vorlagen"]'); await warte(page, 400); }
    const pruefeLayout = async (wann) => page.evaluate(() => {
      const wi = window.innerWidth;
      const sichtbar = (e) => e.offsetParent !== null;
      const ueber = [...document.querySelectorAll("#esBox *")].filter((e) => sichtbar(e) && e.getBoundingClientRect().right > wi + 1).map((e) => e.className || e.tagName);
      const klein = [...document.querySelectorAll("#esBox button, #esBox textarea")].filter((e) => sichtbar(e) && e.getBoundingClientRect().height < 44).map((e) => (e.className || e.tagName) + ":" + Math.round(e.getBoundingClientRect().height));
      const schmal = [...document.querySelectorAll("#esBox [data-esv-platz]")].filter((e) => e.getBoundingClientRect().width < 44).length;
      const font = [...document.querySelectorAll("#esBox textarea")].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length;
      return { breit: document.documentElement.scrollWidth - wi, ueber, klein, schmal, font };
    });
    let r = await pruefeLayout();
    pruefe(`V9a ${b}x${h}`, "Liste: nichts ragt heraus, kein seitliches Wischen, alle Zeilen ≥ 44 px", r.breit <= 0 && !r.ueber.length && !r.klein.length ? null : JSON.stringify(r));
    await page.click('[data-esv-kopf="erinnerung_umschreiber"]'); await warte(page, 250);
    await page.click('[data-esv-an="eltern"]'); await warte(page, 100);
    r = await pruefeLayout();
    const k = await page.evaluate(() => { const ed = document.querySelector(".esv-editor").getBoundingClientRect(), p = document.querySelector(".esv-mail").getBoundingClientRect(), f = document.querySelector(".es-inhalt").getBoundingClientRect(); return { editorImKasten: ed.left >= f.left - 1 && ed.right <= f.right + 1, mailImKasten: p.right <= f.right + 1 }; });
    pruefe(`V9b ${b}x${h}`, "Vorlage offen (längster Text): nichts ragt heraus, Knöpfe/Felder ≥ 44 px, Schrift ≥ 16 px, alles im Kasten", r.breit <= 0 && !r.ueber.length && !r.klein.length && r.schmal === 0 && r.font === 0 && k.editorImKasten && k.mailImKasten ? null : JSON.stringify([r, k]));
    await page.fill(feld("erinnerung_umschreiber", "text"), "Sehr" + "langeswortohneleerzeichen".repeat(8) + " {Unbekannt} und {Datum}");
    r = await pruefeLayout();
    pruefe(`V9c ${b}x${h}`, "sehr langes Wort und Hinweise: nichts ragt heraus", r.breit <= 0 && !r.ueber.length ? null : JSON.stringify(r));
    pruefe(`V12 ${b}x${h}`, "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // V10 dunkel
  {
    const { page, ctx, konsole } = await oeffne({ dunkel: true, breite: 412, hoehe: 800, hash: "#einstellungen" });
    await page.click('.es-thema[data-es-thema="vorlagen"]'); await warte(page, 300);
    await oeffneArt(page, "pruefung");
    await page.fill(feld("pruefung", "text"), "Bitte {Quatsch}");
    const r = await page.evaluate(() => {
      const hell = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
      const ta = document.querySelector("#esv-pruefung-text"), mail = document.querySelector(".esv-mail"), w = document.querySelector('[data-esv-warn="text"]'), card = document.querySelector(".es-inhalt");
      const cs = getComputedStyle(ta), ms = getComputedStyle(mail), ws = getComputedStyle(w);
      return { ta: [hell(cs.backgroundColor), hell(cs.color)], mail: [hell(ms.backgroundColor), hell(ms.color)], warn: hell(ws.color), karte: hell(getComputedStyle(card).backgroundColor), auto: hell(getComputedStyle(document.querySelector(".esv-auto")).color) };
    });
    pruefe("V10", "dunkel: Feld und Vorschau dunkel mit hellem Text, Hinweis lesbar, graue Zeile hell genug", r.ta[0] < 80 && r.ta[1] > 170 && r.mail[0] < 80 && r.mail[1] > 170 && r.warn > 170 && r.auto > 120 ? null : JSON.stringify(r));
    pruefe("V12h", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // Gegenprobe: ohne das Thema (Skript blockiert) muss V1 rot werden
  {
    const daten = bauDaten(new Date().toISOString().slice(0, 10));
    const c = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const p = await c.newPage(); c.setDefaultTimeout(8000);
    await p.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
    await p.route(/buero-vorlagen\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: "/* Gegenprobe: Thema fehlt */" }));
    await p.addInitScript(([d]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "ad-1", email: "a@example.org" } } }; }, [daten]);
    await p.goto(basis + "buero.html#einstellungen?thema=vorlagen"); await warte(p, 800);
    if (await p.$("#wer:not([hidden])")) { await p.click('#werListe button:has-text("Paula Muster")'); await p.keyboard.type("7352", { delay: 20 }); await warte(p, 500); }
    const fehlt = (await p.locator("[data-esv-art]").count()) === 0 && /Hier kommt bald/.test(await p.locator("#esBox").innerText());
    pruefe("V13", "Gegenprobe: ohne buero-vorlagen.js zeigt sich der Platzhalter und es gibt keine Vorlagen (die Prüfungen oben würden rot)", fehlt ? null : "Thema trotzdem da");
    await c.close();
  }
} finally {
  await browser.close(); server.close();
}
console.log(`\n${ok} ok, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
