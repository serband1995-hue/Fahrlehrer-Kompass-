// Werkstatt 12: „Büro (keine Provision)“ bei „Verkauf erfassen“ – nie eine Provision ans Büro.
// Prüft: eigene ID + Name + Kennzeichen beim Anlegen, keine Provision in der Summe, Anzeige, Kennzeichen bleibt
// beim Bezahlen/Zurücknehmen, normaler Fahrlehrer unverändert, gemeinsame Hilfsfunktion in Büro und App.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/verkauf-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
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
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");

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

const T = (page) => page.evaluate(() => window.__FAKE.tabellen);

// 1) Anlegen mit „Büro (keine Provision)“
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#verkaeufe", breite: 1920, hoehe: 1080 });
  const vorProv = await page.evaluate(() => window.__FAKE.tabellen.provisionen.length);
  const profilName = await page.evaluate(() => (window.__FAKE.tabellen.profiles.find((p) => p.id === "bu-1") || {}).name);
  await page.click("#vNeu");
  await page.waitForSelector("dialog[open] select[name=schueler_id]");
  const wert = await page.evaluate(() => {
    const o = [...document.querySelectorAll("dialog[open] select[name=schueler_id] option")].find((x) => x.value === "s1");
    return o ? o.value : [...document.querySelectorAll("dialog[open] select[name=schueler_id] option")][1].value;
  });
  await page.selectOption("dialog[open] select[name=schueler_id]", wert);
  const opt = await page.$eval("dialog[open] select[name=fahrlehrer_id]", (s) => s.options[0].textContent);
  if (opt !== "Büro (keine Provision)") fehler("Auswahl heißt nicht „Büro (keine Provision)“: " + opt);
  await page.click("dialog[open] button[value=ok]");
  await page.waitForTimeout(400);
  const tab = await T(page);
  const neu = tab.fahrschule_empfehlungen.find((e) => e.schueler_id === wert && e.fahrlehrer_id === "bu-1");
  if (!neu) fehler("1: Eintrag mit der eigenen ID (bu-1) wurde nicht angelegt");
  else {
    if (!neu.fahrlehrer_name) fehler("1: fahrlehrer_name leer");
    else if (profilName && neu.fahrlehrer_name !== profilName) fehler(`1: Name ${neu.fahrlehrer_name} statt Profilname ${profilName}`);
    if (!neu.aufteilung || neu.aufteilung.keine_provision !== true) fehler("1: Kennzeichen keine_provision fehlt: " + JSON.stringify(neu.aufteilung));
    // 2) Anzeige
    const zeile = await page.evaluate((id) => { const b = document.querySelector(`[data-vbezahlt="${id}"]`); return b ? b.closest("tr").textContent : ""; }, neu.id);
    if (!/Büro \(keine Provision\)/.test(zeile)) fehler("2: Anzeige zeigt nicht „Büro (keine Provision)“: " + zeile.slice(0, 120));
    if (profilName && zeile.includes(profilName)) fehler("2: Anzeige nennt den Büro-Nutzer: " + zeile.slice(0, 120));
    // 3) Bezahlt setzen: Kennzeichen bleibt, keine Provision, Hinweis statt Aufteilung
    await page.click(`[data-vbezahlt="${neu.id}"]`);
    await page.waitForSelector("#vSplit");
    const hinweis = await page.textContent("#vSplit");
    if (!/keine Provision/.test(hinweis)) fehler("3: Bezahlt-Fenster nennt keine „keine Provision“: " + hinweis);
    await page.click("dialog[open] button[value=ok]");
    await page.waitForTimeout(400);
    let e = (await T(page)).fahrschule_empfehlungen.find((x) => x.id === neu.id);
    if (e.status !== "bezahlt" || e.aufteilung.keine_provision !== true) fehler("3: bezahlt verliert das Kennzeichen: " + JSON.stringify(e));
    if (e.aufteilung.fahrlehrer != null) fehler("3: bezahlt berechnet eine Provision: " + JSON.stringify(e.aufteilung));
    // 4) Zurücknehmen -> Kennzeichen bleibt; Wieder öffnen -> Bezahlt: weiter keine Provision
    await page.click(`[data-vstorno="${neu.id}"]`); await page.waitForTimeout(200);
    await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
    e = (await T(page)).fahrschule_empfehlungen.find((x) => x.id === neu.id);
    if (e.status !== "storniert" || !e.aufteilung || e.aufteilung.keine_provision !== true) fehler("4: Zurücknehmen verliert das Kennzeichen: " + JSON.stringify(e));
    await page.click(`[data-vwieder="${neu.id}"]`); await page.waitForTimeout(400);
    await page.click(`[data-vbezahlt="${neu.id}"]`); await page.waitForSelector("#vSplit");
    await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  }
  const nachT = await T(page);
  if (nachT.provisionen.length !== vorProv) fehler(`5: Provisionen ${vorProv} -> ${nachT.provisionen.length}: Büro-Verkauf hat Provision gebucht`);
  if (nachT.provisionen.some((p) => p.fahrlehrer_id === "bu-1")) fehler("5: Provision für den Büro-Nutzer gebucht");
  // 5) Summe je Fahrlehrer: keine Zeile für den Büro-Nutzer
  const provKarte = await page.evaluate(() => { const k = [...document.querySelectorAll(".karte")].find((x) => /Offene Provisionen/.test(x.textContent)); return k ? k.textContent : ""; });
  if (profilName && provKarte.includes(profilName)) fehler("5: Offene Provisionen nennt den Büro-Nutzer");
  // Filter nach Fahrlehrer: Büro-Nutzer taucht nicht unter einem Fahrlehrer auf
  if (konsole.length) fehler("Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 6) Normaler Fahrlehrer bleibt unverändert: Bezahlt bucht Provision, Aufteilung wie bisher
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#verkaeufe", breite: 1920, hoehe: 1080 });
  await page.click('[data-vbezahlt="e1"]'); await page.waitForSelector("#vSplit table");
  await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  const t = await T(page);
  const e1 = t.fahrschule_empfehlungen.find((e) => e.id === "e1");
  if (e1.aufteilung.fahrlehrer !== 15 || e1.aufteilung.keine_provision) fehler("6: normale Aufteilung verändert: " + JSON.stringify(e1.aufteilung));
  if (t.provisionen.filter((p) => p.fahrlehrer_id === "fl-1" && p.status === "offen").length !== 2) fehler("6: Provision für fl-1 nicht gebucht");
  const z = await page.evaluate(() => document.querySelector('[data-vbezahlt="e1"]') ? "noch offen" : [...document.querySelectorAll("tr")].find((r) => /Anton Muster/.test(r.textContent)).textContent);
  if (!/von Anton Muster/.test(z)) fehler("6: Anzeige „von Anton Muster“ fehlt: " + z.slice(0, 100));
  // alter Eintrag ohne Fahrlehrer-ID: ebenfalls „keine Provision“
  if (konsole.length) fehler("6: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 7) Hilfsfunktion in Büro und App gleich
{
  const quelle = async (datei, ab) => {
    const s = await readFile(join(ROOT, datei), "utf8");
    const i = s.indexOf(ab); if (i < 0) throw new Error(datei + ": istKeineProvision fehlt");
    return s.slice(i, s.indexOf("\n", i));
  };
  const f1 = await quelle("buero.js", "function istKeineProvision");
  const f2 = await quelle("index.html", "function istKeineProvision");
  for (const [name, code] of [["buero.js", f1], ["index.html", f2]]) {
    const f = new Function(code + "; return istKeineProvision;")();
    const faelle = [
      [{ fahrlehrer_id: "x", aufteilung: { keine_provision: true } }, true],
      [{ fahrlehrer_id: null }, true], [{}, true],
      [{ fahrlehrer_id: "x", aufteilung: null }, false],
      [{ fahrlehrer_id: "x", aufteilung: { fahrlehrer: 15, fahrschule: 45 } }, false],
      [{ fahrlehrer_id: "x", aufteilung: { keine_provision: false } }, false],
    ];
    for (const [e, soll] of faelle) if (f(e) !== soll) fehler(`7: istKeineProvision in ${name} bei ${JSON.stringify(e)} ist ${f(e)}`);
  }
}

await browser.close(); server.close();
console.log(probleme ? `${probleme} Fehler` : "Verkauf-Test: alles gut");
process.exit(probleme ? 1 : 0);
