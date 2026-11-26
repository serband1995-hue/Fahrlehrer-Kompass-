// W20 Teil 4: Durchfallgründe und Verschiebungs-Verlauf auf der Büro-Seite, im Vorführmodus (erfundene Daten).
// Prüft: Zahlen und Balken der Durchfallgründe, Filter (Zeitraum, Fahrlehrer), gleiche Beschriftungen wie die App
// (kompass-fehler.js), Verlauf mit Namen und „— Pool —“, leerer Verlauf, alle Rollen (Büro mit/ohne Verwalten, Leitung, Super-Admin),
// schmale Fenster ohne seitliches Wischen.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buero-auswertung-test.mjs [ordner-fuer-fotos]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FOTOS = process.argv[2] || null;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const HEUTE = new Date().toISOString().slice(0, 10);

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
if (FOTOS) await mkdir(FOTOS, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); // GitHub: eigener Browser, hier: vorinstalliert
let probleme = 0;
function fehler(text) { probleme++; console.log("FEHLER:", text); }

async function oeffne({ nutzer, breite = 1366, hoehe = 860, hash = "", dunkel = false, vorbereiten, wer = "Paula Muster", uhr }) {
  const daten = bauDaten(HEUTE);
  const session = nutzer ? { user: { id: nutzer, email: nutzer + "@example.org" } } : null;
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? "dark" : "light" });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    if (v) (new Function("F", v))(window.__FAKE);
  }, [daten, session, vorbereiten ? vorbereiten.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "") : ""]);
  if (uhr) await page.clock.install({ time: new Date(uhr) }); // Uhrzeit fest vorgeben (läuft ab da weiter)
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  // Gemeinsamer Büro-Zugang: „Wer bedient gerade?“ beantworten (Super-Admin wird nicht gefragt)
  if (wer && nutzer) {
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) { await meldePinAn(page, wer); }
  }
  return { page, ctx, konsole };
}
// Büro-Personen der Attrappe und ihre PINs (erfunden, siehe buero-vorfuehrung.js)
const TEST_PIN = { "Mia Muster": "5917", "Noah Muster": "2846", "Paula Muster": "7352" };
async function meldePinAn(page, name, pin) {
  await page.click(`#werListe button:has-text("${name}")`);
  await page.keyboard.type(pin || TEST_PIN[name], { delay: 20 });
  await page.waitForTimeout(150);
}
// „Eingaben verwerfen?“ im obersten Fenster mit Ja beantworten
async function verwerfenJa(page) {
  await page.locator("dialog[open]").last().locator("button[value=ok]").click();
  await page.waitForTimeout(150);
}

const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).textContent || "", sel);
async function breiteOk(page, name) {
  const w = await page.evaluate(() => document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth + 1);
  if (w) fehler(`${name}: Seite ist seitlich wischbar`);
}
const { FAULT_LABEL } = require("../kompass-fehler.js");

// 1) Eine gemeinsame Liste: App und Büro laden sie, keine zweite Kopie in index.html / buero.js
{
  const idx = await readFile(join(ROOT, "index.html"), "utf8"), bue = await readFile(join(ROOT, "buero.html"), "utf8"), bjs = await readFile(join(ROOT, "buero.js"), "utf8");
  if (!/<script src="kompass-fehler\.js"><\/script>/.test(idx)) fehler("index.html lädt kompass-fehler.js nicht");
  if (!/<script src="kompass-fehler\.js"><\/script>/.test(bue)) fehler("buero.html lädt kompass-fehler.js nicht");
  if (/const FAULT_LABEL\s*=|const FAULTS\s*=/.test(idx) || /const FAULT_LABEL\s*=|const FAULTS\s*=/.test(bjs)) fehler("zweite Kopie der Fehler-Liste");
  if (!/kompass-fehler\.js/.test(await readFile(join(ROOT, "sw.js"), "utf8"))) fehler("sw.js hat kompass-fehler.js nicht im Cache");
  if (Object.keys(FAULT_LABEL).length < 25) fehler("FAULT_LABEL zu kurz");
}

// 2) Statistik verweist auf beide Seiten
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#zahlen" });
  const links = await page.evaluate(() => [...document.querySelectorAll("#awKarte a")].map((a) => a.getAttribute("href")));
  if (links.join() !== "#fehler,#verlauf") fehler("Statistik: Links zu den neuen Seiten fehlen: " + links.join());
  if (konsole.length) fehler("Konsole (Statistik): " + konsole.join(" | "));
  await ctx.close();
}

// 3) Durchfallgründe: Zahlen, Beschriftungen, Filter
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fehler", breite: 1366, hoehe: 900 });
  if (await text(page, "#titel") !== "Durchfallgründe") fehler("Titel: " + await text(page, "#titel"));
  const balken = () => page.evaluate(() => [...document.querySelectorAll(".hb-zeile")].map((z) => [z.querySelector(".hb-name").textContent, z.querySelector(".hb-wert").textContent]));
  let b = await balken();
  const erst = b[0] || [];
  if (erst[0] !== FAULT_LABEL.io_beob || erst[1] !== "3×") fehler("häufigster Grund: " + JSON.stringify(erst));
  const namen = b.map((x) => x[0]);
  for (const id of ["io_vorfahrt", "gf_park", "be_schalt"]) if (!namen.includes(FAULT_LABEL[id])) fehler("Grund fehlt: " + id);
  if (namen.includes(FAULT_LABEL.t_speed)) fehler("Durchfall älter als 12 Monate zählt mit");
  if (b.length !== 4) fehler("Anzahl Gründe " + b.length);
  const kach = await page.evaluate(() => [...document.querySelectorAll(".kachel .wert")].map((e) => e.textContent).join());
  if (kach !== "5,4,8") fehler("Kacheln: " + kach);
  await breiteOk(page, "fehler 1366");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "fehler-1366.png"), fullPage: true });
  // Zeitraum „alles“
  await page.selectOption("#awZeit", "alle"); await page.waitForTimeout(200);
  b = await balken();
  if (!b.some((x) => x[0] === FAULT_LABEL.t_speed)) fehler("„alles“ zeigt den alten Durchfall nicht");
  if (!/zeit=alle/.test(page.url())) fehler("Filter nicht in der Adresse: " + page.url());
  // Fahrlehrer Anton (fl-1): io_beob 2× (ohne den alten), io_vorfahrt 1×
  await page.selectOption("#awZeit", "12"); await page.waitForTimeout(150);
  await page.selectOption("#awLehrer", "fl-1"); await page.waitForTimeout(200);
  b = await balken();
  if (b.length !== 2 || b[0][1] !== "2×" || b[1][1] !== "1×") fehler("Filter Anton: " + JSON.stringify(b));
  if (!/Anton Muster/.test(await text(page, "#ansicht"))) fehler("Filtername fehlt im Text");
  // Fahrlehrer ohne Durchfall: freundlicher Text
  await page.selectOption("#awLehrer", "fl-4"); await page.waitForTimeout(200);
  if (!/Noch keine Durchfälle erfasst/.test(await text(page, "#ansicht"))) fehler("kein Text bei leerem Filter");
  if (konsole.length) fehler("Konsole (fehler): " + konsole.join(" | "));
  await ctx.close();
}

// 4) Verschiebungs-Verlauf
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#verlauf", breite: 1366, hoehe: 900 });
  await page.waitForTimeout(200);
  if (await text(page, "#titel") !== "Verschiebungen") fehler("Titel Verlauf: " + await text(page, "#titel"));
  const zeilen = await page.evaluate(() => [...document.querySelectorAll("#awVerlauf tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim().replace(/\s+/g, " "))));
  if (zeilen.length !== 4) fehler("Zeilen im Verlauf: " + zeilen.length);
  else {
    if (!/Anton Muster → Berta Muster/.test(zeilen[0][2]) || zeilen[0][3] !== "Büro Muster") fehler("neuester Eintrag: " + JSON.stringify(zeilen[0]));
    if (!/— Pool — → Cem Muster/.test(zeilen[1][2]) || zeilen[1][3] !== "Leitung Muster") fehler("Pool als Quelle: " + JSON.stringify(zeilen[1]));
    if (!/Berta Muster → — Pool —/.test(zeilen[2][2])) fehler("Pool als Ziel: " + JSON.stringify(zeilen[2]));
    if (!/nicht mehr da/.test(zeilen[3][1]) || zeilen[3][3] !== "–") fehler("gelöschter Schüler: " + JSON.stringify(zeilen[3]));
  }
  await breiteOk(page, "verlauf 1366");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "verlauf-1366.png"), fullPage: true });
  if (konsole.length) fehler("Konsole (Verlauf): " + konsole.join(" | "));
  await ctx.close();
}

// 5) Verlauf leer (Migration noch nicht eingespielt: die Datenbank liefert eine leere Liste) und Lesefehler
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#verlauf", vorbereiten: function () { F.tabellen.schueler_verschiebungen = []; } });
  await page.waitForTimeout(200);
  const t = await text(page, "#ansicht");
  if (!/Noch keine Verschiebungen\./.test(t)) fehler("leerer Verlauf ohne freundlichen Text: " + t.slice(0, 120));
  if (/konnte nicht geladen|Fehler|Nochmal/.test(t)) fehler("leerer Verlauf zeigt einen Fehler");
  if (konsole.length) fehler("Konsole (Verlauf leer): " + konsole.join(" | "));
  await ctx.close();
  const f = await oeffne({ nutzer: "bu-1", hash: "#verlauf", vorbereiten: function () { F.fehler = { schueler_verschiebungen: "kaputt" }; } });
  await f.page.waitForTimeout(200);
  if (!/konnte nicht geladen werden/.test(await text(f.page, "#ansicht"))) fehler("Lesefehler wird nicht gemeldet");
  await f.ctx.close();
}

// 6) Rollen: Büro ohne und mit Verwalten-Recht, Leitung, Super-Admin sehen beide Seiten und die Karte in der Statistik
for (const [nutzer, wer, name] of [["bu-1", "Paula Muster", "Büro ohne Verwalten"], ["bu-1", "Mia Muster", "Büro mit Verwalten"], ["ad-1", null, "Leitung"], ["sa-1", null, "Super-Admin"]]) {
  for (const seite of ["fehler", "verlauf"]) {
    const { page, ctx, konsole } = await oeffne({ nutzer, wer, hash: "#" + seite });
    await page.waitForTimeout(200);
    const ok = await page.evaluate((s) => !!document.querySelector(s === "fehler" ? ".hb-zeile" : "#awVerlauf tbody tr"), seite);
    if (!ok) fehler(`${name}: #${seite} zeigt nichts`);
    if (konsole.length) fehler(`${name} #${seite}: Konsole: ${konsole.join(" | ")}`);
    await ctx.close();
  }
  const { page, ctx } = await oeffne({ nutzer, wer, hash: "#zahlen" });
  if (!(await page.isVisible("#awKarte"))) fehler(`${name}: Karte „Weitere Auswertungen“ fehlt`);
  await ctx.close();
}

// 7) Schmale Fenster (Handy-Breite, Tablet) ohne seitliches Wischen
for (const breite of [360, 412, 768, 1024]) {
  for (const seite of ["fehler", "verlauf"]) {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#" + seite, breite, hoehe: 800 });
    await page.waitForTimeout(200);
    await breiteOk(page, `${seite}@${breite}`);
    if (FOTOS && breite === 360) await page.screenshot({ path: join(FOTOS, `${seite}-360.png`), fullPage: true });
    if (konsole.length) fehler(`${seite}@${breite}: Konsole: ${konsole.join(" | ")}`);
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(probleme ? `Büro-Auswertung-Test: ${probleme} Problem(e).` : "Büro-Auswertung-Test: alles in Ordnung.");
process.exit(probleme ? 1 : 0);
