// Paket 2: Fenster-Stapel, Zurück, Rückfrage bei Eingaben, Rückgängig, Korrigieren (App, index.html).
// Erfundene Testdaten, keine Datenbank (Supabase-Bibliothek gesperrt).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fenster-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.APP_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const body = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(body);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let rot = 0, gruen = 0;
const fall = async (name, fn) => {
  let p = [];
  try { p = (await fn()) || []; } catch (e) { p = ["Testfehler: " + String(e.message || e).split("\n")[0]]; }
  if (js.length) { p.push("JS-Fehler: " + js.join(" | ").slice(0, 300)); js.length = 0; }
  if (p.length) { rot++; console.log("ROT   " + name); p.forEach((x) => console.log("        - " + x)); } else { gruen++; console.log("GRÜN  " + name); }
};
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
const page = await ctx.newPage();
const js = [];
let dialogAntwort = true;
page.on("pageerror", (e) => js.push(String(e)));
page.on("dialog", (d) => (dialogAntwort ? d.accept() : d.dismiss()).catch(() => {}));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.goto(basis + "index.html"); await page.waitForTimeout(1200);

const vorbereiten = () => page.evaluate(() => {
  const h = todayISO(), m = addDays(h, 2);
  ensureAusbildungsplaene(); const c = DB.ausbildungsplaene[0];
  DB.students = [{ id: "s1", name: "Anna Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0151 1111111" }];
  DB.lessons = [
    { id: "L1", sid: "s1", date: m, von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", note: "" },
    { id: "L2", sid: "s1", date: addDays(h, -3), von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", note: "" }];
  DB.exams = []; DB.termine = [];
  DB.workCfg.fahrzeuge = [{ id: "fzA", name: "Testauto", typ: "schalt" }];
  save(); closeSheet(); _navStack = []; routeDashboard();
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
});
const zur = () => page.evaluate(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
const w = (ms = 120) => page.waitForTimeout(ms);
const sheetTitel = () => page.evaluate(() => { const s = document.getElementById("sheet"); return s.classList.contains("open") ? (s.querySelector(".sheet-h")?.textContent || "(ohne Titel)") : "ZU"; });

await vorbereiten();
await fall("A6a Termin → Bearbeiten → Zurück: wieder im Termin-Fenster, dann zu", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  const t1 = await sheetTitel();
  await page.click("#esEdit"); await w();
  const t2 = await sheetTitel();
  await zur(); await w(300);
  const t3 = await sheetTitel();
  await zur(); await w(300);
  const t4 = await sheetTitel();
  if (t2 === t1) f.push("Bearbeiten öffnet kein neues Fenster");
  if (t3 !== t1) f.push("Zurück aus Bearbeiten: „" + t3 + "“ statt „" + t1 + "“");
  if (t4 !== "ZU") f.push("zweites Zurück schließt nicht: " + t4);
  return f;
});
await fall("A6b Fahrstunde → Fahrzeug → Zurück: Eingaben in Schritt 2 noch da", async () => {
  const f = [];
  await page.evaluate(() => openAddLessonSheet("fahrstunde")); await w();
  await page.click('#alList .as-item[data-sid="s1"]'); await w();
  await page.fill("#alNote", "Treffpunkt Bahnhof");
  await page.click("#alSave"); await w();
  if (!(await page.$(".fz-opt"))) f.push("Fahrzeugwahl nicht offen");
  await zur(); await w(300);
  const note = await page.evaluate(() => document.getElementById("alNote")?.value ?? "(weg)");
  if (note !== "Treffpunkt Bahnhof") f.push("Notiz nach Zurück: " + note);
  dialogAntwort = true; await zur(); await w(300); // Schritt 2 hat Eingaben → Rückfrage (angenommen) → Schritt 1
  if (!(await page.$("#alList"))) f.push("Zweites Zurück führt nicht zu „mit wem?“: " + (await sheetTitel()));
  await zur(); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("drittes Zurück schließt nicht");
  return f;
});
await fall("A9 Tippen daneben mit Eingabe fragt nach; „Nein“ lässt das Fenster offen", async () => {
  const f = [];
  await page.evaluate(() => openTodoAdd()); await w();
  const inp = await page.$("#sheet input[type=text], #sheet textarea");
  if (!inp) return ["kein Eingabefeld in „Aufgabe“"];
  await inp.fill("Bremsen üben");
  dialogAntwort = false; await page.evaluate(() => document.getElementById("sheetScrim").click()); await w(300);
  if ((await sheetTitel()) === "ZU") f.push("Fenster ohne Rückfrage zu");
  dialogAntwort = true; await page.evaluate(() => document.getElementById("sheetScrim").click()); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("nach „Verwerfen“ nicht zu");
  return f;
});
await fall("A20 ✕ und Esc schließen eine Ebene, Griff ist da", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  if (!(await page.$("#sheet .sheet-griff"))) f.push("kein Griff");
  const x = await page.$("#sheet .sheet-x"); if (!x) return ["kein ✕"];
  const bb = await x.boundingBox(); if (bb.width < 44 || bb.height < 44) f.push("✕ kleiner als 44 px");
  await page.click("#esEdit"); await w();
  await page.keyboard.press("Escape"); await w(300);
  if (!(await page.$("#esEdit"))) f.push("Esc ging nicht genau eine Ebene zurück: " + (await sheetTitel()));
  await page.click("#sheet .sheet-x"); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("✕ schließt nicht");
  return f;
});
await fall("G2 Neuer Termin → Andere Art → Zurück: wieder bei „Neuer Termin“", async () => {
  const f = [];
  await page.evaluate(() => openNeuerTerminSheet()); await w();
  const t1 = await sheetTitel();
  await page.click("#ntAndere"); await w(300);
  const t2 = await sheetTitel();
  await zur(); await w(300);
  const t3 = await sheetTitel();
  if (t2 === t1) f.push("„Andere Art“ öffnet kein Unterfenster");
  if (t3 !== t1) f.push("Zurück: „" + t3 + "“ statt „" + t1 + "“");
  await page.evaluate(() => closeSheet());
  return f;
});
await fall("Nach dem Speichern kein veraltetes Fenster im Stapel", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  await page.click("#esEdit"); await w();
  await page.evaluate(() => save());
  await page.evaluate(() => openVehiclePicker({}, () => {})); await w();
  await zur(); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("nach save() führt Zurück in ein altes Fenster: " + (await sheetTitel()));
  return f;
});

await browser.close(); server.close();
console.log(rot ? `Fenster-Test: ${rot} rot, ${gruen} grün.` : `Fenster-Test: alles in Ordnung (${gruen} Fälle).`);
process.exit(rot ? 1 : 0);
