// Heute-Test (Umbau Schritt 2): neue Startseite „Heute“ (routeDashboard) mit „Jetzt dran“, Achtung-Streifen, „Danach“, Kacheln.
// Texte werden über textContent gelesen: die Großschreibung der Überschriften ist nur Gestaltung (text-transform).
// Jeder Prüfpunkt (H0a … H9c) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt eine Funktion, wird der Punkt übersprungen.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin), damit „Jetzt dran“/„Als Nächstes“ immer gleich ist.
// Nur erfundene Testdaten. Die Datenbank wird nicht angesprochen: alle Fremdanfragen sind blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/heute-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), HEUTE_SCHNELL=1 (H9b/H9c = andere Tests nicht mitlaufen lassen)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
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
  if (r && typeof r === "object" && !Array.isArray(r) && r.skip) { uebersprungen++; console.log(`übersprungen  ${id} ${text}: ${r.skip}`); return; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const MONTAG = "2026-10-12";    // Montag derselben Woche
const MORGEN = "2026-10-15";    // Donnerstag
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => { const d = new Date(Date.UTC(2026, 9, 14 + n)); return d.toISOString().slice(0, 10); };
const erledigt = (n) => Array.from({ length: n }, (_, i) => ({ d: "01.09.26", iso: `2026-09-${String(i + 1).padStart(2, "0")}` }));
const SONDER_VOLL = { ueberland: erledigt(5), autobahn: erledigt(4), nacht: erledigt(3) };

function basisSzenario() {
  return {
    theme: "light",
    students: [
      // t1: läuft gerade, Prüfung in 5 Tagen, 2 Nachtfahrten offen → gelber Chip
      { id: "t1", name: "Erfundene Testperson", telefon: "0170 1234567", theorie: true, next: "Erfundener Fokus Kreisverkehr",
        sonder: { ueberland: erledigt(5), autobahn: erledigt(4), nacht: erledigt(1) }, todos: [{ id: "td3", text: "Erfundene Aufgabe 3", done: false }] },
      { id: "t2", name: "Erfundene Zweitperson", telefon: "0170 2222222", sonder: SONDER_VOLL,
        todos: [{ id: "td4", text: "Erfundene Aufgabe 4", done: false }, { id: "td5", text: "Erfundene Aufgabe 5", done: true }] },
      { id: "t3", name: "Erfundene Drittperson", telefon: "0170 3333333", sonder: SONDER_VOLL },
      { id: "t4", name: "Erfundene Viertperson", telefon: "0170 4444444", sonder: SONDER_VOLL },
      { id: "t5", name: "Erfundene Fuenftperson", telefon: "0170 5555555", sonder: SONDER_VOLL },
      { id: "t6", name: "Erfundene Sechstperson", telefon: "0170 6666666", sonder: SONDER_VOLL },
      { id: "t7", name: "Erfundene Siebtperson", telefon: "0170 7777777", sonder: SONDER_VOLL },
      // t8: Umschreiber mit Prüfung in 5 Tagen, keine Sonderfahrten → KEIN Chip
      { id: "t8", name: "Erfundene Achtperson", telefon: "0170 8888888", umschreiber: true },
      // t9: Prüfung erst in 30 Tagen, keine Sonderfahrten → KEIN Chip
      { id: "t9", name: "Erfundene Neuntperson", telefon: "0170 9999999" },
    ],
    lessons: [
      { id: "L-mo", date: MONTAG, von: "08:00", bis: "09:30", sid: "t1" },            // Montag gefahren (Verdienst Woche)
      { id: "L-fc", date: "2026-10-05", von: "08:00", bis: "09:30", sid: "t2", fc: "v1" }, // FC vergessen → Fahrcheck-Hinweis
      { id: "L0", date: TAG, von: "08:00", bis: "09:30", sid: "t4" },                 // heute vorbei
      { id: "L3", date: TAG, von: "16:30", bis: "17:15", sid: "t3" },                 // heute später (45 min), absichtlich vor L2 eingefügt
      { id: "L1", date: TAG, von: "10:00", bis: "11:30", sid: "t1" },                 // läuft gerade (10:30)
      { id: "Lx", date: TAG, von: "12:00", bis: "12:45", sid: "t5", status: "abgebrochen" },
      { id: "L2", date: TAG, von: "13:30", bis: "15:00", sid: "t2" },                 // heute später
    ],
    termine: [
      { id: "P1", date: plusTage(5), von: "09:00", slots: ["t1"] },
      { id: "P8", date: plusTage(5), von: "10:00", slots: ["t8"] },
      { id: "P9", date: plusTage(30), von: "09:00", slots: ["t9"] },
    ],
    fristen: {
      t3: { reakt_status: "offen", reakt_bezahlt_bis: "2026-09-01" },        // Reaktivierung gesperrt (rot)
      t4: { theorie_abgeschlossen_am: "2025-09-01" },                         // Theorie abgelaufen (rot)
      t5: { antrag_am: "2025-08-01" },                                        // Antrag abgelaufen (rot)
      t6: { theorie_abgeschlossen_am: "2025-10-30" },                         // Theorie bald (gelb, 16 Tage)
      t7: { antrag_am: "2025-11-20" },                                        // Antrag bald (gelb, 37 Tage)
    },
    notizen: { t2: [{ id: "n1", schueler_id: "t2", art: "stopp", text: "Erfundener Stopp-Grund", gelesen: true, erstellt_am: "2026-10-13T08:00:00Z" }] },
    todos: [{ id: "td1", text: "Erfundene Aufgabe 1", done: false }, { id: "td2", text: "Erfundene Aufgabe 2", done: true }],
    backup: "fehlt", // fehlt | alt | frisch
    verdienst: { proUE: 25, bonusUE: 100 },
    pin: "",
    sicht: {},
    wetter: false,
    workCfg: { vorMittag: { von: "08:00", bis: "12:30" }, nachMittag: { von: "13:30", bis: "18:00" }, nacht: { von: "19:30", bis: "21:00", an: false }, samstagAn: false, blockMin: 90 },
  };
}
const kopie = (o) => JSON.parse(JSON.stringify(o));
// Szenario ohne jeden Hinweis (für „Streifen nicht da“)
function ruhigSzenario() {
  const sz = basisSzenario();
  sz.students.forEach((s) => { s.sonder = SONDER_VOLL; });
  sz.fristen = {}; sz.notizen = {}; sz.backup = "frisch";
  // Auch keine Prüfungstermine: sonst melden die Prüfungs-Hinweise (keine Stunde bis zur Prüfung, mehrere am selben Tag) zu Recht etwas.
  sz.termine = [];
  return sz;
}

async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [], anfragen = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("request", (r) => anfragen.push(r.url()));
  await page.clock.setFixedTime(JETZT);
  // Nur die eigene Seite laden, keine Außenwelt: Fremdanfragen blockieren.
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    // Keine Datenbank: Attrappe, die nichts tut.
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  });
  return { ctx, page, jsFehler, anfragen };
}

// Daten in die App legen und die Startseite neu zeichnen.
async function setze(page, sz) {
  await page.evaluate((sz) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      if (p.theorie) s.plan.theorie = true;
      if (p.next) s.next = p.next;
      if (p.umschreiber) s.umschreiber = true;
      s.plan.sonder = JSON.parse(JSON.stringify(p.sonder || { ueberland: [], autobahn: [], nacht: [] }));
      s.todos = JSON.parse(JSON.stringify(p.todos || []));
      return s;
    });
    // Felder wie addLesson sie anlegt
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: "", fc: l.fc || null }));
    // Prüfungstermine wie createTermin
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = [];
    DB.todos = JSON.parse(JSON.stringify(sz.todos));
    Object.assign(DB.workCfg, sz.workCfg); DB.workCfg.pausen = [];
    Object.assign(DB.verdienst, sz.verdienst);
    DB.verdienstPin = sz.pin || "";
    try { sessionStorage.removeItem("vd_unlocked"); } catch (e) {}
    DB.sichtbarkeit = Object.assign({}, DB.sichtbarkeit, { dash_wocheverdienst: true, dash_nextexam: true, dash_capacity: true, dash_fcpending: true, dash_nextstudent: true }, sz.sicht);
    _schuelerFristen = JSON.parse(JSON.stringify(sz.fristen));
    _bueroNotizen = JSON.parse(JSON.stringify(sz.notizen));
    if (sz.backup === "frisch") localStorage.setItem("serband-backup-stamp", String(Date.now()));
    else if (sz.backup === "alt") localStorage.setItem("serband-backup-stamp", String(Date.now() - 10 * 86400000));
    else localStorage.removeItem("serband-backup-stamp");
    if (sz.wetter) {
      DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: "erfundener-test-schluessel", city: "Teststadt" });
      localStorage.setItem("serband-weather-cache", JSON.stringify({ ts: Date.now(), city: "Teststadt", data: { temp: 17, desc: "leicht bewölkt", icon: "03d" } }));
    } else {
      DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: "", city: "Offenbach,DE" });
      localStorage.removeItem("serband-weather-cache");
    }
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    routeDashboard();
  }, sz);
  await warte(page, 350);
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const gibtFunktion = (page, name) => page.evaluate((n) => { try { return typeof eval(n) === "function"; } catch (e) { return false; } }, name);
const sheetZustand = (page) => page.evaluate(() => {
  const s = document.getElementById("sheet");
  return { offen: !!s && s.classList.contains("open"), kopf: (s?.querySelector(".sheet-h")?.textContent || "").replace(/\s+/g, " ").trim(), text: (s?.textContent || "").replace(/\s+/g, " ").trim() };
});
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; }, sel);
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const norm = (t) => String(t || "").replace(/[\s  ]+/g, " ").replace(/[-—]/g, "–").trim();
const ohneLeer = (t) => String(t || "").replace(/[\s  ]+/g, "");
const KEIN_H2 = "kein .heute2 im #view (Seite noch alt?)";
async function brauchtHeute2(page) { return (await da(page, "#view .heute2")) ? null : KEIN_H2; }
// Element klicken und prüfen, welcher Titel danach oben steht.
async function klickTitel(page, sel, soll) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return `„${sel}“ fehlt`;
  await loc.first().click();
  await warte(page, 400);
  const ti = await titel(page);
  if (ti !== soll) return `Tipp auf „${sel}“ → Titel „${ti}“ statt „${soll}“`;
  return null;
}
// Chips im Achtung-Streifen lesen
const chips = (page) => page.evaluate(() => [...document.querySelectorAll(".h2-achtung .h2-chip")].map((c) => ({
  text: (c.textContent || "").replace(/\s+/g, " ").trim(), rot: c.classList.contains("rot"), gelb: c.classList.contains("gelb"),
})));

// ---------- Hauptlauf bei 412 × 915 ----------
const { ctx, page, jsFehler, anfragen } = await neueSeite(412, 915);
await setze(page, basisSzenario());

// H0: Testaufbau
await pruefe("H0a", "Uhr steht fest: todayISO() = 2026-10-14 (Mittwoch), 10:30", async () => {
  const r = await page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes() }));
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) return `todayISO()=${r.iso}, Uhrzeit ${r.h}:${r.m}`;
});
await pruefe("H0b", "Testdaten: nextLessonEvents(1) ist die laufende Stunde L1 (10:00–11:30, Erfundene Testperson)", async () => {
  if (!(await gibtFunktion(page, "nextLessonEvents"))) return { skip: "nextLessonEvents fehlt" };
  const e = await page.evaluate(() => nextLessonEvents(1)[0] || null);
  if (!e || e.id !== "L1") return `erste Stunde: ${e ? e.id + " " + e.von : "keine"}`;
});

// H1 Grundgerüst
await pruefe("H1a", "routeDashboard(): Titel „Heute“ und Container .heute2 im #view", async () => {
  const f = [];
  if ((await titel(page)) !== "Heute") f.push(`Titel „${await titel(page)}“`);
  if (!(await da(page, "#view .heute2"))) f.push(KEIN_H2);
  return f;
});
await pruefe("H1b", "Kopf: .h2-datum mit „Mittwoch“ und „14. Oktober“, h1.h2-titel = „Heute“", async () => {
  const f = [];
  const d = await text(page, ".heute2 .h2-datum");
  if (d === null) f.push(".h2-datum fehlt");
  else {
    if (!/Mittwoch/.test(d)) f.push(`Datum ohne Wochentag: „${d}“`);
    if (!/14\.?\s*(Oktober|Okt\.?|10\.)/.test(d)) f.push(`Datum ohne Tag + Monat: „${d}“`);
  }
  const t = await text(page, ".heute2 h1.h2-titel");
  if (t === null) f.push("h1.h2-titel fehlt");
  else if (t !== "Heute") f.push(`Überschrift „${t}“`);
  return f;
});
await pruefe("H1c", "Schrift: h1.h2-titel Playfair, .heute2 Manrope", async () => {
  const e = await brauchtHeute2(page); if (e) return e;
  const r = await page.evaluate(() => ({
    titel: (() => { const e = document.querySelector(".heute2 h1.h2-titel"); return e ? getComputedStyle(e).fontFamily : null; })(),
    text: getComputedStyle(document.querySelector(".heute2")).fontFamily,
  }));
  const f = [];
  if (r.titel === null) f.push("h1.h2-titel fehlt");
  else if (!/Playfair/i.test(r.titel)) f.push(`Titel-Schrift „${r.titel}“`);
  if (!/Manrope/i.test(r.text)) f.push(`Text-Schrift „${r.text}“`);
  return f;
});
await pruefe("H1d", "Hell: Hintergrund .heute2 bzw. Seite = #F3F5F1", async () => {
  const e = await brauchtHeute2(page); if (e) return e;
  const bg = await page.evaluate(() => {
    let el = document.querySelector(".heute2");
    while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el = el.parentElement; }
    return "transparent";
  });
  if (bg.replace(/\s+/g, "") !== "rgb(243,245,241)") return `Hintergrund ${bg}`;
});

// H2 „Jetzt dran“-Karte
const jetzt = async () => page.evaluate(() => {
  const k = document.querySelector(".heute2 .h2-jetzt");
  if (!k) return null;
  const t = (s) => { const e = k.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; };
  return { label: t(".h2-jetzt-label"), name: t(".h2-jetzt-name"), pct: t(".h2-jetzt-pct"), fokus: t(".h2-jetzt-fokus"), ue: t(".h2-jetzt-ue"), ganz: (k.textContent || "").replace(/\s+/g, " ").trim() };
});
await pruefe("H2a", "läuft gerade: .h2-jetzt-label „Jetzt dran“ + „10:00–11:30“", async () => {
  const j = await jetzt(); if (!j) return "keine .h2-jetzt-Karte (" + ((await da(page, ".heute2")) ? "aber .heute2 da" : KEIN_H2) + ")";
  if (j.label === null) return ".h2-jetzt-label fehlt";
  const f = [];
  if (!/Jetzt dran/.test(j.label)) f.push(`Label „${j.label}“`);
  if (!ohneLeer(norm(j.label)).includes("10:00–11:30")) f.push(`Zeit fehlt in „${j.label}“`);
  return f;
});
await pruefe("H2b", "läuft keine, kommt heute noch: „Als Nächstes“ + 13:30", async () => {
  const sz = basisSzenario(); sz.lessons = sz.lessons.filter((l) => l.id !== "L1");
  await setze(page, sz);
  const j = await jetzt(); if (!j) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/Als Nächstes/.test(j.label || "")) f.push(`Label „${j.label}“`);
  if (!(j.label || "").includes("13:30")) f.push(`13:30 fehlt im Label „${j.label}“`);
  if (!/Zweitperson/.test(j.name || "")) f.push(`Name „${j.name}“ statt Erfundene Zweitperson`);
  return f;
});
await pruefe("H2c", "nächste erst morgen: „Nächste Fahrstunde“ + Donnerstag", async () => {
  const sz = basisSzenario();
  sz.lessons = sz.lessons.filter((l) => l.date !== TAG).concat([{ id: "Lm", date: MORGEN, von: "09:30", bis: "11:00", sid: "t1" }]);
  await setze(page, sz);
  const j = await jetzt(); if (!j) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/Nächste Fahrstunde/.test(j.label || "")) f.push(`Label „${j.label}“`);
  if (!/Donnerstag|\bDo\b/.test(j.label || "")) f.push(`Wochentag fehlt im Label „${j.label}“`);
  return f;
});
await pruefe("H2d", "Name, Prozent stand(s)+%, Fokus autoNext(s).text", async () => {
  await setze(page, basisSzenario());
  const j = await jetzt(); if (!j) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const soll = await page.evaluate(() => { const s = DB.students.find((x) => x.id === "t1"); return { pct: stand(s), fokus: autoNext(s).text }; });
  const f = [];
  if (!(j.name || "").includes("Erfundene Testperson")) f.push(`Name „${j.name}“`);
  if (!ohneLeer(j.pct).includes(`${soll.pct}%`)) f.push(`Prozent „${j.pct}“ statt ${soll.pct}%`);
  if (!norm(j.fokus).includes(norm(soll.fokus))) f.push(`Fokus „${j.fokus}“ statt „${soll.fokus}“`);
  return f;
});
await pruefe("H2e", "UE der Stunde: 90 min → „2 UE“, 45 min → „1 UE“", async () => {
  const j = await jetzt(); if (!j) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/(^|\D)2\s*UE/.test(j.ue || "")) f.push(`90 min: „${j.ue}“`);
  const sz = basisSzenario(); sz.lessons.find((l) => l.id === "L1").bis = "10:45";
  await setze(page, sz);
  const j2 = await jetzt();
  if (!/(^|\D)1\s*UE/.test((j2 && j2.ue) || "")) f.push(`45 min: „${j2 && j2.ue}“`);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H2f", "Anrufen: a.h2-anrufen href = tel:01701234567", async () => {
  const h = await page.evaluate(() => document.querySelector('.heute2 .h2-jetzt a.h2-anrufen[href^="tel:"]')?.getAttribute("href") ?? null);
  if (h === null) return "a.h2-anrufen[href^=tel:] fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  if (h !== "tel:01701234567") return `href „${h}“`;
});
await pruefe("H2g", "„Bin da“: a.h2-binda → https://wa.me/<Nummer>?text=…„Bin da“…", async () => {
  const h = await page.evaluate(() => document.querySelector(".heute2 .h2-jetzt a.h2-binda")?.getAttribute("href") ?? null);
  if (h === null) return "a.h2-binda fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!h.startsWith("https://wa.me/")) f.push(`href beginnt nicht mit https://wa.me/: „${h}“`);
  const nummer = h.replace("https://wa.me/", "").split("?")[0];
  if (!nummer.replace(/\D/g, "").includes("1701234567")) f.push(`Nummer „${nummer}“`);
  let t = ""; try { t = new URL(h).searchParams.get("text") || ""; } catch (e) {}
  if (!/Bin da/i.test(t)) f.push(`Text-Parameter „${t}“ ohne „Bin da“`);
  return f;
});
await pruefe("H2h", "ohne Telefonnummer: kein tel-/wa-Link, Hinweis „Nummer fehlt“", async () => {
  const sz = basisSzenario(); sz.students[0].telefon = "";
  await setze(page, sz);
  const r = await page.evaluate(() => {
    const k = document.querySelector(".heute2 .h2-jetzt");
    if (!k) return null;
    return { links: k.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').length, txt: k.textContent };
  });
  await setze(page, basisSzenario());
  if (!r) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (r.links) f.push(`${r.links} tel-/wa-Link(s) trotz fehlender Nummer`);
  if (!/Nummer fehlt/.test(r.txt)) f.push("Hinweis „Nummer fehlt“ fehlt");
  return f;
});
await pruefe("H2i", "Hauptknopf .h2-akte „Schülerakte öffnen“ → Titel „Schülerdatei“", async () => {
  await setze(page, basisSzenario());
  const t = await text(page, ".heute2 .h2-jetzt .h2-akte");
  if (t === null) return ".h2-akte fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/Schülerakte öffnen/.test(t)) f.push(`Beschriftung „${t}“`);
  const e = await klickTitel(page, ".heute2 .h2-jetzt .h2-akte", "Schülerdatei"); if (e) f.push(e);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H2j", "Schnellaktionen data-nsact other/noshow/cancel; „Abgebrochen“ setzt L1 auf abgebrochen", async () => {
  if (!(await gibtFunktion(page, "nsQuickAction"))) return { skip: "nsQuickAction fehlt" };
  await setze(page, basisSzenario());
  const acts = await page.evaluate(() => [...document.querySelectorAll(".heute2 .h2-jetzt [data-nsact]")].map((b) => b.dataset.nsact));
  if (!acts.length) return "keine [data-nsact]-Knöpfe in .h2-jetzt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = ["other", "noshow", "cancel"].filter((a) => !acts.includes(a)).map((a) => `data-nsact="${a}" fehlt`);
  if (acts.includes("cancel")) {
    await page.locator('.heute2 .h2-jetzt [data-nsact="cancel"]').first().click();
    await warte(page, 300);
    const st = await page.evaluate(() => (DB.lessons.find((l) => l.id === "L1") || {}).status);
    if (st !== "abgebrochen") f.push(`L1 hat Status „${st}“ statt abgebrochen`);
  }
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H2k", "ohne Fahrstunde: „Keine Fahrstunde geplant“ + Knopf → Fenster „Neuer Termin“", async () => {
  const sz = basisSzenario(); sz.lessons = []; sz.termine = [];
  await setze(page, sz);
  const f = [];
  try {
    const r = await page.evaluate(() => {
      const k = document.querySelector(".heute2 .h2-leer") || document.querySelector(".heute2 .h2-jetzt");
      if (!k) return null;
      const knoepfe = [...k.querySelectorAll("button, a, [role=button]")];
      const i = knoepfe.findIndex((b) => /Termin/i.test(b.textContent));
      return { txt: k.textContent, knopf: knoepfe.length ? (i >= 0 ? i : 0) : -1, sel: k.classList.contains("h2-leer") ? ".heute2 .h2-leer" : ".heute2 .h2-jetzt" };
    });
    if (!r) return "weder .h2-leer noch .h2-jetzt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
    if (!/Keine Fahrstunde geplant/.test(r.txt)) f.push("Text „Keine Fahrstunde geplant“ fehlt");
    if (r.knopf < 0) f.push("kein Knopf in der Karte");
    else {
      await page.locator(`${r.sel} :is(button, a, [role=button])`).nth(r.knopf).click();
      await warte(page, 350);
      const s = await sheetZustand(page);
      if (!s.offen || s.kopf !== "Neuer Termin") f.push(`Knopf öffnet „${s.offen ? s.kopf : "nichts"}“ statt „Neuer Termin“`);
    }
  } finally { await setze(page, basisSzenario()); }
  return f;
});
await pruefe("H2l", "alle Knöpfe der „Jetzt dran“-Karte ≥ 44 px hoch", async () => {
  const r = await page.evaluate(() => {
    const k = document.querySelector(".heute2 .h2-jetzt"); if (!k) return null;
    return [...k.querySelectorAll("button, a, [role=button]")].filter((b) => b.getBoundingClientRect().width > 0)
      .filter((b) => b.getBoundingClientRect().height < 44).map((b) => `„${b.textContent.trim().slice(0, 20)}“ ${Math.round(b.getBoundingClientRect().height)} px`);
  });
  if (r === null) return "keine .h2-jetzt-Karte" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  return r;
});

// H3 Achtung-Streifen
const chipVon = (cs, wort) => cs.find((c) => c.text.includes(wort));
await pruefe("H3a", "Überschrift „Achtung · N“, N = Anzahl Chips = 10", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(() => { const a = document.querySelector(".heute2 .h2-achtung"); return a ? (a.textContent || "").replace(/\s+/g, " ") : null; });
  if (r === null) return ".h2-achtung fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const m = r.match(/Achtung\s*[·•∙|-]\s*(\d+)/);
  const cs = await chips(page);
  const f = [];
  if (!m) f.push(`Überschrift ohne „Achtung · N“: „${r.slice(0, 40)}“`);
  else if (+m[1] !== cs.length) f.push(`N=${m[1]}, aber ${cs.length} Chips`);
  // 10 = 4 rot, 3 gelb (Fristen/Sonderfahrten), Achtperson „keine Stunde bis zur Prüfung“, „2 Prüfungen am selben Tag“, Backup
  if (cs.length !== 10) f.push(`${cs.length} Chips statt 10: ${cs.map((c) => c.text).join(" | ")}`);
  return f;
});
await pruefe("H3b", "ohne Hinweise: kein .h2-achtung", async () => {
  await setze(page, ruhigSzenario());
  const r = await da(page, ".heute2 .h2-achtung"), h = await da(page, ".heute2");
  await setze(page, basisSzenario());
  if (!h) return KEIN_H2;
  if (r) return "Streifen trotzdem da";
});
async function chipPruefung(wort, farbe, muster) {
  const cs = await chips(page);
  if (!cs.length) return "keine .h2-chip" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const c = chipVon(cs, wort);
  if (!c) return `kein Chip mit „${wort}“`;
  const f = [];
  if (farbe === "rot" && (!c.rot || c.gelb)) f.push(`Chip „${c.text}“ nicht rot`);
  if (farbe === "gelb" && (!c.gelb || c.rot)) f.push(`Chip „${c.text}“ nicht gelb`);
  for (const m of muster) if (!m.test(c.text)) f.push(`Grund passt nicht zu ${m}: „${c.text}“`);
  return f;
}
await pruefe("H3c", "rot: Büro-Stopp (Zweitperson) „Stopp vom Büro“", () => chipPruefung("Zweitperson", "rot", [/Stopp vom Büro/]));
await pruefe("H3d", "rot: Reaktivierung gesperrt (Drittperson)", () => chipPruefung("Drittperson", "rot", [/Reaktiv/i]));
await pruefe("H3e", "rot: Theorie abgelaufen (Viertperson)", () => chipPruefung("Viertperson", "rot", [/Theorie/i, /abgelaufen/i]));
await pruefe("H3f", "rot: Führerscheinantrag abgelaufen (Fuenftperson)", () => chipPruefung("Fuenftperson", "rot", [/Antrag/i, /abgelaufen/i]));
await pruefe("H3g", "gelb: Theorie läuft bald ab (Sechstperson)", () => chipPruefung("Sechstperson", "gelb", [/Theorie/i]));
await pruefe("H3h", "gelb: Antrag läuft bald ab (Siebtperson)", () => chipPruefung("Siebtperson", "gelb", [/Antrag/i]));
await pruefe("H3i", "gelb: Prüfung in 5 Tagen + Sonderfahrten offen (Testperson) „2 Nachtfahrten offen“", () => chipPruefung("Testperson", "gelb", [/2\s*Nachtfahrten offen/]));
await pruefe("H3j", "kein Chip für Umschreiber (Achtperson) und Prüfung > 21 Tage (Neuntperson)", async () => {
  const cs = await chips(page);
  if (!cs.length) return "keine .h2-chip" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  // Achtperson (Umschreiber) darf einen Prüfungs-Hinweis haben, aber keinen Sonderfahrten-Chip; Neuntperson (Prüfung > 21 Tage) gar keinen.
  const f = [];
  const acht = cs.filter((c) => c.text.includes("Achtperson"));
  if (acht.some((c) => /fahrt/i.test(c.text))) f.push("Sonderfahrten-Chip für Umschreiber Achtperson");
  if (chipVon(cs, "Neuntperson")) f.push("Chip für Neuntperson vorhanden");
  return f;
});
await pruefe("H3k", "gelb: Backup fehlt / älter als 7 Tage → Chip „Backup“; frisch → keiner", async () => {
  const f = [];
  let cs = await chips(page);
  if (!cs.length) return "keine .h2-chip" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  let c = chipVon(cs, "Backup");
  if (!c) f.push("Backup fehlt: kein Chip „Backup“"); else if (!c.gelb || c.rot) f.push("Backup-Chip nicht gelb");
  const sz = basisSzenario(); sz.backup = "alt"; await setze(page, sz);
  if (!chipVon(await chips(page), "Backup")) f.push("Backup 10 Tage alt: kein Chip");
  sz.backup = "frisch"; await setze(page, sz);
  if (chipVon(await chips(page), "Backup")) f.push("Backup frisch: Chip trotzdem da");
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H3l", "rote Chips stehen vor den gelben", async () => {
  const cs = await chips(page);
  if (!cs.length) return "keine .h2-chip" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const ohne = cs.filter((c) => !c.rot && !c.gelb);
  if (ohne.length) return `${ohne.length} Chip(s) ohne rot/gelb`;
  const ersteGelb = cs.findIndex((c) => c.gelb), letzteRot = cs.map((c) => c.rot).lastIndexOf(true);
  if (ersteGelb >= 0 && letzteRot > ersteGelb) return "gelber Chip vor rotem: " + cs.map((c) => (c.rot ? "rot" : "gelb")).join(",");
});
await pruefe("H3m", "Tipp auf Schüler-Chip → „Schülerdatei“, auf „Backup“ → „Einstellungen“", async () => {
  const cs = await chips(page);
  if (!cs.length) return "keine .h2-chip" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  const e1 = await klickTitel(page, '.h2-achtung .h2-chip:has-text("Zweitperson")', "Schülerdatei"); if (e1) f.push(e1);
  else if (!/Zweitperson/.test(await text(page, "#view"))) f.push("Akte zeigt nicht Erfundene Zweitperson");
  await setze(page, basisSzenario());
  const e2 = await klickTitel(page, '.h2-achtung .h2-chip:has-text("Backup")', "Einstellungen"); if (e2) f.push(e2);
  await setze(page, basisSzenario());
  return f;
});
// H3n läuft unten bei 360 px.

// H4 „Danach“-Liste
const zeilen = () => page.evaluate(() => [...document.querySelectorAll(".heute2 .h2-danach .h2-zeile")].map((z) => (z.textContent || "").replace(/\s+/g, " ").trim()));
await pruefe("H4a", "Überschrift „Danach“, .h2-danach-info „X UE heute“ (X = ueRange(heute,heute).total)", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(() => { const d = document.querySelector(".heute2 .h2-danach"); if (!d) return null; return { txt: d.textContent, info: (d.querySelector(".h2-danach-info")?.textContent || null), x: ueRange(todayISO(), todayISO()).total }; });
  if (!r) return ".h2-danach fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/Danach/.test(r.txt)) f.push("Überschrift „Danach“ fehlt");
  const zahlen = [String(r.x), r.x.toLocaleString("de-DE")];
  if (r.info === null) f.push(".h2-danach-info fehlt");
  else if (!zahlen.some((z) => norm(r.info).includes(`${z} UE heute`))) f.push(`Info „${norm(r.info)}“ statt „${r.x} UE heute“`);
  return f;
});
await pruefe("H4b", "Zeilen: nur Termine nach der Jetzt-Stunde, ohne abgesagte, zeitlich sortiert (13:30 Zweit-, 16:30 Drittperson)", async () => {
  const z = await zeilen();
  if (!z.length) return "keine .h2-zeile" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  const zw = z.find((t) => t.includes("Zweitperson")), dr = z.find((t) => t.includes("Drittperson"));
  if (!zw || !zw.includes("13:30")) f.push("Zeile 13:30 Erfundene Zweitperson fehlt");
  if (!dr || !dr.includes("16:30")) f.push("Zeile 16:30 Erfundene Drittperson fehlt");
  for (const w of ["Testperson", "Viertperson", "Fuenftperson"]) if (z.some((t) => t.includes(w))) f.push(`${w} steht in „Danach“`);
  const zeiten = z.map((t) => (t.match(/\d{2}:\d{2}/) || [""])[0]).filter(Boolean);
  if (zeiten.join() !== [...zeiten].sort().join()) f.push(`nicht sortiert: ${zeiten.join(", ")}`);
  return f;
});
await pruefe("H4c", "Tipp auf Termin-Zeile → Bearbeiten-Fenster (#sheet.open)", async () => {
  const loc = page.locator('.heute2 .h2-danach .h2-zeile:has-text("Zweitperson")');
  if (!(await loc.count())) return "Zeile Zweitperson fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  await loc.first().click(); await warte(page, 350);
  const s = await sheetZustand(page);
  await setze(page, basisSzenario());
  if (!s.offen) return "kein Fenster offen";
});
await pruefe("H4d", "freie Lücke 15:00 als Zeile „frei“ mit „+ vergeben“ → Fenster „Termin vergeben“", async () => {
  const r = await page.evaluate(() => {
    const d = document.querySelector(".heute2 .h2-danach"); if (!d) return null;
    const z = [...d.querySelectorAll(".h2-zeile, *")].find((e) => /frei/i.test(e.textContent) && /15:00/.test(e.textContent) && [...e.querySelectorAll("button, a, [role=button]")].some((b) => /vergeben/.test(b.textContent)) && e !== d);
    return z ? true : false;
  });
  if (r === null) return ".h2-danach fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  if (!r) return "keine Zeile mit „frei“, 15:00 und Knopf „vergeben“";
  const f = [];
  const knopf = page.locator('.heute2 .h2-danach :is(button, a, [role=button]):has-text("vergeben")');
  await knopf.first().click(); await warte(page, 350);
  const s = await sheetZustand(page);
  if (!s.offen || s.kopf !== "Termin vergeben") f.push(`„+ vergeben“ öffnet „${s.offen ? s.kopf : "nichts"}“`);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H4e", "nichts mehr heute: „Heute ist danach nichts mehr geplant“", async () => {
  const sz = basisSzenario();
  sz.lessons = sz.lessons.filter((l) => ["L-mo", "L-fc", "L0", "L1"].includes(l.id));
  sz.workCfg.nachMittag = null; // keine freie Lücke mehr nach jetzt
  await setze(page, sz);
  const r = await text(page, ".heute2 .h2-danach"), h = await da(page, ".heute2");
  const frei = await page.evaluate(() => dayFreeSlots(todayISO()).filter((s) => hm2min(s.von) > 630).length);
  await setze(page, basisSzenario());
  if (!h) return KEIN_H2;
  if (frei) return `Testaufbau: noch ${frei} freie Lücke(n)`;
  if (r === null) return ".h2-danach fehlt";
  if (!/Heute ist danach nichts mehr geplant/.test(r)) return `Text fehlt: „${r.slice(0, 60)}“`;
});

// H5 Kacheln
const kachel = (k) => text(page, `.heute2 .h2-kacheln .h2-kachel[data-k="${k}"]`);
await pruefe("H5a", "Kacheln .h2-kacheln in 2 Spalten", async () => {
  const r = await page.evaluate(() => {
    const w = document.querySelector(".heute2 .h2-kacheln"); if (!w) return null;
    const ks = [...w.querySelectorAll(".h2-kachel")].filter((k) => k.getBoundingClientRect().width > 0);
    return { n: ks.length, spalten: new Set(ks.map((k) => Math.round(k.getBoundingClientRect().left))).size };
  });
  if (!r) return ".h2-kacheln fehlt" + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  if (r.n < 2) return `nur ${r.n} Kachel(n)`;
  if (r.spalten !== 2) return `${r.spalten} Spalte(n)`;
});
const euroTexte = (v) => [String(v), v.toLocaleString("de-DE")].map((z) => `${z} €`);
await pruefe("H5b", "„Diese Woche verdient“ = wocheVerdientEuro() + „ €“, Tipp → „Statistik“", async () => {
  const t = await kachel("woche");
  if (t === null) return 'Kachel data-k="woche" fehlt' + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const v = await page.evaluate(() => wocheVerdientEuro());
  const f = [];
  if (!/Diese Woche verdient/.test(t)) f.push(`Beschriftung „${t}“`);
  if (!euroTexte(v).some((x) => norm(t).includes(x))) f.push(`Wert „${t}“ statt „${v} €“`);
  if (v <= 0) f.push(`Testaufbau: wocheVerdientEuro()=${v}`);
  const e = await klickTitel(page, '.heute2 .h2-kachel[data-k="woche"]', "Statistik"); if (e) f.push(e);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H5c", "Woche bei PIN-Sperre „••••“ statt Betrag", async () => {
  const sz = basisSzenario(); sz.pin = "1234";
  await setze(page, sz);
  const t = await kachel("woche"), v = await page.evaluate(() => ({ eur: wocheVerdientEuro(), frei: _verdienstPinCheck() }));
  await setze(page, basisSzenario());
  if (t === null) return 'Kachel data-k="woche" fehlt' + ((await page.evaluate(() => !!document.querySelector(".heute2"))) ? "" : " (" + KEIN_H2 + ")");
  if (v.frei) return "Testaufbau: PIN-Sperre greift nicht";
  const f = [];
  if (!t.includes("••••")) f.push(`„••••“ fehlt: „${t}“`);
  if (euroTexte(v.eur).some((x) => norm(t).includes(x))) f.push("Betrag trotz Sperre sichtbar");
  return f;
});
await pruefe("H5d", "Woche aus, wenn sichtbar('dash_wocheverdienst') false", async () => {
  const sz = basisSzenario(); sz.sicht = { dash_wocheverdienst: false };
  await setze(page, sz);
  const r = await da(page, '.heute2 .h2-kachel[data-k="woche"]'), h = await da(page, ".heute2");
  await setze(page, basisSzenario());
  if (!h) return KEIN_H2;
  if (r) return "Kachel trotzdem da";
});
await pruefe("H5e", "„Bonus noch“ = aufgerundet max(0, bonusUE − fcCounted Monat) + „ UE“, Tipp → „Statistik“", async () => {
  const t = await kachel("bonus");
  if (t === null) return 'Kachel data-k="bonus" fehlt' + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const soll = await page.evaluate(() => { const [a, b] = monthRangeOf(todayISO()); return Math.ceil(Math.max(0, DB.verdienst.bonusUE - ueRange(a, b).fcCounted)); });
  const f = [];
  if (!/Bonus noch/.test(t)) f.push(`Beschriftung „${t}“`);
  if (!norm(t).includes(`${soll} UE`)) f.push(`Wert „${t}“ statt „${soll} UE“`);
  const e = await klickTitel(page, '.heute2 .h2-kachel[data-k="bonus"]', "Statistik"); if (e) f.push(e);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H5f", "Bonus erreicht → „erreicht“", async () => {
  const sz = basisSzenario(); sz.verdienst.bonusUE = 1;
  await setze(page, sz);
  const t = await kachel("bonus"), h = await da(page, ".heute2");
  await setze(page, basisSzenario());
  if (!h) return KEIN_H2;
  if (t === null) return 'Kachel data-k="bonus" fehlt';
  if (!/erreicht/.test(t)) return `„${t}“ ohne „erreicht“`;
});
await pruefe("H5g", "„Nächste Prüfung“ = TT.MM. des nächsten DB.termine, Tipp → „Prüfungen“", async () => {
  const t = await kachel("pruefung");
  if (t === null) return 'Kachel data-k="pruefung" fehlt' + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const soll = await page.evaluate(() => { const d = futureTermine()[0].date; return d.slice(8, 10) + "." + d.slice(5, 7) + "."; });
  const f = [];
  if (!/Nächste Prüfung/.test(t)) f.push(`Beschriftung „${t}“`);
  if (!t.includes(soll)) f.push(`Wert „${t}“ statt „${soll}“`);
  const e = await klickTitel(page, '.heute2 .h2-kachel[data-k="pruefung"]', "Prüfungen"); if (e) f.push(e);
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H5h", "ohne Prüfungstermin „–“; aus, wenn sichtbar('dash_nextexam') false", async () => {
  const sz = basisSzenario(); sz.termine = [];
  await setze(page, sz);
  const t = await kachel("pruefung"), h = await da(page, ".heute2");
  sz.termine = basisSzenario().termine; sz.sicht = { dash_nextexam: false };
  await setze(page, sz);
  const aus = !(await da(page, '.heute2 .h2-kachel[data-k="pruefung"]'));
  await setze(page, basisSzenario());
  if (!h) return KEIN_H2;
  const f = [];
  if (t === null) f.push('ohne Termin: Kachel data-k="pruefung" fehlt');
  else if (!/[–-]/.test(t.replace(/Nächste Prüfung/, ""))) f.push(`ohne Termin: „${t}“ ohne „–“`);
  if (!aus) f.push("Kachel trotz sichtbar=false da");
  return f;
});
await pruefe("H5i", "„To-dos“ = 3 offene (DB.todos + Schüler-todos), Tipp → „To-Dos“", async () => {
  const t = await kachel("todos");
  if (t === null) return 'Kachel data-k="todos" fehlt' + ((await da(page, ".heute2")) ? "" : " (" + KEIN_H2 + ")");
  const f = [];
  if (!/To-?dos/i.test(t)) f.push(`Beschriftung „${t}“`);
  if (!/(^|\D)3(\D|$)/.test(t)) f.push(`Wert „${t}“ statt 3`);
  const e = await klickTitel(page, '.heute2 .h2-kachel[data-k="todos"]', "To-Dos"); if (e) f.push(e);
  await setze(page, basisSzenario());
  return f;
});

// H6 Bleibt erhalten
await pruefe("H6a", "Fahrcheck-Hinweis (fcPendingCardHTML) erscheint in .heute2 bei offenem FC", async () => {
  const e = await brauchtHeute2(page); if (e) return e;
  const leer = await page.evaluate(() => fcPendingCardHTML() === "");
  if (leer) return "Testaufbau: fcPendingCardHTML() leer";
  if (!(await da(page, ".heute2 .fc-card"))) return ".fc-card fehlt";
});
await pruefe("H6b", "Auslastung (#capCard) da und öffnet „Auslastung“; aus bei sichtbar('dash_capacity') false", async () => {
  const e = await brauchtHeute2(page); if (e) return e;
  const f = [];
  const loc = page.locator(".heute2 #capCard, .heute2 .cap-card");
  if (!(await loc.count())) f.push("Auslastung fehlt");
  else {
    await loc.first().click(); await warte(page, 350);
    const s = await sheetZustand(page);
    if (!s.offen || s.kopf !== "Auslastung") f.push(`Tipp öffnet „${s.offen ? s.kopf : "nichts"}“`);
  }
  const sz = basisSzenario(); sz.sicht = { dash_capacity: false };
  await setze(page, sz);
  if (await da(page, "#view #capCard, #view .cap-card")) f.push("Auslastung trotz sichtbar=false da");
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H6c", "Wetter mit Schlüssel: .h2-wetter im Kopf mit Temperatur, Tipp → „Wetter“", async () => {
  const sz = basisSzenario(); sz.wetter = true;
  await setze(page, sz);
  await warte(page, 300);
  const h = await da(page, ".heute2");
  const t = await text(page, ".heute2 .h2-wetter");
  const f = [];
  if (!h) f.push(KEIN_H2);
  else if (t === null) f.push(".h2-wetter fehlt");
  else {
    if (!/17/.test(t)) f.push(`Temperatur fehlt: „${t}“`);
    const e = await klickTitel(page, ".heute2 .h2-wetter", "Wetter"); if (e) f.push(e);
  }
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H6d", "Wetter ohne Schlüssel: kein .h2-wetter, keine Anfrage an den Wetterdienst", async () => {
  const vorher = anfragen.length;
  await setze(page, basisSzenario());
  await warte(page, 500);
  const h = await da(page, ".heute2");
  const f = [];
  if (!h) f.push(KEIN_H2);
  if (await da(page, ".heute2 .h2-wetter")) f.push(".h2-wetter trotzdem da");
  const w = anfragen.slice(vorher).filter((u) => /openweathermap/i.test(u));
  if (w.length) f.push(`${w.length} Wetter-Anfrage(n)`);
  return f;
});

// H7 Alt entfernt
await setze(page, basisSzenario());
await pruefe("H7a", "keine .dash-quick-row", async () => { if (await da(page, "#view .dash-quick-row")) return ".dash-quick-row noch da"; });
await pruefe("H7b", "kein „Willkommen zurück“", async () => { if (/Willkommen zurück/.test(await text(page, "#view"))) return "„Willkommen zurück“ noch da"; });
await pruefe("H7c", "kein „Anordnen“ der alten Kacheln", async () => {
  if ((await da(page, "#view #dashTilesEditBtn, #view .dash-tiles")) || /Anordnen/.test(await text(page, "#view"))) return "„Anordnen“/alte Kacheln noch da";
});
await pruefe("H7d", "keine alte .next-stud-Karte", async () => { if (await da(page, "#view .next-stud")) return ".next-stud noch da"; });

// H9a (Hauptlauf): JS-Fehler
await pruefe("H9a", "keine JS-Fehler im Hauptlauf", async () => { if (jsFehler.length) return `${jsFehler.length} JS-Fehler, z. B. ${jsFehler[0]}`; });
// H10: Funde des Prüf-Teams (Schritt 2)
await pruefe("H10a", "„Danach“ zeigt einen zweiten Termin zur gleichen Startzeit und eine Theorie vor der nächsten Stunde", async () => {
  await setze(page, basisSzenario());
  const z = await page.evaluate(() => {
    DB.lessons.push({ id: "Lgleich", date: todayISO(), von: "10:00", bis: "11:30", art: "fahrstunde", sid: "t6", status: "geplant" },
      { id: "Ltheo", date: todayISO(), von: "11:45", bis: "13:15", art: "theorie", status: "geplant" });
    routeDashboard();
    return [...document.querySelectorAll(".heute2 .h2-danach .h2-zeile")].map((x) => x.textContent.replace(/\s+/g, " "));
  });
  const f = [];
  if (!z.some((t) => t.includes("Sechstperson"))) f.push("Termin zur gleichen Zeit fehlt: " + z.join(" | "));
  if (!z.some((t) => t.includes("11:45"))) f.push("Theorie 11:45 fehlt");
  await setze(page, basisSzenario());
  return f;
});
await pruefe("H10b", "Heute frischt sich auf: nach Ende der Stunde und Sichtbar-Werden steht die nächste Stunde in der Karte", async () => {
  await setze(page, basisSzenario());
  const vorher = await text(page, ".heute2 .h2-jetzt-name");
  await page.clock.setFixedTime(new Date("2026-10-14T13:40:00+02:00"));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(150);
  const nachher = await text(page, ".heute2 .h2-jetzt-name");
  await page.clock.setFixedTime(JETZT);
  await setze(page, basisSzenario());
  if (vorher === nachher) return `Karte zeigt weiter „${nachher}“`;
  if (!/Zweitperson/.test(nachher || "")) return `nach 13:40 erwartet Zweitperson, steht „${nachher}“`;
});
await pruefe("H10c", "Titel nur einmal sichtbar, Zahlen in Kacheln mit Normalziffern", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(() => ({ oben: getComputedStyle(document.getElementById("tbTitle")).visibility, ziff: getComputedStyle(document.querySelector(".heute2 .h2-k-w")).fontVariantNumeric }));
  const f = [];
  if (r.oben !== "hidden") f.push("Titel oben noch sichtbar");
  if (!/lining-nums/.test(r.ziff)) f.push("Kachel-Zahlen ohne lining-nums: " + r.ziff);
  return f;
});

await ctx.close();

// ---------- H8 Handy: Größen × hell/dunkel ----------
const GROESSEN = [{ n: "360 hoch", w: 360, h: 740 }, { n: "412 hoch", w: 412, h: 915 }, { n: "915 quer", w: 915, h: 412 }];
const h8 = { rand: [], knopf: [], kontrast: [], jetzt: [], fab: [], scroll: [], fehler: [], ohne: false };
for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = await neueSeite(g.w, g.h);
    const sz = basisSzenario(); sz.theme = theme;
    await setze(s.page, sz);
    const name = `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;
    const m = await s.page.evaluate(() => {
      const W = document.documentElement.clientWidth, h2 = document.querySelector(".heute2");
      const out = { h2: !!h2, wisch: document.documentElement.scrollWidth > W + 1, rand: [], klein: [], kontrast: [], jetzt: null, fab: [], scroll: null };
      if (!h2) return out;
      for (const el of h2.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (!r.width || el.closest(".h2-achtung")) continue;
        if (r.right > W + 1) out.rand.push((el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + " +" + Math.round(r.right - W));
      }
      const tipp = [...h2.querySelectorAll("button, a, [role=button], .h2-chip, .h2-zeile, .h2-kachel")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && getComputedStyle(b).visibility !== "hidden"; });
      for (const b of tipp) { const r = b.getBoundingClientRect(); if (r.height < 44) out.klein.push(`„${(b.textContent || "").trim().slice(0, 18)}“ ${Math.round(r.height)}px`); }
      // Kontrast
      const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const hg = (el) => { const ebenen = []; while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c && c.a > 0) { ebenen.push(c); if (c.a >= 1) break; } el = el.parentElement; } let f = { r: 255, g: 255, b: 255 }; if (!ebenen.length || ebenen[ebenen.length - 1].a < 1) f = rgb(getComputedStyle(document.body).backgroundColor) || f; for (const c of ebenen.reverse()) f = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) }; return f; };
      const lum = (c) => { const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      out.dunkel = !document.body.classList.contains("light");
      for (const el of h2.querySelectorAll(".h2-kacheln *, .h2-danach *")) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        const b = hg(el), c = rgb(getComputedStyle(el).color); if (!c) continue;
        const cc = { r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a) };
        const q = ratio(cc, b);
        if (q < 4.5) out.kontrast.push(`„${el.textContent.trim().slice(0, 16)}“ ${q.toFixed(1)}:1`);
      }
      const j = h2.querySelector(".h2-jetzt");
      if (j) {
        const b = hg(j), n = j.querySelector(".h2-jetzt-name") || j;
        const c = rgb(getComputedStyle(n).color);
        out.jetzt = { bgLum: lum(b), gruen: b.g >= b.r && b.g >= b.b, textLum: c ? lum(c) : 0, bg: `rgb(${Math.round(b.r)},${Math.round(b.g)},${Math.round(b.b)})` };
        // Plus-Knopf überdeckt keinen Knopf der Karte (Seite ganz oben)
        const fab = document.getElementById("fab");
        if (fab && getComputedStyle(fab).display !== "none") {
          const fr = fab.getBoundingClientRect();
          for (const k of j.querySelectorAll("button, a, [role=button]")) {
            const r = k.getBoundingClientRect(); if (!r.width) continue;
            if (r.left < fr.right && r.right > fr.left && r.top < fr.bottom && r.bottom > fr.top) out.fab.push(`„${k.textContent.trim().slice(0, 16)}“`);
          }
        }
      }
      // Achtung-Streifen scrollt in sich
      const a = h2.querySelector(".h2-achtung");
      if (a) {
        const sc = [a, ...a.querySelectorAll("*")].find((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1);
        out.scroll = !!sc;
      }
      return out;
    });
    if (!m.h2) { h8.ohne = true; await s.ctx.close(); continue; }
    if (m.wisch) h8.rand.push(`${name}: seitlich wischbar`);
    if (m.rand.length) h8.rand.push(`${name}: ${m.rand.slice(0, 3).join(", ")}`);
    if (m.klein.length) h8.knopf.push(`${name}: ${m.klein.slice(0, 3).join(", ")}${m.klein.length > 3 ? ` (+${m.klein.length - 3})` : ""}`);
    if (theme === "dark") {
      if (!m.dunkel) h8.kontrast.push(`${name}: Dunkel-Modus greift nicht`);
      if (m.kontrast.length) h8.kontrast.push(`${name}: ${m.kontrast.slice(0, 3).join(", ")}${m.kontrast.length > 3 ? ` (+${m.kontrast.length - 3})` : ""}`);
      if (!m.jetzt) h8.jetzt.push(`${name}: .h2-jetzt fehlt`);
      else if (!(m.jetzt.bgLum < 0.12 && m.jetzt.gruen && m.jetzt.textLum > 0.5)) h8.jetzt.push(`${name}: Karte ${m.jetzt.bg}, Text-Helligkeit ${m.jetzt.textLum.toFixed(2)}`);
    }
    if (m.fab.length) h8.fab.push(`${name}: ${m.fab.join(", ")}`);
    if (g.w === 360 && m.scroll === false) h8.scroll.push(`${name}: Streifen scrollt nicht seitlich in sich`);
    if (g.w === 360 && m.scroll === null) h8.scroll.push(`${name}: .h2-achtung fehlt`);
    if (s.jsFehler.length) h8.fehler.push(`${name}: ${s.jsFehler[0]}`);
    await s.ctx.close();
  }
}
const h8Ergebnis = (liste) => (h8.ohne ? KEIN_H2 : liste);
await pruefe("H3n", "Achtung-Streifen scrollt bei 360 px seitlich in sich, die Seite nicht", () => h8Ergebnis(h8.scroll.concat(h8.rand.filter((x) => x.startsWith("360") && x.includes("wischbar")))));
await pruefe("H8a", "360/412 hoch, 915 quer, hell+dunkel: nicht wischbar, nichts über den rechten Rand", () => h8Ergebnis(h8.rand));
await pruefe("H8b", "alle Knöpfe/Links/Chips/Zeilen/Kacheln in .heute2 ≥ 44 px hoch", () => h8Ergebnis(h8.knopf));
await pruefe("H8c", "Dunkel: Text in Kacheln und „Danach“ Kontrast ≥ 4.5:1", () => h8Ergebnis(h8.kontrast));
await pruefe("H8d", "Dunkel: „Jetzt dran“-Karte dunkelgrün mit hellem Text", () => h8Ergebnis(h8.jetzt));
await pruefe("H8e", "Plus-Knopf (#fab) überdeckt oben keinen Knopf der „Jetzt dran“-Karte", () => h8Ergebnis(h8.fab));
await pruefe("H8f", "keine JS-Fehler in den Handy-Größen", () => h8.fehler);

await browser.close();
server.close();

// ---------- H9 Nichts kaputt: die anderen Tests ----------
if (process.env.HEUTE_SCHNELL) {
  await pruefe("H9b", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "HEUTE_SCHNELL gesetzt" }));
  await pruefe("H9c", "handy-test: keine Probleme bei index.html/routeDashboard", () => ({ skip: "HEUTE_SCHNELL gesetzt" }));
} else {
  const dir = join(ROOT, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "heute-test.mjs" && n !== "handy-test.mjs").sort();
  const lauf = (n) => spawnSync(process.execPath, [join(dir, n)], { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 600000 });
  await pruefe("H9b", `alle anderen Tests grün (${tests.join(", ")})`, () => {
    const f = [];
    for (const n of tests) {
      const r = lauf(n);
      if (r.status !== 0) f.push(`${n} Exit ${r.status}${r.signal ? " " + r.signal : ""}: ${((r.stdout || "") + (r.stderr || "")).split("\n").filter((z) => /FEHLER|PROBLEM|Error/.test(z)).slice(0, 2).join(" / ")}`);
    }
    return f;
  });
  await pruefe("H9c", "handy-test: keine Probleme bei index.html/routeDashboard", () => {
    const r = lauf("handy-test.mjs");
    const z = (r.stdout || "").split("\n").filter((x) => /^(PROBLEM|FEHLER)/.test(x) && /index\.html|routeDashboard|App-Ansichten/.test(x));
    if (r.status !== 0 && !z.length) return `handy-test Exit ${r.status} (anderes Problem, bitte mit altem Stand vergleichen): ${(r.stdout || "").split("\n").filter((x) => /^(PROBLEM|FEHLER)/.test(x)).slice(0, 2).join(" / ")}`;
    return z.slice(0, 4);
  });
}

console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
