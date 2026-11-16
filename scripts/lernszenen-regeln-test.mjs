// Lernszenen: Erklärkasten wegtippen (✕), „Text anzeigen“ zum Wiederöffnen, §-Fenster direkt am Kasten mit ✕, Tippen daneben schließt.
// Echter Ablauf per Tippen (Touch). Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-regeln-test.mjs
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
let ok = 0, fehler = 0;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
const sichtbar = (page, sel) => page.evaluate(q => { const e = document.querySelector(q); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; const cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden"; }, sel);
const oben = (page, sel) => page.evaluate(q => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); }, sel);
for (const [w, h, mobil] of [[360, 780, true], [780, 360, true], [568, 320, true], [412, 915, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: mobil });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push("pageerror " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  for (const szene of ["rvl", "kreisel", "halteverbot"]) for (const modus of ["vorfuehren", "mitdenken"]) {
    const t = `${w}×${h} ${szene} ${modus}: `;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), szene);
    await page.waitForSelector("#lzCap", { timeout: 5000 });
    if (modus === "mitdenken") { const b = await page.$('[data-modus="mitdenken"]'); if (b) { await b.tap(); await page.waitForTimeout(400); } }
    // eine Phase mit § suchen (Slider durchfahren)
    const ph = await page.evaluate(() => { const z = window.Lernszenen._intern.zustand(); return window.Lernszenen._szenen.find(x => x.id === z.szene).phasen.map(p => p.t); });
    let par = false;
    for (const tp of ph) { await page.evaluate(v => { const s = document.querySelector("#lzSlider"); s.value = v; s.dispatchEvent(new Event("input")); }, tp + 0.3); await page.waitForTimeout(350); if (await page.$("#lzCap .lz-parb")) { par = true; break; } }
    pruefe(t + "Phase mit § gefunden", par); if (!par) continue;
    // 1) § antippen: Fenster sichtbar, oben auf, nahe am Kasten
    await (await page.$("#lzCap .lz-parb")).tap(); await page.waitForTimeout(250);
    pruefe(t + "§-Fenster erscheint", await sichtbar(page, ".lz-parpop"));
    pruefe(t + "§-Fenster ist oben auf (nichts davor)", await oben(page, ".lz-parpop"));
    const g = await page.evaluate(() => { const p = document.querySelector(".lz-parpop").getBoundingClientRect(), c = document.querySelector("#lzCap").getBoundingClientRect(), s = document.querySelector("#lzStage").getBoundingClientRect(); return { drin: p.left >= s.left - 1 && p.right <= s.right + 1 && p.top >= s.top - 1 && p.bottom <= s.bottom + 1, nah: Math.min(Math.abs(p.top - c.bottom), Math.abs(p.left - c.right), Math.abs(p.right - c.left)) < 40 }; });
    pruefe(t + "§-Fenster im Bild", g.drin, JSON.stringify(g)); pruefe(t + "§-Fenster direkt am Kasten", g.nah, JSON.stringify(g));
    pruefe(t + "§-Knopf bleibt §", (await page.$eval("#lzCap .lz-parb", e => e.textContent)) === "§");
    // 2) ✕ im Fenster schließt
    await (await page.$(".lz-parpop .lz-parx")).tap(); await page.waitForTimeout(200);
    pruefe(t + "✕ im §-Fenster schließt", !(await page.$(".lz-parpop")));
    // 3) wieder öffnen, neben das Fenster tippen schließt
    await (await page.$("#lzCap .lz-parb")).tap(); await page.waitForTimeout(200);
    await page.touchscreen.tap(Math.round(w * 0.5), Math.round(h * 0.55)); await page.waitForTimeout(250);
    pruefe(t + "Tippen daneben schließt", !(await page.$(".lz-parpop")));
    // 4) Erklärkasten wegtippen
    await (await page.$("#lzCap .lz-parb")).tap(); await page.waitForTimeout(150);
    pruefe(t + "Kasten-✕ sichtbar und oben auf", (await sichtbar(page, "#lzCap .lz-capx")) && (await oben(page, "#lzCap .lz-capx")));
    await (await page.$("#lzCap .lz-capx")).tap(); await page.waitForTimeout(250);
    pruefe(t + "Kasten verschwindet", !(await sichtbar(page, "#lzCap")));
    pruefe(t + "§-Fenster mit weg", !(await page.$(".lz-parpop")));
    pruefe(t + "„Text anzeigen“ erscheint", (await sichtbar(page, "#lzCapOpen")) && (await oben(page, "#lzCapOpen")));
    // Phase wechseln: bleibt zu
    if (ph.length > 2) { await page.evaluate(v => { const s = document.querySelector("#lzSlider"); s.value = v; s.dispatchEvent(new Event("input")); }, ph[ph.length - 1] + 0.3); await page.waitForTimeout(350); pruefe(t + "bleibt nach Phasenwechsel zu", !(await sichtbar(page, "#lzCap"))); }
    await (await page.$("#lzCapOpen")).tap(); await page.waitForTimeout(250);
    pruefe(t + "Wiederöffnen zeigt Kasten", (await sichtbar(page, "#lzCap")) && !(await sichtbar(page, "#lzCapOpen")));
    pruefe(t + "Kasten hat Text", (await page.$eval("#lzCap", e => e.textContent.length)) > 20);
    await page.screenshot({ path: `/tmp/claude-0/b6/regeln_${szene}_${modus}_${w}x${h}.png` });
  }
  pruefe(`${w}×${h}: keine Konsolenfehler`, konsole.length === 0, konsole.join(" | ").slice(0, 200));
  await ctx.close();
}
await browser.close(); server.close();
console.log(`Lernszenen-Regeln-Test: ${ok} bestanden, ${fehler} Fehler`); process.exit(fehler ? 1 : 0);
