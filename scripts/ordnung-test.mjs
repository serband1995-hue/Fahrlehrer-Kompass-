// Ordnungs-Test (Umbau Schritt 6b – Ordnung): Kalender-Kopf kompakter, Akte ohne doppelten Namen und mit kleinem Prozentkreis,
// kein doppelter Seitentitel (Kopfleiste + große Überschrift), Einstellungen mit Überschrift, ruhige Linien-Bildchen statt Emojis,
// dazu die Hinweise des Richters aus 6a zum Wetter.
// Geschrieben VOR dem Bau: gegen den alten Stand sind die neuen Punkte (O1 … O7) rot. Das ist gewollt.
// Punkte mit „bleibt“ (O8) prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Zeilen „info“ sind nur Messwerte für den Bericht, keine Prüfung.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank und kein Wetterdienst: alle Fremdanfragen sind blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/ordnung-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), ORDNUNG_SCHNELL=1 (O9: die anderen Tests nicht mitlaufen lassen),
//           ORDNUNG_AUSLESEN=1 (gibt die Bedien-Haken, Titel/Reiter, Emoji-Stellen und Zählerwerte des Stands als JSON aus – so wurden
//           BEDIEN, TITEL, EMOJI_STELLEN und ZAEHLER unten gewonnen).
// O9 läuft auch nicht, wenn dieser Test selbst von einem anderen *-test.mjs gestartet wurde (dessen SCHNELL-Schalter gesetzt oder
// der aufrufende Prozess ist ein *-test.mjs) – sonst liefen alle Tests mehrfach ineinander.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const REPO = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOT = process.env.KOMPASS_ROOT || REPO;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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

const AUSLESEN = !!process.env.ORDNUNG_AUSLESEN;
let fehlerZahl = 0, okZahl = 0, uebersprungen = 0;
// fn liefert: nichts/true/[] = ok, Text/Liste = Fehlergrund, { skip: "Grund" } = übersprungen
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r && typeof r === "object" && !Array.isArray(r) && r.skip) { uebersprungen++; console.log(`übersprungen  ${id} ${text}: ${r.skip}`); return; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  if (Array.isArray(r) && r.length > 10) r = r.slice(0, 10).concat(`(+${r.length - 10} weitere)`);
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const info = (t) => console.log(`info  ${t}`);

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => { const d = new Date(Date.UTC(2026, 9, 14 + n)); return d.toISOString().slice(0, 10); };
const STADT = "Erfundenstadt,DE";
// Schüler mit langem Namen (Umbruch, Doppelt-Zählung): steht in Akte, Plan und Notizen
const LANGNAME = "Maximiliane-Josefine Erfundene-Langnamige";

function basisSzenario() {
  return {
    theme: "light",
    students: [
      { id: "s1", name: LANGNAME, telefon: "0170 1111111", anteil: 0.6, theorie: true, notiz: "Alte erfundene Notiz", todos: [{ id: "st1", text: "Erfundene Schüleraufgabe", done: false }] },
      { id: "s2", name: "Bernd Erfunden", telefon: "0170 2222222", anteil: 0.95, theorie: true, theoryPassed: "2026-09-20T08:00:00.000Z", ready: "2026-10-01T08:00:00.000Z" },
      { id: "s3", name: "Clara Erfunden", telefon: "", anteil: 0.2, theorieWait: "2026-10-01T08:00:00.000Z" },
      { id: "s4", name: "Dieter Erfunden", telefon: "0170 4444444", anteil: 0.95, theorie: true, theoryPassed: "2026-09-25T08:00:00.000Z", ready: "2026-10-05T08:00:00.000Z" },
      { id: "s5", name: "Emma Erfunden", telefon: "0170 5555555", anteil: 1, passed: "2026-09-30", profil: "gruen" },
      { id: "s6", name: "Felix Erfunden", telefon: "0170 6666666", anteil: 1, passed: "2026-08-12", profil: "blau" },
    ],
    lessons: [
      { id: "a1", date: "2026-10-12", von: "08:00", bis: "09:30", sid: "s1" },
      { id: "a2", date: TAG, von: "08:00", bis: "09:30", sid: "s1" },
      { id: "a3", date: TAG, von: "14:00", bis: "15:30", sid: "s1" },
      { id: "a4", date: plusTage(1), von: "10:00", bis: "11:30", sid: "s3" },
      { id: "a5", date: plusTage(2), von: "16:00", bis: "17:30", sid: "s4", art: "sonder" },
      { id: "a6", date: "2026-10-05", von: "10:00", bis: "11:30", sid: "s2" },
      { id: "a7", date: "2026-09-21", von: "10:00", bis: "11:30", sid: "s1" },
      { id: "a8", date: "2026-09-07", von: "12:00", bis: "13:30", sid: "s5" },
    ],
    termine: [{ id: "P1", date: plusTage(1), von: "09:00", slots: ["s2", null] }, { id: "P2", date: plusTage(8), von: "11:00", slots: [null] }],
    exams: [
      { id: "E1", sid: "s5", name: "Emma Erfunden", date: "2026-09-30", von: "09:00", result: "pass", pruefer: "XY", note: "", attempt: 1, faults: [], eingriff: false, earnAt: "2026-09-30" },
      { id: "E2", sid: "s2", name: "Bernd Erfunden", date: "2026-10-02", von: "09:00", result: "fail", pruefer: "XY", note: "", attempt: 1, faults: "FEHLER2", eingriff: true, earnAt: "2026-10-02" },
      { id: "E3", sid: "s6", name: "Felix Erfunden", date: "2026-08-12", von: "11:00", result: "pass", pruefer: "ZW", note: "", attempt: 2, faults: [], eingriff: false, earnAt: "2026-08-12" },
    ],
    todos: [{ id: "t1", text: "Erfundene Aufgabe Eins", done: false }, { id: "t2", text: "Erfundene Aufgabe Zwei", done: true }],
    wetter: { temp: 14, desc: "leichter regen", icon: "10d" },
    vorschau: ["01", "02", "10", "13", "50"].map((ic, i) => ({ date: `2026-10-${15 + i}`, min: 6 + i, max: 13 + i, icon: ic })),
    start: "routeHome",
  };
}
const wetterVon = (icon, temp = 14) => ({ temp, desc: { "01": "klarer himmel", "03": "mäßig bewölkt", "10": "leichter regen", "11": "gewitter", "13": "schnee" }[icon.slice(0, 2)] || "wetter", icon });

// Seiten. k = Schlüssel, vor = Zustand vor dem Aufruf, auf = Route-Aufruf.
const KAL = [
  { k: "kalender", n: "Kalender (Woche)", vor: "_calView='woche';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
  { k: "kalender-tag", n: "Kalender (Tag)", vor: "_calView='tag';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
  { k: "kalender-monat", n: "Kalender (Monat)", vor: "_calView='monat';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
];
const AKTE = [
  { k: "detail", n: "Akte Überblick", vor: "", auf: "routeDetail('s1')" },
  { k: "plan", n: "Akte Plan", vor: "", auf: "routePlan('s1')" },
  { k: "notes", n: "Akte Notizen", vor: "", auf: "routeNotes('s1')" },
];
const SETTINGS = { k: "settings", n: "Einstellungen", vor: "_settingsAccOpen=null;", auf: "routeSettings()" };
// O4: Seiten mit großer, gleichlautender Überschrift in der Seite (Kopfleisten-Titel soll dort unsichtbar sein)
const MIT_UEBERSCHRIFT = [
  { k: "pruefungen", n: "Prüfungen", vor: "window._pruefTab='termine';", auf: "routePruefungen()" },
  { k: "todos", n: "To-dos", vor: "_todoTab='global';_todoStudent=null;", auf: "routeTodos()" },
  { k: "stats", n: "Statistik", vor: "", auf: "routeStats()", ms: 1200 },
  { k: "archiv", n: "Archiv", vor: "_archFormFilter=[];_archColorFilter=[];", auf: "routeArchive()" },
  { k: "warteliste", n: "Warteliste", vor: "", auf: "routeWaitlist()" },
  { k: "arbeitszeit", n: "Arbeitszeiten", vor: "", auf: "routeArbeitszeit()" },
  { k: "historie", n: "Historie", vor: "", auf: "routeHistorie('s1')" },
  { k: "nichtbesteher", n: "Nicht-Besteher", vor: "", auf: "routeNichtBesteher()", ms: 700 },
  { k: "pruefwoche", n: "Diese Woche", vor: "", auf: "routePruefungenWoche()" },
  SETTINGS,
  { k: "home", n: "Schüler-Liste", vor: "", auf: "routeHome()" },
];
// O4: Seiten OHNE gleichlautende Überschrift (Kopfleisten-Titel bleibt sichtbar)
const OHNE_UEBERSCHRIFT = [
  ...KAL,
  ...AKTE,
  { k: "akte-termine", n: "Akte Termine", vor: "", auf: "routeAkteTermine('s1')" },
  { k: "akte-pruefung", n: "Akte Prüfung", vor: "", auf: "routeAktePruefung('s1')" },
  { k: "wetter", n: "Wetter", vor: "", auf: `routeWetter(${JSON.stringify(wetterVon("10d"))})` },
];
// O8: alle betroffenen Seiten (Rand/Wischen/JS-Fehler)
const ALLE = [...KAL, ...AKTE, { k: "settings-app", n: "Einstellungen (App anpassen offen)", vor: "_settingsAccOpen='app';", auf: "routeSettings()", ms: 600 },
  ...MIT_UEBERSCHRIFT, ...OHNE_UEBERSCHRIFT.filter((s) => !KAL.includes(s) && !AKTE.includes(s))];

// ---------- Werte des alten Stands (412 × 915, hell) – gewonnen mit ORDNUNG_AUSLESEN=1 ----------
// Bedien-Haken: ids = Element-IDs im #view, daten = data-*-Attribute an Bedien-Elementen, knoepfe = Anzahl <button> im #view.
// Nach dem Umbau muss jede ID und jedes Attribut noch da sein; die Zahl der Knöpfe darf nicht sinken.
const BEDIEN = {
  "kalender": {"ids": ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"], "daten": ["data-calday", "data-f", "data-freeslot"], "knoepfe": 42},
  "kalender-tag": {"ids": ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"], "daten": ["data-evedit", "data-f", "data-freeslot"], "knoepfe": 15},
  "kalender-monat": {"ids": ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"], "daten": ["data-f"], "knoepfe": 11},
  "detail": {"ids": ["akadOn", "akademieFortschrittSlot", "backBtn", "dashEmpfehlungen", "dashFormPills", "dashTheoToggle", "dashUmschreiberToggle", "delBtn", "editBtn", "pruefReifBtn", "sehhilfeBtn", "shareStandBtn", "simOn", "theoEdit", "theoFill", "theoPct", "waKontaktBtn"], "daten": ["data-akte", "data-form", "data-go"], "knoepfe": 23},
  "plan": {"ids": ["backBtn", "c_autobahn", "c_nacht", "c_ueberland", "pdfPlanBtn", "planActions", "planPrognose", "planRing", "readyForce", "readyLk", "stdGrid", "stufenWrap"], "daten": ["data-akte", "data-done", "data-faid", "data-info", "data-lz", "data-lzalle", "data-note", "data-sn", "data-std", "data-v"], "knoepfe": 323},
  "notes": {"ids": ["backBtn", "noteArea", "saveNote"], "daten": ["data-akte"], "knoepfe": 8},
  "settings": {"ids": ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"], "daten": ["data-vis"], "knoepfe": 23},
};
// Text von #tbTitle und markierter Reiter unten (.tab-i.on) je Seite – muss nach dem Umbau gleich bleiben.
const TITEL = {
  "pruefungen": {"t": "Prüfungen", "reiter": "pruefungen"},
  "todos": {"t": "To-Dos", "reiter": "mehr"},
  "stats": {"t": "Statistik", "reiter": "mehr"},
  "archiv": {"t": "Archiv", "reiter": "mehr"},
  "warteliste": {"t": "Warteliste", "reiter": "schueler"},
  "arbeitszeit": {"t": "Arbeitszeiten", "reiter": "mehr"},
  "historie": {"t": "Historie", "reiter": "schueler"},
  "nichtbesteher": {"t": "Nicht-Besteher", "reiter": "mehr"},
  "pruefwoche": {"t": "Diese Woche", "reiter": "pruefungen"},
  "settings": {"t": "Einstellungen", "reiter": "mehr"},
  "home": {"t": "Schüler", "reiter": "schueler"},
  "kalender": {"t": "Kalender", "reiter": "kalender"},
  "kalender-tag": {"t": "Kalender", "reiter": "kalender"},
  "kalender-monat": {"t": "Kalender", "reiter": "kalender"},
  "detail": {"t": "Schülerdatei", "reiter": "schueler"},
  "plan": {"t": "Ausbildungsplan", "reiter": "schueler"},
  "notes": {"t": "Notizen", "reiter": "schueler"},
  "akte-termine": {"t": "Termine", "reiter": "schueler"},
  "akte-pruefung": {"t": "Prüfung", "reiter": "schueler"},
  "wetter": {"t": "Wetter", "reiter": "mehr"},
};
// Stellen mit Emoji im alten Stand: Seite, Klasse (erste), Beschriftung ohne Emoji. Dort muss nachher ein svg stehen.
// Plan: „Als PDF“ 📄, „Zur Verkehrstafel“ ✏️, 21 Video-Knöpfe .szBtn 🎬 und 6 Mikrofon-Knöpfe .mic-btn 🎤 (beide ohne Beschriftung).
const EMOJI_STELLEN = [
  {"k": "settings", "kl": "acc-h", "label": "App anpassen"},
  {"k": "settings", "kl": "acc-h", "label": "Kalender & Arbeit"},
  {"k": "settings", "kl": "acc-h", "label": "Verdienst & Sicherheit"},
  {"k": "settings", "kl": "acc-h", "label": "Daten"},
  {"k": "settings", "kl": "acc-h", "label": "Sonstiges"},
  {"k": "detail", "kl": "chip", "label": "keine"},
  {"k": "detail", "kl": "chip", "label": "Prüfungsreif markieren"},
  {"k": "detail", "kl": "akte-btn", "label": "Bogen"},
  {"k": "detail", "kl": "akte-btn", "label": "Historie"},
  {"k": "detail", "kl": "vortest-big", "label": "Stand teilen Aktuellen Ausbildungsstand per WhatsApp schicken ›"},
  {"k": "detail", "kl": "vortest-big", "label": "WhatsApp öffnen Frei schreiben, ohne festen Text ›"},
  {"k": "detail", "kl": "vortest-big", "label": "Vortest-Termin buchen Öffnet den Boost-Kalender ›"},
  {"k": "plan", "kl": "mini-btn", "label": "Als PDF"},
  {"k": "plan", "kl": "btn", "label": "Zur Verkehrstafel"},
  {"k": "plan", "kl": "szBtn", "label": ""},
  {"k": "plan", "kl": "mic-btn", "label": ""},
];
// Zähler-Werte des Kalenders (Zahlen im Text von .cal-counter) bei den festen Testdaten
const ZAEHLER = ["4", "8", "12", "4", "8", "72"];   // Woche: 4 Termine · 8 UE, 12 frei; Monat: 4 Termine · 8 UE, 72 frei

// ---------- Hilfen im Browser (als Text in jede Seite gelegt) ----------
const HILFEN = `
window.__o = {
  cs: (e) => getComputedStyle(e),
  unsichtbar(e) {
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return true;
      if (p.parentElement && p.parentElement.tagName === "DETAILS" && !p.parentElement.open && p.tagName !== "SUMMARY") return true;
    }
    return false;
  },
  sicht(e) { if (!e || __o.unsichtbar(e)) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; },
  sel(e) { const c = typeof e.className === "string" ? e.className : (e.className && e.className.baseVal) || ""; return e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (c.trim() ? "." + c.trim().split(/\\s+/).slice(0, 2).join(".") : ""); },
  // Text ohne Inhalt von svg (Bildchen) und ohne Formularfelder
  text(e) {
    let t = ""; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest("svg, script, style, textarea, select") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    let n; while ((n = w.nextNode())) t += n.textContent + " ";
    return t;
  },
  EMO: /[\\p{Extended_Pictographic}\\u2139\\u270F\\uFE0F]/u,
  emojis(t) { return [...t.matchAll(/[\\p{Extended_Pictographic}\\u2139\\u270F]/gu)].map((m) => m[0]); },
  ohneEmoji(t) { return t.replace(/[\\p{Extended_Pictographic}\\u2139\\u270F\\uFE0F\\u200D]/gu, "").replace(/\\s+/g, " ").trim(); },
};`;

async function neueSeite(width, height, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE", reducedMotion: opt.reducedMotion || "no-preference" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  if (opt.reducedMotion) await page.emulateMedia({ reducedMotion: opt.reducedMotion });
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate((h) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    window.__offen = []; window.open = (u) => { window.__offen.push(String(u)); return null; };
    (0, eval)(h);
  }, HILFEN);
  return { ctx, page, jsFehler };
}

async function setze(page, sz) {
  await page.evaluate(({ sz, STADT }) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    try { _fsAgg = null; } catch (e) {}
    try { _fsSetDrawer(false); } catch (e) {}
    ensureAusbildungsplaene(); ensureDB(); ensureTodos();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const fehlerIds = Object.keys(FAULT_LABEL || {});
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      if (p.theorie) s.plan.theorie = true;
      for (const k of ["theoryPassed", "ready", "theorieWait", "passed", "profil", "notiz"]) if (p[k]) s[k] = p[k];
      if (p.todos) s.todos = JSON.parse(JSON.stringify(p.todos));
      s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] };
      ensure(s);
      const ids = evalSkillsFor(s), k = Math.round(ids.length * (p.anteil || 0));
      ids.slice(0, k).forEach((id) => { s.plan.ampeln[id] = "gruen"; });
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: "", fc: null }));
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = JSON.parse(JSON.stringify(sz.exams)).map((e) => ({ ...e, faults: e.faults === "FEHLER2" ? fehlerIds.slice(0, 2) : e.faults }));
    DB.todos = JSON.parse(JSON.stringify(sz.todos));
    DB.pruefer = ["XY", "ZW"];
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];
    if (!DB.workCfg.pausen || !DB.workCfg.pausen.length) DB.workCfg.pausen = [{ days: [0, 1, 2, 3, 4], von: "12:00", bis: "12:30" }];
    // Wetter ohne Netz: aus den Zwischenspeichern (wie wetter2-test.mjs)
    DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: "erfundener-test-schluessel", city: STADT });
    const stadt = DB.weatherCfg.city;
    if (sz.wetter) localStorage.setItem("serband-weather-cache", JSON.stringify({ ts: Date.now() - 60000, city: stadt, data: sz.wetter }));
    else localStorage.removeItem("serband-weather-cache");
    if (sz.vorschau) localStorage.setItem("serband-weather-forecast-cache", JSON.stringify({ ts: Date.now() - 60000, city: stadt, data: sz.vorschau }));
    else localStorage.removeItem("serband-weather-forecast-cache");
    localStorage.removeItem("kompass-fahrstunde");
    localStorage.setItem("serband-backup-stamp", String(Date.now()));
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    _calView = "woche"; _calDate = null; _calFilter = "alle"; window._pruefTab = "termine"; _todoTab = "global"; _todoStudent = null;
    _archFormFilter = []; _archColorFilter = []; _settingsAccOpen = null;
    _navStack = [];
    (0, eval)(sz.start.includes("(") ? sz.start : sz.start + "()");
  }, { sz, STADT });
  await warte(page, 350);
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
async function klick(page, sel, ms = 400) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return `„${sel}“ fehlt`;
  await loc.first().click();
  await warte(page, ms);
  return null;
}
// Seite aufrufen; liefert Fehlertext oder null. #view wird nach oben gescrollt.
async function oeffne(page, s) {
  const err = await page.evaluate((s) => {
    try { closeSheet(); } catch (e) {}
    const fn = s.auf.split("(")[0];
    if (typeof window[fn] !== "function") return `${fn} fehlt`;
    try { (0, eval)(s.vor); (0, eval)(s.auf); if (s.nach) (0, eval)(s.nach); return null; } catch (e) { return `${s.auf}: ${String(e)}`; }
  }, s);
  await warte(page, s.ms || 450);
  await page.evaluate(() => { const v = document.getElementById("view"); if (v) v.scrollTop = 0; window.scrollTo(0, 0); });
  await warte(page, 60);
  return err;
}
const wo = (g, theme) => `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;

// ---------- Messungen im Browser ----------
// Kalender-Kopf (O1)
const messeKalender = (page) => page.evaluate(() => {
  const o = __o, v = document.getElementById("view");
  const body = document.getElementById("calBody");
  const out = { body: null, zaehler: null, zaehlerText: "", legende: null, chips: [], fehlt: [], unsichtbar: [] };
  if (body) out.body = Math.round(body.getBoundingClientRect().top);
  const zs = [...v.querySelectorAll(".cal-counter")].filter(o.sicht);
  if (zs.length) {
    const top = Math.min(...zs.map((z) => z.getBoundingClientRect().top)), bot = Math.max(...zs.map((z) => z.getBoundingClientRect().bottom));
    out.zaehler = Math.round(bot - top);
    out.zaehlerText = zs.map((z) => z.innerText).join(" ").replace(/\s+/g, " ");
    out.zaehlerKarten = zs.map((z) => [...z.querySelectorAll(".cc-card")].filter(o.sicht).map((k) => Math.round(k.getBoundingClientRect().height))).flat();
  }
  const lg = v.querySelector(".cal-legend-bar");
  if (lg) out.legende = { top: Math.round(lg.getBoundingClientRect().top), sicht: o.sicht(lg) };
  const chips = [...v.querySelectorAll(".cal-fchip")];
  out.chips = chips.map((c) => {
    const tops = new Set();
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top / 4)); }
    const r = c.getBoundingClientRect();
    return { f: c.dataset.f, text: c.textContent.trim(), zeilen: tops.size, top: Math.round(r.top), h: Math.round(r.height), sicht: o.sicht(c) };
  });
  for (const id of ["calSearch", "calFilterBtn", "calGear", "calToday", "calViewBtn", "calPrev", "calNext"]) {
    const e = document.getElementById(id);
    if (!e) out.fehlt.push("#" + id); else if (!o.sicht(e)) out.unsichtbar.push("#" + id);
  }
  // was steht über #calBody (zur Orientierung beim Bau)
  out.oben = [...v.querySelectorAll(".cal-head, .cal-counter, .cal-filters, .cal-legend-bar, .cal-nav")].filter(o.sicht).map((e) => `${(e.className || "").split(" ")[0]} ${Math.round(e.getBoundingClientRect().top)}–${Math.round(e.getBoundingClientRect().bottom)}`);
  return out;
});

// Akte (O2/O3): Name im sichtbaren Text, Prozentkreis
const messeAkte = (page, name) => page.evaluate((name) => {
  const o = __o, v = document.getElementById("view");
  const txt = (v.innerText || "").toLowerCase();
  const nm = name.toLowerCase();
  let n = 0, i = 0;
  while ((i = txt.indexOf(nm, i)) >= 0) { n++; i += nm.length; }
  // Wo steht der Name? (kleinstes sichtbares Element, das ihn ganz enthält)
  const wo = [];
  for (const e of v.querySelectorAll("*")) {
    if (e.closest("svg") || !o.sicht(e)) continue;
    if (!(e.innerText || "").toLowerCase().includes(nm)) continue;
    if ([...e.children].some((k) => (k.innerText || "").toLowerCase().includes(nm))) continue;
    wo.push(o.sel(e));
  }
  const out = { n, wo, kreis: null, name: null };
  const hero = v.querySelector(".detail-hero");
  if (hero && hero.firstElementChild) {
    const svg = hero.firstElementChild.matches("svg") ? hero.firstElementChild : hero.firstElementChild.querySelector("svg");
    if (svg) { const r = svg.getBoundingClientRect(); out.kreis = { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; }
  }
  const dn = v.querySelector(".detail-name");
  if (dn && o.sicht(dn)) {
    // Textzeilen des Namens (nicht das ganze Kästchen, das kann breiter sein)
    const rg = document.createRange(); rg.selectNodeContents(dn);
    const rs = [...rg.getClientRects()].filter((r) => r.width > 0);
    const l = rs.length ? Math.min(...rs.map((r) => r.left)) : dn.getBoundingClientRect().left;
    const r = dn.getBoundingClientRect();
    out.name = { l, box: r.left, t: r.top, b: r.bottom };
  }
  return out;
}, name);

// Titel (O4/O5)
const messeTitel = (page) => page.evaluate(() => {
  const o = __o, v = document.getElementById("view");
  const tb = document.getElementById("tbTitle");
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
  const t = tb ? norm(tb.textContent) : null;
  let unsichtbar = null, wie = "";
  if (tb) {
    for (let p = tb; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.visibility === "hidden") { unsichtbar = true; wie = "visibility hidden"; break; }
      if (+s.opacity === 0) { unsichtbar = true; wie = "opacity 0"; break; }
      if (s.display === "none") { unsichtbar = true; wie = "display none"; break; }
    }
    if (!unsichtbar) { const r = tb.getBoundingClientRect(); unsichtbar = !(r.width > 0 && r.height > 0); if (unsichtbar) wie = "keine Fläche"; }
  }
  const UEB = "h1, h2, .sec-h, .display, .plan-title, .sl-titel";
  const ueb = [...v.querySelectorAll(UEB)].filter(o.sicht).map((e) => ({ sel: o.sel(e), text: norm(e.textContent), fs: parseFloat(getComputedStyle(e).fontSize) }));
  const gleich = ueb.filter((u) => t && u.text.toLowerCase() === t.toLowerCase());
  const reiter = [...document.querySelectorAll(".tab-i.on")].map((b) => b.dataset.tab);
  return { t, unsichtbar, wie, ueb, gleich, reiter, einst: ueb.filter((u) => /^(h1|.*sec-h)/.test(u.sel) && u.text === "Einstellungen") };
});

// Emojis (O6): Bereich = Selektor; liefert je Element Beschriftung, Emojis, svg vorhanden
const messeEmoji = (page, bereich) => page.evaluate((bereich) => {
  const o = __o;
  return [...document.querySelectorAll(bereich)].filter((e) => !e.closest(".tabbar")).map((e) => {
    const t = o.text(e);
    // svg-Bildchen VOR der Beschriftung (dort stand das Emoji); ein Pfeil/Chevron hinter dem Text zählt nicht
    const ersterText = (() => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest("svg") || !o.ohneEmoji(n.textContent) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) }); return w.nextNode(); })();
    const svgs = [...e.querySelectorAll("svg")].filter((g) => !g.parentElement.closest("svg"));
    const svg = svgs.some((g) => !ersterText || (g.compareDocumentPosition(ersterText) & Node.DOCUMENT_POSITION_FOLLOWING));
    return { sel: o.sel(e), kl: (typeof e.className === "string" ? e.className.trim().split(/\s+/) : []), label: o.ohneEmoji(t), emo: o.emojis(t), svg, sicht: o.sicht(e) };
  });
}, bereich);

// Rand / Wischen (O8), wie seiten-test S9
const messeRand = (page) => page.evaluate(() => {
  const o = __o, v = document.getElementById("view"), W = document.documentElement.clientWidth;
  const out = { wisch: document.documentElement.scrollWidth > W + 1 || (v && v.scrollWidth > v.clientWidth + 1), rand: [] };
  if (!v) return out;
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== v; p = p.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true; } return false; };
  for (const el of v.querySelectorAll("*")) {
    if (el.closest("svg") || !o.sicht(el) || inScroller(el) || getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1) out.rand.push(`${o.sel(el)} +${Math.round(r.right - W)}px`);
  }
  // Kopfleiste: Titel/Knöpfe nicht über den Rand
  for (const el of document.querySelectorAll(".topbar *, #tbTitle")) {
    if (el.closest("svg") || !o.sicht(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1) out.rand.push(`Kopfleiste ${o.sel(el)} +${Math.round(r.right - W)}px`);
  }
  return out;
});

// Bedien-Haken (O8, wie seiten-test B1)
const messeBedien = (page) => page.evaluate(() => {
  const v = document.getElementById("view");
  const BED = "button, a, [role=button], [onclick], input, select, textarea, label, [tabindex]";
  const ids = [...new Set([...v.querySelectorAll("[id]")].map((e) => e.id))].sort();
  const daten = new Set();
  for (const e of v.querySelectorAll("*")) {
    if (e.closest("svg") || !(e.matches(BED) || getComputedStyle(e).cursor === "pointer")) continue;
    for (const a of e.getAttributeNames()) if (a.startsWith("data-")) daten.add(a);
  }
  return { ids, daten: [...daten].sort(), knoepfe: v.querySelectorAll("button").length };
});

// ======================= Hauptlauf =======================
const sammel = {};
const merk = (id, t) => { (sammel[id] = sammel[id] || []).push(t); };
const GROESSEN = [{ n: "360", w: 360, h: 740 }, { n: "412", w: 412, h: 915 }];
const aus = { bedien: {}, titel: {}, emoji: [], zaehler: null };
// Emoji-Bereiche (O6)
const EMOJI_BEREICHE = [
  { seite: SETTINGS, bereich: "#view .acc-h" },
  { seite: AKTE[0], bereich: "#view .chip, #view .vortest-big, #view .akte-nav button, #view .btn" },
  { seite: AKTE[1], bereich: "#view button" },
];

const haupt = await neueSeite(412, 915);
await setze(haupt.page, basisSzenario());
await pruefe("O0", "Testaufbau: Uhr steht fest (todayISO() = 2026-10-14, 10:30), Testdaten geladen, Wetter aus dem Speicher", async () => {
  const r = await haupt.page.evaluate(async () => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes(), n: DB.students.length, w: await fetchWeather() }));
  const f = [];
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) f.push(`todayISO()=${r.iso}, ${r.h}:${r.m}`);
  if (r.n !== 6) f.push(`${r.n} Schüler`);
  if (!r.w || r.w.icon !== "10d") f.push(`fetchWeather() = ${JSON.stringify(r.w)}`);
  return f;
});

const kalInfo = [];
for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = g.w === 412 && theme === "light" ? haupt : await neueSeite(g.w, g.h);
    const sz = basisSzenario(); sz.theme = theme;
    await setze(s.page, sz);
    const w0 = wo(g, theme);
    const merkJs = (vorher, n) => { if (s.jsFehler.length > vorher) merk("O8c", `${w0} ${n}: JS-Fehler ${s.jsFehler[vorher]}`); };

    // --- O1 Kalender
    for (const seite of KAL) {
      const vorher = s.jsFehler.length;
      const e = await oeffne(s.page, seite);
      if (e) { merk("O8c", `${w0} ${seite.n}: ${e}`); continue; }
      const m = await messeKalender(s.page);
      merkJs(vorher, seite.n);
      const ww = `${w0} ${seite.n}`;
      if (theme === "light") kalInfo.push(`${g.n} ${seite.n.replace(/Kalender \((.*)\)/, "$1")}: #calBody ab ${m.body} px, Zähler ${m.zaehler ?? "–"} px (Karten ${(m.zaehlerKarten || []).join("/")}), Legende ${m.legende ? m.legende.top : "–"} px; oben: ${m.oben.join(", ")}`);
      if (m.body === null) { merk("O1a", `${ww}: #calBody fehlt`); merk("O1c", `${ww}: #calBody fehlt`); continue; }
      if (g.w === 360 && m.body > 380) merk("O1a", `${ww}: #calBody beginnt bei ${m.body} px`);
      if (m.zaehler === null) merk("O1e", `${ww}: keine sichtbare .cal-counter`);
      else if (m.zaehler > 76) merk("O1b", `${ww}: ${m.zaehler} px`);
      if (!m.legende) merk("O1c", `${ww}: .cal-legend-bar fehlt`);
      else if (m.legende.sicht && !(m.legende.top > m.body)) merk("O1c", `${ww}: Legende bei ${m.legende.top} px, #calBody bei ${m.body} px`);
      const chipTops = new Set(m.chips.filter((c) => c.sicht).map((c) => Math.round(c.top / 6)));
      const mehrzeilig = m.chips.filter((c) => c.zeilen > 1).map((c) => `„${c.text}“ ${c.zeilen} Zeilen`);
      if (chipTops.size > 1) mehrzeilig.push(`Chips auf ${chipTops.size} Reihen`);
      if (mehrzeilig.length) merk("O1d", `${ww}: ${mehrzeilig.join(", ")}`);
      // bleibt: Knöpfe, Chips, Zählerwerte
      const fehl = [...m.fehlt.map((x) => `${x} fehlt`), ...m.unsichtbar.map((x) => `${x} unsichtbar`)];
      const chipsF = ["alle", "fahrstunde", "pruefung", "theorie"];
      for (const f of chipsF) { const c = m.chips.find((x) => x.f === f); if (!c) fehl.push(`Chip ${f} fehlt`); else if (!c.sicht) fehl.push(`Chip ${f} unsichtbar`); }
      if (theme === "light" && g.w === 412 && seite.k === "kalender") aus.zaehler = (m.zaehlerText.match(/\d+/g) || []);
      for (const z of ZAEHLER) if (!new RegExp(`(^|\\D)${z}(\\D|$)`).test(m.zaehlerText)) fehl.push(`Zählerwert ${z} fehlt („${m.zaehlerText.slice(0, 80)}“)`);
      if (!m.zaehlerText.trim()) fehl.push("Zähler ohne Text");
      if (fehl.length) merk("O1e", `${ww}: ${fehl.join(", ")}`);
    }

    // --- O2/O3 Akte
    for (const seite of AKTE) {
      const vorher = s.jsFehler.length;
      const e = await oeffne(s.page, seite);
      if (e) { merk("O8c", `${w0} ${seite.n}: ${e}`); continue; }
      const m = await messeAkte(s.page, LANGNAME);
      merkJs(vorher, seite.n);
      const ww = `${w0} ${seite.n}`;
      const id = seite.k === "detail" ? "O2b" : "O3";
      if (m.n > 1) merk(id, `${ww}: ${m.n}× (${m.wo.join(", ")})`);
      if (m.n === 0) merk(id, `${ww}: Name gar nicht sichtbar`);
      if (seite.k === "detail") {
        if (!m.kreis) { merk("O2a", `${ww}: kein svg im ersten Kind von .detail-hero`); continue; }
        const f = [];
        if (m.kreis.w > 100.5) f.push(`Kreis ${Math.round(m.kreis.w)} px breit`);
        if (!m.name) f.push(".detail-name fehlt/unsichtbar");
        else {
          if (!(m.kreis.r <= m.name.l + 1)) f.push(`Kreis rechts ${Math.round(m.kreis.r)} px > Name links ${Math.round(m.name.l)} px`);
          const ueber = Math.min(m.kreis.b, m.name.b) - Math.max(m.kreis.t, m.name.t);
          if (!(ueber > 0)) f.push(`nicht in einer Zeile (Kreis ${Math.round(m.kreis.t)}–${Math.round(m.kreis.b)}, Name ${Math.round(m.name.t)}–${Math.round(m.name.b)})`);
        }
        if (f.length) merk("O2a", `${ww}: ${f.join(", ")}`);
        if (theme === "light") info(`${g.n} Akte Überblick: Kreis ${Math.round(m.kreis.w)}×${Math.round(m.kreis.h)} px bei ${Math.round(m.kreis.l)}…${Math.round(m.kreis.r)}/${Math.round(m.kreis.t)}…${Math.round(m.kreis.b)}, Name ${m.name ? `links ${Math.round(m.name.l)} px, ${Math.round(m.name.t)}…${Math.round(m.name.b)}` : "–"}; Name ${m.n}× (${m.wo.join(", ")})`);
      } else if (theme === "light") info(`${g.n} ${seite.n}: Name ${m.n}× (${m.wo.join(", ")})`);
    }

    // --- O4/O5 Titel
    for (const seite of [...MIT_UEBERSCHRIFT, ...OHNE_UEBERSCHRIFT]) {
      const vorher = s.jsFehler.length;
      const e = await oeffne(s.page, seite);
      if (e) { merk("O8c", `${w0} ${seite.n}: ${e}`); continue; }
      const m = await messeTitel(s.page);
      merkJs(vorher, seite.n);
      const ww = `${w0} ${seite.n}`;
      if (g.w === 412 && theme === "light") {
        aus.titel[seite.k] = { t: m.t, reiter: m.reiter.join(",") };
        info(`O4 ${seite.n}: #tbTitle „${m.t}“ ${m.unsichtbar ? `unsichtbar (${m.wie})` : "sichtbar"}, Reiter ${m.reiter.join(",") || "–"}; Überschriften in der Seite: ${m.ueb.map((u) => `${u.sel} „${u.text.slice(0, 24)}“ ${u.fs}px`).join(" | ") || "keine"}`);
      }
      const soll = TITEL[seite.k];
      if (soll) {
        if (m.t !== soll.t) merk("O4c", `${ww}: #tbTitle „${m.t}“ statt „${soll.t}“`);
        if (m.reiter.join(",") !== soll.reiter) merk("O4c", `${ww}: Reiter [${m.reiter}] statt [${soll.reiter}]`);
      }
      if (MIT_UEBERSCHRIFT.includes(seite)) {
        if (!m.gleich.length) merk("O4a", `${ww}: keine große Überschrift „${m.t}“ in der Seite (gefunden: ${m.ueb.map((u) => `„${u.text.slice(0, 20)}“`).join(", ") || "keine"})`);
        else if (!m.unsichtbar) merk("O4a", `${ww}: #tbTitle „${m.t}“ sichtbar, obwohl ${m.gleich[0].sel} „${m.gleich[0].text}“ in der Seite steht`);
        else if (m.wie !== "visibility hidden" && m.wie !== "opacity 0") merk("O4a", `${ww}: #tbTitle versteckt per ${m.wie} (erlaubt: visibility hidden oder opacity 0)`);
      } else if (m.unsichtbar) merk("O4b", `${ww}: #tbTitle „${m.t}“ unsichtbar (${m.wie})`);
      if (seite.k === "settings" && !m.einst.length) merk("O5", `${ww}: keine Überschrift „Einstellungen“ (h1/.sec-h) – gefunden: ${m.ueb.map((u) => `${u.sel} „${u.text.slice(0, 20)}“`).join(", ") || "nichts"}`);
    }

    // --- O6 Emojis
    for (const b of EMOJI_BEREICHE) {
      const e = await oeffne(s.page, b.seite);
      if (e) { merk("O8c", `${w0} ${b.seite.n}: ${e}`); continue; }
      const l = await messeEmoji(s.page, b.bereich);
      for (const x of l) if (x.emo.length) {
        merk("O6a", `${b.seite.n}: ${x.emo.join("")} in ${x.label ? `„${x.label.slice(0, 28)}“` : "(ohne Text)"} (${x.sel})`);
        if (g.w === 412 && theme === "light") aus.emoji.push({ k: b.seite.k, kl: x.kl[0], label: x.label });
      }
      for (const st of EMOJI_STELLEN.filter((x) => x.k === b.seite.k)) {
        const xs = l.filter((y) => y.label === st.label && y.kl.includes(st.kl));
        const name = st.label ? `„${st.label.slice(0, 30)}“` : `.${st.kl} (ohne Beschriftung)`;
        if (!xs.length) merk("O6b", `${b.seite.n}: ${name} (.${st.kl}) nicht mehr gefunden`);
        else { const ohne = xs.filter((x) => !x.svg).length; if (ohne) merk("O6b", `${b.seite.n}: ${name} ${ohne === 1 ? "" : ohne + "× "}ohne svg-Bildchen`); }
      }
    }

    // --- O8 Rand/Wischen + Bedien-Haken
    for (const seite of ALLE) {
      const vorher = s.jsFehler.length;
      const e = await oeffne(s.page, seite);
      if (e) { merk("O8c", `${w0} ${seite.n}: ${e}`); continue; }
      const m = await messeRand(s.page);
      merkJs(vorher, seite.n);
      if (m.wisch) merk("O8a", `${w0} ${seite.n}: seitlich wischbar`);
      if (m.rand.length) merk("O8a", `${w0} ${seite.n}: über den Rand ${m.rand.slice(0, 2).join(", ")}`);
      if (g.w === 412 && theme === "light" && [...KAL, ...AKTE, SETTINGS].includes(seite)) aus.bedien[seite.k] = await messeBedien(s.page);
    }
    if (s !== haupt) await s.ctx.close();
  }
}
for (const z of kalInfo) info(`O1 ${z}`);

// ===== Querformat 915 × 412: nur Rand/Wischen und JS-Fehler =====
for (const theme of ["light", "dark"]) {
  const s = await neueSeite(915, 412);
  const sz = basisSzenario(); sz.theme = theme;
  await setze(s.page, sz);
  for (const seite of ALLE) {
    const w0 = `915 quer ${theme === "dark" ? "dunkel" : "hell"} ${seite.n}`;
    const vorher = s.jsFehler.length;
    const e = await oeffne(s.page, seite);
    if (e) { merk("O8c", `${w0}: ${e}`); continue; }
    const m = await messeRand(s.page);
    if (m.wisch) merk("O8a", `${w0}: seitlich wischbar`);
    if (m.rand.length) merk("O8a", `${w0}: über den Rand ${m.rand.slice(0, 2).join(", ")}`);
    if (s.jsFehler.length > vorher) merk("O8c", `${w0}: JS-Fehler ${s.jsFehler[vorher]}`);
  }
  await s.ctx.close();
}

if (AUSLESEN) {
  console.log("BEDIEN = " + JSON.stringify(aus.bedien));
  console.log("TITEL = " + JSON.stringify(aus.titel));
  const st = []; for (const x of aus.emoji) if (!st.some((y) => y.k === x.k && y.kl === x.kl && y.label === x.label)) st.push(x);
  console.log("EMOJI_STELLEN = " + JSON.stringify(st));
  console.log("ZAEHLER = " + JSON.stringify(aus.zaehler));
}

await pruefe("O1a", "Kalender (Woche/Tag/Monat) bei 360×740: #calBody beginnt höchstens 380 px vom oberen Rand", () => sammel.O1a || []);
await pruefe("O1b", "Kalender: Zähler-Karten (.cal-counter) zusammen höchstens 76 px hoch (360/412, hell/dunkel)", () => sammel.O1b || []);
await pruefe("O1c", "Kalender: Farberklärung .cal-legend-bar steht unter #calBody (Oberkante tiefer)", () => sammel.O1c || []);
await pruefe("O1d", "Kalender: Filter-Chips einzeilig (eine Reihe, kein Umbruch im Chip)", () => sammel.O1d || []);
await pruefe("O1e", "bleibt: Kalender-Knöpfe (#calSearch #calFilterBtn #calGear #calToday #calViewBtn #calPrev #calNext), alle .cal-fchip und die Zählerwerte vorhanden und sichtbar", () => (ZAEHLER.length ? [] : ["ZAEHLER leer (Auslese-Lauf)"]).concat(sammel.O1e || []));
await pruefe("O2a", "Akte Überblick: Prozentkreis ≤ 100 px breit und links neben dem Namen in derselben Zeile", () => sammel.O2a || []);
await pruefe("O2b", "Akte Überblick: voller Schülername höchstens einmal im sichtbaren Text", () => sammel.O2b || []);
await pruefe("O3", "Akte Plan und Notizen: voller Schülername höchstens einmal im sichtbaren Text", () => sammel.O3 || []);
await pruefe("O4a", "Seiten mit gleichlautender großer Überschrift: #tbTitle unsichtbar (visibility hidden / opacity 0)", () => sammel.O4a || []);
await pruefe("O4b", "Seiten ohne gleichlautende Überschrift (Kalender, Akte-Reiter, Wetter): #tbTitle sichtbar", () => sammel.O4b || []);
await pruefe("O4c", "bleibt: Text von #tbTitle und markierter Reiter (.tab-i.on) je Seite wie vorher", () => (Object.keys(TITEL).length ? [] : ["TITEL leer (Auslese-Lauf)"]).concat(sammel.O4c || []));
await pruefe("O4d", "#tbTitle wird nach Wechsel auf eine Seite ohne Überschrift wieder sichtbar (direkt und über Zurück)", async () => {
  const p = haupt.page, f = [];
  await setze(p, basisSzenario());
  const wege = [
    ["Prüfungen → Kalender", "routePruefungen()", "routeKalender()"],
    ["Einstellungen → Akte", "routeSettings()", "routeDetail('s1')"],
    ["Schüler → Wetter", "routeHome()", `routeWetter(${JSON.stringify(wetterVon("10d"))})`],
    ["To-dos → Akte Plan", "routeTodos()", "routePlan('s1')"],
    ["Kalender → Statistik → Zurück", "routeKalender(); routeStats()", "navZurueck()"],
    ["Akte → Historie → Zurück", "routeDetail('s1'); routeHistorie('s1')", "navZurueck()"],
  ];
  for (const [n, a, b] of wege) {
    await p.evaluate((a) => (0, eval)(a), a); await warte(p, 500);
    const m1 = await messeTitel(p);
    await p.evaluate((b) => (0, eval)(b), b); await warte(p, 450);
    const m2 = await messeTitel(p);
    if (m2.unsichtbar) f.push(`${n}: danach „${m2.t}“ unsichtbar (${m2.wie})${m1.unsichtbar ? "" : " – war vorher schon sichtbar"}`);
  }
  return f;
});
await pruefe("O5", "Einstellungen: große Überschrift „Einstellungen“ (h1 oder .sec-h) in der Seite", () => sammel.O5 || []);
await pruefe("O6a", "keine Emojis in Einstellungen-Abschnittsköpfen (.acc-h), Akte-Überblick-Knöpfen/Chips, Akte-Plan-Knöpfen (360/412, hell/dunkel; gleiche Fundstellen zusammengefasst)", () => {
  const n = new Map(); for (const x of sammel.O6a || []) n.set(x, (n.get(x) || 0) + 1);
  return [...n].map(([x, k]) => (k > 4 ? `${x} ${k / 4}×` : x));
});
await pruefe("O6b", "an jeder früheren Emoji-Stelle steht ein svg-Bildchen vor der Beschriftung, Beschriftung unverändert", () => (EMOJI_STELLEN.length ? [] : ["EMOJI_STELLEN leer (Auslese-Lauf)"]).concat([...new Set(sammel.O6b || [])]));

// ===== O7 Wetter (Hinweise Richter 6a) =====
const wetterSz = (icon, theme = "light", start) => ({ ...basisSzenario(), theme, wetter: wetterVon(icon), start: start || `routeWetter(${JSON.stringify(wetterVon(icon))})` });
const messeBuehne = (page) => page.evaluate(() => {
  const st = document.querySelector("#view .wx-stage");
  if (!st) return null;
  const S = st.getBoundingClientRect();
  const deck = (e) => { let o = 1; for (let p = e; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === "none" || s.visibility === "hidden") return 0; o *= +s.opacity; } return o; };
  const drin = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom; };
  const zaehle = (sel) => { const l = [...st.querySelectorAll(sel)]; return { alle: l.length, sicht: l.filter((e) => deck(e) > 0.01 && drin(e)).length, null: l.filter((e) => deck(e) <= 0.01).length, aussen: l.filter((e) => !drin(e)).length }; };
  const wolken = [...st.querySelectorAll(".wx2-wolke")].map((e) => Math.round(e.getBoundingClientRect().left - S.left));
  return { tropfen: zaehle(".wx2-tropfen"), flocke: zaehle(".wx2-flocke"), wolken };
});
const verschiedeneLinks = (l) => { const s = [...l].sort((a, b) => a - b); const g = []; for (const x of s) if (!g.length || x - g[g.length - 1] > 20) g.push(x); return g.length; };
const wetterInfo = [];
await pruefe("O7a", "Weniger Bewegung (reduce): Regen 10d ≥ 10 .wx2-tropfen und Schnee 13d ≥ 10 .wx2-flocke sichtbar in der Bühne", async () => {
  const s = await neueSeite(412, 915, { reducedMotion: "reduce" });
  try {
    if (!(await s.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))) return "Testaufbau: reducedMotion greift nicht";
    const f = [];
    for (const [icon, k, n] of [["10d", "tropfen", "Tropfen"], ["13d", "flocke", "Flocken"]]) {
      await setze(s.page, wetterSz(icon));
      const b = await messeBuehne(s.page);
      if (!b) { f.push(`${icon}: keine .wx-stage`); continue; }
      wetterInfo.push(`reduce ${icon}: ${n} ${b[k].sicht}/${b[k].alle} sichtbar (${b[k].null} mit opacity 0, ${b[k].aussen} außerhalb), Wolken links bei ${b.wolken.join("/") || "–"} px`);
      if (b[k].sicht < 10) f.push(`${icon}: ${b[k].sicht} von ${b[k].alle} ${n} sichtbar (${b[k].null} opacity 0, ${b[k].aussen} außerhalb der Bühne)`);
    }
    if (s.jsFehler.length) f.push(`JS-Fehler: ${s.jsFehler[0]}`);
    return f;
  } finally { await s.ctx.close(); }
});
await pruefe("O7b", "Weniger Bewegung (reduce): .wx2-wolke nicht alle an einer Stelle (≥ 2 linke Kanten mit > 20 px Abstand; 03d, 10d, 13d wenn ≥ 2 Wolken)", async () => {
  const s = await neueSeite(412, 915, { reducedMotion: "reduce" });
  try {
    const f = [];
    for (const icon of ["03d", "10d", "13d"]) {
      await setze(s.page, wetterSz(icon));
      const b = await messeBuehne(s.page);
      if (!b) { f.push(`${icon}: keine .wx-stage`); continue; }
      if (icon === "03d") wetterInfo.push(`reduce 03d: Wolken links bei ${b.wolken.join("/") || "–"} px`);
      if (b.wolken.length < 2) { if (icon !== "13d") f.push(`${icon}: nur ${b.wolken.length} .wx2-wolke`); continue; }
      const n = verschiedeneLinks(b.wolken);
      if (n < 2) f.push(`${icon}: alle ${b.wolken.length} Wolken links bei ${[...new Set(b.wolken)].join("/")} px`);
    }
    return f;
  } finally { await s.ctx.close(); }
});
await pruefe("O7c", "Dunkelmodus, Pille auf Heute: Gewitterwolke (svg.wx-gewitter .wx-wolke-f) hat andere Füllung als normale Wolke (svg.wx-wolke .wx-wolke-f)", async () => {
  const s = await neueSeite(412, 915);
  try {
    const fuell = async (icon, sel) => {
      await setze(s.page, wetterSz(icon, "dark", "routeDashboard()"));
      return s.page.evaluate((sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const f = getComputedStyle(e).fill;
        const m = f.match(/url\(["']?#([^"')]+)["']?\)/);
        if (!m) return { roh: f, farbe: f };
        const g = document.getElementById(m[1]);
        const stops = g ? [...g.querySelectorAll("stop")].map((x) => `${getComputedStyle(x).stopColor}@${x.getAttribute("offset")}`) : [];
        return { roh: f, farbe: "Verlauf " + stops.join(" ") };
      }, sel);
    };
    const normal = await fuell("03d", "#view .heute2 svg.wx-wolke .wx-wolke-f");
    const gew = await fuell("11d", "#view .heute2 svg.wx-gewitter .wx-wolke-f");
    wetterInfo.push(`dunkel Pille: normale Wolke ${normal ? normal.farbe : "–"}, Gewitterwolke ${gew ? gew.farbe : "–"}`);
    const f = [];
    if (!normal) f.push("keine svg.wx-wolke .wx-wolke-f in der Pille (03d)");
    if (!gew) f.push("keine svg.wx-gewitter .wx-wolke-f in der Pille (11d)");
    if (normal && gew && normal.farbe === gew.farbe) f.push(`beide gleich: ${gew.farbe}`);
    if (s.jsFehler.length) f.push(`JS-Fehler: ${s.jsFehler[0]}`);
    return f;
  } finally { await s.ctx.close(); }
});
for (const z of wetterInfo) info(`O7 ${z}`);

// ===== O8 bleibt =====
await pruefe("O8a", "bleibt: nicht seitlich wischbar, nichts über den rechten Rand (360/412 hoch, 915 quer, hell+dunkel)", () => sammel.O8a || []);
await pruefe("O8b", "bleibt: jede Element-ID und jedes data-*-Attribut an Bedien-Elementen des alten Stands ist noch da, Knopfzahl sinkt nicht (Kalender, Einstellungen, Akte Überblick/Plan/Notizen)", () => {
  if (!Object.keys(BEDIEN).length) return { skip: "BEDIEN leer (Auslese-Lauf)" };
  const f = [];
  for (const [k, soll] of Object.entries(BEDIEN)) {
    const ist = aus.bedien[k];
    if (!ist) { f.push(`${k}: nicht gemessen`); continue; }
    const ids = soll.ids.filter((x) => !ist.ids.includes(x));
    const dat = soll.daten.filter((x) => !ist.daten.includes(x));
    if (ids.length) f.push(`${k}: IDs fehlen ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? " …" : ""}`);
    if (dat.length) f.push(`${k}: Attribute fehlen ${dat.join(", ")}`);
    if (ist.knoepfe < soll.knoepfe) f.push(`${k}: ${ist.knoepfe} Knöpfe statt ≥ ${soll.knoepfe}`);
  }
  return f;
});
const p = haupt.page;
await pruefe("O8d", "bleibt: Akte-Reiter (.ak-r) wechseln Überblick → Plan → Notizen → Termine → Prüfung → Überblick (Titel je Reiter)", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeDetail("s1")); await warte(p, 300);
  const f = [];
  for (const [k, soll] of [["plan", "Ausbildungsplan"], ["notizen", "Notizen"], ["termine", "Termine"], ["pruefung", "Prüfung"], ["ueberblick", "Schülerdatei"]]) {
    const e = await klick(p, `#view .ak-r[data-akte="${k}"]`); if (e) { f.push(e); break; }
    const t = await titel(p);
    if (t !== soll) f.push(`${k} → „${t}“ statt „${soll}“`);
    const on = await p.evaluate(() => [...document.querySelectorAll("#view .ak-r.on")].map((b) => b.dataset.akte).join(","));
    if (on !== k) f.push(`${k}: aktiver Reiter [${on}]`);
  }
  return f;
});
await pruefe("O8e", "bleibt: Klick auf einen Einstellungen-Abschnitt klappt ihn auf (.set-acc.open), nur einer offen, nochmal tippen schließt", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _settingsAccOpen = null; routeSettings(); }); await warte(p, 300);
  const f = [];
  const keys = await p.evaluate(() => [...document.querySelectorAll("#view .set-acc[data-acckey]")].map((a) => a.dataset.acckey));
  if (keys.length < 2) return `nur ${keys.length} Abschnitte [${keys}]`;
  for (const k of keys) {
    const e = await klick(p, `#view .set-acc[data-acckey="${k}"] > .acc-h`, 350); if (e) { f.push(e); continue; }
    const r = await p.evaluate(() => [...document.querySelectorAll("#view .set-acc.open")].map((a) => a.dataset.acckey).join(","));
    if (r !== k) f.push(`${k}: offen [${r}]`);
  }
  const last = keys[keys.length - 1];
  const e = await klick(p, `#view .set-acc[data-acckey="${last}"] > .acc-h`, 350); if (e) f.push(e);
  else if (await p.evaluate(() => document.querySelectorAll("#view .set-acc.open").length)) f.push("schließt nicht");
  return f;
});
await pruefe("O8c", "bleibt: keine JS-Fehler, jede Seite öffnet sich (alle Größen, hell/dunkel, quer, Klick-Prüfungen)", () => (sammel.O8c || []).concat(haupt.jsFehler.length ? [`Hauptlauf: ${haupt.jsFehler.length} JS-Fehler, z. B. ${haupt.jsFehler[0]}`] : []));
await haupt.ctx.close();
await browser.close();
server.close();

// ---------- O9 Nichts kaputt: die anderen Tests ----------
// Eltern-Prozess ist selbst „node …/xyz-test.mjs“ (nicht die Shell, in der man den Test von Hand startet)?
const elternTest = (() => {
  try {
    const a = readFileSync(`/proc/${process.ppid}/cmdline`, "utf8").split("\0").filter(Boolean);
    return /(^|\/)node(js)?$/.test(a[0] || "") && a.slice(1).some((x) => /-test\.mjs$/.test(x));
  } catch (e) { return false; }
})();
const verschachtelt = ["SEITEN_SCHNELL", "HEUTE_SCHNELL", "AKTE_SCHNELL", "FAHR_SCHNELL", "WETTER_SCHNELL", "WETTER2_SCHNELL"].filter((v) => process.env[v]);
if (process.env.ORDNUNG_SCHNELL) {
  await pruefe("O9", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "ORDNUNG_SCHNELL gesetzt" }));
} else if (AUSLESEN) {
  await pruefe("O9", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "Auslese-Lauf" }));
} else if (elternTest || verschachtelt.length) {
  await pruefe("O9", "alle anderen scripts/*-test.mjs grün", () => ({ skip: `läuft selbst unter einem anderen Test (${elternTest ? "Eltern-Prozess ist ein *-test.mjs" : verschachtelt.join(", ") + " gesetzt"})` }));
} else {
  const dir = join(REPO, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "ordnung-test.mjs").sort();
  // Die anderen Tests sollen nicht ihrerseits noch einmal alle Tests (oder diesen hier) starten.
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", AKTE_SCHNELL: "1", FAHR_SCHNELL: "1", SEITEN_SCHNELL: "1", WETTER_SCHNELL: "1", WETTER2_SCHNELL: "1", ORDNUNG_SCHNELL: "1" };
  await pruefe("O9", `alle anderen Tests grün (${tests.join(", ")})`, () => {
    const f = [];
    for (const n of tests) {
      const r = spawnSync(process.execPath, [join(dir, n)], { cwd: ROOT, env, encoding: "utf8", timeout: 900000 });
      if (r.status !== 0) f.push(`${n} Exit ${r.status}${r.signal ? " " + r.signal : ""}: ${((r.stdout || "") + (r.stderr || "")).split("\n").filter((z) => /FEHLER|PROBLEM|Error/.test(z)).slice(0, 2).join(" / ")}`);
    }
    return f;
  });
}

console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
