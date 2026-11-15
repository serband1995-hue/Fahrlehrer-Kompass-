// Theorie-Akte-Test (Block 4, Wunsch Serband 15.11.2026): Der Fahrlehrer bestätigt in der Schülerakte, welche Theorie-Lektionen
// der Schüler besucht hat („Lektion nachtragen“ / „entfernen“). Geschrieben wird nur über die Funktion theorie_teilnahme_setzen, deren
// Verhalten die Attrappe nachbildet: p_schueler ist der VOLLE Stand je Datum+Lektion (wer fehlt, wird abgewählt – außer archivierte Schüler).
// Nur erfundene Testdaten. Keine Datenbank.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/theorie-akte-test.mjs
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


const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
page.on("dialog", (d) => d.accept());
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  ensureAusbildungsplaene(); ensureDB();
  const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
  DB.students = ["b1", "b2"].map((id) => ({ id, name: id === "b1" ? "Bea Erfunden" : "Bruno Erfunden", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }));
  DB.lessons = []; DB.termine = []; DB.exams = [];
  _authUser = { id: "me", email: "me@example.org" }; _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer" };
  _schuelerFristen.b1 = { vorbesitz: [] }; _schuelerFristen.b2 = { vorbesitz: [] }; _theorieBesuch = { b1: [], b2: [] };
  save();
  // Attrappe der Datenbankfunktionen (Verhalten wie theorie_teilnahme_tag/_setzen)
  const heute = KR.todayISO();
  window.__anw = { [heute + "|7"]: new Set(["x9"]) };      // x9 = fremder Schüler, war schon an Lektion 7 eingetragen
  window.__archiv = new Set();                             // archivierte Schüler lassen sich nicht abwählen
  window.__rpc = []; window.__modus = {};
  window.getSupa = () => ({ rpc: async (name, args) => {
    window.__rpc.push({ name, args: JSON.parse(JSON.stringify(args)) });
    if (window.__modus.tagFehler && name === "theorie_teilnahme_tag") return { data: null, error: { message: "Netz weg" } };
    if (name === "theorie_teilnahme_tag") { const r = []; args.p_lektionen.forEach((k) => (window.__anw[args.p_datum + "|" + k] || new Set()).forEach((id) => r.push({ schueler_id: id, lektion: k }))); return { data: r, error: null }; }
    if (name === "theorie_teilnahme_setzen") {
      if (window.__modus.setzenFehler) return { data: { fehler: window.__modus.setzenFehler }, error: null };
      args.p_lektionen.forEach((k) => { const key = args.p_datum + "|" + k; const alt = window.__anw[key] || new Set(); const neu = new Set(args.p_schueler);
        alt.forEach((id) => { if (!neu.has(id) && window.__archiv.has(id)) neu.add(id); });   // archivierte behalten ihre Anwesenheit
        window.__anw[key] = neu; });
      return { data: { ok: true, eintraege: 1 }, error: null };
    }
    return { data: [], error: null };
  }, from: () => ({ select: () => ({ eq: () => ({ then: (f) => f({ data: [], error: null }) }) }) }), auth: { getUser: async () => ({ data: { user: { id: "me" } } }), getSession: async () => ({ data: { session: null } }) } });
  routeDetail("b1");
});
await page.waitForTimeout(300);
const anw = (k) => page.evaluate((k) => [...(window.__anw[KR.todayISO() + "|" + k] || [])].sort().join(), k);

await pruefe("A1", "Akte zeigt „Lektion nachtragen“ (Tippfläche ≥ 44 px, kein Überlauf bei 360 px)", () => page.evaluate(() => {
  const b = document.querySelector(".theorie-besuch .tb-nachtragen"); if (!b) return "Knopf fehlt";
  const r = b.getBoundingClientRect(), f = [];
  if (r.height < 43.5) f.push("Knopf nur " + Math.round(r.height) + " px hoch");
  if (document.documentElement.scrollWidth > innerWidth + 1) f.push("seitlich wischbar");
  return f;
}));
await pruefe("A2", "Nachtragen Lektion 7 + 8 heute: nur Bea kommt dazu, fremder Schüler x9 bleibt in Lektion 7 (voller Stand), je Lektion ein Aufruf", async () => {
  await page.click(".theorie-besuch .tb-nachtragen"); await page.waitForTimeout(200);
  await page.click('#tnLekt .pill[data-k="8"]'); await page.click('#tnLekt .pill[data-k="7"]');
  await page.click("#tnSpeichern"); await page.waitForTimeout(500);
  const f = [];
  const a7 = await anw("7"), a8 = await anw("8");
  if (a7 !== "b1,x9") f.push("Lektion 7: " + a7);
  if (a8 !== "b1") f.push("Lektion 8: " + a8);
  const sz = await page.evaluate(() => window.__rpc.filter((x) => x.name === "theorie_teilnahme_setzen").map((x) => x.args.p_lektionen.join("+")));
  if (sz.join() !== "7,8") f.push("setzen-Aufrufe: " + sz.join("|"));
  const t = await page.evaluate(() => (document.querySelector(".theorie-besuch") || {}).textContent || "");
  if (!/2 von 14/.test(t)) f.push("Karte zeigt nicht „2 von 14“: " + t.slice(0, 90));
  if (await page.isVisible("#sheet.open")) f.push("Blatt blieb offen");
  return f;
});
await pruefe("A3", "Entfernen Lektion 7: nur Bea geht, x9 bleibt; Karte aktualisiert", async () => {
  await page.evaluate(() => { document.querySelector(".tb-liste").open = true; });
  await page.click('.theorie-besuch [data-tb="weg"][data-lektion="7"]'); await page.waitForTimeout(500);
  const f = [];
  const a7 = await anw("7"); if (a7 !== "x9") f.push("Lektion 7: " + a7);
  const t = await page.evaluate(() => (document.querySelector(".theorie-besuch") || {}).textContent || "");
  if (!/1 von 14/.test(t)) f.push("Karte: " + t.slice(0, 90));
  return f;
});
await pruefe("A4", "Eingetragene lassen sich nicht laden → nichts wird gespeichert (kein setzen-Aufruf)", async () => {
  await page.evaluate(() => { window.__rpc = []; window.__modus = { tagFehler: true }; });
  await page.click(".theorie-besuch .tb-nachtragen"); await page.waitForTimeout(200);
  await page.click('#tnLekt .pill[data-k="9"]'); await page.click("#tnSpeichern"); await page.waitForTimeout(400);
  const f = [];
  const n = await page.evaluate(() => window.__rpc.filter((x) => x.name === "theorie_teilnahme_setzen").length);
  if (n) f.push(n + " setzen-Aufrufe trotz Fehler");
  const toastT = await page.evaluate(() => document.getElementById("toast").textContent);
  if (!/nicht geladen/.test(toastT)) f.push("Meldung: " + toastT);
  if (!(await page.isVisible("#sheet.open"))) f.push("Blatt zu früh geschlossen");
  await page.evaluate(() => { window.__modus = {}; closeSheet(); });
  return f;
});
await pruefe("A5", "Keine Berechtigung (Datenbank meldet Fehler) → verständliche Meldung, Akte unverändert", async () => {
  await page.evaluate(() => { window.__modus = { setzenFehler: "keine_berechtigung" }; });
  await page.click(".theorie-besuch .tb-nachtragen"); await page.waitForTimeout(200);
  await page.click('#tnLekt .pill[data-k="9"]'); await page.click("#tnSpeichern"); await page.waitForTimeout(400);
  const toastT = await page.evaluate(() => document.getElementById("toast").textContent);
  const lokal = await page.evaluate(() => _theorieBesuch.b1.map((x) => x.lektion).join());
  await page.evaluate(() => { window.__modus = {}; closeSheet(); });
  const f = [];
  if (!/Keine Berechtigung/.test(toastT)) f.push("Meldung: " + toastT);
  if (/9/.test(lokal)) f.push("Lektion 9 trotz Fehler lokal eingetragen: " + lokal);
  return f;
});
await pruefe("A6", "Datum in der Zukunft / zu weit zurück wird abgelehnt, ohne Aufruf", async () => {
  await page.evaluate(() => { window.__rpc = []; });
  await page.click(".theorie-besuch .tb-nachtragen"); await page.waitForTimeout(200);
  await page.click('#tnLekt .pill[data-k="9"]');
  const f = [];
  const geprueft = await page.evaluate(() => { const i = document.getElementById("tnDatum"); return { max: i.max === KR.todayISO(), min: i.min < i.max }; });
  if (!geprueft.max || !geprueft.min) f.push("Datumsfeld ohne Grenzen: " + JSON.stringify(geprueft));
  await page.evaluate(() => { document.getElementById("tnDatum").value = KR.addDaysISO(KR.todayISO(), 5); });
  await page.click("#tnSpeichern"); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById("tnDatum").value = KR.addDaysISO(KR.todayISO(), -500); });
  await page.click("#tnSpeichern"); await page.waitForTimeout(200);
  const n = await page.evaluate(() => window.__rpc.length); if (n) f.push(n + " Aufrufe trotz ungültigem Datum");
  await page.evaluate(() => closeSheet());
  return f;
});
await pruefe("A7", "Mehr als 4 Lektionen an einem Tag: 5. Auswahl wird abgelehnt", async () => {
  await page.click(".theorie-besuch .tb-nachtragen"); await page.waitForTimeout(200);
  for (const k of ["1", "2", "3", "4", "5"]) await page.click(`#tnLekt .pill[data-k="${k}"]`);
  const sel = await page.evaluate(() => document.querySelectorAll("#tnLekt .pill.sel").length);
  await page.evaluate(() => closeSheet());
  return sel === 4 ? null : "ausgewählt: " + sel;
});
await pruefe("A8", "Entfernen bei archiviertem Schüler (Datenbank wählt nicht ab): Meldung, lokaler Eintrag bleibt", async () => {
  await page.evaluate(() => { __t = { }; window.__archiv.add("b1"); window.__anw[KR.todayISO() + "|8"] = new Set(["b1"]); _theorieBesuch.b1 = [{ lektion: "8", datum: KR.todayISO() }]; routeDetail("b1"); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector(".tb-liste").open = true; });
  await page.click('.theorie-besuch [data-tb="weg"][data-lektion="8"]'); await page.waitForTimeout(500);
  const toastT = await page.evaluate(() => document.getElementById("toast").textContent);
  const lokal = await page.evaluate(() => _theorieBesuch.b1.map((x) => x.lektion).join());
  const f = [];
  if (!/nicht entfernt/.test(toastT)) f.push("Meldung: " + toastT);
  if (lokal !== "8") f.push("lokal: " + lokal);
  return f;
});
await pruefe("A9", "keine JS-Fehler", () => (jsFehler.length ? jsFehler.slice(0, 5) : null));

await browser.close();
server.close();
console.log(fehler ? `Theorie-Akte-Test: ${fehler} Fehler.` : "Theorie-Akte-Test: alles in Ordnung.");
process.exit(fehler ? 1 : 0);
