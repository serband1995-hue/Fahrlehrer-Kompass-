// W19 Teil 2: Zahlungsbelege im Büro (Attrappe der Datenbank, erfundene Daten, nichts verlässt den Browser).
// Prüft: Einstellungen (Kopf, Steuer Standard aus, Bargeld-Schalter Standard AUS mit Hinweis), neuer Beleg (Nummer 1, Name vom
// Server, Druck mit Kopf), Bargeld gesperrt bis eingeschaltet, Storno als Gegenbeleg, Knopf „Beleg“ in der Schülerliste,
// Fahrlehrer ohne Zugang, keine JS-Fehler, nichts seitlich wischbar bei 1024/1366 px.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/belege-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const HEUTE = new Date().toISOString().slice(0, 10);
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const TEST_PIN = { "Paula Muster": "7352" };
async function oeffne(nutzer, hash, breite = 1366) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; },
    [bauDaten(HEUTE), { user: { id: nutzer, email: nutzer + "@example.org" } }]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type(TEST_PIN["Paula Muster"], { delay: 20 }); await page.waitForTimeout(200); }
  await page.waitForTimeout(300);
  return { page, ctx, konsole };
}
const okKlick = async (page) => { await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await page.waitForTimeout(250); };
const wischbar = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ? "seitlich wischbar: " + document.documentElement.scrollWidth : null);
const tab = (page) => page.evaluate(() => window.__FAKE.tabellen.zahlungsbelege || []);

try {
  // ---------- Büro ----------
  const { page, ctx, konsole } = await openBuero();
  async function openBuero() { return oeffne("bu-1", "#einstellungen?thema=belege"); }
  await page.waitForSelector("#belegEinst", { timeout: 4000 });
  const einst = await page.evaluate(() => { const f = document.getElementById("belegEinst"); return { bar: f.elements.bargeld.checked, steuer: f.elements.ausweisen.checked, text: f.textContent.replace(/\s+/g, " ") }; });
  await pruefe("E1", "Einstellungen: Bargeld und Steuerausweis Standard AUS, Hinweis § 146a AO steht da", () => [einst.bar && "Bargeld an", einst.steuer && "Steuer an",
    !einst.text.includes("Bargeld-Belege aus dem Kompass können als elektronische Kasse gelten (Kassensicherungsverordnung, § 146a AO). Vor dem Einschalten mit dem Steuerberater klären.") && "Hinweis fehlt"].filter(Boolean));
  await page.fill("#belegEinst [name=anschrift]", "Musterweg 1\n12345 Musterstadt");
  await page.fill("#belegEinst [name=steuernummer]", "12/345/67890");
  await page.click("#belegEinst button[type=submit]"); await page.waitForTimeout(400);
  const kopf = await page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).find((e) => e.schluessel === "beleg.fahrschule"));
  await pruefe("E2", "Kopf gespeichert (beleg.fahrschule)", () => (kopf && kopf.wert.steuernummer === "12/345/67890" ? null : JSON.stringify(kopf)));
  await pruefe("E3", "Einstellungen: nicht seitlich wischbar", () => wischbar(page));

  // Neuer Beleg
  await page.goto(basis + "buero.html#belege"); await page.waitForTimeout(700);
  const frage = await page.$("#wer:not([hidden])");
  if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type("7352", { delay: 20 }); await page.waitForTimeout(300); }
  await page.waitForSelector("#belegNeu", { timeout: 4000 });
  await pruefe("B1", "Reiter „Belege“ unter Zahlungen, Liste leer", () => page.evaluate(() => [!/Belege/.test((document.querySelector(".zahl-reiter") || {}).textContent || "") && "kein Reiter", !/Noch keine Belege/.test(document.getElementById("ansicht").textContent) && "nicht leer"].filter(Boolean)));
  await page.click("#belegNeu"); await page.waitForTimeout(300);
  const barAus = await page.evaluate(() => { const r = document.querySelector("dialog[open] input[name=zahlart][value=bar]"); return r && r.disabled; });
  await pruefe("B2", "Bar im Dialog gesperrt, solange der Schalter aus ist", () => (barAus ? null : "Bar wählbar"));
  await page.selectOption("dialog[open] select[name=schueler]", "s1");
  await page.fill("dialog[open] input[name=betrag]", "45,50");
  await page.fill("dialog[open] input[name=zweck]", "Grundbetrag");
  await okKlick(page); // Beleg erstellen → Rückfrage
  await okKlick(page); // Ja, Beleg erstellen
  await page.waitForTimeout(400);
  let t = await tab(page);
  await pruefe("B3", "Beleg Nr. 1, 45,50 €, EC, Name vom Schüler", () => (t.length === 1 && t[0].nummer === 1 && Number(t[0].betrag) === 45.5 && t[0].zahlart === "ec" && t[0].schueler_name ? null : JSON.stringify(t)));
  const druck = await page.evaluate(() => { const f = document.getElementById("belegDruckRahmen"); return f ? f.contentDocument.body.textContent.replace(/\s+/g, " ") : ""; });
  await pruefe("B4", "Druck: Quittung, Beleg Nr. 1, Steuernummer, Betrag, keine Steuerzeile", () => [!/Quittung/.test(druck) && "kein Titel", !/Beleg Nr\. 1/.test(druck) && "keine Nummer", !/12\/345\/67890/.test(druck) && "keine Steuernummer", !/45,50/.test(druck) && "kein Betrag", /USt/.test(druck) && "Steuerzeile ohne Einstellung"].filter(Boolean));
  // Storno
  await page.click("[data-belegstorno]"); await page.waitForTimeout(250);
  await page.fill("dialog[open] input[name=grund]", "falscher Betrag");
  await okKlick(page); await page.waitForTimeout(300);
  t = await tab(page);
  const s = t.find((x) => x.storno_von);
  await pruefe("B5", "Storno: Gegenbeleg Nr. 2 mit −45,50 €, Original bleibt", () => (t.length === 2 && s && s.nummer === 2 && Number(s.betrag) === -45.5 && /Storno zu Beleg Nr\. 1/.test(s.zweck) ? null : JSON.stringify(t)));
  await pruefe("B6", "Liste: kein „Stornieren“ mehr, Pill „Storno“", () => page.evaluate(() => [document.querySelector("[data-belegstorno]") && "Stornieren noch da", !/Storno/.test(document.getElementById("ansicht").textContent) && "keine Pill"].filter(Boolean)));
  await pruefe("B7", "Belege-Seite: nicht seitlich wischbar", () => wischbar(page));
  // Bargeld einschalten (mit Rückfrage) und Bar-Beleg
  await page.goto(basis + "buero.html#einstellungen?thema=belege"); await page.waitForSelector("#belegEinst", { timeout: 4000 });
  await page.check("#belegEinst [name=bargeld]");
  await page.click("#belegEinst button[type=submit]"); await page.waitForTimeout(250);
  await okKlick(page); await page.waitForTimeout(400);
  const barZ = await page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).find((e) => e.schluessel === "beleg.bargeld"));
  await pruefe("B8", "Bargeld nach Rückfrage eingeschaltet", () => (barZ && barZ.wert.aktiv === true ? null : JSON.stringify(barZ)));
  await page.goto(basis + "buero.html#belege"); await page.waitForSelector("#belegNeu", { timeout: 4000 });
  await page.click("#belegNeu"); await page.waitForTimeout(300);
  await page.selectOption("dialog[open] select[name=schueler]", "s2");
  await page.fill("dialog[open] input[name=betrag]", "120");
  await page.fill("dialog[open] input[name=zweck]", "Fahrstunden");
  await page.check("dialog[open] input[name=zahlart][value=bar]");
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  t = await tab(page);
  await pruefe("B9", "Bar-Beleg Nr. 3", () => (t.length === 3 && t.some((x) => x.nummer === 3 && x.zahlart === "bar") ? null : JSON.stringify(t.map((x) => [x.nummer, x.zahlart]))));
  // Schülerliste: Knopf „Beleg“
  await page.goto(basis + "buero.html#schueler"); await page.waitForTimeout(600);
  await pruefe("B10", "Schülerliste: Knopf „Beleg“", () => page.evaluate(() => (document.querySelector("[data-sbeleg]") ? null : "kein Knopf")));
  await page.click("[data-sbeleg]"); await page.waitForTimeout(400);
  await pruefe("B10", "Knopf „Beleg“ öffnet den Dialog mit gewähltem Schüler", () => page.evaluate(() => { const s = document.querySelector("dialog[open] select[name=schueler]"); return s && s.value ? null : "kein Schüler gewählt"; }));
  await pruefe("B11", "keine JS-Fehler (Büro)", () => konsole.length ? konsole.slice(0, 3).join(" | ") : null);
  await ctx.close();
  // 1024 px
  const b2 = await oeffne("bu-1", "#belege", 1024);
  await b2.page.waitForSelector("#belegNeu", { timeout: 4000 });
  await pruefe("B12", "1024 px: nicht seitlich wischbar", () => wischbar(b2.page));
  await b2.ctx.close();
  // ---------- Fahrlehrer: kein Zugang ----------
  const f = await oeffne("fl-1", "#belege");
  await pruefe("F1", "Fahrlehrer: keine Belege-Seite", () => f.page.evaluate(() => (document.getElementById("belegNeu") || document.querySelector("[data-sbeleg]") ? "sichtbar" : null)));
  await f.ctx.close();
} finally { await browser.close(); server.close(); }
console.log(`\nBelege-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
