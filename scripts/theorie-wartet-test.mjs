// K14-Test: grüner Knopf „Theorie bestanden“ in „Wartet auf Theorie“ (🗣 Serband 23.11.2026).
//   W1 Knopf neben jedem Namen (≥ 44 px hoch, Typ button)
//   W2 ein Tipp = gleicher Stand wie der Schalter in der Akte (Feld für Feld), 20 % sofort, Schüler weg, kein Bestätigen-Fenster
//   W3 Rückgängig stellt den alten Stand her (auch „wartet“ wieder an, Liste wieder da)
//   W4 360 px und quer: nichts ragt seitlich heraus, keine JS-Fehler
// Nur erfundene Daten, kein Netz. Aufruf: NODE_PATH=$(npm root -g) node scripts/theorie-wartet-test.mjs
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
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 300) => page.waitForTimeout(ms);

async function starte({ w = 360, h = 780 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [], dialoge = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => { dialoge.push(d.message()); d.dismiss().catch(() => {}); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    ensureAusbildungsplaene(); ensureDB();
    const mk = (id, name, anteil) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), telefon: "" }; ensure(s);
      const ids = evalSkillsFor(s); ids.slice(0, Math.round(ids.length * anteil)).forEach((x) => { s.plan.ampeln[x] = "gruen"; }); return s; };
    const a = mk("w1", "Anna Wartet", 0.5), b = mk("w2", "Ben Wartet", 0.9), c = mk("w3", "Cara Frei", 0.3);
    a.theorieWait = "2026-11-01T08:00:00.000Z"; b.theorieWait = "2026-11-05T08:00:00.000Z";
    DB.students = [a, b, c]; DB.lessons = []; DB.termine = []; DB.exams = [];
    _navStack = []; _pruefTab = "wait"; routePruefungen();
  });
  await warte(page, 400);
  return { ctx, page, jsFehler, dialoge };
}
const breit = (page) => page.evaluate(() => { const d = document.documentElement; return d.scrollWidth > d.clientWidth + 1 ? "scrollWidth " + d.scrollWidth + " > " + d.clientWidth : null; });
const namen = (page) => page.evaluate(() => [...document.querySelectorAll(".wait-card .wait-name")].map((e) => e.textContent));
const zustand = (page, id) => page.evaluate((id) => { const r = DB.students.find((s) => s.id === id); return { theorie: !!r.plan.theorie, wait: !!r.theorieWait, waitBis: !!r.theorieWaitBis, passed: !!r.theoryPassed, ready: !!r.ready, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) }; }, id);

{
  const { ctx, page, jsFehler, dialoge } = await starte();
  await pruefe("W1", "Knopf „Theorie bestanden“ neben jedem Namen, button, ≥ 44 px", () => page.evaluate(() => {
    const k = [...document.querySelectorAll("[data-theo-ok]")]; if (k.length !== 2) return "Knöpfe: " + k.length;
    for (const b of k) { if (b.tagName !== "BUTTON" || b.type !== "button") return "kein type=button"; const r = b.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) return "zu klein " + r.width + "x" + r.height; if (!/Theorie bestanden/.test(b.textContent)) return "Text " + b.textContent; }
    return null;
  }));
  // Referenz: der Schalter in der Akte (Soll-Stand) an einer Kopie von Ben; danach alles zurück
  const vorher = (await zustand(page, "w2")).stand;
  const soll = await page.evaluate(() => {
    const echt = DB.students.find((s) => s.id === "w2"); const kopie = JSON.parse(JSON.stringify(echt));
    routeDetail("w2"); document.getElementById("dashTheoToggle").click();
    const r = DB.students.find((s) => s.id === "w2");
    const out = { theorie: !!r.plan.theorie, wait: !!r.theorieWait, waitBis: !!r.theorieWaitBis, passed: !!r.theoryPassed, ready: !!r.ready, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) };
    DB.students = DB.students.map((s) => (s.id === "w2" ? kopie : s)); _pruefTab = "wait"; routePruefungen();
    return out;
  });
  await page.click('[data-theo-ok="w2"]'); await warte(page, 400);
  const ist = await zustand(page, "w2");
  await pruefe("W2a", "ein Tipp setzt dieselben Felder wie der Schalter in der Akte", () => (JSON.stringify(ist) === JSON.stringify(soll) ? null : "ist " + JSON.stringify(ist) + " soll " + JSON.stringify(soll)));
  await pruefe("W2b", "Datum heute, „wartet“ aus, 20 % sofort", () => page.evaluate((v) => {
    const r = DB.students.find((s) => s.id === "w2"); const heute = new Date().toISOString().slice(0, 10);
    return (r.theoryPassed || "").slice(0, 10) === heute && !r.theorieWait && r.plan.theorie && stand(r) > v ? null : JSON.stringify({ p: r.theoryPassed, w: r.theorieWait, s: stand(r), v });
  }, vorher));
  await pruefe("W2c", "Schüler verschwindet aus der Liste, Hinweis mit Rückgängig, kein Bestätigen-Fenster", async () => {
    const n = await namen(page); if (n.join() !== "Anna Wartet") return "Liste: " + n.join();
    const t = await page.evaluate(() => { const e = document.getElementById("toast"); return { text: e.textContent, undo: e.classList.contains("undo") }; });
    if (!t.undo || !/Rückgängig/i.test(t.text)) return "Hinweis: " + JSON.stringify(t);
    return dialoge.length ? "Fenster: " + dialoge.join("|") : null;
  });
  await pruefe("W2d", "Cloud-Zeile (ausbildung) trägt Stand, theoryPassed, Theorie ✓ – ohne „wartet“", () => page.evaluate(() => {
    _authProfile = { fahrschule_id: "fs-muster" }; _authUser = { id: "u-ich" };
    const z = _schuelerZeile(DB.students.find((s) => s.id === "w2")).ausbildung;
    return z.theoryPassed && z.plan.theorie && !z.theorieWait && z.standPct === stand(DB.students.find((s) => s.id === "w2")) ? null : JSON.stringify({ p: z.theoryPassed, w: z.theorieWait, pct: z.standPct });
  }));
  await page.evaluate(() => { const b = document.getElementById("toast").querySelector("button"); if (b) b.click(); }); await warte(page, 400);
  await pruefe("W3", "Rückgängig: alter Stand (wartet wieder an, 20 % weg, Liste wieder da)", async () => {
    const z = await page.evaluate(() => { const r = DB.students.find((s) => s.id === "w2"); return { theorie: !!r.plan.theorie, wait: r.theorieWait, passed: r.theoryPassed, ready: r.ready, waitBis: r.theorieWaitBis, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) }; });
    if (z.theorie || z.passed || z.ready || z.waitBis || z.hist) return "Rest: " + JSON.stringify(z);
    if (z.wait !== "2026-11-05T08:00:00.000Z" || z.stand !== vorher) return "Stand: " + JSON.stringify(z) + " vorher " + vorher;
    const n = await namen(page); return n.join() === "Anna Wartet,Ben Wartet" ? null : "Liste: " + n.join();
  });
  await pruefe("W4", "keine JS-Fehler", () => jsFehler);
  await pruefe("W4b", "360 px: nichts ragt heraus", () => breit(page));
  await ctx.close();
}
{
  const { ctx, page, jsFehler } = await starte({ w: 740, h: 360 });
  await pruefe("W5", "quer: nichts ragt heraus, Knopf ≥ 44 px", async () => (await breit(page)) || page.evaluate(() => { const b = document.querySelector("[data-theo-ok]"); return b && b.getBoundingClientRect().height >= 43.5 ? null : "Knopf klein/fehlt"; }));
  await pruefe("W5b", "keine JS-Fehler (quer)", () => jsFehler);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\nTheorie-wartet-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
