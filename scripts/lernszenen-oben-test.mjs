// Lernszenen-Oben-Test (17.11.2026): Ansicht „von oben“ zeigt am Android-Profil (Pixel 7, hoch und quer) in ALLEN Szenen ein Bild,
// geöffnet wie am Handy über die Szenenauswahl (Vorschaubilder zuerst). Geprüft am fertigen Bildschirmfoto (nicht nur im Canvas-Speicher):
// Helligkeit und Pixel-Varianz im Bühnenbereich. Dazu: keine Fahrer-Ansicht mehr, Erklärkasten startet zu, „▤ Text anzeigen“ holt ihn,
// Abbiegen gleitet (Fahrtrichtung aller Fahrzeuge ändert sich je 1/60 s um höchstens 4°, keine Sprünge).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-oben-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const f = p === "/" ? "index.html" : p; const d = await readFile(join(ROOT, f)); res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };

// 1) Abbiegen gleitet: Fahrtrichtung je 1/60 s (rohe Szenenzeit, ohne Kamera) – keine Sprünge
{
  const page = await browser.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const L = window.Lernszenen, out = [];
    for (const s of L._szenen) for (const f of s.fahrzeuge) {
      if (f.bahn || !f.pfad) continue;
      let max = 0, wo = 0, vor = null;
      for (let t = 0; t <= s.dauer; t += 1 / 60) {
        const p = L._intern.rohPos(f, t); if (vor) { const d = Math.abs(Math.atan2(Math.sin(p.h - vor.h), Math.cos(p.h - vor.h))) * 180 / Math.PI; if (d > max && Math.hypot(p.x - vor.x, p.y - vor.y) > 1e-4) { max = d; wo = t; } } vor = p;
      }
      out.push([s.id, f.id, f.typ, Math.round(max * 10) / 10, Math.round(wo * 100) / 100]);
    }
    return out;
  });
  let n = 0;
  for (const [sid, fid, typ, max, wo] of r) { n++; pruefe(`Richtung ${sid}/${fid} (${typ}) ohne Sprung`, max <= 4, `${max}° je 1/60 s bei t=${wo}`); }
  pruefe("Richtungs-Prüfung hat Fahrzeuge", n > 60, String(n));
  await page.close();
}

// 2) Ansicht von oben am Pixel 7, hoch und quer, über die Auswahl geöffnet
for (const quer of [false, true]) {
  const ctx = await browser.newContext({ ...(quer ? devices["Pixel 7 landscape"] : devices["Pixel 7"]) });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const t0 = quer ? "quer " : "hoch ";
  const ids = await page.evaluate(() => window.Lernszenen._szenen.map(s => s.id));
  pruefe(t0 + "36 Szenen", ids.length === 36, String(ids.length));
  for (const id of ids) {
    const t = t0 + id + ": ";
    await page.evaluate(() => window.Lernszenen.open({})); await page.waitForSelector("[data-kat]", { state: "attached" });
    const kat = await page.evaluate(sid => window.Lernszenen._szenen.find(s => s.id === sid).kategorie || "autobahn", id);
    const kb = await page.$(`[data-kat="${kat}"]`); if (kb) { await kb.click(); await page.waitForTimeout(150); }
    await page.click(`[data-szene="${id}"]`); await page.waitForSelector("#lzCap", { state: "attached" });
    const ui = await page.evaluate(() => ({ fahrer: !!document.querySelector('[data-kam="fahrer"]'), kam: [...document.querySelectorAll("[data-kam]")].map(b => b.dataset.kam).join(","), capHidden: document.querySelector("#lzCap").hidden, offenKnopf: !document.querySelector("#lzCapOpen").hidden }));
    pruefe(t + "keine Fahrer-Ansicht", !ui.fahrer && ui.kam === "oben,3d", ui.kam);
    pruefe(t + "Erklärkasten startet zu, „Text anzeigen“ sichtbar", ui.capHidden && ui.offenKnopf, JSON.stringify(ui));
    await page.click("#lzPlay"); await page.waitForTimeout(1400);
    const box = await page.$eval("#lzCanvas", c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const png = (await page.screenshot({ clip: box })).toString("base64");
    const st = await page.evaluate(async b64 => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0, schwarz = 0;
      for (let i = 0; i < d.length; i += 4 * 7) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; n++; if (v < 14) schwarz++; }
      const m = s / n; return { mittel: Math.round(m), varianz: Math.round(s2 / n - m * m), schwarzAnteil: Math.round(100 * schwarz / n) };
    }, png);
    const z = await page.evaluate(() => window.Lernszenen._intern.zustand());
    pruefe(t + "Bild von oben nicht leer/schwarz", st.mittel > 50 && st.varianz > 60 && st.schwarzAnteil < 30, JSON.stringify(st));
    pruefe(t + "Ansicht oben, Muster aktiv", z.kameraModus === "oben" && !z.musterAus, `${z.kameraModus} musterAus=${z.musterAus}`);
    await page.click("#lzCapOpen"); await page.waitForTimeout(100);
    pruefe(t + "„Text anzeigen“ öffnet den Erklärkasten", await page.evaluate(() => !document.querySelector("#lzCap").hidden && document.querySelector("#lzCapOpen").hidden));
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  // Sicherung: bricht das Muster (Android), schaltet die Ansicht auf Vollfarben um und zeichnet weiter
  await page.evaluate(() => window.Lernszenen.open({ szene: "abknick" })); await page.waitForSelector("#lzCap", { state: "attached" });
  await page.evaluate(() => { const o = CanvasRenderingContext2D.prototype.createPattern; window.__cp = o; CanvasRenderingContext2D.prototype.createPattern = function () { throw new Error("kaputt"); }; });
  await page.evaluate(() => window.Lernszenen.open({ szene: "kreisel" })); await page.waitForSelector("#lzCap", { state: "attached" }); await page.waitForTimeout(600);
  const zz = await page.evaluate(() => { CanvasRenderingContext2D.prototype.createPattern = window.__cp; const c = document.querySelector("#lzCanvas"), d = c.getContext("2d").getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return { sum: d[0] + d[1] + d[2] }; });
  pruefe(t0 + "ohne Muster: Bild wird trotzdem gezeichnet", zz.sum > 60, JSON.stringify(zz));
  await page.evaluate(() => document.querySelector("#lzZu").click());
  pruefe(t0 + "Konsole ohne Fehler", konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
console.log(`Lernszenen-Oben-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
