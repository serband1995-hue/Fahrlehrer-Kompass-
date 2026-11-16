// Lernszenen-Stimme-Test (Kompass 5, Block 5): Sprecherstimme je Phase im Takt mit der Szene.
// Prüft: Stimmen-Knopf nur bei vertonten Szenen, ▶ startet Satz 1, die Szene läuft während des Sprechens langsamer und wartet am Phasenende,
// ⏸ pausiert den Ton, „Nochmal hören“, Aus-Schalter (bleibt gemerkt), Info-Satz „mit KI erzeugt“, Szene ohne Dateien bleibt stumm, keine Konsolenfehler.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-stimme-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const f = p === "/" ? "index.html" : p;
    const d = await readFile(join(ROOT, f)); res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream", "Accept-Ranges": "none" }); res.end(d);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
let fehler = 0, ok = 0;
const pruefe = (n, c, g = "") => { if (c) { ok++; console.log("ok     " + n); } else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
const page = await ctx.newPage(); const konsole = [];
page.on("pageerror", e => konsole.push("pageerror " + e.message));
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.addInitScript(() => { window.__au = []; const A = window.Audio; window.Audio = function (src) { const a = new A(src); window.__au.push(a); return a; }; });
await page.goto(basis);
await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
const zeitSlider = () => page.evaluate(() => +document.querySelector("#lzSlider").value);
const anzahl = () => page.evaluate(() => window.__au.length);
const spielt = () => page.evaluate(() => window.__au.length ? !window.__au[window.__au.length - 1].paused : false);

// Jede Phase jeder Szene hat ihre Aufnahme (Stand des Phasentexts passt) und die Datei ist abrufbar
const luecken = await page.evaluate(async () => {
  const stand = t => { let h = 5381; t = String(t); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const idx = await (await fetch("stimme/index.json")).json(); const fehlt = []; let n = 0;
  for (const sz of window.Lernszenen._szenen) { if (!idx[sz.id]) continue; for (const ph of sz.phasen) { n++; const e = idx[sz.id] && idx[sz.id][stand(ph.text)]; if (!e) { fehlt.push(sz.id + ": " + ph.titel); continue; } const r = await fetch("stimme/" + e.f, { method: "HEAD" }); if (!r.ok) fehlt.push(sz.id + ": Datei fehlt " + e.f); } }
  return { n, fehlt };
});
pruefe(`alle ${luecken.n} Phasen der bereits vertonten Szenen haben Ton (neue Szenen ohne Index-Eintrag bleiben stumm)`, luecken.fehlt.length === 0, luecken.fehlt.slice(0, 6).join(" | "));

// Auswahl: Info-Satz
await page.evaluate(() => window.Lernszenen.open({}));
await page.waitForSelector("#lzGrid");
await page.waitForFunction(() => document.querySelector(".lz-info"), null, { timeout: 5000 }).catch(() => {});
pruefe("Auswahl zeigt Info-Satz „mit KI erzeugt“", !!(await page.$(".lz-info")) && /KI erzeugt/.test(await page.$eval(".lz-info", e => e.textContent)));
await page.evaluate(() => document.querySelector("#lzZu").click());

// Szene ohne Aufnahme bleibt stumm (Probe: Index ohne „rvl“ ausliefern)
await page.route("**/stimme/index.json", async route => { const r = await route.fetch(); const j = await r.json(); delete j.rvl; await route.fulfill({ response: r, json: j }); });
await page.reload(); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
await page.evaluate(() => window.Lernszenen.open({ szene: "rvl" }));
await page.waitForSelector("#lzCap"); await page.waitForTimeout(500);
pruefe("rvl (ohne Aufnahme): Stimmen-Knopf versteckt", await page.$eval("#lzStimme", e => e.hidden));
await page.click("#lzPlay"); await page.waitForTimeout(1500);
pruefe("rvl (ohne Aufnahme): kein Ton gestartet", (await anzahl()) === 0);
await page.evaluate(() => document.querySelector("#lzZu").click());
await page.unroute("**/stimme/index.json");
await page.reload(); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
await page.evaluate(() => window.Lernszenen.open({ szene: "rvl" }));
await page.waitForSelector("#lzCap"); await page.waitForTimeout(500);
pruefe("rvl (mit Aufnahme): Stimmen-Knopf sichtbar", !(await page.$eval("#lzStimme", e => e.hidden)));
await page.evaluate(() => document.querySelector("#lzZu").click());

// Langsames Netz: Index kommt erst nach dem Antippen der Szene – Knopf muss trotzdem erscheinen
await page.route("**/stimme/index.json", async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
await page.reload(); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
await page.evaluate(() => window.Lernszenen.open({}));
await page.waitForSelector("#lzGrid");
await page.evaluate(() => window.Lernszenen.open({ szene: "stop" }));
await page.waitForSelector("#lzCap"); await page.waitForTimeout(2500);
pruefe("langsamer Index: Stimmen-Knopf erscheint trotzdem", !(await page.$eval("#lzStimme", e => e.hidden)));
await page.evaluate(() => document.querySelector("#lzZu").click());
await page.unroute("**/stimme/index.json");
await page.reload(); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });

// Szene mit Stimme (Stoppschild: Phasen bei 0,2 / 4,8 / 6,6 / 9 s)
await page.evaluate(() => { try { localStorage.removeItem("lz_stimme"); } catch (e) {} window.__au.length = 0; window.Lernszenen.open({ szene: "stop" }); });
await page.waitForSelector("#lzCap"); await page.waitForTimeout(500);
pruefe("stop: Stimmen-Knopf sichtbar und an", !(await page.$eval("#lzStimme", e => e.hidden)) && (await page.$eval("#lzStimme", e => e.getAttribute("aria-pressed"))) === "true");
pruefe("stop: „Nochmal hören“ im Erklärkasten", !!(await page.$("#lzCap .lz-nochmal")));
pruefe("nichts spielt vor dem Start", (await anzahl()) === 0);
await page.click("#lzPlay");
await page.waitForFunction(() => window.__au.length >= 1, null, { timeout: 4000 }).catch(() => {});
await page.waitForTimeout(800);
pruefe("▶ startet Satz 1", (await anzahl()) >= 1 && await spielt());
const t3 = (await page.waitForTimeout(2000), await zeitSlider());
pruefe("Szene läuft beim Sprechen langsamer (nach ca. 3 s Szenenzeit unter 3 s)", t3 > 0.3 && t3 < 3.0, "Zeit " + t3);
// ⏸
await page.click("#lzPlay"); await page.waitForTimeout(300);
pruefe("⏸ pausiert den Ton", !(await spielt()));
await page.click("#lzPlay"); await page.waitForTimeout(400);
pruefe("▶ setzt den Ton fort", await spielt());
// Weiter bis Satz 2 (am Phasenende wartet die Szene bis der Satz fertig ist, dann kommt Phase 2)
await page.waitForFunction(() => window.__au.length >= 2, null, { timeout: 12000 }).catch(() => {});
const tPhase2 = await zeitSlider();
pruefe("Satz 2 startet erst nach Satz 1 / bei Phase 2", (await anzahl()) >= 2 && tPhase2 >= 4.7 && tPhase2 < 5.6, "Zeit " + tPhase2 + ", Sätze " + (await anzahl()));
pruefe("Satz 2 passt zum Erklärkasten (Phase 2)", /Haltlinie/.test(await page.$eval("#lzCap h3", e => e.textContent)) || /Stillstand/.test(await page.$eval("#lzCap h3", e => e.textContent)));
// Nochmal hören
const n1 = await anzahl();
await page.click("#lzCap .lz-nochmal"); await page.waitForTimeout(300);
pruefe("„Nochmal hören“ spielt den Satz neu", (await anzahl()) === n1 + 1 && await spielt());
// § Regeln: Info
await page.click("#lzPlay"); await page.click("#lzRegeln");
await page.waitForSelector(".lz-sheet");
pruefe("§ Regeln zeigt Info-Satz", /KI erzeugt/.test(await page.$eval(".lz-sheet", e => e.textContent)));
await page.click("#lzOk");
// Aus-Schalter
await page.click("#lzStimme"); await page.waitForTimeout(300);
pruefe("Aus-Schalter: Knopf zeigt aus", (await page.$eval("#lzStimme", e => e.getAttribute("aria-pressed"))) === "false");
pruefe("Aus-Schalter: Ton gestoppt", !(await spielt()));
pruefe("Aus-Schalter: „Nochmal hören“ weg", !(await page.$("#lzCap .lz-nochmal")));
pruefe("Aus-Schalter gemerkt", (await page.evaluate(() => localStorage.getItem("lz_stimme"))) === "0");
const n2 = await anzahl();
await page.click("#lzReset"); await page.click("#lzPlay"); await page.waitForTimeout(1500);
pruefe("bei „aus“ startet kein neuer Ton", (await anzahl()) === n2);
// Schließen stoppt
await page.click("#lzStimme");
await page.evaluate(() => document.querySelector("#lzZu").click()); await page.waitForTimeout(300);
pruefe("Schließen: kein Ton mehr", !(await spielt()));
pruefe("Konsole ohne Fehler", konsole.length === 0, konsole.join(" | "));
await browser.close(); server.close();
console.log(`${ok} ok, ${fehler} Fehler`); process.exit(fehler ? 1 : 0);
