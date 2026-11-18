// Prüfer-Akte-Test (18.11.2026): Reiter „Schüler“, „Strecken & Notizen“, „Profil“; Notiz der Prüfung erscheint; Briefing zeigt letzte Strecke.
// Keine Datenbank: Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/pruefer-akte-test.mjs
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
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehlerZahl = 0, okZahl = 0, uebersprungen = 0;
// fn liefert: nichts/true = ok, Text = Fehlergrund, { skip: "Grund" } = übersprungen
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r && typeof r === "object" && r.skip) { uebersprungen++; console.log(`übersprungen  ${id} ${text}: ${r.skip}`); return; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const NOTIZ = "Start Prüfstelle, Richtung Ortsteil A, Tempo-30-Zone, dann Autobahn, Grundfahraufgaben, zurück.";
async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate((notiz) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const neu = (id, name) => ({ id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)) });
    DB.students.push(neu("t1", "Erfundene Testperson Eins"), neu("t2", "Erfundene Testperson Zwei mit sehr langem Namen"), Object.assign(neu("t3", "Alte Testperson"), { passed: "2026-01-10", passedPruefer: "Prüfer Test", passedStrecke: "Alte Strecke ohne Eintrag" }));
    DB.pruefer.push("Prüfer Test"); ensurePruefer("Prüfer Test").routen.push(["Ort A", "Ort B"]);
    DB.exams.push({ id: "e1", sid: "t1", name: "Erfundene Testperson Eins", date: "2026-11-18", result: "pass", pruefer: "Prüfer Test", note: notiz, attempt: 1, faults: [] });
    DB.exams.push({ id: "e2", sid: "t2", name: "Erfundene Testperson Zwei mit sehr langem Namen", date: "2026-10-01", result: "fail", pruefer: "Prüfer Test", note: "", attempt: 1, faults: ["be_anweis"], eingriff: true, eingNote: "Vorfahrt missachtet" });
    routePrueferAkte("Prüfer Test");
  }, NOTIZ);
  return { ctx, page, jsFehler };
}
const text = (page) => page.evaluate(() => document.getElementById("view").innerText.replace(/\s+/g, " "));
const breiter = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

for (const [w, h] of [[360, 780], [412, 915], [780, 360]]) {
  const { ctx, page, jsFehler } = await neueSeite(w, h);
  await pruefe(`A ${w}`, "Reiter da, Schüler-Liste zeigt beide Ergebnisse und alten Schüler", async () => {
    const t = await text(page);
    const f = [];
    for (const s of ["Schüler", "Strecken & Notizen", "Profil", "Erfundene Testperson Eins", "bestanden", "nicht best.", "Alte Testperson"]) if (!t.includes(s)) f.push(`fehlt „${s}“`);
    if (await breiter(page)) f.push("seitlich scrollbar");
    return f;
  });
  await pruefe(`B ${w}`, "Reiter Strecken & Notizen zeigt Notiz, Fehler, Eingriff, alte Strecke, zusammengestellte Strecke", async () => {
    await page.click('[data-pftab="strecken"]'); await page.waitForTimeout(200);
    const t = await text(page); const f = [];
    for (const s of [NOTIZ, "Vorfahrt missachtet", "Anweisung des Prüfers", "Alte Strecke ohne Eintrag", "Ort A", "+ Strecke zusammenstellen"]) if (!t.includes(s)) f.push(`fehlt „${s.slice(0, 30)}“`);
    if (await breiter(page)) f.push("seitlich scrollbar");
    return f;
  });
  await pruefe(`C ${w}`, "Reiter Profil zeigt Notizfeld, Tags, Umbenennen", async () => {
    await page.click('[data-pftab="profil"]'); await page.waitForTimeout(200);
    const f = [];
    for (const sel of ["#pfNote", "#tagAdd", "#renamePruefer", "#delPruefer"]) if (!(await page.locator(sel).count())) f.push(`fehlt ${sel}`);
    if (await breiter(page)) f.push("seitlich scrollbar");
    await page.screenshot({ path: `${process.env.BILDER_DIR||"/tmp"}/akte-profil-${w}.png` }).catch(() => {});
    return f;
  });
  await pruefe(`D ${w}`, "Tipp auf Schüler öffnet den Schüler", async () => {
    await page.click('[data-pftab="schueler"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: `${process.env.BILDER_DIR||"/tmp"}/akte-schueler-${w}.png` }).catch(() => {});
    await page.locator('.pf-exam-btn[data-sid="t1"]').click(); await page.waitForTimeout(300);
    const t = await text(page);
    if (!t.includes("Erfundene Testperson Eins")) return "Schülerseite nicht geöffnet";
  });
  await pruefe(`E ${w}`, "Briefing beim Ergebnis-Eintragen zeigt letzte Strecke", async () => {
    const h = await page.evaluate(() => prueferHintHTML("Prüfer Test"));
    if (!h.includes("Zuletzt (18.11.26)")) return "keine letzte Strecke im Briefing";
  });
  await pruefe(`F ${w}`, "keine JS-Fehler", async () => jsFehler);
  await ctx.close();
}
{
  const { ctx, page, jsFehler } = await neueSeite(412, 915);
  await pruefe("G", "Reaktivierte/doppelte alte Einträge nicht zeigen, Umbenennen nimmt alte Schüler mit", async () => {
    return page.evaluate(() => {
      const f = [];
      const c = DB.students.find((x) => x.id === "t1");
      DB.students.push(Object.assign({}, c, { id: "t4", name: "Reaktiviert", passed: undefined, passedPruefer: "Prüfer Test", passedStrecke: "x" }));
      DB.students.push(Object.assign({}, c, { id: "t5", name: "Doppelt", passed: "2026-02-01", passedPruefer: "Prüfer Test", passedStrecke: "y" }));
      DB.exams.push({ id: "e5", sid: "t5", name: "Doppelt", date: "2026-02-01", result: "pass", pruefer: "Anderer", attempt: 1, faults: [] });
      const v = prueferVerlauf("Prüfer Test").map((e) => e.name);
      if (v.includes("Reaktiviert")) f.push("reaktivierter Schüler erscheint");
      if (v.includes("Doppelt")) f.push("doppelter alter Eintrag erscheint");
      mergePruefer("Prüfer Test", "Prüfer Neu");
      if (!prueferVerlauf("Prüfer Neu").some((e) => e.name === "Alte Testperson")) f.push("alter Schüler nach Umbenennen weg");
      return f;
    });
  });
  await pruefe("G2", "keine JS-Fehler", async () => jsFehler);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${okZahl} ok · ${fehlerZahl} Fehler · ${uebersprungen} übersprungen`);
process.exit(fehlerZahl ? 1 : 0);
