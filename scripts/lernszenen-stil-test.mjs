// Lernszenen-Look-Test (Kompass 5, Block 4 Stufe 1): alle Szenen in 360×640 und 640×360 öffnen, 3 s abspielen.
// Prüft: keine Konsolenfehler, Zeichenfläche nicht leer/einfarbig (Pixelstichprobe), mittlere Zeichenzeit unter 12 ms im Container,
// außerdem laufen 3D, Fahrer und Selbst-fahren weiterhin ohne Fehler.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-stil-test.mjs
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
let fehler = 0, ok = 0, summe = 0, n = 0, maxZeit = 0;
const pruefe = (name, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + name + (g ? " – " + g : "")); } };
// Pixelstichprobe: viele verschiedene Farben und kein einfarbiges Bild
const stich = page => page.evaluate(() => {
  const cv = document.querySelector("#lzCanvas"), g = cv.getContext("2d"), w = cv.width, h = cv.height, farben = new Set(); let hell = 0;
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) { const d = g.getImageData(Math.floor((i + 0.5) * w / 24), Math.floor((j + 0.5) * h / 24), 1, 1).data; farben.add((d[0] >> 4) + "," + (d[1] >> 4) + "," + (d[2] >> 4)); hell += d[0] + d[1] + d[2]; }
  return { farben: farben.size, hell: hell / (576 * 3) };
});
for (const [w, h] of [[360, 640], [640, 360]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push("pageerror " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis);
  await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const ids = await page.evaluate(() => window.Lernszenen._szenen.map(s => s.id));
  pruefe(`${w}×${h}: 27 Szenen vorhanden`, ids.length >= 27, String(ids.length));
  for (const id of ids) {
    const t = `${w}×${h} ${id}: `; konsole.length = 0;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id);
    try { await page.waitForSelector("#lzCap", { state: "attached", timeout: 5000 }); await page.evaluate(() => { const o = document.querySelector("#lzCapOpen"); if (o && !o.hidden) o.click(); }); } catch { pruefe(t + "öffnet", false); continue; }
    await page.click("#lzPlay"); await page.waitForTimeout(3000);
    const sp = await stich(page);
    pruefe(t + "Zeichenfläche nicht einfarbig", sp.farben >= 12, JSON.stringify(sp));
    const ms = await page.evaluate(() => window.Lernszenen._intern.messeOben(20));
    summe += ms; n++; maxZeit = Math.max(maxZeit, ms);
    pruefe(t + "Zeichenzeit unter 12 ms", ms < 12, ms.toFixed(2) + " ms");
    pruefe(t + "keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    if (["bahnuebergang", "strassenbahn", "abstand", "halteverbot", "einsatz"].includes(id)) {
      for (const k of ["3d", "oben"]) { await page.click(`[data-kam="${k}"]`); await page.waitForTimeout(500); const s2 = await stich(page); pruefe(t + `Ansicht ${k} zeichnet`, s2.farben >= 6, JSON.stringify(s2)); }
      pruefe(t + "Ansichten ohne Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    }
    if (id === "auffahren") {
      for (const k of ["3d", "oben"]) {
        await page.click(`[data-kam="${k}"]`); await page.waitForTimeout(500);
        const s2 = await stich(page);
        pruefe(t + `Ansicht ${k} zeichnet`, s2.farben >= 6, JSON.stringify(s2));
      }
      const selbst = await page.$("#lzSelbst");
      if (selbst) { await selbst.click(); await page.waitForTimeout(1200); const s3 = await stich(page); pruefe(t + "Selbst fahren zeichnet", s3.farben >= 6, JSON.stringify(s3)); }
      // eigener Zoom schaltet die Auto-Kamera ab; ↺ stellt sie wieder her
      const zz = () => page.evaluate(() => window.Lernszenen._intern.zustand().ansicht.zoom);
      const z0 = await zz();
      await page.evaluate(() => { const st = document.querySelector("#lzStage"); for (let i = 0; i < 6; i++) st.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, cancelable: true })); });
      const z1 = await zz(); pruefe(t + "eigener Zoom wirkt", z1 < z0 * 0.7, z0 + " -> " + z1);
      await page.click("#lzReset"); await page.waitForTimeout(400);
      const z2 = await zz(); pruefe(t + "↺ stellt Standard-Zoom wieder her", Math.abs(z2 - z0) / z0 < 0.35, z0 + " / " + z2);
      pruefe(t + "Ansichten ohne Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    }
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  await ctx.close();
}
console.log(`mittlere Zeichenzeit ${(summe / n).toFixed(2)} ms, höchste ${maxZeit.toFixed(2)} ms (Container, 2× Pixeldichte)`);
console.log(`Lernszenen-Look-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close();
process.exit(fehler ? 1 : 0);
