// Kalender: Termine erst nach 0,8 s Halten ziehen (W17, 🗣 Serband 26.11.2026: „manchmal passiert das aus Versehen“).
// Wochenansicht am Handy (360 px), erfundener Schüler „Muster“, keine Datenbank:
//   H1 kurz tippen → Termin öffnet sich, nichts verschoben
//   H2 0,5 s halten, dann bewegen → kein Ziehen, Termin bleibt
//   H3 0,9 s halten → Karte hebt sich („scharf“), dann auf freies Feld ziehen → verschoben
//   H4 Karten lassen das Scrollen zu (touch-action nicht „none“), lange Halten öffnet kein Kontextmenü
//   H5 Finger (Touch) 0,9 s halten und ziehen → verschoben; Finger sofort bewegen → kein Ziehen
//   H7 Finger hält und zieht nach unten (scrollbare Woche) → Browser bricht nicht ab; H8 kein Wochenwechsel nach Halten + Zug zur Seite
//   H9 lange gehalten, ohne Ziehen losgelassen → öffnet nichts
//   H6 keine JS-Fehler
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/kalender-halten-test.mjs
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

async function lade() {
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const s = { id: "m1", name: "Mia Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" };
    try { ensure(s); } catch (e) {}
    DB.students = [s]; DB.exams = []; DB.termine = [];
    // Termin morgen (Sonntag → übermorgen), damit er sicher in der Zukunft und in der gezeigten Woche liegt
    let tag = addDays(todayISO(), 1); if (weekdayMon0(tag) === 6) tag = addDays(tag, 1);
    DB.lessons = [{ id: "L1", sid: "m1", date: tag, von: "12:00", bis: "12:45", art: "fahrstunde", status: "geplant" }];
    // Weitere Termine in der Woche, damit die Ansicht scrollbar ist (wie im echten Alltag; sonst bricht der Browser nie ab)
    const ws = isoWeekStart(tag); let n = 0;
    for (let d = 0; d < 6; d++) ["08:00", "10:00", "14:00", "16:00"].forEach((v, k) => { const day = addDays(ws, d); if ((d + k) % 2 === 0 && !(day === tag && v === "12:00")) DB.lessons.push({ id: "F" + n++, sid: "m1", date: day, von: v, bis: v.slice(0, 2) + ":45", art: "fahrstunde", status: "geplant" }); });
    _calView = "woche"; _calDate = tag;
    routeKalender();
  });
  await warte(page, 500);
}
const termin = () => page.evaluate(() => { const l = DB.lessons.find((x) => x.id === "L1"); return l.date + " " + l.von; });
const mitte = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const freiesFeld = async () => {
  const sel = await page.evaluate(() => { const ch = document.querySelector('.cw-draggable[data-dragid="L1"]').getBoundingClientRect();
    const f = [...document.querySelectorAll(".cw-free[data-freeslot]")].map((e) => ({ e, r: e.getBoundingClientRect() })).find((x) => x.r.top > ch.bottom + 4 && x.r.height > 0 && x.r.top < innerHeight - 80);
    if (!f) return null; f.e.setAttribute("data-testziel", "1"); return f.e.dataset.freeslot; });
  return sel ? { slot: sel, ...(await mitte('[data-testziel="1"]')) } : null;
};
const CHIP = '.cw-draggable[data-dragid="L1"]';

await lade();
await pruefe("H4", "Karte lässt Scrollen zu (touch-action nicht „none“), Text nicht markierbar", () => page.evaluate((sel) => {
  const c = document.querySelector(sel); if (!c) return "keine ziehbare Karte";
  const st = getComputedStyle(c); const f = [];
  if (st.touchAction === "none") f.push("touch-action: none");
  if (st.userSelect !== "none" && st.webkitUserSelect !== "none") f.push("Text markierbar");
  const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); c.dispatchEvent(ev); if (!ev.defaultPrevented) f.push("Kontextmenü nicht verhindert");
  return f;
}, CHIP));
// H1 kurz tippen
{
  const vor = await termin(); const p = await mitte(CHIP);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await warte(page, 120); await page.mouse.up(); await warte(page, 500);
  const offen = await page.evaluate(() => typeof sheetOffen === "function" && sheetOffen());
  await pruefe("H1", "kurz tippen öffnet den Termin, nichts verschoben", async () => [!offen && "Termin nicht geöffnet", (await termin()) !== vor && "verschoben"].filter(Boolean));
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} }); await warte(page, 400);
}
// H2 0,5 s halten + bewegen
await lade();
{
  const vor = await termin(); const p = await mitte(CHIP); const z = await freiesFeld();
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await warte(page, 500);
  await page.mouse.move(z.x, z.y, { steps: 8 }); await warte(page, 100);
  const clone = await page.evaluate(() => !!document.querySelector(".cw-drag-clone"));
  await page.mouse.up(); await warte(page, 500);
  await pruefe("H2", "0,5 s halten und bewegen → kein Ziehen, Termin bleibt", async () => [clone && "Zieh-Karte erschienen", (await termin()) !== vor && "verschoben auf " + (await termin())].filter(Boolean));
}
// H3 0,9 s halten + ziehen
await lade();
{
  const p = await mitte(CHIP); const z = await freiesFeld();
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await warte(page, 400);
  const frueh = await page.evaluate((s) => document.querySelector(s).classList.contains("cw-scharf"), CHIP);
  await warte(page, 500);
  const scharf = await page.evaluate((s) => document.querySelector(s).classList.contains("cw-scharf"), CHIP);
  await page.mouse.move(z.x, z.y, { steps: 10 }); await warte(page, 150);
  await page.mouse.up(); await warte(page, 600);
  const [d, v] = z.slot.split("|");
  const offen = await page.evaluate(() => typeof sheetOffen === "function" && sheetOffen());
  await pruefe("H3", "0,9 s halten → Karte hebt sich, ziehen → verschoben, kein Fenster", async () => [frueh && "schon nach 0,4 s scharf", !scharf && "nach 0,9 s nicht scharf", (await termin()) !== d + " " + v && "nicht verschoben: " + (await termin()) + " statt " + d + " " + v, offen && "Termin-Fenster geöffnet"].filter(Boolean));
}
// H5 Finger (Touch über CDP)
const cdp = await ctx.newCDPSession(page);
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) });
const fingerZug = async (von, nach, halten) => {
  await touch("touchStart", [von]); await warte(page, halten);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", [{ x: von.x + ((nach.x - von.x) * i) / 10, y: von.y + ((nach.y - von.y) * i) / 10 }]); await warte(page, 20); }
  await warte(page, 120); await touch("touchEnd", []); await warte(page, 600);
};
await lade();
{
  const vor = await termin(); const p = await mitte(CHIP); const z = await freiesFeld();
  await fingerZug(p, z, 100);
  await pruefe("H5", "Finger sofort bewegen → kein Ziehen (normales Scrollen)", async () => ((await termin()) !== vor ? "verschoben" : null));
}
await lade();
{
  const p = await mitte(CHIP); const z = await freiesFeld();
  await fingerZug(p, z, 900);
  const [d, v] = z.slot.split("|");
  await pruefe("H5", "Finger 0,9 s halten, dann ziehen → verschoben", async () => ((await termin()) !== d + " " + v ? "nicht verschoben: " + (await termin()) : null));
}
// H7 (Prüfer Bedienung W17): Finger hält, zieht dann 100 px nach unten → Zieh-Karte erscheint (Browser bricht nicht ab)
const mitteKarte = () => page.evaluate(() => { const r = [...document.querySelectorAll(".cw-draggable")].map((e) => e.getBoundingClientRect()).find((r) => r.top > 200 && r.bottom < innerHeight - 250); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
await lade();
{
  const p = (await mitteKarte()) || (await mitte(CHIP));
  await touch("touchStart", [p]); await warte(page, 950);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", [{ x: p.x, y: p.y + i * 10 }]); await warte(page, 20); }
  const clone = await page.evaluate(() => !!document.querySelector(".cw-drag-clone"));
  await touch("touchEnd", []); await warte(page, 600);
  await pruefe("H7", "Finger 0,95 s halten, dann 100 px nach unten → wird gezogen (kein Abbruch)", () => (clone ? null : "keine Zieh-Karte (Browser hat abgebrochen)"));
}
// H8: lange halten, breit nach rechts ziehen und loslassen → die Woche springt nicht
await lade();
{
  const p = (await mitteKarte()) || (await mitte(CHIP));
  const vorher = await page.evaluate(() => _calDate);
  await touch("touchStart", [p]); await warte(page, 1200);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", [{ x: p.x + i * 20, y: p.y + 4 }]); await warte(page, 20); }
  await touch("touchEnd", []); await warte(page, 700);
  const nachher = await page.evaluate(() => _calDate);
  await pruefe("H8", "lange halten und breit zur Seite ziehen → kein Wochenwechsel", () => (nachher === vorher ? null : vorher + " → " + nachher));
}
// H9: gehalten (scharf) und ohne Bewegen nach 1,8 s losgelassen → öffnet nichts
await lade();
{
  const p = await mitte(CHIP);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await warte(page, 1800); await page.mouse.up(); await warte(page, 400);
  const offen = await page.evaluate(() => typeof sheetOffen === "function" && sheetOffen());
  const h = await page.evaluate((s) => { const c = document.querySelector(s); return (!!c && c.classList.contains("cw-scharf")) || _calDragActive; }, CHIP);
  await pruefe("H9", "1,8 s gehalten, ohne Ziehen losgelassen → kein Fenster, Karte wieder normal", () => [offen && "Termin geöffnet", h && "Karte bleibt scharf/gesperrt"].filter(Boolean));
}
await pruefe("H6", "keine JS-Fehler", () => jsFehler);
await browser.close(); server.close();
console.log(`\nKalender-Halten-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
