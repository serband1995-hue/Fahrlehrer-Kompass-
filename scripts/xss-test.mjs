// XSS-Test (Sicherheitsfund S4): Daten aus gemeinsamen Datenbank-Spalten dürfen in der Fahrlehrer-App nie als HTML/Code laufen.
// Die App wird lokal mit erfundenen Daten geladen (kein Netz, getSupa() ist eine Attrappe). JEDES Feld, das ein Kollege
// über die gemeinsame Datenbank setzen könnte, trägt eine Schad-Nutzlast. Danach werden die betroffenen Seiten geöffnet.
// Geprüft wird: window.__xss bleibt leer, kein eingeschleustes img/svg-Element, keine Seitenfehler, keine doppelt
// maskierten Zeichen (&amp;amp; usw.), Namen mit ' und & bleiben wörtlich und unverändert gespeichert, und der Termin-Abruf
// lässt die Nutzlast die geprüften Spalten nicht überschreiben.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/xss-test.mjs
// Optional: XSS_SEITE=/pfad/zu/index.html (andere Fassung der Startseite, z. B. der alte Stand), CHROMIUM_PATH=…
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
    const istStart = pfad === "/" || pfad === "/index.html" || pfad === "index.html";
    const datei = await readFile(istStart ? (process.env.XSS_SEITE || join(ROOT, "index.html")) : join(ROOT, pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || (istStart ? "text/html" : "application/octet-stream") });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

// ---------- Schad-Nutzlasten ----------
const Z = "window.__xss=(window.__xss||0)+1";
const P1 = `<img src=x onerror="${Z}">`;
const P2 = `"><svg onload="${Z}">`;
const P3 = `' onfocus='${Z}' autofocus='`;
const P4 = `" autofocus onfocus="${Z}" x="`;
const NAME = "Zoé O'Brien & Söhne Muster";
const TAG = "2026-10-14"; // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => new Date(Date.UTC(2026, 9, 14 + n)).toISOString().slice(0, 10);

const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
page.on("dialog", (d) => d.dismiss().catch(() => {}));
await page.clock.setFixedTime(JETZT);
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
});

// ---------- Erfundene Daten mit Schad-Nutzlast in JEDEM Feld ----------
await page.evaluate(({ P1, P2, P3, P4, NAME, TAG }) => {
  const plus = (n) => new Date(Date.UTC(2026, 9, 14 + n)).toISOString().slice(0, 10);
  try { closeSheet(); } catch (e) {}
  ensureAusbildungsplaene(); ensureDB();
  const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
  const neu = (id, name, extra) => Object.assign({ id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0170 1234567" }, extra || {});
  const z = neu("z1", NAME, { ready: "2026-10-01T08:00:00.000Z" });
  z.plan.theorie = true;
  const a = neu("a1", "Anna Muster", {
    theoryPassed: P1, theoriePct: P2, attempts: P1, simEmpf: P2, akademieEmpf: P1, ready: "2026-10-02T08:00:00.000Z",
    uebernahme: { von: P1, am: "2026-09-01T08:00:00.000Z", fahrstunden: [{ datum: "2026-09-01", von: P2, bis: "10:00", status: P1 }], pruefungen: [{ datum: P2, result: "fail", pruefer: P1 }, { datum: P1, result: "pass", pruefer: P2 }] },
  });
  a.plan.theorie = true;
  a.plan.sonder = { ueberland: [{ d: P1, iso: P2 }], autobahn: [{ d: P2, iso: P1 }], nacht: [] };
  a.hist = [{ typ: "note", text: P1, d: "2026-10-01T08:00:00.000Z" }];
  const b = neu("b1", "Berta Muster", { passed: P1, ready: null });
  const c2 = neu("c1", "Carla Muster", { theoryPassed: P2, theoriePct: P1, attempts: P2, passed: P2 });
  DB.students = [z, a, b, c2];
  const L = (id, o) => Object.assign({ id, date: TAG, von: "08:00", bis: "09:30", art: "fahrstunde", sid: "a1", name: "", status: "geplant", note: "", fc: null }, o);
  DB.lessons = [
    L("Lh1", { von: P2, bis: P1, art: P1, fahrzeug: P1, status: P2, lektion: P1 }),
    L("Lh2", { von: "18:00", bis: "19:30", art: "theorie", lektion: P1, fahrzeug: P2, status: P1 }),
    L("Lh3", { von: "13:00", bis: "14:30", fahrzeug: P3, status: P4 }),
    L("Lh4", { von: P4, bis: P3, art: "sonder", sid: "z1", date: plus(1) }),
    L("Lh5", { von: "10:00", bis: "11:30", sid: "z1", fahrzeug: P1 }),
    L("Lh6", { date: plus(-3), von: P1, bis: P2, art: P3, sid: "a1", status: P1 }),
    L("Lh7", { date: plus(2), von: P2, bis: P1, art: P2, sid: "a1" }),
  ];
  DB.termine = [
    { id: "T1", date: plus(3), plaetze: 2, slots: ["a1", "z1"], von: P1, bis: "10:00" },
    { id: "T2", date: TAG, plaetze: 1, slots: ["z1"], von: P2, bis: "10:00" },
  ];
  DB.exams = [
    { id: "E1", sid: "a1", name: "Anna Muster", date: plus(-2), result: "fail", pruefer: P2, faults: [P1, P2, "ab_vorfahrt"], von: P1, eingriff: true, eingNote: P1, attempt: 1 },
    { id: "E2", sid: "a1", name: "Anna Muster", date: TAG, result: "pass", pruefer: P1, faults: [], von: P2, attempt: 2 },
    { id: "E3", sid: "c1", name: "Carla Muster", date: plus(-9), result: "fail", pruefer: P1, faults: [P2, P1], von: P1, attempt: 1 },
  ];
  DB.todos = [];
  Object.assign(DB.workCfg, { vorMittag: { von: "08:00", bis: "12:30" }, nachMittag: { von: "13:30", bis: "18:00" }, blockMin: 90, pausen: [] });
  window.__xss = 0;
  window.__vorher = JSON.stringify({ students: DB.students, lessons: DB.lessons, termine: DB.termine, exams: DB.exams });
}, { P1, P2, P3, P4, NAME, TAG });

// ---------- Hilfen ----------
let fehlerBisher = 0;
async function scan() {
  await page.waitForTimeout(220); // onerror/onload feuern asynchron
  return page.evaluate(() => {
    const t = ((document.getElementById("view")?.innerText || "") + " " + (document.getElementById("sheet")?.innerText || ""));
    const xss = window.__xss || 0; window.__gesamt = (window.__gesamt || 0) + xss; window.__xss = 0;
    return {
      xss,
      fremd: [...document.querySelectorAll('img[src="x"], svg[onload], [onerror], [onfocus], [autofocus]')].length,
      doppelt: [...t.matchAll(/.{0,25}&(amp|lt|gt|quot|#39);.{0,10}/g)].slice(0, 2).map((m) => m[0].replace(/\s+/g, " ")),
    };
  });
}
// Code in der Seite ausführen (fehlende Funktion = Fehlschlag), danach auf Code-Ausführung prüfen.
async function seite(id, text, code, extra) {
  await pruefe(id, text, async () => {
    const r = await page.evaluate(async (c) => {
      try { try { closeSheet(); } catch (e) {} const v = await (0, eval)("(async()=>{" + c + "})()"); return { ok: true, v }; }
      catch (e) { return { ok: false, m: String(e && e.message || e) }; }
    }, code);
    if (!r.ok) return "Aufruf scheiterte: " + r.m;
    const s = await scan(), f = [];
    if (s.xss) f.push(`window.__xss = ${s.xss} (Code lief)`);
    if (s.fremd) f.push(`${s.fremd} eingeschleustes Element (img/svg/on…)`);
    if (s.doppelt.length) f.push("doppelt maskiert sichtbar: „" + s.doppelt.join("“ „") + "“");
    if (jsFehler.length > fehlerBisher) { f.push("Seitenfehler: " + jsFehler.slice(fehlerBisher).join(" | ")); fehlerBisher = jsFehler.length; }
    if (extra) { const e = await extra(); if (e) f.push(...[].concat(e)); }
    return f;
  });
}
const sicht = (sel) => page.evaluate((s) => (document.querySelector(s)?.innerText || "").replace(/\s+/g, " "), sel);

// ---------- Seiten ----------
await seite("X01", "Heute (routeDashboard)", `routeDashboard()`);
await seite("X02", "Schülerliste (routeHome)", `routeHome()`, async () => {
  const t = await sicht("#view");
  return t.includes(NAME) ? null : `Name „${NAME}“ fehlt/verändert in der Liste`;
});
await seite("X03", "Wochenkalender (Termine mit Schad-Feldern)", `routeKalender("woche","${TAG}")`);
await seite("X04", "Tagesansicht Mittwoch", `routeKalender("tag","${TAG}")`);
await seite("X05", "Tagesansicht Sonntag davor (Termin mit Schad-art)", `routeKalender("tag","2026-10-11")`);
await seite("X06", "Tagesansicht Freitag (Termin mit Schad-art/von/bis)", `routeKalender("tag","2026-10-16")`);
await seite("X07", "Monatsansicht", `routeKalender("monat","${TAG}")`);
await seite("X08", "Kalender-Suche (Fenster, Suche „Muster“)", `openCalSearchSheet(); const i=document.getElementById("csInput"); i.value="Muster"; i.dispatchEvent(new Event("input",{bubbles:true}));`);
await seite("X09", "Kalender-Suche: Termine von Anna (art/von/Datum)", `showCalStudentDetail("a1")`);
await seite("X10", "Schülerakte Anna (routeDetail)", `routeDetail("a1")`);
await seite("X11", "Schülerakte Zoé (routeDetail)", `routeDetail("z1")`, async () => {
  const t = await sicht("#view");
  return t.includes(NAME) ? null : `Name „${NAME}“ fehlt/verändert in der Akte`;
});
await seite("X12", "Akte Reiter „Prüfung“", `routeAktePruefung("a1")`);
await seite("X13", "Akte Reiter „Termine“", `routeAkteTermine("a1")`);
await seite("X14", "Ausbildungsplan", `routePlan("a1")`);
await seite("X15", "Historie", `routeHistorie("a1")`);
await seite("X16", "Profil", `routeProfil("a1")`);
await seite("X17", "Risiko-Seite", `routeRisk("a1")`);
await seite("X18", "Akte Carla (Schad-Werte theoryPassed/passed)", `routeDetail("c1")`);
await seite("X19", "Akte Berta (bestanden = Schad-Wert)", `routeDetail("b1")`);
await seite("X20", "Warteliste", `routeWaitlist()`, async () => {
  const t = await sicht("#view");
  return t.includes(NAME) ? null : `Name „${NAME}“ fehlt/verändert in der Warteliste`;
});
await seite("X21", "Prüfungen (Tafel)", `routePruefungen()`);
await seite("X22", "Prüfungen Woche", `routePruefungenWoche()`);
await seite("X23", "Archiv", `routeArchive()`);
await seite("X24", "Statistik", `routeStats("all")`);
await seite("X25", "Nichtbesteher / Fehleranalyse", `routeNichtBesteher("all")`);
await seite("X26", "Prüferliste", `routePrueferListe()`);
await seite("X27", "Prüfer-Akte (Name = Schad-Wert)", `routePrueferAkte(${JSON.stringify(P2)})`);
await seite("X28", "Prüfer-Akte (Name = Schad-Wert 2)", `routePrueferAkte(${JSON.stringify(P1)})`);
await seite("X29", "Fahrcheck fehlt", `routeFCMissing()`);
await seite("X30", "Prüfungs-Seite (routeExam)", `routeExam("a1")`);
await seite("X31", "Fahrstunde läuft (routeFahrstunde)", `routeFahrstunde("Lh3")`);
await seite("X32", "Stunde fertig", `routeStundeFertig("Lh3")`);
await seite("X33", "Termin-Fenster Fahrstunde (Schad-art/von/bis/fahrzeug/status)", `openEventSheet("lesson","Lh1","a1")`);
await seite("X34", "Termin-Fenster Theorie (Schad-lektion)", `openEventSheet("lesson","Lh2","a1")`);
await seite("X35", "Termin-Fenster Fahrstunde (Schad-fahrzeug/status mit Anführungszeichen)", `openEventSheet("lesson","Lh3","a1")`);
await seite("X36", "Prüfungs-Fenster (Prüfungstermin, Schad-von)", `openEventSheet("pruefung","T1","a1")`);
await seite("X37", "Prüfungs-Fenster (erledigte Prüfung, Schad-von/pruefer)", `openEventSheet("examDone","E1","a1")`);
await seite("X38", "Prüfungs-Fenster (bestanden, Schad-pruefer)", `openEventSheet("examDone","E2","a1")`);
await seite("X39", "Prüfungstermin bearbeiten", `openTerminEdit("T1")`);
await seite("X40", "Platz im Prüfungstermin", `openTerminSheet()`);
await seite("X41", "Theorie-Fenster (Termin eintragen)", `openTheorieSheet()`);
await seite("X42", "Prüfungsplan-Fenster für Anna", `openExamPlanSheet(DB.students.find(s=>s.id==="a1"))`);
await seite("X43", "Kapazitäts-Fenster", `openCapacitySheet()`);
await seite("X44", "Sonderfahrt-Fenster (Schad-d)", `openSonderKalenderSheet("a1","ueberland",0)`);
await seite("X45", "Termin vergeben (freier Platz)", `openAssignSlotSheet("${TAG}","08:00","09:30","fahrstunde")`);
await seite("X46", "Zeit schenken (Fahrstunde mit Schad-von)", `openGiftTimeSheet("Lh1")`);
await seite("X47", "Neuer Termin", `openNeuerTerminSheet()`);
await seite("X48", "Prüfungs-Fenster Zoé (Sonderfahrt-Termin mit Schad-Attributen)", `openEventSheet("lesson","Lh4","z1")`);
await seite("X49", "Termin-Fenster (Schad-art/von in der Vergangenheit)", `openEventSheet("lesson","Lh6","a1")`);
await seite("X50", "Termin-Fenster (Schad-art/von in der Zukunft)", `openEventSheet("lesson","Lh7","a1")`);
await seite("X51", "Heute erneut (nach allen Fenstern)", `routeDashboard()`);

// Gesamtansicht (Fahrschule) Fehleranalyse und Kategorien, soweit ohne Netz erreichbar
await seite("X52", "Gesamtansicht: Fehleranalyse", `window.__alt=_fsAgg; _fsAgg={fahrschuleId:"f1",fahrschule:{name:"Muster Fahrschule"},lehrer:[],pakete:[]}; try{ routeFahrschuleFehleranalyse(); } finally { await new Promise(r=>setTimeout(r,50)); }`);
await seite("X53", "Gesamtansicht: Kategorie Theorie", `try{ routeFahrschuleKategorie("theorie_pruefung"); } finally { _fsAgg=window.__alt||null; }`);

// ---------- Name wörtlich und unverändert gespeichert ----------
await pruefe("X54", "Name „Zoé O'Brien & Söhne Muster“ und alle Schad-Felder bleiben nach dem Speichern unverändert im lokalen Speicher", async () => {
  const r = await page.evaluate(({ NAME }) => {
    try { closeSheet(); } catch (e) {}
    save();
    const roh = localStorage.getItem(STORE_KEY);
    if (!roh) return { fehler: "nichts gespeichert" };
    const d = JSON.parse(roh);
    const vorher = JSON.parse(window.__vorher);
    const f = [];
    const z = (d.students || []).find((s) => s.id === "z1");
    if (!z || z.name !== NAME) f.push(`Name gespeichert als „${z && z.name}“`);
    for (const k of ["students", "lessons", "termine", "exams"]) {
      for (const alt of vorher[k]) {
        const neu = (d[k] || []).find((x) => x.id === alt.id);
        if (!neu) { f.push(`${k} ${alt.id} fehlt`); continue; }
        for (const feld of Object.keys(alt)) {
          if (["plan", "planSnapshot", "created"].includes(feld)) continue;
          if (JSON.stringify(neu[feld]) !== JSON.stringify(alt[feld])) f.push(`${k} ${alt.id}.${feld} verändert`);
        }
      }
    }
    return { f };
  }, { NAME });
  if (r.fehler) return r.fehler;
  return r.f.slice(0, 6);
});

// ---------- Termin-Abruf: Nutzlast darf die geprüften Spalten nicht überschreiben ----------
await pruefe("X55", "Termin-Abruf: Spalten von/bis/art/fahrzeug/status/id/sid/date gewinnen gegen die Nutzlast, Zusatzfelder bleiben", async () => {
  const r = await page.evaluate(async ({ P1, P2, TAG }) => {
    const rows = [
      { id: "R1", schueler_id: "a1", datum: TAG, von: "09:00", bis: "10:30", art: "fahrstunde", fahrzeug: "VW Golf", status: "geplant", aktualisiert_am: "2026-10-14T08:00:00Z",
        payload: { von: P1, bis: P2, art: "<b>x", fahrzeug: P2, status: P1, date: "1999-01-01", sid: "evil", id: "EVIL", note: "Hallo" } },
      { id: "R2", schueler_id: "z1", datum: TAG, von: "11:00", bis: "12:30", art: "sonder", fahrzeug: null, status: "geplant", aktualisiert_am: "2026-10-14T08:00:00Z",
        payload: { von: P2, art: P1, note: "Zwei" } },
    ];
    const kette = { select: () => kette, eq: () => kette, order: () => kette, range: async () => ({ data: rows, error: null }) };
    const altSupa = window.getSupa;
    window.getSupa = () => ({ from: () => kette, rpc: async () => ({ data: [], error: null }), auth: { getUser: async () => ({ data: {}, error: null }), getSession: async () => ({ data: {}, error: null }) } });
    const sicher = { u: _authUser, p: _authProfile, l: DB.lessons };
    try {
      _authUser = { id: "u1" }; _authProfile = { fahrschule_id: "fs1", rolle: "fahrlehrer" };
      _termineAbrufLaeuft = false;
      DB.lessons = [{ id: "R2", date: TAG, von: "07:00", bis: "08:00", art: "fahrstunde", sid: "z1", status: "geplant", _syncedAt: 1 }];
      await pullTermineZuweisungen();
      const l1 = DB.lessons.find((x) => x.id === "R1"), l2 = DB.lessons.find((x) => x.id === "R2");
      const f = [];
      if (!l1) f.push("Termin R1 nicht übernommen");
      else {
        const soll = { von: "09:00", bis: "10:30", art: "fahrstunde", fahrzeug: "VW Golf", status: "geplant", date: TAG, sid: "a1", id: "R1" };
        for (const k of Object.keys(soll)) if (l1[k] !== soll[k]) f.push(`R1.${k} = ${JSON.stringify(l1[k])} statt ${JSON.stringify(soll[k])}`);
        if (l1.note !== "Hallo") f.push("Zusatzfeld note aus der Nutzlast fehlt");
      }
      if (!l2) f.push("Termin R2 fehlt");
      else {
        if (l2.von !== "11:00") f.push(`R2.von = ${JSON.stringify(l2.von)} statt "11:00"`);
        if (l2.art !== "sonder") f.push(`R2.art = ${JSON.stringify(l2.art)} statt "sonder"`);
        if (l2.note !== "Zwei") f.push("R2: Zusatzfeld note fehlt");
      }
      return f;
    } finally {
      window.getSupa = altSupa; _authUser = sicher.u; _authProfile = sicher.p; DB.lessons = sicher.l;
    }
  }, { P1, P2, TAG });
  return r;
});

await pruefe("X56", "keine Seitenfehler im ganzen Lauf", async () => (jsFehler.length ? jsFehler.slice(0, 3) : null));
await pruefe("X57", "window.__xss blieb im ganzen Lauf 0", async () => {
  const v = await page.evaluate(() => (window.__gesamt || 0) + (window.__xss || 0));
  return v ? `window.__xss insgesamt ${v}` : null;
});

await browser.close();
server.close();
console.log(`XSS-Test: ${okZahl + fehlerZahl} Prüfungen, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
