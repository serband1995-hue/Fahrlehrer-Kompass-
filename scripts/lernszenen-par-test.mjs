// Lernszenen-§-Test (Kompass 5, Block 3): kleines antippbares §, 1. Tippen öffnet, 2. Tippen schließt,
// kein dauerhaftes Gesetzes-Schild mehr im Erklärkasten, nichts verdeckt die Szene, keine Konsolenfehler.
// Ansichten: 360×640, 412×915, quer 640×360. Alle 22 Szenen werden geöffnet.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-par-test.mjs
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
let fehler = 0, ok = 0, mitPar = 0, ohnePar = 0;
const pruefe = (n, c, g = "") => { if (c) { ok++; } else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
for (const [w, h] of [[360, 640], [412, 915], [640, 360]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push("pageerror " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis);
  await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const ids = await page.evaluate(() => (window.Lernszenen.alleIds ? window.Lernszenen.alleIds() : null));
  const liste = ids || ["auffahren", "abfahren", "reissverschluss", "rettungsgasse", "laengs", "wenden", "ecke", "gefahr", "ueberholen", "schulbus", "rvl", "links_gegen", "voreinander", "rechts_rad", "doppel", "kreisel", "zebra", "eng", "stop", "gruenpfeil"];
  for (const szene of liste) {
    const t = `${w}×${h} ${szene}: `;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), szene);
    try { await page.waitForSelector("#lzCap", { timeout: 5000 }); } catch { pruefe(t + "öffnet", false); continue; }
    let btn = null;
    for (let i = 0; i < 12; i++) {
      btn = await page.$("#lzCap .lz-parb"); if (btn) break;
      const n = await page.$("#lzNext"); if (!n) break; await n.click(); await page.waitForTimeout(40);
    }
    pruefe(t + "kein dauerhaftes .lz-par im Erklärkasten", (await page.$$("#lzCap .lz-par")).length === 0);
    if (!btn) { ohnePar++; await page.evaluate(() => document.querySelector("#lzZu").click()); continue; }
    mitPar++;
    const bb = await btn.boundingBox();
    pruefe(t + "§-Knopf mind. 32 px", bb.width >= 32 && bb.height >= 32, JSON.stringify(bb));
    pruefe(t + "Popover anfangs zu", !(await page.$(".lz-parpop")));
    await btn.tap(); await page.waitForSelector(".lz-parpop", { timeout: 2000 });
    const pop = await (await page.$(".lz-parpop")).boundingBox(), cap = await (await page.$("#lzCap")).boundingBox(), st = await (await page.$("#lzStage")).boundingBox();
    pruefe(t + "Popover im Bild", pop.x >= st.x - 1 && pop.x + pop.width <= st.x + st.width + 1 && pop.y >= st.y - 1 && pop.y + pop.height <= st.y + st.height + 1, JSON.stringify({ pop, st }));
    pruefe(t + "Popover überlappt Erklärkasten nicht", pop.y >= cap.y + cap.height - 1 || pop.x >= cap.x + cap.width - 1 || pop.x + pop.width <= cap.x + 1, JSON.stringify({ pop, cap }));
    const hud = await (await page.$("#lzHud")).boundingBox();
    pruefe(t + "Popover überlappt Tacho nicht", pop.x + pop.width <= hud.x + 1 || pop.x >= hud.x + hud.width - 1 || pop.y + pop.height <= hud.y + 1 || pop.y >= hud.y + hud.height - 1, JSON.stringify({ pop, hud }));
    pruefe(t + "Link zum Gesetzestext", !!(await page.$(".lz-parpop a[href*='gesetze-im-internet.de/stvo_2013/__']")));
    if (w === 360 && h === 640 && szene === "auffahren") await page.screenshot({ path: process.env.PAR_BILD || "/tmp/par-360.png" });
    await btn.tap(); await page.waitForTimeout(120);
    pruefe(t + "2. Tippen schließt", !(await page.$(".lz-parpop")));
    await page.evaluate(() => document.querySelector("#lzZu").click());
    pruefe(t + "schließt", !(await page.$("#lzCap")));
  }
  pruefe(`${w}×${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
await browser.close(); server.close();
console.log(`Szenen mit §: ${mitPar}, ohne geprüftes § in den angespielten Phasen: ${ohnePar}`);
console.log(`${ok} ok, ${fehler} Fehler`); process.exit(fehler ? 1 : 0);
