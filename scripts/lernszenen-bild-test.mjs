// Lernszenen-Bild-Test: in JEDER Phase aller Szenen liegt das Fokus-Fahrzeug (bei rechts_rad auch die Radfahrer, bei kreisel auch das zweite Auto)
// mit seiner Mitte im Bühnen-Rechteck. Größen: 360×640, 640×360, 568×320. Geprüft wird in der Mitte jeder Phase und am Ende der Szene.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-bild-test.mjs
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
const ZEIGE = { rechts_rad: ["rad", "rad2"], kreisel: ["k"] };
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
for (const [w, h] of [[360, 640], [640, 360], [568, 320]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis);
  await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const ids = await page.evaluate(() => window.Lernszenen._szenen.map(s => s.id));
  for (const id of ids) {
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id); await page.waitForSelector("#lzCap");
    const zeiten = await page.evaluate(sid => { const s = window.Lernszenen._szenen.find(x => x.id === sid), ph = s.phasen.map(p => p.t); return ph.map((t, i) => [i, (t + (i + 1 < ph.length ? ph[i + 1] : s.dauer)) / 2]).concat([[ph.length, s.dauer - 0.1]]); }, id);
    for (const [i, t] of zeiten) {
      await page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, t);
      await page.waitForTimeout(900);
      const r = await page.evaluate(zeige => {
        const L = window.Lernszenen, z = L._intern.zustand(), s = L._szenen.find(x => x.id === z.szene), st = document.querySelector("#lzCanvas").getBoundingClientRect(), out = [];
        for (const f of s.fahrzeuge) { if (!f.fokus && !(zeige || []).includes(f.id)) continue; const p = L._intern.rohPos(f, z.zeit); const sx = st.width / 2 + (p.x - z.ansicht.px) * z.ansicht.zoom, sy = st.height / 2 + (p.y - z.ansicht.py) * z.ansicht.zoom; out.push([f.id, Math.round(sx), Math.round(sy), sx >= 0 && sx <= st.width && sy >= 0 && sy <= st.height]); }
        return { out, b: [Math.round(st.width), Math.round(st.height)], zeit: z.zeit };
      }, ZEIGE[id]);
      for (const [fid, sx, sy, drin] of r.out) pruefe(`${w}×${h} ${id} Phase ${i} t=${t.toFixed(1)}: ${fid} im Bild`, drin, `Bild ${r.b} Mitte (${sx},${sy})`);
    }
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  pruefe(`${w}×${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
console.log(`Lernszenen-Bild-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
