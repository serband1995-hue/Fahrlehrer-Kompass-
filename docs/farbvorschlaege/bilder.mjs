// Erzeugt die Vergleichsbilder der Farbvorschläge (heute, A, B) im Büro-Vorführmodus. Nichts davon ist live.
// Aufruf:  NODE_PATH=$(npm root -g) node docs/farbvorschlaege/bilder.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HIER = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HIER, "..", "..");
const { bauDaten } = require(join(ROOT, "buero-vorfuehrung.js"));
const { chromium } = require("playwright");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;

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

// erfundene Testdaten für die Zahlungsdaten (wie in scripts/zahlungsmail-test.mjs)
const ZD = { fahrschule_id: "fs-test-1", kontoinhaber: "Boost Fahrschule Muster", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "boostmuster",
  impressum: "Boost Fahrschule Muster, Beispielstraße 1, 12345 Beispielstadt, Tel. 000 0000, info@example.org", modus: "test", test_email: "test@example.org",
  geaendert_am: "2026-11-20T10:00:00Z", bearbeiter: "Mia Muster" };
const vor = `
  F.tabellen.fahrschule_zahlungsdaten = [${JSON.stringify(ZD)}];
  F.tabellen.fahrschule_preise = [{ id: "pz1", fahrschule_id: "fs-test-1", art: "pruefung_praxis", klasse: "B", bezeichnung: "Vorstellung zur praktischen Prüfung", einheit: "pauschal", betrag_cent: 12000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }];
`;
const STAENDE = { heute: null, a: "vorschlag-a.css", b: "vorschlag-b.css" };

const BREITEN = { 360: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 }, 1024: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 }, 1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } };
// Ansicht: Konto, Adresse. Super-Admin (sa-1) und Büro (bu-1) zeigen den Rollenstreifen.
const ANSICHTEN = {
  start: { konto: "ad-1", hash: "#start" }, akte: { konto: "ad-1", hash: "#start" }, zahlungsdaten: { konto: "ad-1", hash: "#fristen" },
  kalender: { konto: "ad-1", hash: "#kalender" }, super: { konto: "sa-1", hash: "#start" }, buero: { konto: "bu-1", hash: "#start" },
};
const PIN_NAME = "Paula Muster";

async function bild(stand, ansicht, breite, modus) {
  const g = BREITEN[breite], a = ANSICHTEN[ansicht];
  const ctx = await browser.newContext({ ...g, colorScheme: modus === "dunkel" ? "dark" : "light" });
  const page = await ctx.newPage();
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  const daten = bauDaten(HEUTE);
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    (new Function("F", v))(window.__FAKE);
  }, [daten, { user: { id: a.konto, email: a.konto + "@example.org" } }, vor]);
  await page.goto(basis + "buero.html" + a.hash);
  await page.waitForTimeout(400);
  if (await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null)) {
    await page.click(`#werListe button:has-text("${PIN_NAME}")`);
    await page.keyboard.type("7352", { delay: 20 });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => { const x = document.getElementById("ansicht"); return x && !/Daten werden geladen/.test(x.textContent); }, null, { timeout: 8000 }).catch(() => {});
  // Layout-Fehler in main (nicht Teil der Farben): "#zmForm input{width:100%}" macht die Auswahlpunkte riesig.
  // Für den fairen Vergleich bei allen Ständen gleich ausgebessert, damit nur die Farben unterschiedlich sind.
  await page.addStyleTag({ content: "#zmForm .zm-wahl input{width:22px;min-width:22px;flex:0 0 22px;}" });
  if (STAENDE[stand]) await page.addStyleTag({ content: await readFile(join(HIER, STAENDE[stand]), "utf8") });
  if (ansicht === "akte") {
    await page.evaluate(() => schuelerDialog("s3"));
    await page.waitForSelector("dialog[open]");
    await page.evaluate(() => document.getElementById("zmBlock")?.scrollIntoView({ block: "center" }));
  }
  if (ansicht === "zahlungsdaten") await page.evaluate(() => { document.getElementById("zmEinst")?.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(HIER, `${stand}-${ansicht}-w${breite}-${modus}.png`), scale: "css" });
  await ctx.close();
}

// Bildliste: Start/Akte/Zahlungsdaten bei 360 und 1024 (hell+dunkel), Start bei 1280 (hell+dunkel),
// dazu Super-Admin, Büro-Rolle und Kalender bei 1280.
const LISTE = [];
for (const an of ["start", "akte", "zahlungsdaten"]) for (const b of [360, 1024]) for (const m of ["hell", "dunkel"]) LISTE.push([an, b, m]);
for (const m of ["hell", "dunkel"]) LISTE.push(["start", 1280, m], ["super", 1280, m]);
LISTE.push(["kalender", 1280, "hell"], ["buero", 1280, "hell"]);
for (const stand of Object.keys(STAENDE)) for (const [an, b, m] of LISTE) {
  await bild(stand, an, b, m);
  console.log("ok", `${stand}-${an}-w${b}-${m}.png`);
}
await browser.close(); server.close();
