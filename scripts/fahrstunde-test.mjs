// Fahrstunde-Test (Umbau Schritt 3): Fahrstunden-Modus (routeFahrstunde) und „Nach der Stunde“ (routeStundeFertig).
// Geschrieben VOR dem Bau: gegen den alten Stand sind fast alle Punkte rot (Funktion/Klasse fehlt). Das ist gewollt.
// Jeder Prüfpunkt (F0a … F4d) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Texte werden über textContent gelesen (Großschreibung per CSS ist egal).
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin). Für die Laufzeit wird sie während des Tests vorgestellt.
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fahrstunde-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), FAHR_SCHNELL=1 (F4b: heute-test nicht mitlaufen lassen),
//           FAHR_BASIS=<git-Stand> (Vergleich für F4c „Rechnen/Abgleich unverändert“; sonst merge-base HEAD origin/main)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const REPO = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOT = process.env.KOMPASS_ROOT || REPO;
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
// fn liefert: nichts/true/[] = ok, Text/Liste = Fehlergrund, { skip: "Grund" } = übersprungen
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
const MONTAG = "2026-10-12";
const MORGEN = "2026-10-15";    // Donnerstag
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const SPAETER = new Date(JETZT.getTime() + 42 * 60000); // 11:12 → Laufzeit „0:42“
const MERKER = "kompass-fahrstunde";
const ALT_ZEIT = "2026-10-01T08:00:00.000Z";
const ALT_NOTIZ = "Erfundener Treffpunkt Bahnhof";
// winzige erfundene Unterschrift (1×1 px PNG)
const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
// Ampeln des Testschülers nach Plan-Position (Item-IDs werden aus stufenFor(s) gelesen, nicht geraten).
// 0 grün · 1 gelb · 2 grün · 3 rot · 4 grün · 5 gelb · 6 offen · 7 gelb · ab 8 offen
const AMPELN_NACH_POS = { 0: "gruen", 1: "gelb", 2: "gruen", 3: "rot", 4: "gruen", 5: "gelb", 7: "gelb" };

function basisSzenario() {
  return {
    theme: "light",
    students: [
      { id: "t1", name: "Erfundene Testperson", telefon: "0170 1234567", sig: true, ampeln: AMPELN_NACH_POS },
      { id: "t2", name: "Erfundene Zweitperson", telefon: "0170 2222222" },
      { id: "t8", name: "Erfundene Achtperson", telefon: "0170 8888888" }, // alphabetisch zuerst
    ],
    lessons: [
      { id: "L-mo", date: MONTAG, von: "08:00", bis: "09:30", sid: "t1", note: "Erfundene Notiz Spiegel" }, // frühere Stunde
      { id: "L1", date: TAG, von: "10:00", bis: "11:30", sid: "t1", note: ALT_NOTIZ },                      // läuft gerade
      { id: "L2", date: TAG, von: "13:30", bis: "15:00", sid: "t2" },                                       // heute später
    ],
    termine: [],
    fahrzeuge: [],
    workCfg: { vorMittag: { von: "08:00", bis: "12:30" }, nachMittag: { von: "13:30", bis: "18:00" }, nacht: { von: "19:30", bis: "21:00", an: false }, samstagAn: false, blockMin: 90 },
    merkerBehalten: false,
  };
}

async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  const s = { ctx, page, jsFehler: [], dialoge: [], antwort: "accept" };
  page.on("pageerror", (e) => s.jsFehler.push(e.message));
  page.on("dialog", async (d) => { s.dialoge.push(d.message()); try { s.antwort === "accept" ? await d.accept() : await d.dismiss(); } catch (e) {} });
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await bereite(page);
  return s;
}
// Nach Laden/Neuladen: Anmeldung ausblenden, Datenbank-Attrappe, Spione für window.open.
async function bereite(page) {
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
    window._geoeffnet = [];
    window.open = (u) => { window._geoeffnet.push(String(u)); return null; };
  });
}

// Daten in die App legen, speichern (damit Neuladen sie findet) und Heute zeichnen.
async function setze(page, sz) {
  await page.evaluate(({ sz, ALT_ZEIT, SIG, MERKER }) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      s.plan.ampelnZeit = {};
      if (p.sig) s.signature = { dataUrl: SIG, date: "2026-09-01" };
      if (p.ampeln) {
        const flach = []; stufenFor(s).forEach((st) => st.items.forEach((it) => flach.push(it.id)));
        for (const [pos, v] of Object.entries(p.ampeln)) { s.plan.ampeln[flach[+pos]] = v; s.plan.ampelnZeit[flach[+pos]] = ALT_ZEIT; }
      }
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: l.note || "", fc: null }));
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = []; DB.todos = [];
    Object.assign(DB.workCfg, sz.workCfg); DB.workCfg.pausen = []; DB.workCfg.fahrzeuge = JSON.parse(JSON.stringify(sz.fahrzeuge || []));
    DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: "", city: "Offenbach,DE" });
    try { localStorage.removeItem("serband-weather-cache"); } catch (e) {}
    try { localStorage.setItem("serband-backup-stamp", String(Date.now())); } catch (e) {}
    _schuelerFristen = {}; _bueroNotizen = {};
    if (!sz.merkerBehalten) { try { localStorage.removeItem(MERKER); } catch (e) {} }
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    save();
    routeDashboard();
  }, { sz, ALT_ZEIT, SIG, MERKER });
  await warte(page, 300);
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const gibtFunktion = (page, name) => page.evaluate((n) => { try { return typeof eval(n) === "function"; } catch (e) { return false; } }, name);
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; }, sel);
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const anzahl = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const norm = (t) => String(t || "").replace(/[\s  ]+/g, " ").replace(/[-—]/g, "–").trim();
const ohneLeer = (t) => String(t || "").replace(/[\s  ]+/g, "");
const sheetZustand = (page) => page.evaluate(() => {
  const s = document.getElementById("sheet");
  return { offen: !!s && s.classList.contains("open"), kopf: (s?.querySelector(".sheet-h")?.textContent || "").replace(/\s+/g, " ").trim(), text: (s?.textContent || "").replace(/\s+/g, " ").trim() };
});
const merker = (page) => page.evaluate((k) => { try { const r = localStorage.getItem(k); return r === null ? null : JSON.parse(r); } catch (e) { return "kaputt"; } }, MERKER);
const plan = (page, sid = "t1") => page.evaluate((sid) => { const s = DB.students.find((x) => x.id === sid); return JSON.parse(JSON.stringify({ ampeln: s.plan.ampeln || {}, zeit: s.plan.ampelnZeit || {} })); }, sid);
const stunde = (page, lid = "L1") => page.evaluate((lid) => JSON.parse(JSON.stringify(DB.lessons.find((x) => x.id === lid) || null)), lid);
async function klick(page, sel) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return `„${sel}“ fehlt`;
  await loc.first().click();
  await warte(page, 300);
  return null;
}
// „N von M grün“: das .fm-gruen-Element mit „von“ (falls .fm-gruen auch als Farbklasse vorkommt)
const gruenText = (page) => page.evaluate(() => { const e = [...document.querySelectorAll("#view .fahrmodus .fm-gruen")].find((x) => /von/.test(x.textContent)); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; });
const KEIN_MODUS = "kein #view .fahrmodus (Fahrstunden-Modus fehlt)";
const KEIN_FERTIG = "kein #view .fertig2 („Nach der Stunde“ fehlt)";
const brauchtModus = async (page) => ((await da(page, "#view .fahrmodus")) ? null : KEIN_MODUS);
const brauchtFertig = async (page) => ((await da(page, "#view .fertig2")) ? null : KEIN_FERTIG);
// Zustand eines Themen-Knopfs: Text ohne den Thementitel → offen/gelb/grün/rot
async function zustand(page, id) {
  return page.evaluate(({ id }) => {
    const b = document.querySelector(`#view .fahrmodus .fm-thema[data-item="${id}"]`);
    if (!b) return null;
    const s = DB.students.find((x) => x.id === "t1");
    let t = ""; stufenFor(s).forEach((st) => st.items.forEach((it) => { if (it.id === id) t = it.t; }));
    const rest = (b.textContent || "").replace(t, " ").replace(/\s+/g, " ");
    const m = rest.match(/(^|[^a-zäöüß])(offen|gelb|grün|rot)(?![a-zäöüß])/i);
    return m ? m[2].toLowerCase() : "?" + rest.trim().slice(0, 30);
  }, { id });
}
async function tippe(page, id, mal = 1) {
  for (let i = 0; i < mal; i++) {
    const loc = page.locator(`#view .fahrmodus .fm-thema[data-item="${id}"]`);
    if (!(await loc.count())) return `.fm-thema[data-item="${id}"] fehlt`;
    await loc.first().click();
    await warte(page, 150);
  }
  return null;
}
const WERT = { "grün": "gruen", gruen: "gruen", gelb: "gelb", rot: "rot", offen: "offen" };
const istOffenWert = (v) => v === undefined || v === null || v === "" || v === "offen";
// Knopf der Jetzt-Karte lesen
const kartenKnopf = (page) => page.evaluate(() => {
  const b = document.querySelector("#view .heute2 .h2-jetzt .h2-akte");
  return b ? { text: (b.textContent || "").replace(/\s+/g, " ").trim(), start: b.classList.contains("h2-start") } : null;
});
// Lokales Datum (Berlin) eines ISO-Zeitstempels
const tagVon = (page, z) => page.evaluate((z) => { const d = new Date(z); return isNaN(d.getTime()) ? "" : dateISO(d); }, z);

// ---------- Hauptlauf bei 412 × 915 ----------
const H = await neueSeite(412, 915);
const page = H.page;
await setze(page, basisSzenario());
// Item-IDs in Plan-Reihenfolge
const I = await page.evaluate(() => { const s = DB.students.find((x) => x.id === "t1"); const out = []; stufenFor(s).forEach((st) => st.items.forEach((it) => out.push({ id: it.id, t: it.t, eval: st.eval !== false }))); return out; });
const f = (n) => I[n].id;
const FMODUS_DA = await gibtFunktion(page, "routeFahrstunde");
const FERTIG_DA = await gibtFunktion(page, "routeStundeFertig");

// F0 Testaufbau
await pruefe("F0a", "Uhr steht fest: todayISO() = 2026-10-14, 10:30", async () => {
  const r = await page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes() }));
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) return `todayISO()=${r.iso}, ${r.h}:${r.m}`;
});
await pruefe("F0b", "Testdaten: Jetzt-Karte = L1 (10:00–11:30, Testperson), Plan gelb/rot an Position 1/3/5/7", async () => {
  const r = await page.evaluate(() => ({ e: nextLessonEvents(1)[0] || null, a: DB.students[0].plan.ampeln }));
  const fl = [];
  if (!r.e || r.e.id !== "L1") fl.push(`erste Stunde ${r.e ? r.e.id : "keine"}`);
  if (r.a[f(1)] !== "gelb" || r.a[f(3)] !== "rot" || r.a[f(5)] !== "gelb" || r.a[f(0)] !== "gruen") fl.push("Ampeln nicht wie geplant gesetzt");
  if (I.length < 9) fl.push(`nur ${I.length} Themen im Plan`);
  return fl;
});

// ---------- F1 Start ----------
await pruefe("F1a", "Heute, Fahrstunde läuft jetzt: Hauptknopf .h2-akte.h2-start „Fahrstunde starten“", async () => {
  await setze(page, basisSzenario());
  const k = await kartenKnopf(page);
  if (!k) return "kein .h2-akte in der Jetzt-Karte";
  const fl = [];
  if (!/Fahrstunde starten/.test(k.text)) fl.push(`Beschriftung „${k.text}“`);
  if (!k.start) fl.push("Klasse .h2-start fehlt");
  return fl;
});
await pruefe("F1b", "auch für spätere Stunde heute („Als Nächstes“) und für Art „sonder“: „Fahrstunde starten“", async () => {
  const fl = [];
  const sz = basisSzenario(); sz.lessons = sz.lessons.filter((l) => l.id !== "L1");
  await setze(page, sz);
  let k = await kartenKnopf(page);
  if (!k || !/Fahrstunde starten/.test(k.text) || !k.start) fl.push(`13:30 heute: „${k ? k.text : "kein Knopf"}“${k && !k.start ? " ohne .h2-start" : ""}`);
  const sz2 = basisSzenario(); sz2.lessons.find((l) => l.id === "L1").art = "sonder";
  await setze(page, sz2);
  k = await kartenKnopf(page);
  if (!k || !/Fahrstunde starten/.test(k.text) || !k.start) fl.push(`Sonderfahrt: „${k ? k.text : "kein Knopf"}“`);
  await setze(page, basisSzenario());
  return fl;
});
await pruefe("F1c", "Prüfung jetzt bzw. Stunde erst morgen: Knopf bleibt „Schülerakte öffnen“ ohne .h2-start", async () => {
  const fl = [];
  const sz = basisSzenario(); sz.lessons = sz.lessons.filter((l) => l.date !== TAG); sz.termine = [{ id: "P1", date: TAG, von: "10:15", slots: ["t1"] }];
  await setze(page, sz);
  let k = await kartenKnopf(page);
  const label = await text(page, ".heute2 .h2-jetzt-label");
  if (!k) fl.push(`Prüfung: kein .h2-akte (Karte: „${label}“)`);
  else if (!/Schülerakte öffnen/.test(k.text) || k.start) fl.push(`Prüfung: „${k.text}“${k.start ? " mit .h2-start" : ""}`);
  const sz2 = basisSzenario(); sz2.lessons = sz2.lessons.filter((l) => l.date !== TAG).concat([{ id: "Lm", date: MORGEN, von: "09:30", bis: "11:00", sid: "t1" }]);
  await setze(page, sz2);
  k = await kartenKnopf(page);
  if (!k) fl.push("morgen: kein .h2-akte");
  else if (!/Schülerakte öffnen/.test(k.text) || k.start) fl.push(`morgen: „${k.text}“${k.start ? " mit .h2-start" : ""}`);
  await setze(page, basisSzenario());
  return fl;
});
await pruefe("F1d", "Tipp auf „Fahrstunde starten“ → routeFahrstunde, Titel „Fahrstunde“, #view .fahrmodus, Reiter „Heute“ markiert", async () => {
  await setze(page, basisSzenario());
  const fl = [];
  if (!FMODUS_DA) fl.push("Funktion routeFahrstunde fehlt");
  const e = await klick(page, "#view .heute2 .h2-jetzt .h2-start"); if (e) return fl.concat(e);
  const t = await titel(page);
  if (t !== "Fahrstunde") fl.push(`Titel „${t}“`);
  if (!(await da(page, "#view .fahrmodus"))) fl.push(KEIN_MODUS);
  const tab = await page.evaluate(() => document.querySelector(".tab-i.on")?.dataset.tab || "keiner");
  if (tab !== "heute") fl.push(`markierter Reiter „${tab}“`);
  return fl;
});
await pruefe("F1e", "Merker localStorage „kompass-fahrstunde“ = {lid:'L1', start = jetzt (ms), stufe:{}, notizen:[]}", async () => {
  const m = await merker(page);
  if (!m) return "kein Merker gespeichert";
  if (m === "kaputt") return "Merker ist kein JSON";
  const fl = [];
  if (m.lid !== "L1") fl.push(`lid „${m.lid}“`);
  if (typeof m.start !== "number" || Math.abs(m.start - JETZT.getTime()) > 60000) fl.push(`start ${m.start} statt ${JETZT.getTime()}`);
  if (!m.stufe || typeof m.stufe !== "object" || Object.keys(m.stufe).length) fl.push(`stufe ${JSON.stringify(m.stufe)}`);
  if (!Array.isArray(m.notizen) || m.notizen.length) fl.push(`notizen ${JSON.stringify(m.notizen)}`);
  return fl;
});
await pruefe("F1f", "Läuft eine Fahrstunde: Heute zeigt „Fahrstunde fortsetzen“ (.h2-start); Tipp → Modus, Start bleibt", async () => {
  const m0 = await merker(page);
  if (!m0) return "kein Merker (Start fehlt)";
  await page.evaluate(() => routeDashboard()); await warte(page, 250);
  const k = await kartenKnopf(page);
  const fl = [];
  if (!k || !/Fahrstunde fortsetzen/.test(k.text) || !k.start) fl.push(`Knopf „${k ? k.text : "fehlt"}“${k && !k.start ? " ohne .h2-start" : ""}`);
  if (k) {
    const e = await klick(page, "#view .heute2 .h2-jetzt .h2-akte"); if (e) fl.push(e);
    if ((await titel(page)) !== "Fahrstunde") fl.push(`nach Tipp Titel „${await titel(page)}“`);
    const m1 = await merker(page);
    if (!m1 || m1.start !== m0.start) fl.push(`Start geändert: ${m0.start} → ${m1 && m1.start}`);
  }
  return fl;
});

// ---------- F2 Fahrstunden-Modus ----------
// Ohne Notiz in der früheren Stunde: kein „Letztes Mal“ (eigener Aufbau vorweg)
await pruefe("F2e", "„Letztes Mal“ fehlt, wenn die frühere Stunde keine Notiz hat", async () => {
  if (!FMODUS_DA) return "Funktion routeFahrstunde fehlt";
  const sz = basisSzenario(); sz.lessons.find((l) => l.id === "L-mo").note = "";
  await setze(page, sz);
  await page.evaluate(() => routeFahrstunde("L1")); await warte(page, 250);
  const e = await brauchtModus(page); if (e) return e;
  const t = await text(page, "#view .fahrmodus .fm-ueben");
  if (t === null) return ".fm-ueben fehlt";
  if (/Letztes Mal/.test(t)) return `„Letztes Mal“ trotzdem da: „${t}“`;
  if (t.includes(ALT_NOTIZ)) return "Notiz der laufenden Stunde wird gezeigt";
});
// Haupt-Durchlauf
await setze(page, basisSzenario());
if (FMODUS_DA) { await page.evaluate(() => { try { routeFahrstunde("L1"); } catch (e) {} }); await warte(page, 300); }
else await klick(page, "#view .heute2 .h2-jetzt .h2-akte"); // alter Stand: öffnet nur die Akte
const planVorher = await plan(page);
const stunde1Vorher = await stunde(page);
const standVorher = await page.evaluate(() => stand(DB.students.find((x) => x.id === "t1")));

await pruefe("F2a", "Kopf: „Fahrstunde läuft“, .fm-name = Name, .fm-zeit „0:00“, „von 1:30“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const fl = [];
  const ganz = await text(page, "#view .fahrmodus");
  if (!/Fahrstunde läuft/.test(ganz)) fl.push("„Fahrstunde läuft“ fehlt");
  const n = await text(page, "#view .fahrmodus .fm-name");
  if (n === null) fl.push(".fm-name fehlt"); else if (!n.includes("Erfundene Testperson")) fl.push(`Name „${n}“`);
  const z = await text(page, "#view .fahrmodus .fm-zeit");
  if (z === null) fl.push(".fm-zeit fehlt"); else if (z !== "0:00") fl.push(`.fm-zeit „${z}“ statt „0:00“`);
  if (!/von\s*1:30/.test(ganz)) fl.push("„von 1:30“ fehlt");
  return fl;
});
await pruefe("F2b", "dunkel (Hintergrund .fahrmodus dunkel im hellen Design), Reiterleiste und #fab unsichtbar", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const r = await page.evaluate(() => {
    const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    let el = document.querySelector("#view .fahrmodus"), c = null;
    while (el) { const x = rgb(getComputedStyle(el).backgroundColor); if (x && x.a > 0.5) { c = x; break; } el = el.parentElement; }
    const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c ? 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b) : 1;
    const sichtbar = (id) => { const x = document.getElementById(id); if (!x) return false; const cs = getComputedStyle(x), b = x.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0 && b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0; };
    return { lum, bg: c ? `rgb(${c.r},${c.g},${c.b})` : "keiner", tab: sichtbar("tabbar"), fab: sichtbar("fab") };
  });
  const fl = [];
  if (r.lum > 0.15) fl.push(`Hintergrund ${r.bg} nicht dunkel`);
  if (r.tab) fl.push("Reiterleiste sichtbar");
  if (r.fab) fl.push("#fab sichtbar");
  return fl;
});
await pruefe("F2d", "„Heute üben“ (.fm-ueben): erste zwei nicht-grüne Themen; „Letztes Mal: Erfundene Notiz Spiegel“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const t = await text(page, "#view .fahrmodus .fm-ueben");
  if (t === null) return ".fm-ueben fehlt";
  const fl = [];
  if (!/Heute üben/i.test(t)) fl.push("Überschrift „Heute üben“ fehlt");
  if (!t.includes(I[1].t)) fl.push(`1. Thema „${I[1].t}“ fehlt`);
  if (!t.includes(I[3].t)) fl.push(`2. Thema „${I[3].t}“ fehlt`);
  if (t.includes(I[5].t)) fl.push(`3. nicht-grünes Thema „${I[5].t}“ steht auch drin`);
  if (!/Letztes Mal/.test(t) || !t.includes("Erfundene Notiz Spiegel")) fl.push("„Letztes Mal: Erfundene Notiz Spiegel“ fehlt");
  if (t.includes(ALT_NOTIZ)) fl.push("Notiz der laufenden Stunde statt der früheren");
  return fl;
});
await pruefe("F2f", ".fm-themen: 5 .fm-thema[data-item], erst gelb/rot in Plan-Reihenfolge, dann offene; Zustand als Text", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const ids = await page.evaluate(() => [...document.querySelectorAll("#view .fahrmodus .fm-themen .fm-thema[data-item]")].map((b) => b.dataset.item));
  const soll = [f(1), f(3), f(5), f(7), f(6)];
  const fl = [];
  if (ids.join() !== soll.join()) fl.push(`Reihenfolge ${ids.join(",") || "leer"} statt ${soll.join(",")}`);
  const sollZ = { [f(1)]: "gelb", [f(3)]: "rot", [f(5)]: "gelb", [f(7)]: "gelb", [f(6)]: "offen" };
  for (const [id, z] of Object.entries(sollZ)) { const ist = await zustand(page, id); if (ist !== null && ist !== z) fl.push(`${id}: „${ist}“ statt „${z}“`); }
  return fl;
});
await pruefe("F2g", "Anzeige .fm-gruen „0 von 5 grün“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const t = await gruenText(page);
  if (t === null) return ".fm-gruen fehlt";
  if (!/0\s*von\s*5\s*grün/.test(t)) return `„${t}“`;
});
await pruefe("F2h", "Tipp-Zyklus offen → gelb → grün → rot → offen, jeder Tipp sofort im Merker (stufe)", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const fl = [];
  const folge = ["gelb", "grün", "rot", "offen"];
  for (const soll of folge) {
    const t = await tippe(page, f(6)); if (t) return fl.concat(t);
    const ist = await zustand(page, f(6));
    if (ist !== soll) fl.push(`nach Tipp „${ist}“ statt „${soll}“`);
    const m = await merker(page);
    const v = m && m.stufe ? m.stufe[f(6)] : undefined;
    if (soll === "offen" ? !(m && m.stufe && f(6) in m.stufe && istOffenWert(v)) : v !== WERT[soll]) fl.push(`Merker nach „${soll}“: ${JSON.stringify(v)}`);
  }
  return fl;
});
await pruefe("F2i", "Bewerten: gelb→grün, rot→offen, gelb→grün→rot, offen→gelb→grün, gelb 4× → gelb (unverändert); .fm-gruen „2 von 5 grün“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const fl = [];
  for (const [n, mal, soll] of [[1, 1, "grün"], [3, 1, "offen"], [5, 2, "rot"], [6, 2, "grün"], [7, 4, "gelb"]]) {
    const t = await tippe(page, f(n), mal); if (t) { fl.push(t); continue; }
    const ist = await zustand(page, f(n));
    if (ist !== soll) fl.push(`${f(n)}: „${ist}“ statt „${soll}“`);
  }
  const m = await merker(page);
  if (!m || !m.stufe) fl.push("Merker fehlt");
  else {
    if (m.stufe[f(1)] !== "gruen") fl.push(`Merker ${f(1)}=${m.stufe[f(1)]}`);
    if (!(f(3) in m.stufe) || !istOffenWert(m.stufe[f(3)])) fl.push(`Merker ${f(3)}=${JSON.stringify(m.stufe[f(3)])} (offen muss als Änderung drinstehen)`);
    if (m.stufe[f(5)] !== "rot") fl.push(`Merker ${f(5)}=${m.stufe[f(5)]}`);
    if (m.stufe[f(6)] !== "gruen") fl.push(`Merker ${f(6)}=${m.stufe[f(6)]}`);
    if (f(7) in m.stufe && m.stufe[f(7)] !== "gelb") fl.push(`Merker ${f(7)}=${m.stufe[f(7)]}`);
  }
  const g = await gruenText(page);
  if (!/2\s*von\s*5\s*grün/.test(g || "")) fl.push(`.fm-gruen „${g}“`);
  return fl;
});
await pruefe("F2j", "vor „Fertig“: DB-Plan (ampeln/ampelnZeit) und gespeicherte Daten unverändert", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const jetzt = await plan(page);
  const gesp = await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem(STORE_KEY)); const s = d.students.find((x) => x.id === "t1"); return { ampeln: s.plan.ampeln, zeit: s.plan.ampelnZeit || {} }; } catch (e) { return null; } });
  const fl = [];
  if (JSON.stringify(jetzt) !== JSON.stringify(planVorher)) fl.push("DB.students[t1].plan geändert");
  if (!gesp || JSON.stringify(gesp.ampeln) !== JSON.stringify(planVorher.ampeln)) fl.push("localStorage-Plan geändert");
  return fl;
});
await pruefe("F2k", "„Anderes Thema …“ (.fm-mehr): Fenster mit allen nicht-grünen Themen; Tipp fügt Thema hinzu (gemerkt)", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const fl = [];
  const k = await klick(page, "#view .fahrmodus .fm-mehr"); if (k) return k;
  const s = await sheetZustand(page);
  if (!s.offen) return "kein Fenster offen";
  const r = await page.evaluate(({ gruen, neu }) => {
    const ids = [...document.querySelectorAll("#sheet [data-item]")].map((b) => b.dataset.item);
    return { n: ids.length, gruen: ids.filter((i) => gruen.includes(i)), neu: ids.includes(neu) };
  }, { gruen: [f(0), f(2), f(4)], neu: f(8) });
  const nichtGruen = await page.evaluate(() => { const s = DB.students.find((x) => x.id === "t1"); let n = 0; stufenFor(s).forEach((st) => st.items.forEach((it) => { if (s.plan.ampeln[it.id] !== "gruen") n++; })); return n; });
  if (!r.n) return "keine #sheet [data-item]-Einträge";
  if (r.gruen.length) fl.push(`grüne Themen im Fenster: ${r.gruen.join(",")}`);
  if (!r.neu) fl.push(`${f(8)} fehlt im Fenster`);
  if (r.n !== nichtGruen && r.n !== nichtGruen - 5) fl.push(`${r.n} Einträge, erwartet ${nichtGruen} (alle nicht-grünen) oder ${nichtGruen - 5} (ohne die gezeigten)`);
  await page.locator(`#sheet [data-item="${f(8)}"]`).first().click(); await warte(page, 300);
  if ((await sheetZustand(page)).offen) fl.push("Fenster bleibt offen");
  if (!(await da(page, `#view .fahrmodus .fm-thema[data-item="${f(8)}"]`))) fl.push(`${f(8)} nicht in der Liste`);
  const t = await tippe(page, f(8)); if (t) fl.push(t); // offen → gelb
  await page.evaluate(() => routeFahrstunde("L1")); await warte(page, 250);
  if (!(await da(page, `#view .fahrmodus .fm-thema[data-item="${f(8)}"]`))) fl.push(`${f(8)} nach Neuzeichnen weg (nicht gemerkt)`);
  else if ((await zustand(page, f(8))) !== "gelb") fl.push(`${f(8)} nach Neuzeichnen „${await zustand(page, f(8))}“ statt gelb`);
  return fl;
});
await pruefe("F2l", "Schnell-Notizen .fm-notiz (4 Chips an/aus) landen im Merker, nicht in l.note", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const fl = [];
  const texte = await page.evaluate(() => [...document.querySelectorAll("#view .fahrmodus .fm-notiz")].map((b) => (b.textContent || "").trim()));
  for (const n of ["Zu schnell", "Blinker vergessen", "Schulterblick vergessen", "Sehr gut gemacht"]) if (!texte.some((t) => t.includes(n))) fl.push(`Chip „${n}“ fehlt`);
  if (fl.length) return fl;
  const chip = (n) => page.locator("#view .fahrmodus .fm-notiz", { hasText: n }).first();
  await chip("Zu schnell").click(); await warte(page, 120);
  await chip("Zu schnell").click(); await warte(page, 120);
  await chip("Blinker vergessen").click(); await warte(page, 120);
  await chip("Sehr gut gemacht").click(); await warte(page, 120);
  const m = await merker(page);
  const nz = (m && m.notizen) || [];
  if (nz.slice().sort().join("|") !== ["Blinker vergessen", "Sehr gut gemacht"].join("|")) fl.push(`Merker notizen ${JSON.stringify(nz)}`);
  const l = await stunde(page);
  if (l.note !== ALT_NOTIZ) fl.push(`l.note schon geändert: „${l.note}“`);
  return fl;
});
await pruefe("F2m", "„Sprechen“: ohne Spracheingabe im Browser ein Hinweis, kein Absturz", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const loc = page.locator("#view .fahrmodus :is(button,[role=button])", { hasText: "Sprechen" });
  if (!(await loc.count())) return "Knopf „Sprechen“ fehlt";
  const vorher = H.jsFehler.length;
  await page.evaluate(() => { try { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; } catch (e) {} document.getElementById("toast")?.classList.remove("show"); });
  await loc.first().click(); await warte(page, 300);
  const r = await page.evaluate(() => ({ toast: document.getElementById("toast")?.classList.contains("show") ? document.getElementById("toast").textContent : "", sheet: document.getElementById("sheet")?.classList.contains("open") }));
  const fl = [];
  if (!r.toast && !r.sheet) fl.push("kein Hinweis (Toast/Fenster)");
  if (H.jsFehler.length > vorher) fl.push(`JS-Fehler: ${H.jsFehler[vorher]}`);
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
  return fl;
});
await pruefe("F2c", "laufende Zeit: Uhr +42 min → .fm-zeit „0:42“ (spätestens nach 30 s)", async () => {
  const e = await brauchtModus(page); if (e) return e;
  if (!(await da(page, "#view .fahrmodus .fm-zeit"))) return ".fm-zeit fehlt";
  await page.clock.setFixedTime(SPAETER);
  let z = "";
  for (let i = 0; i < 31; i++) { z = await text(page, "#view .fahrmodus .fm-zeit"); if (z === "0:42") break; await warte(page, 1000); }
  if (z !== "0:42") return `.fm-zeit „${z}“ nach 30 s`;
});
await page.clock.setFixedTime(SPAETER);

await pruefe("F1g", "Neuladen mitten im Modus: Merker bleibt, Heute „Fahrstunde fortsetzen“, Bewertungen/Notizen/Zeit wieder da", async () => {
  const e = await brauchtModus(page); if (e) return e;
  const m0 = await merker(page);
  if (!m0) return "kein Merker vor dem Neuladen";
  await page.reload({ waitUntil: "load" }); await warte(page, 700);
  await bereite(page);
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} routeDashboard(); }); await warte(page, 300);
  const fl = [];
  const m1 = await merker(page);
  if (JSON.stringify(m1) !== JSON.stringify(m0)) fl.push("Merker nach Neuladen anders");
  const k = await kartenKnopf(page);
  if (!k || !/Fahrstunde fortsetzen/.test(k.text)) { fl.push(`Heute-Knopf „${k ? k.text : "fehlt"}“`); await page.evaluate(() => { try { routeFahrstunde("L1"); } catch (e) {} }); }
  else await page.locator("#view .heute2 .h2-jetzt .h2-akte").first().click();
  await warte(page, 300);
  if (!(await da(page, "#view .fahrmodus"))) return fl.concat(KEIN_MODUS + " nach Neuladen");
  for (const [n, soll] of [[1, "grün"], [3, "offen"], [5, "rot"], [6, "grün"], [7, "gelb"], [8, "gelb"]]) { const ist = await zustand(page, f(n)); if (ist !== soll) fl.push(`${f(n)} „${ist}“ statt „${soll}“`); }
  const an = await page.evaluate(() => [...document.querySelectorAll("#view .fahrmodus .fm-notiz")].filter((b) => b.classList.contains("on") || b.getAttribute("aria-pressed") === "true").map((b) => b.textContent.trim()));
  if (!an.some((t) => t.includes("Blinker")) || !an.some((t) => t.includes("Sehr gut")) || an.some((t) => t.includes("Zu schnell"))) fl.push(`Notiz-Chips an (Klasse .on/aria-pressed): ${JSON.stringify(an)}`);
  const z = await text(page, "#view .fahrmodus .fm-zeit");
  if (z !== "0:42") fl.push(`.fm-zeit „${z}“ statt „0:42“`);
  return fl;
});
await pruefe("F2n", "Android-Zurück im Modus → Heute, Merker bleibt, „Fahrstunde fortsetzen“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  await page.evaluate(() => history.back()); await warte(page, 600);
  const fl = [];
  const t = await titel(page);
  if (t !== "Heute") fl.push(`Titel „${t}“`);
  if (!(await merker(page))) fl.push("Merker gelöscht");
  const k = await kartenKnopf(page);
  if (!k || !/Fahrstunde fortsetzen/.test(k.text)) fl.push(`Knopf „${k ? k.text : "fehlt"}“`);
  const tab = await page.evaluate(() => { const x = document.getElementById("tabbar"); return x && getComputedStyle(x).display !== "none" && x.getBoundingClientRect().height > 0; });
  if (!tab) fl.push("Reiterleiste auf Heute weiter unsichtbar");
  // zurück in den Modus für „Fertig“
  if (k) await page.locator("#view .heute2 .h2-jetzt .h2-akte").first().click(); else await page.evaluate(() => { try { routeFahrstunde("L1"); } catch (e) {} });
  await warte(page, 300);
  return fl;
});

// Fertig
const nachFertig = { ok: false };
await pruefe("F2o", "„Fertig“ (.fm-fertig): save() aufgerufen, Merker gelöscht, öffnet „Nach der Stunde“", async () => {
  const e = await brauchtModus(page); if (e) return e;
  await page.evaluate(() => { window._saveZahl = 0; const alt = window.save; window.save = function () { window._saveZahl++; return alt.apply(this, arguments); }; });
  const k = await klick(page, "#view .fahrmodus .fm-fertig"); if (k) return k;
  await warte(page, 200);
  nachFertig.ok = true;
  const fl = [];
  const n = await page.evaluate(() => window._saveZahl);
  if (!n) fl.push("save() nicht aufgerufen");
  if (await merker(page)) fl.push("Merker noch da");
  const t = await titel(page);
  if (t !== "Nach der Stunde") fl.push(`Titel „${t}“`);
  return fl;
});
await pruefe("F2p", "nach „Fertig“: ampeln genau für geänderte Themen, ampelnZeit = heute; offen löscht; Unverändertes behält alte Zeit", async () => {
  if (!nachFertig.ok) return "„Fertig“ nicht erreichbar";
  const p = await plan(page);
  const fl = [];
  const soll = { [f(0)]: "gruen", [f(1)]: "gruen", [f(2)]: "gruen", [f(4)]: "gruen", [f(5)]: "rot", [f(6)]: "gruen", [f(7)]: "gelb", [f(8)]: "gelb" };
  for (const [id, v] of Object.entries(soll)) if (p.ampeln[id] !== v) fl.push(`ampeln[${id}]=${p.ampeln[id]} statt ${v}`);
  for (const n of [3]) if (f(n) in p.ampeln) fl.push(`ampeln[${f(n)}] sollte fehlen, ist ${p.ampeln[f(n)]}`);
  const andere = Object.keys(p.ampeln).filter((id) => !(id in soll));
  if (andere.length) fl.push(`zusätzliche Einträge: ${andere.join(",")}`);
  for (const n of [1, 5, 6, 8]) {
    const z = p.zeit[f(n)];
    if (!z) { fl.push(`ampelnZeit[${f(n)}] fehlt`); continue; }
    const tg = await tagVon(page, z);
    if (tg !== TAG) fl.push(`ampelnZeit[${f(n)}]=${z} (Tag ${tg})`);
    else if (Math.abs(new Date(z).getTime() - SPAETER.getTime()) > 5 * 60000) fl.push(`ampelnZeit[${f(n)}]=${z} nicht „jetzt“`);
  }
  for (const n of [0, 2, 4, 7]) if (p.zeit[f(n)] !== ALT_ZEIT) fl.push(`ampelnZeit[${f(n)}] überschrieben: ${p.zeit[f(n)]}`);
  for (const n of [3]) if (p.zeit[f(n)]) fl.push(`ampelnZeit[${f(n)}] sollte fehlen: ${p.zeit[f(n)]}`);
  return fl;
});
await pruefe("F2q", "nach „Fertig“: l.note = alter Text + „ · Blinker vergessen · Sehr gut gemacht“; l.status unverändert", async () => {
  if (!nachFertig.ok) return "„Fertig“ nicht erreichbar";
  const l = await stunde(page);
  const fl = [];
  if (!l.note.startsWith(ALT_NOTIZ)) fl.push(`alter Text weg: „${l.note}“`);
  if (!l.note.includes(" · Blinker vergessen")) fl.push(`„ · Blinker vergessen“ fehlt: „${l.note}“`);
  if (!l.note.includes(" · Sehr gut gemacht")) fl.push(`„ · Sehr gut gemacht“ fehlt: „${l.note}“`);
  if (/Zu schnell/.test(l.note)) fl.push("abgewählte Notiz „Zu schnell“ drin");
  if (l.status !== stunde1Vorher.status) fl.push(`Status „${stunde1Vorher.status}“ → „${l.status}“`);
  const andere = Object.keys(l).filter((k) => !["note", "signed", "signedAt", "signatureSnap"].includes(k) && JSON.stringify(l[k]) !== JSON.stringify(stunde1Vorher[k]));
  if (andere.length) fl.push(`weitere Felder geändert: ${andere.join(",")}`);
  return fl;
});
await pruefe("F2r", "nach „Fertig“: gespeicherter Stand (localStorage) enthält die neuen Ampeln und die Notiz", async () => {
  if (!nachFertig.ok) return "„Fertig“ nicht erreichbar";
  const r = await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem(STORE_KEY)); return { a: d.students.find((x) => x.id === "t1").plan.ampeln, n: d.lessons.find((x) => x.id === "L1").note }; } catch (e) { return null; } });
  const p = await plan(page), l = await stunde(page);
  if (!r) return "kein gespeicherter Stand";
  const fl = [];
  if (JSON.stringify(r.a) !== JSON.stringify(p.ampeln)) fl.push("Ampeln nicht gespeichert");
  if (r.n !== l.note) fl.push("Notiz nicht gespeichert");
  return fl;
});

// ---------- F3 Nach der Stunde ----------
await pruefe("F3a", "routeStundeFertig: Titel „Nach der Stunde“, #view .fertig2 hell, Reiter „Heute“ markiert", async () => {
  const fl = [];
  if (!FERTIG_DA) fl.push("Funktion routeStundeFertig fehlt");
  const e = await brauchtFertig(page); if (e) return fl.concat(e);
  const r = await page.evaluate(() => {
    const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    let el = document.querySelector("#view .fertig2"), c = null;
    while (el) { const x = rgb(getComputedStyle(el).backgroundColor); if (x && x.a > 0.5) { c = x; break; } el = el.parentElement; }
    if (!c) c = rgb(getComputedStyle(document.body).backgroundColor);
    const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return { lum: c ? 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b) : 0, tab: document.querySelector(".tab-i.on")?.dataset.tab || "keiner" };
  });
  if (r.lum < 0.8) fl.push(`Hintergrund nicht hell (Helligkeit ${r.lum.toFixed(2)})`);
  if (r.tab !== "heute") fl.push(`markierter Reiter „${r.tab}“`);
  return fl;
});
await pruefe("F3b", "Kopf „Stunde mit Erfundene fertig“; .sf-info „10:00–11:30 · 2 UE · Stand jetzt N %“ und „(+d)“", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  const fl = [];
  const ganz = await text(page, "#view .fertig2");
  if (!/Stunde mit Erfundene fertig/.test(ganz)) fl.push("„Stunde mit Erfundene fertig“ fehlt");
  const info = await text(page, "#view .fertig2 .sf-info");
  if (info === null) return fl.concat(".sf-info fehlt");
  const n = await page.evaluate(() => stand(DB.students.find((x) => x.id === "t1")));
  const i = ohneLeer(norm(info));
  if (!i.includes("10:00–11:30")) fl.push(`Zeit fehlt: „${info}“`);
  if (!/(^|\D)2UE/.test(i)) fl.push(`„2 UE“ fehlt: „${info}“`);
  if (!i.includes(`Standjetzt${n}%`)) fl.push(`„Stand jetzt ${n} %“ fehlt: „${info}“`);
  const d = n - standVorher;
  if (d > 0 && !i.includes(`(+${d}`)) fl.push(`„(+${d})“ fehlt: „${info}“`);
  if (d <= 0) fl.push(`Testaufbau: Stand nicht gestiegen (${standVorher} → ${n})`);
  return fl;
});
await pruefe("F3c", "„Heute bewertet“: .sf-chip je Thema von themenDesTages, Klasse gruen/gelb/rot", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  const r = await page.evaluate(() => {
    const s = DB.students.find((x) => x.id === "t1"), th = themenDesTages(s, todayISO());
    const soll = th.gut.map((it) => ({ t: it.t, k: "gruen" })).concat(th.ueben.map((it) => ({ t: it.t, k: s.plan.ampeln[it.id] })));
    const ist = [...document.querySelectorAll("#view .fertig2 .sf-chip")].map((c) => ({ t: (c.textContent || "").replace(/\s+/g, " ").trim(), cls: [...c.classList] }));
    return { soll, ist, txt: (document.querySelector("#view .fertig2")?.textContent || "") };
  });
  const fl = [];
  if (!/Heute bewertet/i.test(r.txt)) fl.push("Überschrift „Heute bewertet“ fehlt");
  if (r.soll.length !== 4) fl.push(`Testaufbau: themenDesTages liefert ${r.soll.length} statt 4`);
  if (r.ist.length !== r.soll.length) fl.push(`${r.ist.length} Chips statt ${r.soll.length}`);
  for (const s of r.soll) {
    const c = r.ist.find((x) => x.t.includes(s.t));
    if (!c) { fl.push(`Chip „${s.t}“ fehlt`); continue; }
    if (!c.cls.includes(s.k)) fl.push(`Chip „${s.t.slice(0, 20)}“ ohne Klasse ${s.k} (${c.cls.join(" ")})`);
    for (const k of ["gruen", "gelb", "rot"]) if (k !== s.k && c.cls.includes(k)) fl.push(`Chip „${s.t.slice(0, 20)}“ hat zusätzlich ${k}`);
  }
  return fl;
});
await pruefe("F3d", "Unterschrift .sf-unterschrift: Status „noch offen“ → Fenster → bestätigen → „✓ vorhanden“, l.signed", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  const status = () => page.evaluate(() => { const b = document.querySelector("#view .fertig2 .sf-unterschrift"); if (!b) return null; return ((b.parentElement || b).textContent || "").replace(/\s+/g, " "); });
  const s0 = await status();
  if (s0 === null) return ".sf-unterschrift fehlt";
  const fl = [];
  if (!/noch offen/.test(s0)) fl.push(`vorher „noch offen“ fehlt: „${s0.slice(0, 60)}“`);
  const k = await klick(page, "#view .fertig2 .sf-unterschrift"); if (k) return fl.concat(k);
  const sh = await sheetZustand(page);
  if (!sh.offen || !/Unterschrift/.test(sh.kopf)) return fl.concat(`öffnet „${sh.offen ? sh.kopf : "nichts"}“ statt Unterschrift-Fenster`);
  const k2 = await klick(page, "#sigUse"); if (k2) return fl.concat(k2 + " (erwartet: Fenster „Mit dieser Unterschrift bestätigen“)");
  await warte(page, 300);
  const l = await stunde(page);
  if (!l.signed) fl.push("l.signed nicht gesetzt");
  if ((await titel(page)) !== "Nach der Stunde") fl.push(`danach Titel „${await titel(page)}“`);
  const s1 = await status();
  if (s1 === null || !/✓\s*vorhanden/.test(s1)) fl.push(`Status danach „${(s1 || "").slice(0, 60)}“ statt „✓ vorhanden“`);
  return fl;
});
await pruefe("F3e", "Protokoll .sf-protokoll „Protokoll per WhatsApp an Erfundene“ → wa.me mit Tagesprotokoll; danach „Protokoll gesendet ✓“", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  const t = await text(page, "#view .fertig2 .sf-protokoll");
  if (t === null) return ".sf-protokoll fehlt";
  const fl = [];
  if (!/Protokoll per WhatsApp an Erfundene/.test(t)) fl.push(`Beschriftung „${t}“`);
  await page.evaluate(() => { window._geoeffnet = []; });
  H.dialoge.length = 0;
  const k = await klick(page, "#view .fertig2 .sf-protokoll"); if (k) return fl.concat(k);
  const r = await page.evaluate(() => ({ urls: window._geoeffnet.slice(), soll: stundenProtokollText(DB.students.find((x) => x.id === "t1"), todayISO()) }));
  if (H.dialoge.length) fl.push(`Rückfrage statt Protokoll: „${H.dialoge[0].slice(0, 50)}“`);
  const u = r.urls.find((x) => x.startsWith("https://wa.me/"));
  if (!u) fl.push(`kein wa.me-Link geöffnet (${r.urls.length} window.open)`);
  else {
    if (!u.split("?")[0].replace(/\D/g, "").endsWith("1701234567")) fl.push(`Nummer in „${u.split("?")[0]}“`);
    let txt = ""; try { txt = new URL(u).searchParams.get("text") || ""; } catch (e) {}
    if (!r.soll) fl.push("Testaufbau: stundenProtokollText leer");
    else if (txt !== r.soll) fl.push(`Text ≠ stundenProtokollText(s, heute): „${txt.slice(0, 50)}…“`);
  }
  if (!/Protokoll gesendet\s*✓/.test(await text(page, "#view .fertig2"))) fl.push("„Protokoll gesendet ✓“ fehlt");
  return fl;
});
// Freie Lücken ab morgen (Erwartung)
const sollSlots = await page.evaluate(() => { const out = []; let d = addDays(todayISO(), 1); for (let i = 0; i < 60 && out.length < 3; i++) { dayFreeSlots(d).forEach((s) => { if (out.length < 3) out.push({ date: d, von: s.von, bis: s.bis }); }); d = addDays(d, 1); } return out; });
await pruefe("F3f", "„Nächster Termin für Erfundene“: bis zu 3 .sf-slot ab morgen (Tag + Uhrzeit) = erste freie Lücken", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  const fl = [];
  if (!/Nächster Termin für Erfundene/.test(await text(page, "#view .fertig2"))) fl.push("Überschrift „Nächster Termin für Erfundene“ fehlt");
  const ist = await page.evaluate(() => [...document.querySelectorAll("#view .fertig2 .sf-slot")].map((b) => (b.textContent || "").replace(/\s+/g, " ").trim()));
  if (ist.length !== sollSlots.length) fl.push(`${ist.length} .sf-slot statt ${sollSlots.length}`);
  sollSlots.forEach((s, i) => {
    if (!ist[i]) return;
    if (!ist[i].includes(s.von)) fl.push(`Lücke ${i + 1}: „${ist[i]}“ ohne ${s.von}`);
    const tag = s.date.slice(8, 10).replace(/^0/, "");
    const wt = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(s.date + "T12:00:00").getDay()];
    if (!(ist[i].includes(wt) || new RegExp(`(^|\\D)0?${tag}\\.`).test(ist[i]) || (s.date === MORGEN && /Morgen/i.test(ist[i])))) fl.push(`Lücke ${i + 1}: „${ist[i]}“ ohne Tag (${wt} ${tag}.)`);
  });
  return fl;
});
await pruefe("F3g", "Tipp auf .sf-slot → „Termin vergeben“, erster Listeneintrag ist Erfundene Testperson", async () => {
  const e = await brauchtFertig(page); if (e) return e;
  await page.evaluate(() => { DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }]; });
  const k = await klick(page, "#view .fertig2 .sf-slot"); if (k) return k;
  const s = await sheetZustand(page);
  if (!s.offen || s.kopf !== "Termin vergeben") return `öffnet „${s.offen ? s.kopf : "nichts"}“`;
  const erst = await page.evaluate(() => document.querySelector("#sheet .as-list .as-item")?.dataset.sid || null);
  if (erst !== "t1") return `erster Eintrag ${erst} statt t1`;
});
await pruefe("F3h", "Buchen (Fahrzeug wählen) → zurück auf „Nach der Stunde“ mit „Nächster Termin: TT.MM. HH:MM“", async () => {
  const s = await sheetZustand(page);
  if (!s.offen || s.kopf !== "Termin vergeben") return "Fenster „Termin vergeben“ nicht offen (siehe F3g)";
  const zahl = (await page.evaluate(() => DB.lessons.length));
  await page.locator('#sheet .as-item[data-sid="t1"]').first().click(); await warte(page, 300);
  const fz = page.locator("#sheet .fz-opt");
  if (await fz.count()) { await fz.first().click(); await warte(page, 300); }
  else if (await page.locator("#fzSkip").count()) { await page.locator("#fzSkip").click(); await warte(page, 300); }
  const fl = [];
  const neu = await page.evaluate((n) => DB.lessons.slice(n), zahl);
  const z = sollSlots[0];
  const l = neu.find((x) => x.sid === "t1");
  if (!l) fl.push("kein neuer Termin für t1 angelegt");
  else {
    if (z && (l.date !== z.date || l.von !== z.von)) fl.push(`Termin ${l.date} ${l.von} statt ${z.date} ${z.von}`);
    if (l.fahrzeug !== "Erfundenes Testauto") fl.push(`Fahrzeug „${l.fahrzeug}“`);
  }
  const t = await titel(page);
  if (t !== "Nach der Stunde") fl.push(`danach Titel „${t}“ (statt zurück auf „Nach der Stunde“)`);
  else if (z) {
    const soll = `Nächster Termin: ${z.date.slice(8, 10)}.${z.date.slice(5, 7)}. ${z.von}`;
    if (!norm(await text(page, "#view .fertig2")).includes(soll)) fl.push(`„${soll}“ fehlt`);
  }
  return fl;
});
await pruefe("F3i", "unten .sf-heute „Zurück zu Heute · nächster: … 13:30“; Tipp → Heute", async () => {
  if (FERTIG_DA && !(await da(page, "#view .fertig2"))) { await page.evaluate(() => { try { routeStundeFertig("L1"); } catch (e) {} }); await warte(page, 250); }
  const e = await brauchtFertig(page); if (e) return e;
  const t = await text(page, "#view .fertig2 .sf-heute");
  if (t === null) return ".sf-heute fehlt";
  const fl = [];
  if (!/Zurück zu Heute/.test(t)) fl.push(`„Zurück zu Heute“ fehlt: „${t}“`);
  if (!/nächster:?\s*.*Zweitperson.*13:30|nächster:?\s*.*13:30/.test(t)) fl.push(`„· nächster: Erfundene Zweitperson 13:30“ fehlt: „${t}“`);
  const k = await klick(page, "#view .fertig2 .sf-heute"); if (k) fl.push(k);
  if ((await titel(page)) !== "Heute") fl.push(`Tipp → Titel „${await titel(page)}“`);
  return fl;
});
await pruefe("F3j", "ohne weitere Stunde heute: .sf-heute ohne „nächster“", async () => {
  if (!FERTIG_DA) return "Funktion routeStundeFertig fehlt";
  const sz = basisSzenario(); sz.lessons = sz.lessons.filter((l) => l.id !== "L2");
  await setze(page, sz);
  await page.evaluate(() => routeStundeFertig("L1")); await warte(page, 250);
  const e = await brauchtFertig(page); if (e) return e;
  const t = await text(page, "#view .fertig2 .sf-heute");
  if (t === null) return ".sf-heute fehlt";
  if (/nächster/i.test(t)) return `„${t}“`;
});

// Abbrechen
await pruefe("F2s", "„Abbrechen“ nach Bewertung: Rückfrage; Nein → bleibt im Modus; Ja → nichts gespeichert, Merker weg, Heute", async () => {
  await page.clock.setFixedTime(JETZT);
  await setze(page, basisSzenario());
  if (!FMODUS_DA) return "Funktion routeFahrstunde fehlt";
  await page.evaluate(() => routeFahrstunde("L1")); await warte(page, 250);
  const e = await brauchtModus(page); if (e) return e;
  const p0 = await plan(page), l0 = await stunde(page);
  const fl = [];
  const t = await tippe(page, f(1)); if (t) return t;
  const c = page.locator("#view .fahrmodus .fm-notiz", { hasText: "Zu schnell" }); if (await c.count()) { await c.first().click(); await warte(page, 120); }
  if (!(await da(page, "#view .fahrmodus .fm-abbrechen"))) return ".fm-abbrechen fehlt";
  H.dialoge.length = 0; H.antwort = "dismiss";
  await page.locator("#view .fahrmodus .fm-abbrechen").first().click(); await warte(page, 300);
  if (!H.dialoge.length) fl.push("keine Rückfrage");
  else if ((await titel(page)) !== "Fahrstunde") fl.push(`nach „Nein“ Titel „${await titel(page)}“`);
  if (!(await merker(page))) fl.push("nach „Nein“ Merker weg");
  H.antwort = "accept"; H.dialoge.length = 0;
  if (await da(page, "#view .fahrmodus .fm-abbrechen")) { await page.locator("#view .fahrmodus .fm-abbrechen").first().click(); await warte(page, 300); }
  if ((await titel(page)) !== "Heute") fl.push(`nach „Ja“ Titel „${await titel(page)}“`);
  if (await merker(page)) fl.push("Merker nicht gelöscht");
  if (JSON.stringify(await plan(page)) !== JSON.stringify(p0)) fl.push("Plan geändert");
  const l = await stunde(page);
  if (JSON.stringify(l) !== JSON.stringify(l0)) fl.push(`Stunde geändert (Status „${l.status}“, Notiz „${l.note}“)`);
  const k = await kartenKnopf(page);
  if (!k || !/Fahrstunde starten/.test(k.text)) fl.push(`Heute-Knopf „${k ? k.text : "fehlt"}“`);
  return fl;
});
await pruefe("F2t", "„Abbrechen“ ohne Bewertung/Notiz: ohne Rückfrage zurück zu Heute, Merker weg", async () => {
  await setze(page, basisSzenario());
  if (!FMODUS_DA) return "Funktion routeFahrstunde fehlt";
  await page.evaluate(() => routeFahrstunde("L1")); await warte(page, 250);
  const e = await brauchtModus(page); if (e) return e;
  H.dialoge.length = 0;
  const k = await klick(page, "#view .fahrmodus .fm-abbrechen"); if (k) return k;
  const fl = [];
  if (H.dialoge.length) fl.push(`unnötige Rückfrage „${H.dialoge[0].slice(0, 40)}“`);
  if ((await titel(page)) !== "Heute") fl.push(`Titel „${await titel(page)}“`);
  if (await merker(page)) fl.push("Merker noch da");
  return fl;
});

// ---------- F4 Nichts kaputt (Teil im Hauptlauf) ----------
// F5: Funde des Prüf-Teams (Schritt 3)
await pruefe("F5a", "Tipp auf ein Thema springt nicht nach oben (Scrollstand bleibt)", async () => {
  await setze(page, basisSzenario());
  await page.evaluate(() => { try { localStorage.removeItem("kompass-fahrstunde"); } catch (e) {} routeFahrstunde("L1"); });
  await warte(page, 250);
  const r = await page.evaluate(async () => { view.scrollTop = 200; const vor = view.scrollTop; document.querySelectorAll("#view .fm-thema")[2].click(); await new Promise((k) => setTimeout(k, 150)); return { vor, nach: view.scrollTop }; });
  await page.evaluate(() => { try { localStorage.removeItem("kompass-fahrstunde"); } catch (e) {} });
  if (r.vor > 0 && r.nach === 0) return `Scrollstand ${r.vor} → 0`;
});
await pruefe("F5b", "Fertig zweimal mit gleicher Notiz: Notiz steht nur einmal in l.note", async () => {
  await setze(page, basisSzenario());
  const n = await page.evaluate(async () => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    for (let i = 0; i < 2; i++) { localStorage.removeItem("kompass-fahrstunde"); routeFahrstunde("L1"); await w(100);
      document.querySelector('#view .fm-notiz[data-notiz="Zu schnell"]').click(); await w(100); document.getElementById("fmFertig").click(); await w(150); }
    return (DB.lessons.find((l) => l.id === "L1").note || "").split("Zu schnell").length - 1;
  });
  if (n !== 1) return `„Zu schnell“ steht ${n}× in der Notiz`;
});
await pruefe("F5c", "Stunde während des Modus gelöscht: Fertig speichert die Bewertungen trotzdem im Plan", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(async () => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    localStorage.removeItem("kompass-fahrstunde"); routeFahrstunde("L1"); await w(100);
    const b = [...document.querySelectorAll("#view .fm-thema")].find((x) => x.dataset.wert === "offen"); const id = b.dataset.item; b.click(); await w(100);
    DB.lessons = DB.lessons.filter((l) => l.id !== "L1");
    fahrstundeAbschliessen("L1"); await w(100);
    return DB.students.find((x) => x.id === "t1").plan.ampeln[id];
  });
  if (r !== "gelb") return `Bewertung verloren (${r})`;
});
await pruefe("F5d", "Abmelden löscht den Merker „kompass-fahrstunde“; Sonderfahrt-Verschieben behält angehängte Notizen", async () => {
  const r = await page.evaluate(() => { localStorage.setItem("kompass-fahrstunde", JSON.stringify({ lid: "x" })); _lokaleNutzerdatenLoeschen(); return { weg: localStorage.getItem("kompass-fahrstunde") === null, sn: _sonderNotiz("Autobahnfahrt · Zu schnell", "Überlandfahrt"), leer: _sonderNotiz("", "Nachtfahrt") }; });
  const f = [];
  if (!r.weg) f.push("Merker bleibt nach dem Abmelden");
  if (r.sn !== "Überlandfahrt · Zu schnell") f.push("Sonderfahrt-Notiz: " + r.sn);
  if (r.leer !== "Nachtfahrt") f.push("leere Notiz: " + r.leer);
  await setze(page, basisSzenario());
  return f;
});

await pruefe("F5e", "Stunde vorbei, Modus verlassen: Heute zeigt „Fahrstunde mit … fortsetzen“, Bewertungen sind wieder da (Richter-Fund)", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(async () => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    localStorage.removeItem("kompass-fahrstunde"); routeFahrstunde("L1"); await w(100);
    const b = [...document.querySelectorAll("#view .fm-thema")].find((x) => x.dataset.wert === "offen"); const id = b.dataset.item; b.click(); await w(100);
    return id;
  });
  await page.clock.setFixedTime(new Date("2026-10-14T16:00:00+02:00"));
  const z = await page.evaluate(async (id) => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    routeDashboard(); await w(100);
    const k = document.querySelector("#view .h2-fortsetzen"); if (!k) return { knopf: false };
    const text = k.textContent; k.click(); await w(150);
    const t = document.querySelector(`#view .fm-thema[data-item="${id}"]`);
    return { knopf: true, text, titel: $("#tbTitle").textContent, wert: t ? t.dataset.wert : null };
  }, r);
  await page.clock.setFixedTime(JETZT);
  await page.evaluate(() => localStorage.removeItem("kompass-fahrstunde"));
  await setze(page, basisSzenario());
  if (!z.knopf) return "kein „fortsetzen“ auf Heute nach dem Ende der Stunde";
  const f = [];
  if (!/fortsetzen/.test(z.text)) f.push("Text: " + z.text);
  if (z.titel !== "Fahrstunde") f.push("Tipp öffnet „" + z.titel + "“");
  if (z.wert !== "gelb") f.push("Bewertung nicht mehr da: " + z.wert);
  return f;
});

await pruefe("F4a", "openAssignSlotSheet ohne neue Angaben: alphabetische Liste, nach dem Buchen in den Kalender", async () => {
  await setze(page, basisSzenario());
  await page.evaluate((d) => openAssignSlotSheet(d, "09:30", "11:00"), MORGEN); await warte(page, 300);
  const s = await sheetZustand(page);
  if (!s.offen || s.kopf !== "Termin vergeben") return `öffnet „${s.offen ? s.kopf : "nichts"}“`;
  const fl = [];
  const erst = await page.evaluate(() => document.querySelector("#sheet .as-list .as-item")?.dataset.sid || null);
  if (erst !== "t8") fl.push(`erster Eintrag ${erst} statt t8 (alphabetisch)`);
  await page.locator('#sheet .as-item[data-sid="t8"]').first().click(); await warte(page, 400);
  if (await page.locator("#sheet .fz-opt, #fzSkip").count()) { await page.locator("#fzSkip").click(); await warte(page, 300); }
  const t = await titel(page);
  if (t !== "Kalender") fl.push(`danach Titel „${t}“ statt „Kalender“`);
  if (!(await page.evaluate((d) => DB.lessons.some((l) => l.sid === "t8" && l.date === d && l.von === "09:30"), MORGEN))) fl.push("Termin nicht angelegt");
  await setze(page, basisSzenario());
  return fl;
});
await pruefe("F4d", "keine JS-Fehler im Hauptlauf", async () => { if (H.jsFehler.length) return `${H.jsFehler.length} JS-Fehler, z. B. ${H.jsFehler[0]}`; });
await H.ctx.close();

// ---------- Handy: 360×740 und 915×412 ----------
const GROESSEN = [{ n: "360 hoch", w: 360, h: 740 }, { n: "915 quer", w: 915, h: 412 }, { n: "412 hoch", w: 412, h: 915 }];
const hm = { modus: [], fertig: [], fehler: [], ohneModus: false, ohneFertig: false };
const messe = (page, sel, tippSel) => page.evaluate(({ sel, tippSel }) => {
  const W = document.documentElement.clientWidth, root = document.querySelector(sel);
  if (!root) return null;
  const out = { wisch: document.documentElement.scrollWidth > W + 1 || document.getElementById("view").scrollWidth > document.getElementById("view").clientWidth + 1, rand: [], klein: [], leiste: [] };
  for (const el of root.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (r.right > W + 1 || r.left < -1) out.rand.push((typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + " " + Math.round(r.left) + "–" + Math.round(r.right));
  }
  for (const b of root.querySelectorAll(tippSel)) {
    const r = b.getBoundingClientRect(); if (!r.width || getComputedStyle(b).visibility === "hidden") continue;
    if (r.height < 44) out.klein.push(`„${(b.textContent || "").trim().slice(0, 18)}“ ${Math.round(r.height)}px`);
  }
  for (const id of ["tabbar", "fab"]) { const x = document.getElementById(id); if (!x) continue; const cs = getComputedStyle(x), b = x.getBoundingClientRect(); if (cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0 && b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0) out.leiste.push(id); }
  return out;
}, { sel, tippSel });
for (const g of GROESSEN) {
  const s = await neueSeite(g.w, g.h);
  await setze(s.page, basisSzenario());
  if (await gibtFunktion(s.page, "routeFahrstunde")) {
    await s.page.evaluate(() => routeFahrstunde("L1")); await warte(s.page, 300);
    // eine Bewertung + Notiz, damit alle Zustände sichtbar sind
    const b = s.page.locator("#view .fahrmodus .fm-thema"); if (await b.count()) { await b.first().click(); await warte(s.page, 100); }
    const m = await messe(s.page, "#view .fahrmodus", "button, a, [role=button], .fm-thema, .fm-notiz");
    if (!m) hm.ohneModus = true;
    else {
      if (m.wisch) hm.modus.push(`${g.n}: seitlich wischbar`);
      if (m.rand.length) hm.modus.push(`${g.n}: über den Rand ${m.rand.slice(0, 3).join(", ")}`);
      if (m.klein.length) hm.modus.push(`${g.n}: ${m.klein.slice(0, 3).join(", ")}${m.klein.length > 3 ? ` (+${m.klein.length - 3})` : ""}`);
      if (m.leiste.length) hm.modus.push(`${g.n}: sichtbar ${m.leiste.map((x) => "#" + x).join(", ")}`);
    }
    if (await s.page.locator("#view .fahrmodus .fm-fertig").count()) { await s.page.locator("#view .fahrmodus .fm-fertig").first().click(); await warte(s.page, 300); }
  } else hm.ohneModus = true;
  if (!(await da(s.page, "#view .fertig2")) && (await gibtFunktion(s.page, "routeStundeFertig"))) { await s.page.evaluate(() => routeStundeFertig("L1")); await warte(s.page, 300); }
  const m2 = await messe(s.page, "#view .fertig2", "button, a, [role=button], .sf-slot");
  if (!m2) hm.ohneFertig = true;
  else {
    if (m2.wisch) hm.fertig.push(`${g.n}: seitlich wischbar`);
    if (m2.rand.length) hm.fertig.push(`${g.n}: über den Rand ${m2.rand.slice(0, 3).join(", ")}`);
    if (m2.klein.length) hm.fertig.push(`${g.n}: ${m2.klein.slice(0, 3).join(", ")}${m2.klein.length > 3 ? ` (+${m2.klein.length - 3})` : ""}`);
  }
  if (s.jsFehler.length) hm.fehler.push(`${g.n}: ${s.jsFehler[0]}`);
  await s.ctx.close();
}
await pruefe("F2u", "Handy 360×740 / 915×412 / 412×915: Modus nicht wischbar, nichts über den Rand, Knöpfe ≥ 44 px, Reiterleiste/#fab unsichtbar", () => (hm.ohneModus ? KEIN_MODUS : hm.modus));
await pruefe("F3k", "Handy 360×740 / 915×412 / 412×915: „Nach der Stunde“ nicht wischbar, nichts über den Rand, Knöpfe ≥ 44 px", () => (hm.ohneFertig ? KEIN_FERTIG : hm.fertig));
await pruefe("F4e", "keine JS-Fehler in den Handy-Größen", () => hm.fehler);

await browser.close();
server.close();

// ---------- F4 Nichts kaputt: Rechnen/Abgleich unverändert, heute-test ----------
// Funktion als Quelltext aus einer HTML-Datei schneiden (Klammern zählen; für beide Stände gleich, also vergleichbar).
function schneide(html, name) {
  const i = html.indexOf(`function ${name}(`);
  if (i < 0) return null;
  let j = html.indexOf("{", i), tiefe = 0;
  for (; j < html.length; j++) { const c = html[j]; if (c === "{") tiefe++; else if (c === "}") { tiefe--; if (!tiefe) break; } }
  return html.slice(i, j + 1);
}
// Vergleichsstand: FAHR_BASIS, sonst Abzweigpunkt dieses Zweigs von origin/main (Stand vor dem Bau).
const BASIS = process.env.FAHR_BASIS || (() => { const m = spawnSync("git", ["-C", REPO, "merge-base", "HEAD", "origin/main"], { encoding: "utf8" }); return m.status === 0 ? m.stdout.trim() : "main"; })();
await pruefe("F4c", "Rechnen/Abgleich unverändert gegenüber " + BASIS.slice(0, 10) + " (ueRange, dayEvents, dayFreeSlots, nextLessonEvents, themenDesTages, stundenProtokollText, save, pushToCloud, _fsSyncAggChanges)", async () => {
  const ref = BASIS;
  const r = spawnSync("git", ["-C", REPO, "show", `${ref}:index.html`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return { skip: `git show ${ref}:index.html geht nicht` };
  const alt = r.stdout, neu = await readFile(join(ROOT, "index.html"), "utf8");
  const fl = [];
  for (const n of ["ueRange", "dayEvents", "dayFreeSlots", "nextLessonEvents", "themenDesTages", "stundenProtokollText", "save", "pushToCloud", "_fsSyncAggChanges"]) {
    const a = schneide(alt, n), b = schneide(neu, n);
    if (a === null) continue;
    if (b === null) fl.push(`${n} fehlt`); else if (a !== b) fl.push(`${n} geändert`);
  }
  return fl;
});
if (process.env.FAHR_SCHNELL) {
  await pruefe("F4b", "heute-test grün (nur der Knopftext der Karte darf sich ändern)", () => ({ skip: "FAHR_SCHNELL gesetzt" }));
} else {
  await pruefe("F4b", "heute-test grün (nur der Knopftext der Karte darf sich ändern)", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "scripts", "heute-test.mjs")], { cwd: ROOT, env: { ...process.env, HEUTE_SCHNELL: "1", KOMPASS_ROOT: ROOT }, encoding: "utf8", timeout: 600000 });
    const zeilen = (r.stdout || "").split("\n").filter((z) => /^FEHLER/.test(z));
    // H2i prüft den alten Knopftext „Schülerakte öffnen“ für die heutige Stunde: mit Schritt 3 ist „Fahrstunde starten“ richtig.
    const echt = zeilen.filter((z) => !(/^FEHLER\s+H2i\b/.test(z) && /Fahrstunde starten/.test(z)));
    if (r.status !== 0 && !zeilen.length) return `heute-test Exit ${r.status}: ${((r.stderr || "") + (r.stdout || "")).split("\n").slice(-3).join(" / ")}`;
    return echt.slice(0, 4);
  });
}

console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
