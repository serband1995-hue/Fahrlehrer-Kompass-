// Lernszenen-Frage-Test: Frage-Fenster in Quer- und Hochformat: "Weiter" erreichbar ohne Scrollen, Vor/Zurueck schliessen ein offenes Frage-Fenster.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-frage-test.mjs
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
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p === "/" ? "index.html" : p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [568, 320]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  for (const id of ["stop", "abstand", "rvl"]) {
    const t = `${w}x${h} ${id}: `;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id); await page.waitForSelector("#lzCap", { state: "attached" }); await page.evaluate(() => { const o = document.querySelector("#lzCapOpen"); if (o && !o.hidden) o.click(); });
    await page.click('[data-modus="mitdenken"]'); await page.click("#lzPlay");
    try { await page.waitForSelector(".lz-sheet .lz-opt", { timeout: 8000 }); } catch { pruefe(t + "Frage-Fenster erscheint", false); continue; }
    await page.click("#lzNext"); await page.waitForTimeout(200);
    pruefe(t + "Weiter-Pfeil schliesst das Frage-Fenster", !(await page.$(".lz-sheet")));
    await page.click("#lzPrev"); await page.waitForTimeout(200);
    pruefe(t + "Zurueck-Pfeil laesst kein altes Frage-Fenster stehen", (await page.$$(".lz-sheet")).length <= 1);
    await page.click("#lzReset"); await page.waitForTimeout(200); await page.click("#lzPlay");
    try { await page.waitForSelector(".lz-sheet .lz-opt", { timeout: 8000 }); } catch { pruefe(t + "Frage-Fenster erscheint (2)", false); continue; }
    await page.click(".lz-sheet .lz-opt"); await page.waitForSelector("#lzWeiter");
    const r = await page.evaluate(() => {
      const b = document.querySelector("#lzWeiter"), st = document.querySelector("#lzStage").getBoundingClientRect(), bb = b.getBoundingClientRect(), top = document.elementFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2);
      return { drin: bb.top >= st.top - 1 && bb.bottom <= st.bottom + 1 && bb.left >= st.left - 1 && bb.right <= st.right + 1, davor: !!top && (top === b || b.contains(top)), h: Math.round(bb.height) };
    });
    pruefe(t + "Weiter im Bild ohne Scrollen", r.drin, JSON.stringify(r));
    pruefe(t + "Weiter antippbar (nichts liegt darueber)", r.davor, JSON.stringify(r));
    await page.tap("#lzWeiter"); await page.waitForTimeout(200);
    pruefe(t + "Weiter schliesst das Fenster", !(await page.$(".lz-sheet")));
  }
  pruefe(`${w}x${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
console.log(`Lernszenen-Frage-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
