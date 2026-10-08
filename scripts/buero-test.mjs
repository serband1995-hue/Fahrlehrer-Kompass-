// Test der Büro-Seite im echten Browser, mit erfundenen Daten statt Datenbank.
// Prüft Anmeldung, Rollen, jeden Bereich bei 1024/1366/1920 px (nichts seitlich wischbar,
// keine Fehler in der Konsole) und speichert Bildschirmfotos.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buero-test.mjs [ordner-fuer-fotos]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { bauDaten } from "./buero-testdaten.mjs";

const require = createRequire(import.meta.url);
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
const fake = await readFile(join(ROOT, "scripts/buero-fake-supabase.js"), "utf8");
if (FOTOS) await mkdir(FOTOS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let probleme = 0;
function fehler(text) { probleme++; console.log("FEHLER:", text); }

async function oeffne({ nutzer, breite = 1366, hoehe = 860, hash = "", dunkel = false, vorbereiten }) {
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
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  return { page, ctx, konsole };
}
async function pruefeBreite(page, name) {
  const r = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const zuBreit = [...document.querySelectorAll("body *")].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.right > w + 1 && getComputedStyle(el).position !== "fixed";
    }).slice(0, 3).map((el) => el.tagName + "." + el.className);
    return { wisch: document.documentElement.scrollWidth > w + 1, zuBreit };
  });
  if (r.wisch) fehler(`${name}: Seite ist seitlich wischbar`);
  if (r.zuBreit.length) fehler(`${name}: über den Rand: ${r.zuBreit.join(", ")}`);
}

// 1) Ohne Sitzung: Anmeldung sichtbar, falsches Passwort meldet Fehler, richtiges öffnet die App
{
  const { page, ctx, konsole } = await oeffne({});
  if (!(await page.isVisible("#loginForm"))) fehler("Anmeldung nicht sichtbar");
  await page.fill("#loginMail", "buero@example.org");
  await page.fill("#loginPw", "falsch");
  await page.click("#loginKnopf");
  await page.waitForTimeout(200);
  if (!/stimmt nicht/.test(await page.textContent("#loginFehler"))) fehler("falsches Passwort ohne Meldung");
  await page.fill("#loginPw", "test1234");
  await page.click("#loginKnopf");
  await page.waitForTimeout(500);
  if (!(await page.isVisible("#app"))) fehler("nach Anmeldung keine App");
  if (konsole.length) fehler("Konsole (Anmeldung): " + konsole.join(" | "));
  await ctx.close();
}

// 2) Rollen und Sperren
for (const [nutzer, erwartet] of [["fl-x", "Nur für das Büro"], ["gesperrt-1", "Zugang gesperrt"], ["agb-1", "Nutzungsbedingungen"]]) {
  const { page, ctx } = await oeffne({ nutzer });
  const titel = await page.textContent("#hinweisTitel").catch(() => "");
  if (titel !== erwartet) fehler(`${nutzer}: erwartet „${erwartet}“, bekommen „${titel}“`);
  if (await page.isVisible("#app")) fehler(`${nutzer}: App trotzdem sichtbar`);
  await ctx.close();
}

// 3) Jeder Bereich bei drei Breiten, hell und dunkel
const bereiche = ["heute", "pruefungen", "fahrchecks", "fristen", "kalender", "schueler", "verkaeufe", "zahlen", "team", "flotte"];
for (const [breite, hoehe] of [[1920, 1080], [1366, 768], [1024, 768]]) {
  for (const b of bereiche) {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", breite, hoehe, hash: "#" + b, dunkel: breite === 1024 });
    await page.waitForTimeout(150);
    const titel = await page.textContent("#titel");
    if (!titel) fehler(`${b}@${breite}: kein Titel`);
    await pruefeBreite(page, `${b}@${breite}`);
    if (konsole.length) fehler(`${b}@${breite}: Konsole: ${konsole.join(" | ")}`);
    if (FOTOS && (breite === 1920 || breite === 1024)) await page.screenshot({ path: join(FOTOS, `${b}-${breite}.png`), fullPage: true });
    await ctx.close();
  }
}

// 4) Fristen: Zahlung erfassen, Bearbeiten-Dialog, Prüfungen der Eingaben
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fristen" });
  const vorher = await page.$$eval("[data-zahlung]", (b) => b.length);
  if (!vorher) fehler("Fristen: keine Zahlungs-Knöpfe in den Testdaten");
  const id = await page.getAttribute("[data-zahlung]", "data-zahlung");
  await page.click(`[data-zahlung="${id}"]`);
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(250);
  const gespeichert = await page.evaluate((sid) => window.__FAKE.tabellen.schueler.find((s) => s.id === sid), id);
  if (gespeichert.reakt_status !== "bezahlt" || !gespeichert.reakt_bezahlt_bis) fehler("Fristen: Zahlung nicht gespeichert");
  // Bearbeiten: „befreit“ ohne Grund muss abgelehnt werden
  await page.click("[data-fristen]");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "fristen-dialog.png") });
  await page.check("dialog input[value=befreit]");
  await page.fill("dialog input[name=reakt_notiz]", "");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(150);
  if (!(await page.isVisible("dialog"))) fehler("Fristen: „befreit“ ohne Grund wurde gespeichert");
  await page.fill("dialog input[name=reakt_notiz]", "Test-Grund");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(250);
  if (await page.isVisible("dialog")) fehler("Fristen: Dialog bleibt nach gültigem Speichern offen");
  // Suche
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=alle");
  await page.waitForTimeout(300);
  const alle = await page.$$eval(".tabelle tbody tr", (r) => r.length);
  await page.fill("#fristenSuche", "Lena");
  await page.waitForTimeout(500);
  const gefiltert = await page.$$eval(".tabelle tbody tr", (r) => r.length);
  if (!(gefiltert > 0 && gefiltert < alle)) fehler(`Fristen: Suche filtert nicht (${alle} → ${gefiltert})`);
  if (konsole.length) fehler("Fristen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// Speichern ohne Berechtigung meldet einen Fehler statt „gespeichert“
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#fristen", vorbereiten: function () { F.fehler = { schueler: "permission denied" }; } });
  await page.waitForTimeout(200);
  // Laden schlägt fehl -> Statusanzeige rot
  const status = await page.getAttribute("#status", "class");
  if (!/fehler/.test(status)) fehler("Fehlerfall: Status nicht rot");
  await ctx.close();
}

// 4b) Prüfungstafel: Haken setzen, planen (mit Kalender), Ergebnis, Großansicht
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#pruefungen", breite: 1920, hoehe: 1080 });
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-tafel.png"), fullPage: true });
  await page.click('[data-id="pt-1"][data-haken="tuev_gutschein"]');
  await page.waitForTimeout(200);
  const pt1 = await page.evaluate(() => window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "pt-1"));
  if (!pt1.tuev_gutschein) fehler("Prüfungstafel: Haken nicht gespeichert");
  await page.click("#pNeu");
  await page.selectOption("dialog select[name=schueler_id]", "s2");
  await page.fill("dialog input[name=von]", "11:30");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-dialog.png") });
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.pruefungstermine.find((p) => p.schueler_id === "s2"));
  if (!neu) fehler("Prüfungstafel: neue Prüfung nicht gespeichert");
  else {
    if (!neu.fahrlehrer_id) fehler("Prüfungstafel: Fahrlehrer nicht vom Schüler übernommen");
    const kt = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), neu.kalender_termin_id);
    if (!kt || kt.art !== "pruefung" || kt.bis !== "13:00") fehler("Prüfungstafel: kein passender Kalendertermin für den Fahrlehrer " + JSON.stringify(kt));
  }
  // Ergebnis für die gestrige Prüfung
  await page.click('[data-ergebnis="pt-4"]');
  await page.check("dialog input[value=bestanden]");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const s8 = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.id === "s8"));
  if (s8.reakt_status !== "befreit") fehler("Prüfungstafel: bestandene Praxis befreit nicht von der Reaktivierung");
  await page.goto(page.url().split("#")[0] + "#pruefungen?gross=1");
  await page.waitForTimeout(300);
  if (await page.isVisible(".seite")) fehler("Großansicht: Menü noch sichtbar");
  await pruefeBreite(page, "Großansicht");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-gross.png"), fullPage: true });
  if (konsole.length) fehler("Prüfungstafel: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 5) Super-Admin sieht die Auswahl der Fahrschule
{
  const { page, ctx } = await oeffne({ nutzer: "sa-1" });
  if (!(await page.isVisible("#schulWahlWrap"))) fehler("Super-Admin: keine Fahrschul-Auswahl");
  await ctx.close();
}
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1" });
  if (await page.isVisible("#schulWahlWrap")) fehler("Büro: Fahrschul-Auswahl sichtbar");
  await ctx.close();
}

await browser.close();
server.close();
console.log(probleme ? `Büro-Test: ${probleme} Problem(e).` : "Büro-Test: alles in Ordnung.");
process.exit(probleme ? 1 : 0);
