// Schülerliste ordnen (W17, 🗣 Serband 26.11.2026: „die Überblick-Seite der Schüler bitte ordnen, das ist alles etwas random“).
// Prüft mit erfundenen Schülern („Muster“), am Handy 360 px:
//   S1 „Als Nächstes dran“: feste Gruppen Heute · Nächste 7 Tage · Später · Ohne Termin, je mit Anzahl, innen nach Uhrzeit bzw. A–Z
//   S2 „Lange nicht gefahren“ und „Nach Stand“: feste Gruppen in fester Reihenfolge
//   S3 die gewählte Sortierung bleibt nach dem Neuladen (je Gerät), getrennt von der Gesamtansicht (auch ohne Neuladen); kaputter Speicher → Vorgabe
//   S4 Abschnitt „Wartet“ ist A–Z sortiert
//   S5 alle vier Sortier-Knöpfe sichtbar (nichts rechts abgeschnitten), kein seitliches Wischen, keine JS-Fehler
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/schuelerliste-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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
const warte = (page, ms = 250) => page.waitForTimeout(ms);

const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));

// Erfundene Daten: Termine relativ zu heute, damit der Test an jedem Tag gilt
async function lade({ speicher } = {}) {
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600);
  await page.evaluate((speicher) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    if (speicher !== undefined) { if (speicher === null) localStorage.removeItem("kompass-sl-sort-v1"); else localStorage.setItem("kompass-sl-sort-v1", speicher); }
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const h = todayISO(), d = (n) => addDays(h, n);
    const neu = (id, name) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" }; try { ensure(s); } catch (e) {} return s; };
    DB.students = [["a", "Anna Muster"], ["b", "Bert Muster"], ["c", "Cora Muster"], ["d", "Dirk Muster"], ["e", "Eva Muster"], ["f", "Falk Muster"], ["g", "Gabi Muster"]].map(([i, n]) => neu(i, n));
    DB.lessons = []; DB.exams = []; DB.termine = [];
    const L = (sid, date, von) => DB.lessons.push({ id: "l" + DB.lessons.length, sid, date, von, bis: String(+von.slice(0, 2) + 1).padStart(2, "0") + von.slice(2), art: "fahrstunde", status: "" });
    L("g", h, "23:00"); L("g", d(-3), "09:00");  // heute (spät, damit es den ganzen Tag „künftig“ ist)
    L("b", d(2), "10:00"); L("b", d(-40), "09:00");
    L("f", d(1), "08:00");                       // morgen, nie gefahren
    L("c", d(20), "08:00"); L("c", d(-20), "09:00");
    L("e", d(-10), "09:00");                     // ohne Termin
    // Anna und Dirk: ohne Termin, nie gefahren
    // „Wartet“: per Attrappe zwei Schüler in falscher Reihenfolge (Regel selbst prüft theorie-wartet-test)
    window.__wartetEcht = wartetBuero; wartetBuero = (s) => (s.id === "x2" || s.id === "x1" ? "Theorie" : "");
    DB.students.push(neu("x2", "Zoe Muster"), neu("x1", "Ben Muster"));
    routeHome();
  }, speicher);
  await warte(page, 500);
}
const gruppen = () => page.evaluate(() => [...document.querySelectorAll("#studentGrid > .sl-gruppe")].map((g) => {
  const ids = []; let n = g.nextElementSibling;
  while (n && !n.classList.contains("sl-gruppe") && n.id !== "wartendBox") { if (n.dataset && n.dataset.id) ids.push(n.dataset.id); n = n.nextElementSibling; }
  return { t: g.firstElementChild.textContent, n: +g.querySelector(".sl-gruppe-n").textContent, ids: ids.join("") };
}));
const tippe = async (k) => { await page.click(`#view .sl-sort[data-sort="${k}"]`); await warte(page, 300); };
const soll = (ist, erwartet) => (JSON.stringify(ist) === JSON.stringify(erwartet) ? null : "ist " + JSON.stringify(ist));

await lade({ speicher: null });
await pruefe("S1", "„Als Nächstes dran“ (Vorgabe): Heute · Nächste 7 Tage · Später · Ohne Termin, mit Anzahl", async () => soll(await gruppen(), [
  { t: "Heute", n: 1, ids: "g" }, { t: "Nächste 7 Tage", n: 2, ids: "fb" }, { t: "Später", n: 1, ids: "c" }, { t: "Ohne Termin", n: 3, ids: "ade" }]));
await tippe("lange");
await pruefe("S2", "„Lange nicht gefahren“: Noch nie · über 4 Wochen · 2 bis 4 Wochen · letzte 2 Wochen", async () => soll((await gruppen()).map((g) => g.t + ":" + g.ids),
  ["Noch nie gefahren:adf", "Über 4 Wochen her:b", "2 bis 4 Wochen her:c", "In den letzten 2 Wochen:eg"]));
await tippe("stand");
await pruefe("S2", "„Nach Stand“: Gruppen mit Überschrift (alle neu → „Am Anfang“)", async () => soll((await gruppen()).map((g) => g.t + ":" + g.n), ["Am Anfang (unter 40 %):7"]));
await pruefe("S4", "Abschnitt „Wartet“ A–Z", () => page.evaluate(() => [...document.querySelectorAll("#wartendBox .s-card")].map((c) => c.dataset.id).join(",")).then((v) => (v === "x1,x2" ? null : v)));
await tippe("lange");
await lade();
await pruefe("S3", "gewählte Sortierung „Lange nicht gefahren“ bleibt nach dem Neuladen", () => page.evaluate(() => [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort).join()).then((v) => (v === "lange" ? null : "aktiv: " + v)));
await pruefe("S3", "gespeichert nur ein Wort je Ansicht (keine Schülerdaten)", () => page.evaluate(() => localStorage.getItem("kompass-sl-sort-v1")).then((v) => (v === '{"eigen":"lange"}' ? null : v)));
await tippe("stand");
await pruefe("S3", "Wahl der eigenen Ansicht gilt nicht in der Gesamtansicht (dort Vorgabe A–Z), auch ohne Neuladen", () => page.evaluate(() => {
  const echt = _fsAgg; _fsAgg = { pakete: [], lehrer: [], fahrschuleId: "fs-muster" };
  try { routeHome(); return [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort).join(); } finally { _fsAgg = echt; routeHome(); }
}).then((v) => (v === "az" ? null : "aktiv: " + v)));
await lade({ speicher: "{kaputt" });
await pruefe("S3", "kaputter Speicher → Vorgabe „Als Nächstes dran“, kein Fehler", () => page.evaluate(() => [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort).join()).then((v) => (v === "naechste" ? null : "aktiv: " + v)));
await pruefe("S5", "alle vier Sortier-Knöpfe ganz sichtbar (≥ 44 px), kein seitliches Wischen", () => page.evaluate(() => {
  const W = document.documentElement.clientWidth, f = [];
  document.querySelectorAll("#view .sl-sort").forEach((b) => { const r = b.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1) f.push(b.textContent + " abgeschnitten"); if (r.height < 43.5) f.push(b.textContent + " nur " + r.height + " px"); });
  if (document.documentElement.scrollWidth > W + 1) f.push("seitlich wischbar");
  return f;
}));
await tippe("az");
await pruefe("S5", "bei A–Z höchstens 2 Zeilen Sortier-Knöpfe (360 px)", () => page.evaluate(() => new Set([...document.querySelectorAll("#view .sl-sort")].map((b) => Math.round(b.getBoundingClientRect().top))).size).then((n) => (n <= 2 ? null : n + " Zeilen")));
await pruefe("S5", "keine JS-Fehler", () => jsFehler);
await browser.close(); server.close();
console.log(`\nSchülerliste-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
