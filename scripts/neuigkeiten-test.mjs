// Neuigkeiten-Test (K11, 🗣 22.11.2026): Zeitstrahl aller Updates + kleiner Hinweis nach dem Update, ohne Knopf.
// N1 Datei neuigkeiten.js: oberster Eintrag = APP_VERSION (jede Werkstatt trägt ihr Update ein), Felder vollständig.
// N2 Update-Hinweis erscheint einmal mit dem Text „kurz“ und verschwindet von selbst; N3 Erst-Installation: kein Hinweis.
// N4 App: Mehr › Neuigkeiten zeigt alle Einträge, „Aktuell“ genau einmal, 360 px ohne Querscrollen.
// N5 Büro (Vorführung, erfundene Daten): Menü › Neuigkeiten zeigt den Zeitstrahl.
// Keine Datenbank, keine Schülerdaten. Aufruf: NODE_PATH=$(npm root -g) node scripts/neuigkeiten-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
let fehler = 0, ok = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === true) { ok++; console.log(`ok  ${id} ${text}`); } else { fehler++; console.log(`FEHLER  ${id} ${text}: ${r}`); }
}

const html = await readFile(join(ROOT, "index.html"), "utf8");
const appVersion = (html.match(/const APP_VERSION="([^"]+)"/) || [])[1];
const ctxVm = { window: {} }; vm.runInNewContext(await readFile(join(ROOT, "neuigkeiten.js"), "utf8"), ctxVm);
const LISTE = ctxVm.window.KOMPASS_NEU || [];
await pruefe("N1", "neuigkeiten.js: oberster Eintrag ist die aktuelle Version, Felder vollständig, Reihenfolge neu → alt", () => {
  if (!LISTE.length) return "keine Einträge";
  if (LISTE[0].version !== appVersion) return `oberster Eintrag ${LISTE[0].version}, APP_VERSION ${appVersion} – Eintrag für dieses Update fehlt`;
  const v = new Set();
  for (const e of LISTE) {
    if (!e.version || !/^\d{4}-\d{2}-\d{2}$/.test(e.datum || "") || !e.kurz || !Array.isArray(e.punkte)) return "unvollständig: " + JSON.stringify(e).slice(0, 80);
    if (v.has(e.version)) return "doppelt: " + e.version; v.add(e.version);
  }
  for (let i = 1; i < LISTE.length; i++) if (LISTE[i - 1].datum < LISTE[i].datum) return "Reihenfolge falsch bei " + LISTE[i].version;
});

const { chromium } = require("playwright");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const d = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(d);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function appSeite(gesehen) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: "de-DE" });
  await ctx.addInitScript((g) => { try { if (g) localStorage.setItem("serband-app-version", g); else localStorage.removeItem("serband-app-version"); localStorage.setItem("serband-theme", "light"); } catch (e) {} }, gesehen);
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load" });
  return { ctx, page, js };
}
const toastText = (page) => page.evaluate(() => { const t = document.getElementById("toast"); return t && t.classList.contains("show") ? { text: t.textContent, knopf: !!t.querySelector("button") } : null; });

await pruefe("N2", "nach Update: Hinweis erst nach der Anmeldung, mit dem Neu-Text, ohne Knopf, verschwindet von selbst", async () => {
  const { ctx, page, js } = await appSeite("2000.01.01.1");
  // Anmeldeseite offen: Hinweis wartet und wird noch nicht als gesehen gemerkt
  await page.waitForTimeout(3500);
  const vorher = await page.evaluate(() => localStorage.getItem("serband-app-version"));
  if (vorher !== "2000.01.01.1") { await ctx.close(); return "bei offener Anmeldeseite schon als gesehen gemerkt"; }
  await page.evaluate(() => { const e = document.getElementById("loginOverlay"); if (e) e.classList.add("hidden"); const sp = document.getElementById("splash"); if (sp) sp.style.display = "none"; });
  let gesehen = null;
  for (let i = 0; i < 30 && !gesehen; i++) { await page.waitForTimeout(200); const t = await toastText(page); if (t && t.text.includes(LISTE[0].kurz)) gesehen = t; }
  if (!gesehen) { await ctx.close(); return "kein Hinweis mit „" + LISTE[0].kurz + "“"; }
  if (gesehen.knopf) { await ctx.close(); return "Hinweis hat einen Knopf"; }
  await page.waitForTimeout(7000);
  const danach = await toastText(page);
  const gespeichert = await page.evaluate(() => localStorage.getItem("serband-app-version"));
  await ctx.close();
  if (danach && danach.text.includes(LISTE[0].kurz)) return "Hinweis nach 7 s noch sichtbar";
  if (gespeichert !== appVersion) return "Version nicht gemerkt: " + gespeichert;
  if (js.length) return "JS-Fehler: " + js[0];
});
await pruefe("N3", "Erst-Installation: kein Update-Hinweis", async () => {
  const { ctx, page } = await appSeite(null);
  let t = null; for (let i = 0; i < 20 && !t; i++) { await page.waitForTimeout(200); const x = await toastText(page); if (x && x.text.includes(LISTE[0].kurz)) t = x; }
  await ctx.close(); if (t) return "Hinweis erschien beim ersten Start";
});
await pruefe("N4", "App: Mehr › Neuigkeiten zeigt den Zeitstrahl (360 px)", async () => {
  const { ctx, page, js } = await appSeite(appVersion);
  await page.waitForTimeout(500);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } });
  await page.evaluate(() => tabGo("mehr")); await page.waitForTimeout(400);
  const knopf = page.locator('.drawer-nav .nav-item[data-nav="neuigkeiten"]');
  if (!(await knopf.count())) { await ctx.close(); return "kein Eintrag Neuigkeiten in Mehr"; }
  await knopf.first().click(); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ titel: document.getElementById("tbTitle").textContent.trim(), n: document.querySelectorAll(".nz-zs > .nz-e").length,
    tag: document.querySelectorAll(".nz-tag").length, quer: document.documentElement.scrollWidth > window.innerWidth + 1 }));
  await ctx.close();
  if (r.titel !== "Neuigkeiten") return "Titel " + r.titel;
  if (r.n !== LISTE.length) return `Einträge ${r.n} statt ${LISTE.length}`;
  if (r.tag !== 1) return "„Aktuell“ " + r.tag + "×";
  if (r.quer) return "Querscrollen bei 360 px";
  if (js.length) return "JS-Fehler: " + js[0];
});
await pruefe("N5", "Büro (Vorführung): Menü › Neuigkeiten zeigt den Zeitstrahl", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "de-DE" });
  const page = await ctx.newPage(); const js = []; page.on("pageerror", (e) => js.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "buero.html?vorfuehrung#neuigkeiten", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ titel: (document.getElementById("titel") || {}).textContent, n: document.querySelectorAll(".nz-zs > .nz-e").length,
    nav: !!document.querySelector('.nav-punkt[href="#neuigkeiten"]') }));
  await ctx.close();
  if (!r.nav) return "kein Menüpunkt Neuigkeiten";
  if (r.n !== LISTE.length) return `Einträge ${r.n} statt ${LISTE.length} (Titel ${r.titel})`;
  if (js.length) return "JS-Fehler: " + js[0];
});

await browser.close(); server.close();
console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
