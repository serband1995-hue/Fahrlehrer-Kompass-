// Handy-Test: öffnet jede Seite bei 360 und 412 px (hoch) und quer
// und meldet Seiten, die seitlich wischbar sind oder Elemente über den Rand schieben.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/handy-test.mjs [seite.html ...]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const SEITEN = process.argv.length > 2
  ? process.argv.slice(2)
  : ["index.html", "buchen.html", "storno.html", "check.html", "reaktion.html", "quiz.html", "quiz-lehrer.html", "quiz-tafel.html", "quiz-loesungen.html"];
const GROESSEN = [
  { name: "360 hoch", width: 360, height: 740 },
  { name: "412 hoch", width: 412, height: 915 },
  { name: "412 quer", width: 915, height: 412 },
];

const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let probleme = 0;

for (const seite of SEITEN) {
  for (const g of GROESSEN) {
    const ctx = await browser.newContext({ viewport: { width: g.width, height: g.height }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const jsFehler = [];
    page.on("pageerror", (e) => jsFehler.push(e.message));
    // Nur die eigene Seite laden, keine Außenwelt: Fremdanfragen blockieren.
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    try {
      await page.goto(basis + seite, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(600);
      const messung = await page.evaluate(() => {
        const breite = document.documentElement.clientWidth;
        const rand = [];
        for (const el of document.body.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          if (r.width === 0 || s.visibility === "hidden" || s.display === "none" || s.position === "fixed") continue;
          if (r.right > breite + 1 && !el.closest("[style*='overflow']")) {
            rand.push((el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "")) + " +" + Math.round(r.right - breite) + "px");
          }
        }
        return { breite, scrollBreite: document.documentElement.scrollWidth, rand: rand.slice(0, 5) };
      });
      const wischbar = messung.scrollBreite > messung.breite + 1;
      if (wischbar || jsFehler.length) {
        probleme++;
        console.log(`PROBLEM  ${seite} @ ${g.name}: ${wischbar ? `seitlich wischbar (${messung.scrollBreite} > ${messung.breite})` : ""} ${jsFehler.length ? "JS-Fehler: " + jsFehler[0] : ""}`);
        if (messung.rand.length) console.log("         Verdacht: " + messung.rand.join(", "));
      } else {
        console.log(`ok       ${seite} @ ${g.name}`);
      }
    } catch (e) {
      probleme++;
      console.log(`FEHLER   ${seite} @ ${g.name}: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(probleme ? `\n${probleme} Problem(e) gefunden.` : "\nAlles in Ordnung.");
process.exit(probleme ? 1 : 0);
