// Zurück-Test (K10, 🗣 22.11.2026): „Auf jeder Seite ein Knopf, der eine Seite zurückspringt.“
// App: Pfeil oben links auf jeder Seite, sobald es eine vorige Seite gibt (auch Hauptseiten); Zurück führt an dieselbe Stelle,
// Android-Zurück ebenso; die doppelte Zurück-Zeile in der Seite ist dann weg; erste Seite nach dem Start ohne Pfeil.
// Büro: „‹ Zurück“ links neben dem Titel, sobald es eine vorige Seite gibt; führt an dieselbe Stelle mit denselben offenen Listen,
// Browser-/Handy-Zurück ebenso. Nur erfundene Daten (Büro: Vorführung). Aufruf: NODE_PATH=$(npm root -g) node scripts/zurueck-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
let fehler = 0, ok = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (Array.isArray(r)) r = r.length ? r.join("; ") : undefined;
  if (r === undefined || r === true) { ok++; console.log(`ok  ${id} ${text}`); } else { fehler++; console.log(`FEHLER  ${id} ${text}: ${r}`); }
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const warte = (p, ms = 350) => p.waitForTimeout(ms);

async function seite(url, w = 360, h = 740) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, locale: "de-DE" });
  await ctx.addInitScript(() => { try { localStorage.setItem("serband-theme", "light"); localStorage.removeItem("serband-app-version"); localStorage.removeItem("buero-neu-gesehen"); } catch (e) {} });
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message)); page.on("dialog", (d) => { js.push("Dialog: " + d.message()); d.dismiss(); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + url, { waitUntil: "load" }); await warte(page, 600);
  return { ctx, page, js };
}

// ---------- App ----------
const a = await seite("index.html");
const p = a.page;
await p.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  document.getElementById("bueroNotizPopup")?.remove();
  _navStack.length = 0; routeDashboard();
});
await warte(p);
const pfeil = () => p.evaluate(() => { const b = document.getElementById("navBackBtn"); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left }; });
const titel = () => p.evaluate(() => document.getElementById("tbTitle").textContent);
const y = () => p.evaluate(() => document.getElementById("view").scrollTop);

await pruefe("Z1", "erste Seite nach dem Start: kein Pfeil (es gibt keine vorige Seite)", async () => { if (await pfeil()) return "Pfeil sichtbar"; });

await pruefe("Z2", "Einstellungen weit unten → Reiter „Schüler“ → Pfeil oben links (≥ 44 px) → zurück an dieselbe Stelle, gleicher Bereich offen", async () => {
  const f = [];
  await p.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); }); await warte(p);
  await p.evaluate(() => { document.getElementById("view").scrollTop = 600; }); await warte(p, 150);
  const vor = await y(); if (vor < 400) f.push("Testaufbau: nur " + vor + " px gescrollt");
  await p.click('#tabbar [data-tab="schueler"]'); await warte(p);
  if ((await titel()) !== "Schüler") f.push("Reiter öffnet " + (await titel()));
  const pf = await pfeil();
  if (!pf) f.push("kein Pfeil auf der Hauptseite Schüler"); else { if (pf.h < 44 || pf.w < 44) f.push(`Pfeil ${pf.w}×${pf.h}`); if (pf.x > 80) f.push("Pfeil nicht links"); }
  await p.click("#navBackBtn"); await warte(p, 600);
  if ((await titel()) !== "Einstellungen") f.push("zurück zu " + (await titel()));
  const nach = await y(); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
  if (!(await p.evaluate(() => document.querySelector('.set-acc[data-acckey="app"]')?.classList.contains("open")))) f.push("Bereich „App“ nicht mehr offen");
  return f;
});

await pruefe("Z3", "Android-Zurück (Verlauf) führt ebenso an dieselbe Stelle", async () => {
  const f = [];
  await p.evaluate(() => { document.getElementById("view").scrollTop = 450; }); await warte(p, 150);
  const vor = await y();
  await p.evaluate(() => routePlanVorlagen()); await warte(p);
  await p.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate"))); await warte(p, 600);
  if ((await titel()) !== "Einstellungen") f.push("zurück zu " + (await titel()));
  const nach = await y(); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
  return f;
});

await pruefe("Z4", "Unterseite: Pfeil oben da, doppelte Zurück-Zeile in der Seite ausgeblendet", async () => {
  await p.evaluate(() => routePlanVorlagen()); await warte(p);
  const r = await p.evaluate(() => ({ pfeil: !document.getElementById("navBackBtn").hidden,
    zeile: [...document.querySelectorAll("#view .back-row .back-btn, #view #backBtn")].filter((e) => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== "none" && b.width > 0; }).length }));
  const f = []; if (!r.pfeil) f.push("kein Pfeil"); if (r.zeile) f.push(r.zeile + " Zurück-Knopf in der Seite sichtbar"); return f;
});

await pruefe("Z5", "neue Seiten bekommen den Pfeil von selbst (jede route*-Seite, die nach einer anderen geöffnet wird)", async () => {
  const r = await p.evaluate(() => {
    const ohne = [];
    for (const n of ["routeTodos", "routeStats", "routeArchive", "routeNeuigkeiten", "routeKalender", "routePruefungen"]) {
      if (typeof window[n] !== "function") continue; routeDashboard(); window[n]();
      if (document.getElementById("navBackBtn").hidden) ohne.push(n);
    }
    return ohne;
  });
  if (r.length) return "ohne Pfeil: " + r.join(", ");
});

await pruefe("Z6", "quer 740×360: Pfeil sichtbar und antippbar", async () => {
  await p.setViewportSize({ width: 740, height: 360 }); await p.evaluate(() => { routeDashboard(); routeTodos(); }); await warte(p);
  const pf = await pfeil(); await p.setViewportSize({ width: 360, height: 740 });
  if (!pf || pf.h < 44) return "Pfeil " + JSON.stringify(pf);
});
await pruefe("Z7", "App: keine JS-Fehler, kein Dialog", () => a.js);
await a.ctx.close();

// ---------- Büro ----------
for (const [w, h, n] of [[360, 740, "Handy"], [1280, 800, "PC"]]) {
  const b = await seite("buero.html?vorfuehrung", w, h);
  const q = b.page;
  await q.waitForFunction(() => window.S && S.geladenAm, null, { timeout: 8000 }).catch(() => {});
  const knopf = () => q.evaluate(() => { const k = document.getElementById("kopfZurueck"); if (!k || k.hidden) return null; const r = k.getBoundingClientRect(); return { h: r.height, w: r.width }; });
  await pruefe(`B1 [${n}]`, "Büro: beim Start kein Zurück-Knopf", async () => { if (await knopf()) return "Knopf sichtbar"; });
  await pruefe(`B2 [${n}]`, "Büro: Bereich mit Liste, weit unten, Liste offen → anderer Bereich → „‹ Zurück“ → gleiche Stelle, Liste offen", async () => {
    const f = [];
    const ids = await q.evaluate(() => BEREICHE.map((x) => x.id));
    let mitListe = null;
    for (const id of ids) { await q.evaluate((id) => { location.hash = id; }, id); await warte(q, 250); if (await q.evaluate(() => [...document.querySelectorAll("#ansicht details")].some((d) => !d.open))) { mitListe = id; break; } }
    if (!mitListe) return "kein Bereich mit Klapp-Liste in der Vorführung";
    await q.evaluate(() => { [...document.querySelectorAll("#ansicht details")].find((d) => !d.open).open = true; document.body.style.minHeight = "4000px"; window.scrollTo(0, 300); });
    await warte(q, 150); const vor = await q.evaluate(() => window.scrollY);
    const anderer = ids.find((x) => x !== mitListe);
    await q.evaluate((id) => { location.hash = id; }, anderer); await warte(q, 300);
    const k = await knopf(); if (!k) f.push("kein Zurück-Knopf"); else if (k.h < 44) f.push("Knopf " + k.h + " px hoch");
    await q.click("#kopfZurueck"); await warte(q, 500);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== mitListe) f.push("zurück zu " + (await q.evaluate(() => document.body.dataset.bereich)));
    const nach = await q.evaluate(() => window.scrollY); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
    if (!(await q.evaluate(() => [...document.querySelectorAll("#ansicht details")].some((d) => d.open)))) f.push("Liste wieder zu");
    // Browser-/Handy-Zurück ebenso
    await q.evaluate((id) => { window.scrollTo(0, 200); location.hash = id; }, anderer); await warte(q, 300);
    await q.goBack(); await warte(q, 500);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== mitListe) f.push("Browser-Zurück landet falsch");
    const nach2 = await q.evaluate(() => window.scrollY); if (Math.abs(nach2 - 200) > 3) f.push(`Browser-Zurück Stelle 200 → ${nach2}`);
    const quer = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (quer > 0) f.push(quer + " px zu breit");
    return f;
  });
  await pruefe(`B3 [${n}]`, "Büro: keine JS-Fehler, kein Dialog", () => b.js);
  await b.ctx.close();
}

await browser.close(); server.close();
console.log(`\nZurück-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
