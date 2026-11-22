// Klapp-Test (K2 + K4, 🗣 22.11.2026): kein Ruckeln beim Auf- und Zuklappen, kein Sprung nach oben beim Umschalten.
// A1 App-Einstellungen: Bereich öffnen, während darüber ein anderer zuklappt → angetippte Überschrift bleibt im Bild und springt nicht.
// A2 App-Einstellungen: Schalter (Sichtbarkeit) umlegen → Seite bleibt an derselben Stelle, Schalter hat gewechselt.
// A3 App: Tipp auf den Reiter der gerade offenen Seite führt weiter nach oben (bewusst „diese Seite neu“).
// A4 App-Ausbildungsplan: Klapp-Bereich „Fahrstunden“ → Überschrift bleibt ruhig.
// B1 Büro (Vorführung, erfundene Daten): Bereich neu zeichnen → aufgeklappte Listen bleiben offen, Seite bleibt stehen.
// Nur erfundene Testdaten, keine Datenbank. Aufruf: NODE_PATH=$(npm root -g) node scripts/klapp-test.mjs
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

async function seite(url) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: "de-DE" });
  await ctx.addInitScript(() => { try { localStorage.setItem("serband-theme", "light"); localStorage.removeItem("serband-app-version"); localStorage.removeItem("buero-neu-gesehen"); } catch (e) {} });
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message)); page.on("dialog", (d) => { js.push("Dialog: " + d.message()); d.dismiss(); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + url, { waitUntil: "load" }); await page.waitForTimeout(600);
  return { ctx, page, js };
}
// Überschrift antippen und 600 ms lang jede Bildschirm-Aktualisierung messen (Abstand zum oberen Rand von #view)
async function klappSpur(page, sel) {
  const el = await page.$(sel); await el.click({ trial: true }).catch(() => {});
  return page.evaluate(async (sel) => {
    const v = document.getElementById("view"), h = document.querySelector(sel);
    const top = () => h.getBoundingClientRect().top - v.getBoundingClientRect().top;
    const y0 = top(); h.click(); const spur = [];
    const t0 = performance.now();
    await new Promise((res) => { const f = () => { spur.push(top()); if (performance.now() - t0 < 600) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const sprung = Math.max(0, ...spur.map((y, i) => Math.abs(y - (i ? spur[i - 1] : y0))));
    return { spur: spur.map(Math.round), st: v.scrollTop, y0, ende: spur[spur.length - 1], min: Math.min(...spur), max: Math.max(...spur), sprung, hoehe: v.clientHeight };
  }, sel);
}

// ---------- App ----------
const a = await seite("index.html");
await a.page.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  document.getElementById("bueroNotizPopup")?.remove();
});

await pruefe("A1", "Einstellungen: Bereich öffnen, während darüber einer zuklappt → Überschrift bleibt im Bild, kein Sprung", async () => {
  const f = [];
  await a.page.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); });
  await a.page.waitForTimeout(500);
  await a.page.evaluate(() => { const h = document.querySelector('.set-acc[data-acckey="kal"] .acc-h'); const v = document.getElementById("view"); v.scrollTop += h.getBoundingClientRect().top - v.getBoundingClientRect().top - 420; });
  await a.page.waitForTimeout(150);
  const r = await klappSpur(a.page, '.set-acc[data-acckey="kal"] .acc-h');
  if (r.min < 0 || r.max > r.hoehe - 40) f.push(`Überschrift verlässt das Bild (${Math.round(r.min)}…${Math.round(r.max)} px)`);
  if (r.sprung > 40) f.push(`Sprung ${Math.round(r.sprung)} px in einem Bild ${JSON.stringify(r.spur)} st=${r.st}`);
  const offen = await a.page.evaluate(() => [...document.querySelectorAll(".set-acc.open")].map((x) => x.dataset.acckey).join(","));
  if (offen !== "kal") f.push("offen: " + offen);
  return f;
});

await pruefe("A2", "Einstellungen: Schalter umlegen → Seite bleibt an derselben Stelle (vorher Sprung nach oben)", async () => {
  const f = [];
  await a.page.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); });
  await a.page.waitForTimeout(500);
  const sel = '.set-acc[data-acckey="app"] [data-vis="simulator"]';
  await a.page.evaluate((sel) => { const b = document.querySelector(sel); const v = document.getElementById("view"); v.scrollTop += b.getBoundingClientRect().top - v.getBoundingClientRect().top - 300; }, sel);
  await a.page.waitForTimeout(600);
  const vor = await a.page.evaluate((sel) => ({ y: document.getElementById("view").scrollTop, on: document.querySelector(sel).classList.contains("on") }), sel);
  if (vor.y < 200) f.push("Testaufbau: nicht weit genug gescrollt (" + vor.y + ")");
  await a.page.click(sel);
  await a.page.waitForTimeout(200);
  const nach = await a.page.evaluate((sel) => ({ y: document.getElementById("view").scrollTop, on: document.querySelector(sel).classList.contains("on") }), sel);
  if (Math.abs(nach.y - vor.y) > 2) f.push(`Seite gesprungen ${vor.y} → ${nach.y}`);
  if (nach.on === vor.on) f.push("Schalter hat nicht gewechselt");
  await a.page.click(sel); // zurück
  return f;
});

await pruefe("A2b", "Schalter: Tippfläche mindestens 44 px hoch (Aussehen unverändert 54×34)", async () => {
  return a.page.evaluate(() => {
    const b = document.querySelector('.set-acc[data-acckey="app"] [data-vis]'); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect();
    const v = getComputedStyle(b, "::before"); const h = r.height - parseFloat(v.top) - parseFloat(v.bottom);
    const f = []; if (Math.round(r.height) !== 34 || Math.round(r.width) !== 54) f.push(`Größe ${r.width}×${r.height}`);
    if (h < 44) f.push("Tippfläche " + h + " px");
    // Tipp knapp über dem Schalter trifft ihn
    const t = document.elementFromPoint(r.left + r.width / 2, r.top - 4); if (!(t === b || b.contains(t))) f.push("Tipp 4 px darüber trifft nicht");
    return f;
  });
});

await pruefe("A3", "Reiter der offenen Seite antippen → nach oben (bewusst neu)", async () => {
  const f = [];
  await a.page.evaluate(() => { tabGo("heute"); });
  await a.page.waitForTimeout(400);
  await a.page.evaluate(() => { const v = document.getElementById("view"); v.style.minHeight = ""; const p = document.createElement("div"); p.style.height = "1500px"; p.id = "klappPolster"; v.querySelector(".view-inner")?.appendChild(p); v.scrollTop = 600; });
  const y = await a.page.evaluate(() => document.getElementById("view").scrollTop);
  if (y < 100) f.push("Testaufbau: kein Scroll möglich");
  await a.page.click('#tabbar [data-tab="heute"]');
  await a.page.waitForTimeout(300);
  const y2 = await a.page.evaluate(() => document.getElementById("view").scrollTop);
  if (y2 !== 0) f.push("nicht oben: " + y2);
  return f;
});

await pruefe("A4", "Ausbildungsplan: Klapp-Bereich „Fahrstunden“ → Überschrift ruhig, kein Sprung", async () => {
  const f = [];
  const da = await a.page.evaluate(() => {
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const s = { id: "kt1", name: "Erfundene Testperson", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" };
    s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] }; s.todos = [];
    DB.students = [s];
    DB.lessons = Array.from({ length: 12 }, (_, i) => ({ id: "kl" + i, date: `2026-10-${String(i + 1).padStart(2, "0")}`, von: "10:00", bis: "11:30", art: "fahrstunde", sid: "kt1", name: "", status: "erledigt", note: "", fc: null }));
    routePlan("kt1");
    return !!document.querySelector('[data-acc="fahrstunden"] > .acc-h');
  });
  if (!da) return "kein Klapp-Bereich Fahrstunden im Plan";
  await a.page.waitForTimeout(400);
  await a.page.evaluate(() => { const h = document.querySelector('[data-acc="fahrstunden"] > .acc-h'); const v = document.getElementById("view"); v.scrollTop += h.getBoundingClientRect().top - v.getBoundingClientRect().top - 300; });
  await a.page.waitForTimeout(150);
  for (const runde of ["auf", "zu"]) {
    const r = await klappSpur(a.page, '[data-acc="fahrstunden"] > .acc-h');
    if (r.sprung > 40) f.push(`${runde}: Sprung ${Math.round(r.sprung)} px`);
    if (r.min < 0 || r.max > r.hoehe - 40) f.push(`${runde}: verlässt das Bild`);
    await a.page.waitForTimeout(200);
  }
  return f;
});
await pruefe("A4b", "schnell zweimal tippen: Klappzustand stimmt, Browser-Automatik danach wieder an", async () => {
  const f = [];
  const r = await a.page.evaluate(async () => {
    const h = document.querySelector('[data-acc="fahrstunden"] > .acc-h'); const vor = h.closest(".acc").classList.contains("open");
    h.click(); await new Promise((x) => setTimeout(x, 60)); h.click(); await new Promise((x) => setTimeout(x, 900));
    return { gleich: h.closest(".acc").classList.contains("open") === vor, anker: document.getElementById("view").style.overflowAnchor };
  });
  if (!r.gleich) f.push("Zustand falsch");
  if (r.anker !== "") f.push("overflow-anchor bleibt " + r.anker);
  return f;
});
await pruefe("A5", "App: keine JS-Fehler, kein Dialog", () => a.js);
await a.ctx.close();

// ---------- Büro ----------
const b = await seite("buero.html?vorfuehrung");
await pruefe("B1", "Büro: Bereich neu zeichnen → aufgeklappte Liste bleibt offen, Seite bleibt stehen", async () => {
  const f = [];
  await b.page.waitForFunction(() => window.S && S.geladenAm, null, { timeout: 8000 }).catch(() => {});
  const ids = await b.page.evaluate(() => BEREICHE.map((x) => x.id));
  let gefunden = null;
  for (const id of ids) {
    await b.page.evaluate((id) => { location.hash = id; }, id);
    await b.page.waitForTimeout(250);
    const n = await b.page.evaluate(() => [...document.querySelectorAll("#ansicht details")].filter((d) => !d.open).length);
    if (n) { gefunden = id; break; }
  }
  if (!gefunden) return "kein Bereich mit geschlossener Klapp-Liste in der Vorführung";
  const r = await b.page.evaluate(() => {
    const d = [...document.querySelectorAll("#ansicht details")].find((x) => !x.open);
    d.open = true;
    document.body.style.minHeight = "3000px"; window.scrollTo(0, 150); const y = window.scrollY;
    zeichne();
    const d2 = [...document.querySelectorAll("#ansicht details")].find((x) => x.querySelector("summary").textContent === d.querySelector("summary").textContent);
    return { offen: !!(d2 && d2.open), y, y2: window.scrollY };
  });
  if (!r.offen) f.push(`${gefunden}: Liste nach Neuzeichnen wieder zu`);
  if (Math.abs(r.y2 - r.y) > 2) f.push(`${gefunden}: Seite gesprungen ${r.y} → ${r.y2}`);
  // Bereichswechsel springt weiter nach oben
  await b.page.evaluate(() => { location.hash = BEREICHE.find((x) => x.id !== document.body.dataset.bereich).id; });
  await b.page.waitForTimeout(300);
  if ((await b.page.evaluate(() => window.scrollY)) > 400) f.push("Bereichswechsel springt nicht mehr nach oben");
  return f;
});
await pruefe("B2", "Büro: keine JS-Fehler, kein Dialog", () => b.js);
await b.ctx.close();

await browser.close(); server.close();
console.log(`\nKlapp-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
