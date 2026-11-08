// Start der App: Z3 (ohne Profil nicht weiter, „Nochmal“; mit gespeichertem Profil offline weiter) und
// G5 (Startbild kurz und nicht blockierend, Logo-Tipp blockiert nicht).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/start-test.mjs
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
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let rot = 0;
const fehler = (t) => { rot++; console.log("ROT   " + t); };
const ok = (t) => console.log("GRÜN  " + t);

const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const js = [];
page.on("pageerror", (e) => js.push(String(e)));
page.on("dialog", (d) => d.dismiss().catch(() => {}));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());

// G5: zweiter Start (gleiche Version) – Startbild nach unter 1 s weg
await page.goto(basis + "index.html"); await page.waitForTimeout(2500);
const t0 = Date.now();
await page.reload();
await page.waitForFunction(() => { const s = document.getElementById("splash"); return !s || s.classList.contains("hide"); }, null, { timeout: 5000 });
const dauer = Date.now() - t0;
if (dauer > 1500) fehler("G5 Startbild beim zweiten Start " + dauer + " ms"); else ok("G5 Startbild beim zweiten Start nach " + dauer + " ms weg");
// Logo-Tipp: Startbild blockiert nicht und ist nach unter 1,5 s weg
const logo = await page.evaluate(async () => {
  const sp = document.getElementById("splash"); replaySplash();
  const pe = getComputedStyle(sp).pointerEvents; const t = performance.now();
  while (!sp.classList.contains("hide") && performance.now() - t < 5000) await new Promise((k) => setTimeout(k, 50));
  return { pe, ms: Math.round(performance.now() - t) };
});
if (logo.pe !== "none") fehler("G5 Logo-Tipp: Startbild fängt Tipps ab (" + logo.pe + ")"); else ok("G5 Logo-Tipp: Tippen geht durch");
if (logo.ms > 1500) fehler("G5 Logo-Tipp: Startbild " + logo.ms + " ms"); else ok("G5 Logo-Tipp: Startbild nach " + logo.ms + " ms weg");

// A1/A12: keine Doppelanlage nach Zurück auf der Fragebogen-Frage, Warnung bei gleichem Namen
const a1 = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  const zur = async () => { window.dispatchEvent(new PopStateEvent("popstate")); await w(80); };
  formView(null); await w(50);
  document.getElementById("f_name").value = "Gustav Muster";
  document.getElementById("saveBtn").click(); await w(80);
  const sheetOffen = document.getElementById("sheet").classList.contains("open");
  await zur();
  const titel = document.getElementById("tbTitle").textContent;
  const formularDa = !!document.getElementById("saveBtn");
  formView(null); await w(50);
  document.getElementById("f_name").value = "gustav  muster";
  document.getElementById("saveBtn").click(); await w(80); // Rückfrage wird im Test abgelehnt
  const anzahl = DB.students.filter((x) => x.name.toLowerCase().replace(/\s+/g, " ") === "gustav muster").length;
  // A12: Schnell-Anlage, Fragebogen-Fenster mit Zurück schließen → Abschluss läuft trotzdem
  let fertigId = null;
  openQuickNewStudentSheet((id) => { fertigId = id; });
  document.getElementById("qnsName").value = "Hanna Muster";
  document.getElementById("qnsSave").click(); await w(80);
  await zur();
  return { sheetOffen, titel, formularDa, anzahl, fertig: !!fertigId };
});
if (!a1.sheetOffen) fehler("A1 Vorbereitung: Fragebogen-Fenster nicht offen");
if (a1.formularDa || !/Schülerdatei/.test(a1.titel)) fehler("A1 nach Zurück steht das Formular noch da (" + a1.titel + ")"); else ok("A1 nach dem Anlegen gleich in der Akte");
if (a1.anzahl !== 1) fehler("A1 Schüler " + a1.anzahl + "× angelegt"); else ok("A1 gleicher Name: Warnung, kein zweiter Eintrag");
if (!a1.fertig) fehler("A12 Zurück auf der Fragebogen-Frage: Termin-Abschluss läuft nicht"); else ok("A12 Abschluss läuft auch nach Zurück");

// Z3: Profil-Abfrage scheitert
const fakeEinbauen = () => {
  const antwort = { data: null, error: { message: "503 Service Unavailable" } };
  const kette = () => new Proxy(function () {}, {
    get: (_, k) => (k === "then" ? (ok, no) => Promise.resolve(antwort).then(ok, no) : () => kette()),
    apply: () => kette(),
  });
  window.getSupa = () => ({ from: () => kette(), rpc: () => kette(), auth: { signOut: async () => ({}), getSession: async () => ({ data: { session: null } }) }, channel: () => kette(), removeChannel: () => {} });
  try { getSupa = window.getSupa; } catch (e) {}
};
await page.evaluate(fakeEinbauen);
const r1 = await page.evaluate(async () => {
  try { localStorage.removeItem("kompass-profil-cache"); localStorage.setItem(OWNER_KEY, "u-z3"); } catch (e) {}
  _continueLoginFlow = (() => { window.__weiter = true; });
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { nochmal: !!document.getElementById("loNochmal"), weiter: !!window.__weiter, profil: _authProfile };
});
if (!r1.nochmal) fehler("Z3 kein Knopf „Nochmal“ bei Profilfehler"); else ok("Z3 Meldung mit „Nochmal“");
if (r1.weiter || r1.profil) fehler("Z3 App läuft ohne Profil weiter"); else ok("Z3 ohne Profil nicht weiter");
// Mit gespeichertem, gesperrtem Profil: Sperre greift auch offline
const r2 = await page.evaluate(async () => {
  window.__weiter = false;
  localStorage.setItem("kompass-profil-cache", JSON.stringify({ id: "u-z3", aktiv: false, rolle: "fahrlehrer", agb_akzeptiert_version: AGB_VERSION }));
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { weiter: !!window.__weiter, text: document.getElementById("loErr").textContent };
});
if (r2.weiter || !/gesperrt/.test(r2.text)) fehler("Z3 gesperrtes Konto (gespeichert) kommt rein: " + r2.text); else ok("Z3 gespeichertes gesperrtes Profil bleibt gesperrt");
// Mit gespeichertem, aktivem Profil: offline weiter
const r3 = await page.evaluate(async () => {
  window.__weiter = false;
  localStorage.setItem("kompass-profil-cache", JSON.stringify({ id: "u-z3", aktiv: true, rolle: "fahrlehrer", email: "z3@example.org", agb_akzeptiert_version: AGB_VERSION }));
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { weiter: !!window.__weiter, nochmal: !!document.getElementById("loNochmal") };
});
if (!r3.weiter || r3.nochmal) fehler("Z3 mit gespeichertem Profil offline nicht weiter"); else ok("Z3 mit gespeichertem Profil offline weiter");
if (js.length) fehler("JS-Fehler: " + js.join(" | ").slice(0, 300));
await browser.close(); server.close();
console.log(rot ? `Start-Test: ${rot} rot.` : "Start-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
