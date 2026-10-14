// Schülerdaten-Test (14.10.2026): Behörde, Vorbesitz, Umschreiber und Sehhilfe in der Fahrlehrer-App.
// Prüft die Akte (Karte „Behörde“, Hinweise zu Theorie-Frist und ausländischem Führerschein), das Bearbeiten-Blatt
// am Handy (360 px, quer), den Lkw-Weg aus dem Vorbesitz und den Abgleich der Sehhilfe mit dem Büro.
// Nur erfundene Testdaten. Keine Datenbank: getSupa() ist eine Attrappe, die Schreibvorgänge mitschreibt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/schuelerdaten-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehler = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { console.log(`ok  ${id} ${text}`); return; }
  fehler++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const HILFEN = `
window.__t = {
  setze() {
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name, form, extra) => { const s = Object.assign({ id, name, form, created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }, extra || {}); ensure(s); return s; };
    DB.students = [mk("u1", "Umut Erfunden", "B", { umschreiber: true }), mk("ce1", "Cem Erfunden", "CE"), mk("ce2", "Cora Erfunden", "CE"), mk("ce3", "Cid Erfunden", "CE", { lkwWeg: "C" }), mk("b1", "Bea Erfunden", "B", { sehhilfe: true })];
    DB.lessons = []; DB.termine = []; DB.exams = [];
    _authUser = { id: "me", email: "me@example.org" }; _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer" };
    const h = KR.todayISO();
    _schuelerFristen.u1 = { ausbildungsart: "umschreibung", bewerbernummer: "RL-0815", theorie_frist_bis: KR.addDaysISO(h, 10), vorbesitz: [],
      auslands_fs: [{ land: "Syrien", klasse: "B", nummer: "SY-1", behoerde: "Damaskus", erteilt_am: "2019-05-02" }] /* Reihenfolge wie aus der Datenbank (jsonb) */, wohnsitz_de_seit: KR.addDaysISO(h, -175), uebersetzung_vorhanden: false };
    _schuelerFristen.ce1 = { vorbesitz: ["B", "C"] };
    _schuelerFristen.ce2 = { vorbesitz: ["B"] };
    _schuelerFristen.ce3 = { vorbesitz: ["B"] };
    save();
  },
  stud: (id) => DB.students.find((x) => x.id === id),
};`;
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate((h) => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.__schreib = [];
  const upd = (tab) => ({ update: (w) => ({ eq: (_k, id) => ({ select: async () => { window.__schreib.push({ tab, id, w }); return { data: [{ id }], error: null }; } }) }) });
  window.getSupa = () => ({ from: (tab) => Object.assign(Object.create(null), { update: upd(tab).update, select: () => q, upsert: leer, insert: () => q, delete: () => q, eq: () => q, in: () => q, is: () => q }), rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
  (0, eval)(h);
  __t.setze();
}, HILFEN);


await pruefe("D1", "Akte Umschreiber: Karte „Behörde“ mit Bewerbernummer, Führerschein, „Darf fahren bis“; Warnung Theorie-Frist und Führerschein", () => page.evaluate(() => {
  routeDetail("u1");
  const t = document.querySelector("#view").textContent, f = [];
  if (!/Bewerbernummer/.test(t) || !/RL-0815/.test(t)) f.push("Bewerbernummer fehlt");
  if (!/Führerschein Syrien/.test(t) || !/SY-1/.test(t)) f.push("ausländischer Führerschein fehlt");
  if (!/Darf fahren bis/.test(t)) f.push("Darf fahren bis fehlt");
  if (!/Theorieprüfung muss bis/.test(t)) f.push("Warnung Theorie-Frist fehlt");
  if (!/Ausländischer Führerschein gilt nur noch bis/.test(t)) f.push("Warnung Führerschein fehlt");
  return f;
}));
await pruefe("D2", "Bearbeiten-Blatt: speichert nur Geändertes (Bewerbernummer, Vorbesitz, Übersetzung) direkt in schueler", async () => {
  await page.evaluate(() => { routeDetail("u1"); document.querySelector("#behoerdeBearb").click(); });
  await page.waitForTimeout(200);
  await page.fill("#bhNr", "RL-0816");
  await page.click('#bhVorbesitz .pill[data-k="B"]');
  await page.click("#bhUebers");
  await page.click("#bhSpeichern"); await page.waitForTimeout(300);
  return page.evaluate(() => {
    const w = (window.__schreib.filter((x) => x.tab === "schueler" && x.id === "u1").pop() || {}).w || {};
    const f = [];
    if (w.bewerbernummer !== "RL-0816") f.push("Bewerbernummer " + w.bewerbernummer);
    if (JSON.stringify(w.vorbesitz) !== '["B"]') f.push("Vorbesitz " + JSON.stringify(w.vorbesitz));
    if ("auslands_fs" in w || w.uebersetzung_vorhanden !== true) f.push("nur Geändertes senden (Führerschein unverändert, Übersetzung neu): " + JSON.stringify(w));
    if ("theorie_frist_bis" in w) f.push("App schreibt die Theorie-Frist (nur Büro)");
    if (_schuelerFristen.u1.bewerbernummer !== "RL-0816") f.push("Akte nicht aktualisiert");
    return f;
  });
});
await pruefe("D3", "Akte und Blatt bei 360 px und quer: nichts seitlich wischbar", async () => {
  const f = [];
  for (const [w, h] of [[360, 780], [780, 360]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => { closeSheet(); routeDetail("u1"); }); await page.waitForTimeout(200);
    let b = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (b > 1) f.push(`Akte ${w}×${h}: ${b} px zu breit`);
    await page.evaluate(() => document.querySelector("#behoerdeBearb").click()); await page.waitForTimeout(200);
    b = await page.evaluate(() => { const sh = document.querySelector("#sheet"); return Math.max(document.documentElement.scrollWidth - window.innerWidth, sh.scrollWidth - sh.clientWidth); });
    if (b > 1) f.push(`Blatt ${w}×${h}: ${b} px zu breit`);
  }
  await page.evaluate(() => closeSheet());
  await page.setViewportSize({ width: 412, height: 915 });
  return f;
});
await pruefe("D4", "Lkw-Weg aus dem Vorbesitz: CE mit C → 5/2/3, CE nur mit B → C+CE 8/3/3, selbst gewählter Weg geht vor", () => page.evaluate(() => {
  const w = (id) => sonderWerte(__t.stud(id)).join("/");
  const f = [];
  if (w("ce1") !== "5/2/3") f.push("ce1 " + w("ce1"));
  if (w("ce2") !== "8/3/3") f.push("ce2 " + w("ce2"));
  if (w("ce3") !== "5/2/3") f.push("ce3 " + w("ce3"));
  if (!lkwStufen(__t.stud("ce2")).flatMap((s) => s.items.map((i) => i.id)).includes("lk_gfa_rampe_r")) f.push("ce2 ohne C-Grundfahraufgaben");
  return f;
}));
await pruefe("D5", "Sehhilfe: Tippen schreibt in schueler; ein Wert aus dem Büro wird übernommen", async () => {
  await page.evaluate(() => { window.__schreib = []; routeDetail("ce1"); document.querySelector("#sehhilfeBtn").click(); });
  await page.waitForTimeout(200);
  return page.evaluate(async () => {
    const f = [];
    const w = window.__schreib.find((x) => x.id === "ce1");
    if (!w || w.w.sehhilfe !== true) f.push("Tippen schreibt nicht: " + JSON.stringify(window.__schreib));
    if (__t.stud("ce1")._sehhilfeOffen) f.push("bleibt als offen markiert");
    // Büro hat „nein“ eingetragen → App übernimmt
    const rows = [{ id: "b1", name: "Bea Erfunden", klasse: "B", status: "aktiv", fahrlehrer_id: "me", sehhilfe: false }];
    const alt = window.getSupa;
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok) => ok({ data: [], error: null }) : k === "single" || k === "maybeSingle" ? async () => ({ data: null, error: null }) : () => q), apply: () => q });
    window.getSupa = () => ({ from: (t) => t === "schueler" ? { select: () => ({ eq: () => ({ eq: async () => ({ data: rows, error: null }) }) }), update: alt().from("schueler").update } : q, rpc: async () => ({ data: null, error: null }) });
    try { await pullSchuelerZuweisungen(); } catch (e) { f.push("Ausnahme " + e.message); }
    window.getSupa = alt;
    if (__t.stud("b1").sehhilfe !== false) f.push("Büro-Wert nicht übernommen");
    return f;
  });
});
await pruefe("D6", "keine JS-Fehler", () => (jsFehler.length ? jsFehler.slice(0, 5) : null));

await browser.close();
server.close();
console.log(fehler ? `Schülerdaten-Test: ${fehler} Fehler.` : "Schülerdaten-Test: alles in Ordnung.");
process.exit(fehler ? 1 : 0);
