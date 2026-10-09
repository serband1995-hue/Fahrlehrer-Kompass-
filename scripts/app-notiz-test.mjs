// Test der Büro-Notizen in der Fahrlehrer-App (index.html): Popup, „Gelesen“, Hinweis in der Akte, Stopp-Rückfrage.
// Die Datenbank wird nicht angesprochen: getSupa() wird durch eine Attrappe ersetzt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/app-notiz-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let probleme = 0;
const fehler = (t) => { probleme++; console.log("FEHLER:", t); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const konsole = [];
page.on("pageerror", (e) => konsole.push(String(e)));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.goto(basis + "index.html");
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__upserts = [];
  window.getSupa = () => ({ from: () => ({ upsert: async (rows) => { window.__upserts.push(rows); return { error: null }; } }) });
  _authUser = { id: "fl-1" };
  DB.students = [{ id: "s1", name: "Test <Schüler>" }];
  _bueroNotizen = { s1: [
    { id: "n1", schueler_id: "s1", text: "Reaktivierung offen <b>bitte</b> keine Fahrstunden", art: "stopp", gelesen: false, erstellt_am: new Date().toISOString(), bearbeiter: "Kristina" },
    { id: "n2", schueler_id: "s1", text: "Bitte Telefonnummer prüfen", art: "info", gelesen: false, erstellt_am: new Date().toISOString(), bearbeiter: "Jelena" },
  ] };
  zeigeBueroNotizPopup();
});
if (!(await page.isVisible("#bueroNotizPopup"))) fehler("Popup erscheint nicht");
const text = await page.textContent("#bueroNotizPopup");
if (!/STOPP/.test(text) || !/Test <Schüler>/.test(text) || !/Kristina/.test(text)) fehler("Popup-Text unvollständig: " + text.slice(0, 200));
if (await page.$("#bueroNotizPopup b")) fehler("Popup: HTML aus der Notiz wurde nicht maskiert");
const px = await page.evaluate(() => { const k = document.querySelector("#bueroNotizPopup > div").getBoundingClientRect(); return [k.left, k.right, innerWidth]; });
if (px[0] < 0 || px[1] > px[2]) fehler("Popup ragt aus dem Bildschirm " + px);
await page.click("#bnSpaeter");
if (await page.isVisible("#bueroNotizPopup")) fehler("„Später erinnern“ schließt nicht");
await page.evaluate(() => { _notizSpaeterBis = 0; zeigeBueroNotizPopup(); });
await page.click("#bnGelesen");
await page.waitForTimeout(200);
if (await page.isVisible("#bueroNotizPopup")) fehler("„Gelesen“ schließt nicht");
const gel = await page.evaluate(() => ({ up: window.__upserts.flat().map((r) => r.notiz_id), n: _bueroNotizen.s1.every((n) => n.gelesen) }));
if (gel.up.join() !== "n1,n2" || !gel.n) fehler("„Gelesen“ nicht eingetragen " + JSON.stringify(gel));
await page.evaluate(() => zeigeBueroNotizPopup());
if (await page.isVisible("#bueroNotizPopup")) fehler("Popup erscheint erneut, obwohl gelesen");
const hint = await page.evaluate(() => fristenHinweisHTML("s1"));
if (!/STOPP vom Büro/.test(hint) || !/Bitte Telefonnummer prüfen/.test(hint) || /<b>bitte<\/b>/.test(hint)) fehler("Hinweis in der Akte falsch: " + hint.slice(0, 200));
// Antrag
const antrag = await page.evaluate(() => { _schuelerFristen.s2 = { antrag_am: "2020-01-01" }; return fristenHinweisHTML("s2"); });
if (!/Führerscheinantrag abgelaufen/.test(antrag)) fehler("Antrag-Hinweis fehlt: " + antrag.slice(0, 200));
const inaktiv = await page.evaluate(() => { _schuelerFristen.s3 = { antrag_am: "2020-01-01", inaktiv_seit: "2026-01-01" }; return fristenHinweisHTML("s3"); });
if (/Führerscheinantrag/.test(inaktiv)) fehler("Inaktiver Schüler bekommt Antrag-Hinweis");
if (konsole.length) fehler("Konsole: " + konsole.join(" | "));
await browser.close(); server.close();
console.log(probleme ? `App-Notiz-Test: ${probleme} Problem(e).` : "App-Notiz-Test: alles in Ordnung.");
process.exit(probleme ? 1 : 0);
