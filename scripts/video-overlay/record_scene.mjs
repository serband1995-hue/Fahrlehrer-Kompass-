// Nimmt eine animierte Lernszene aus dem Kompass als Hochformat-Clip (1080x1920, ohne Ton) auf.
// Der Clip eignet sich als Einblendung ("card" oder "full") in render.py. Alles läuft lokal, nichts wird hochgeladen.
// Aufruf:
//   NODE_PATH=$(npm root -g) node record_scene.mjs <szene-id> <ausgabe.mp4> [--view oben|3d|fahrer] [--seconds N] [--keep-ui]
//   NODE_PATH=$(npm root -g) node record_scene.mjs --list
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

const arg = process.argv.slice(2);
const flag = (n) => { const i = arg.indexOf(n); return i < 0 ? null : arg[i + 1]; };
const liste = arg.includes("--list");
const [szene, ausgabe] = arg.filter((a, i) => !a.startsWith("--") && !(i > 0 && arg[i - 1].startsWith("--") && arg[i - 1] !== "--keep-ui" && arg[i - 1] !== "--list"));
if (!liste && (!szene || !ausgabe)) {
  console.error("Aufruf: node record_scene.mjs <szene-id> <ausgabe.mp4> [--view oben|3d|fahrer] [--seconds N] [--keep-ui]  |  --list");
  process.exit(2);
}

const server = createServer(async (req, res) => {
  try {
    const p = req.url.split("?")[0];
    const datei = await readFile(join(ROOT, p === "/" ? "index.html" : p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p === "/" ? "index.html" : p)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const dir = mkdtempSync(join(tmpdir(), "szene_"));
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  recordVideo: { dir, size: { width: 1080, height: 1920 } },
});
const page = await ctx.newPage();
const t0 = Date.now();
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis, { waitUntil: "load" });
await page.waitForFunction(() => window.Lernszenen && window.Lernszenen._szenen && window.Lernszenen._szenen.length, null, { timeout: 15000 });

const alle = await page.evaluate(() => window.Lernszenen._szenen.map((s) => ({ id: s.id, titel: s.titel, dauer: s.dauer })));
if (liste) {
  for (const s of alle) console.log(`${s.id.padEnd(16)} ${String(s.dauer ?? "?").padStart(3)} s  ${s.titel}`);
  await browser.close(); server.close(); process.exit(0);
}
const info = alle.find((s) => s.id === szene);
if (!info) { console.error("Szene nicht gefunden. Mit --list ansehen."); await browser.close(); server.close(); process.exit(2); }

await page.evaluate((id) => window.Lernszenen.open({ szene: id }), szene);
await page.waitForSelector("#lzPlay", { state: "visible" });
const ansicht = (flag("--view") || "oben").toLowerCase();
const knopf = { oben: "Oben", "3d": "3D", fahrer: "Fahrer" }[ansicht];
if (!knopf) { console.error("--view: oben, 3d oder fahrer"); process.exit(2); }
await page.locator(".lz-btn", { hasText: new RegExp(`^${knopf}$`) }).first().click();
if (!arg.includes("--keep-ui")) {
  await page.addStyleTag({ content: ".lz-top,.lz-bar,.lz-caption{display:none!important}.lz-stage{position:fixed!important;inset:0!important;height:100vh!important}" });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
}
await page.waitForTimeout(600);
const startOffset = (Date.now() - t0) / 1000;
await page.evaluate(() => document.getElementById("lzPlay").click());
const sekunden = flag("--seconds") ? Number(flag("--seconds")) : (info.dauer || 20) + 1;
await page.waitForTimeout(sekunden * 1000);
await ctx.close();
const webm = await page.video().path();
await browser.close();
server.close();

const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", startOffset.toFixed(2), "-i", webm, "-t", String(sekunden),
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30", "-an",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", ausgabe], { encoding: "utf8" });
if (r.status) { console.error("ffmpeg-Fehler:", r.stderr.slice(-800)); process.exit(1); }
console.log(`fertig: ${ausgabe} (${info.titel}, Ansicht ${ansicht}, ${sekunden.toFixed(0)} s)`);
