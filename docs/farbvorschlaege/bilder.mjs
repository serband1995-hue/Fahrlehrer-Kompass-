// Erzeugt die 36 Vergleichsbilder der Farbvorschläge (heute, A, B) im Büro-Vorführmodus. Nichts davon ist live.
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
const GERAETE = { handy: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }, tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 } };
const ANSICHTEN = ["start", "akte", "zahlungsdaten"];

async function bild(stand, ansicht, geraet, modus) {
  const g = GERAETE[geraet];
  const ctx = await browser.newContext({ ...g, colorScheme: modus === "dunkel" ? "dark" : "light" });
  const page = await ctx.newPage();
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  const daten = bauDaten(HEUTE);
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    (new Function("F", v))(window.__FAKE);
  }, [daten, { user: { id: "ad-1", email: "ad-1@example.org" } }, vor]);
  await page.goto(basis + "buero.html" + (ansicht === "zahlungsdaten" ? "#fristen" : "#start"));
  await page.waitForTimeout(400);
  if (await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null)) {
    await page.click(`#werListe button:has-text("Paula Muster")`);
    await page.keyboard.type("7352", { delay: 20 });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
  // Layout-Fehler in main (nicht Teil der Farben): "#zmForm input{width:100%}" macht die Auswahlpunkte riesig.
  // Für den fairen Vergleich bei allen drei Ständen gleich ausgebessert, damit nur die Farben unterschiedlich sind.
  await page.addStyleTag({ content: "#zmForm .zm-wahl input{width:22px;min-width:22px;flex:0 0 22px;}" });
  if (STAENDE[stand]) await page.addStyleTag({ content: await readFile(join(HIER, STAENDE[stand]), "utf8") });
  if (ansicht === "akte") {
    await page.evaluate(() => schuelerDialog("s3"));
    await page.waitForSelector("dialog[open]");
    await page.evaluate(() => document.getElementById("zmBlock")?.scrollIntoView({ block: "center" }));
  }
  if (ansicht === "zahlungsdaten") await page.evaluate(() => { document.getElementById("zmEinst")?.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(HIER, `${stand}-${ansicht}-${geraet}-${modus}.png`), scale: "css" });
  await ctx.close();
}

for (const stand of Object.keys(STAENDE)) for (const a of ANSICHTEN) for (const g of Object.keys(GERAETE)) for (const m of ["hell", "dunkel"]) {
  await bild(stand, a, g, m);
  console.log("ok", `${stand}-${a}-${g}-${m}.png`);
}
await browser.close(); server.close();
