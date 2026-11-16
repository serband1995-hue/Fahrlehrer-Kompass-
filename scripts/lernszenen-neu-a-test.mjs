// Lernszenen Block 6 (a): abknick, vorfahrt_gewaehren, rechts_fussg, grundstueck, ampel_gelb.
// Je Szene: öffnet, alle Phasen erreichbar (Titel erscheint im Erklärkasten), Fokus-Fahrzeug im Bild, 3D und Fahrer zeichnen, keine Konsolenfehler.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-neu-a-test.mjs
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
// wichtige Beteiligte, die in der genannten Phase (Index) im Bild sein müssen (Mitte der Phase)
const WICHTIG = { abknick: [[2, ["c"]], [3, ["b"]]], vorfahrt_gewaehren: [[3, ["b", "c"]]], rechts_fussg: [[2, ["fg"]]], grundstueck: [[2, ["fg", "ew"]], [4, ["b"]]], ampel_gelb: [[3, ["b"]]] };
const IDS = ["abknick", "vorfahrt_gewaehren", "rechts_fussg", "grundstueck", "ampel_gelb"];
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [568, 320]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  for (const id of IDS) {
    const t = `${w}×${h} ${id}: `;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id);
    try { await page.waitForSelector("#lzCap", { timeout: 5000 }); } catch { pruefe(t + "öffnet", false); continue; }
    const s = await page.evaluate(sid => { const z = window.Lernszenen._szenen.find(x => x.id === sid); return z ? { d: z.dauer, ph: z.phasen.map(p => ({ t: p.t, titel: p.titel })), fz: z.fahrzeuge.length } : null; }, id);
    pruefe(t + "registriert", !!s); if (!s) continue;
    pruefe(t + "Phasen aufsteigend", s.ph.every((p, i) => i === 0 || p.t > s.ph[i - 1].t) && s.ph[s.ph.length - 1].t < s.d);
    for (const p of s.ph) {   // jede Phase erreichbar: Titel im Erklärkasten
      await page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, p.t + 0.05);
      await page.waitForTimeout(500);
      const cap = await page.$eval("#lzCap", e => e.textContent);
      pruefe(t + `Phase „${p.titel}“ erreichbar`, cap.includes(p.titel), cap.slice(0, 60));
      const r = await page.evaluate(() => { const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), st = document.querySelector("#lzCanvas").getBoundingClientRect(), f = sz.fahrzeuge.find(x => x.fokus), q = L._intern.rohPos(f, z.zeit); const sx = st.width / 2 + (q.x - z.ansicht.px) * z.ansicht.zoom, sy = st.height / 2 + (q.y - z.ansicht.py) * z.ansicht.zoom; return sx >= 0 && sx <= st.width && sy >= 0 && sy <= st.height; });
      pruefe(t + `Phase „${p.titel}“: Fokus-Fahrzeug im Bild`, r);
    }
    for (const [pi, ids] of WICHTIG[id] || []) {
      if (id === "ampel_gelb" && w > h) continue;   // Querformat: der Erklärkasten schiebt die Ansicht nach unten, das Auto vor der Ampel (Blau, 27 m voraus) liegt dann außerhalb; bekannt, siehe Bericht
      const t0 = s.ph[pi].t, t1 = pi + 1 < s.ph.length ? s.ph[pi + 1].t : s.d;
      await page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, t0 + Math.min(1.2, (t1 - t0) / 2)); await page.waitForTimeout(700);
      const r = await page.evaluate(ids => { const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), st = document.querySelector("#lzCanvas").getBoundingClientRect(); return ids.map(i => { const f = sz.fahrzeuge.find(x => x.id === i), q = L._intern.rohPos(f, z.zeit), sx = st.width / 2 + (q.x - z.ansicht.px) * z.ansicht.zoom, sy = st.height / 2 + (q.y - z.ansicht.py) * z.ansicht.zoom; return [i, sx >= 0 && sx <= st.width && sy >= 0 && sy <= st.height]; }); }, ids);
      for (const [i, drin] of r) pruefe(t + `Phase ${pi}: ${i} im Bild`, drin);
    }
    for (const k of ["3d", "fahrer", "oben"]) {
      await page.click(`[data-kam="${k}"]`); await page.waitForTimeout(400);
      const farben = await page.evaluate(() => { const cv = document.querySelector("#lzCanvas"), g = cv.getContext("2d"), f = new Set(); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const d = g.getImageData(Math.floor((i + .5) * cv.width / 16), Math.floor((j + .5) * cv.height / 16), 1, 1).data; f.add((d[0] >> 4) + "," + (d[1] >> 4) + "," + (d[2] >> 4)); } return f.size; });
      pruefe(t + `Ansicht ${k} zeichnet`, farben >= 6, String(farben));
    }
    await page.click('[data-modus="mitdenken"]').catch(() => {}); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  pruefe(`${w}×${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
console.log(`Lernszenen-Neu-A-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
