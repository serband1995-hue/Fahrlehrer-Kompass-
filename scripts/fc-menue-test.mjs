// Fahrcheck-Menü zeigt die echte Zahl (W17, 🗣 Serband 26.11.2026: nur volle 45 Minuten, 45 = 1, 90 = 2, 135 = 3 Fahrchecks).
// Erfundener Schüler „Muster“, keine Datenbank, Handy 360 px:
//   M1 45 Min: „1 FC erhalten“, kein „2 FC“ im Menü und im Termin-Fenster
//   M2 90 Min: „2 FC erhalten“, „2 FC vergessen“
//   M3 135 Min: „3 FC erhalten“, „Alle 3 FC vergessen“, „Nur 2 FC · bewusst“
//   M4 40 Min: keine Fahrcheck-Wahl, Hinweis „kürzer als 45 Minuten“
//   M5 Vermerk „vergessen“ bei 135 Min: Termin-Fenster „Alle 3 FC vergessen“, Liste „3 FC fehlen“
//   M7 alte Vermerke: unter 45 Min zurücksetzbar, nie „0 FC“; 45 Min mit altem „2 vergessen“ markiert
//   M6 keine JS-Fehler, Knöpfe ≥ 44 px
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fc-menue-test.mjs
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
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await page.waitForTimeout(600);
await page.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  ensureAusbildungsplaene(); ensureDB();
  const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
  const s = { id: "m1", name: "Mia Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" };
  try { ensure(s); } catch (e) {}
  DB.students = [s]; DB.exams = []; DB.termine = [];
  const d = addDays(todayISO(), -1);
  DB.lessons = [["L45", "10:00", "10:45"], ["L90", "11:00", "12:30"], ["L135", "13:00", "15:15"], ["L40", "16:00", "16:40"]]
    .map(([id, von, bis]) => ({ id, sid: "m1", date: d, von, bis, art: "fahrstunde", status: "gefahren" }));
  routeDashboard();
});
const menue = (id) => page.evaluate((id) => { try { closeSheet(); } catch (e) {} openFCMenu(id);
  const sh = document.getElementById("sheet"); const k = [...sh.querySelectorAll("[data-fcset]")];
  return { text: sh.textContent.replace(/\s+/g, " "), knoepfe: k.map((b) => b.dataset.fcset), minH: k.length ? Math.min(...k.map((b) => b.getBoundingClientRect().height)) : 99 }; }, id);
const termin = (id) => page.evaluate((id) => { try { closeSheet(); } catch (e) {} openEventSheet("lesson", id, "m1"); const b = document.getElementById("esFC"); return b ? b.textContent.replace(/\s+/g, " ") : "kein Knopf"; }, id);
await page.waitForTimeout(400);
let m = await menue("L45");
await pruefe("M1", "45 Min: Menü „1 FC erhalten“, kein „2 FC“", () => [!/Normal · 1 FC erhalten/.test(m.text) && "kein „1 FC erhalten“", /2 FC/.test(m.text) && "„2 FC“ im Menü"].filter(Boolean));
await page.waitForTimeout(300);
const t45 = await termin("L45");
await pruefe("M1", "45 Min: Termin-Fenster „1 FC erhalten“", () => (/1 FC erhalten/.test(t45) ? null : t45));
m = await menue("L90");
await pruefe("M2", "90 Min: „2 FC erhalten“ und „2 FC vergessen“", () => [!/Normal · 2 FC erhalten/.test(m.text) && "kein „2 FC erhalten“", !/2 FC vergessen/.test(m.text) && "kein „2 FC vergessen“"].filter(Boolean));
m = await menue("L135");
await pruefe("M3", "135 Min: „3 FC erhalten“, „Alle 3 FC vergessen“, „Nur 2 FC · bewusst“", () => ["Normal · 3 FC erhalten", "Alle 3 FC vergessen", "Nur 2 FC · bewusst"].filter((x) => !m.text.includes(x)).map((x) => "fehlt: " + x));
await pruefe("M6", "Knöpfe im Menü ≥ 44 px", () => (m.minH >= 43.5 ? null : "nur " + m.minH));
m = await menue("L40");
await pruefe("M4", "40 Min: keine Fahrcheck-Wahl, Hinweis „kürzer als 45 Minuten“", () => [m.knoepfe.length && "Knöpfe: " + m.knoepfe.join(","), !/kürzer als 45 Minuten/.test(m.text) && "kein Hinweis"].filter(Boolean));
// M7 (Prüfer Bedienung): alte Vermerke – 40 Min mit „vergessen“ lässt sich zurücksetzen, nie „0 FC“; 45 Min mit altem v2 ist markiert
await page.evaluate(() => { const l = DB.lessons.find((x) => x.id === "L40"); l.fc = "v1"; const k = DB.lessons.find((x) => x.id === "L45"); k.fc = "v2"; });
m = await menue("L40");
const t40 = await termin("L40");
await pruefe("M7", "40 Min mit altem Vermerk: „Vermerk entfernen“ da, Termin-Fenster „Kein Fahrcheck“, nie „0 FC“", () => [!m.knoepfe.includes("normal") && "kein Zurücksetzen", !/Kein Fahrcheck/.test(t40) && "Termin: " + t40, /0 FC/.test(t40 + m.text) && "„0 FC“ sichtbar"].filter(Boolean));
const m45 = await page.evaluate(() => { try { closeSheet(); } catch (e) {} openFCMenu("L45"); const on = document.querySelector("#sheet [data-fcset].on"); return on ? on.dataset.fcset : ""; });
await pruefe("M7", "45 Min mit altem „2 vergessen“: im Menü markiert", () => (m45 === "v2" ? null : "markiert: " + m45));
await page.evaluate(() => { try { closeSheet(); } catch (e) {} setFC("L40", "normal"); }); await page.waitForTimeout(300);
await pruefe("M7", "Vermerk entfernen wirkt", () => page.evaluate(() => DB.lessons.find((x) => x.id === "L40").fc || null).then((v) => (v ? "noch " + v : null)));
await page.evaluate(() => { try { closeSheet(); } catch (e) {} setFC("L135", "v2"); }); await page.waitForTimeout(300);
const t135 = await termin("L135");
const liste = await page.evaluate(() => { try { closeSheet(); } catch (e) {} return typeof fcForgottenLessons === "function" ? fcForgottenLessons().map((l) => l.id).join(",") : ""; });
await pruefe("M5", "135 Min „vergessen“: Termin-Fenster „Alle 3 FC vergessen“, in der Vergessen-Liste", () => [!/Alle 3 FC vergessen/.test(t135) && "Termin: " + t135, !liste.split(",").includes("L135") && "Liste: " + liste].filter(Boolean));
await pruefe("M6", "keine JS-Fehler", () => jsFehler);
await browser.close(); server.close();
console.log(`\nFahrcheck-Menü-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
