// Akte-Test (Umbau Schritt 4): Schülerliste (routeHome) und Schülerakte mit Reitern (Überblick, Plan, Termine, Prüfung, Notizen).
// Geschrieben VOR dem Bau: gegen den alten Stand sind die neuen Punkte rot (Klasse/Funktion fehlt). Das ist gewollt.
// Punkte mit „bleibt“ prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt (T0a … H7) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Texte werden über textContent gelesen (Großschreibung per CSS ist egal).
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/akte-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), AKTE_SCHNELL=1 (H7: die anderen Tests nicht mitlaufen lassen)
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
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => { const d = new Date(Date.UTC(2026, 9, 14 + n)); return d.toISOString().slice(0, 10); };
// s2 ist 12-mal gefahren: „Bisher“ darf nur die letzten 10 zeigen (01.09. und 03.09. nicht).
const S2_ALT = ["2026-09-01", "2026-09-03", "2026-09-07", "2026-09-09", "2026-09-11", "2026-09-15", "2026-09-17", "2026-09-21", "2026-09-23", "2026-09-25", "2026-09-29", "2026-10-04"];

function basisSzenario() {
  return {
    theme: "light",
    // anteil = Anteil grüner Plan-Punkte (Item-IDs aus evalSkillsFor/stufenFor gelesen) → stand(s) eindeutig verschieden
    students: [
      // s1: nächster Termin heute 16:00, letzte Fahrt gestern; Protokoll-Knopf (findLastNextLesson zählt heute als „letzte“)
      { id: "s1", name: "Anna Erfunden", telefon: "0170 1111111", anteil: 0.6, theorie: true, protokoll: TAG },
      // s2: morgen 09:00, letzte Fahrt vor 10 Tagen, Sonderfahrt in 6 Tagen, Prüfung in 9 Tagen (DB.termine), Ergebnis in DB.exams
      { id: "s2", name: "Bernd Erfunden", telefon: "0170 2222222", anteil: 0.9, theorie: true },
      // s3: in 5 Tagen (Mo 19.10.), nie gefahren, OHNE Telefon, Theorie 40 %
      { id: "s3", name: "Clara Erfunden", telefon: "", anteil: 0, theoriePct: 40 },
      // s4: kein Termin, letzte Fahrt vor 20 Tagen (gestern „nicht erschienen“ zählt nicht), Prüfungsreif-Zeichen
      { id: "s4", name: "Dieter Erfunden", telefon: "0170 4444444", anteil: 0.15, reif: true },
      // s5: kein Termin, letzte Fahrt vor 3 Tagen, Büro-Stopp
      { id: "s5", name: "Emma Erfunden", telefon: "0170 5555555", anteil: 0.3 },
      // s6: kein Termin (morgen abgebrochen), letzte Fahrt vor 6 Tagen, eigener Fokus, Sehhilfe
      { id: "s6", name: "Felix Erfunden", telefon: "0170 6666666", anteil: 0.4, next: "Erfundener Fokus Einparken", sehhilfe: true },
      // s7: Termin übermorgen 08:00, aber gelbe Frist (Theorie bald) → gelb geht vor
      { id: "s7", name: "Greta Erfunden", telefon: "0170 7777777", anteil: 0.5 },
      // s8: wartet auf die Praxisprüfung (ready, keine Fahrstunde danach, kein Prüfungstermin) → Abschnitt „Wartet“
      { id: "s8", name: "Hans Erfunden", telefon: "0170 8888888", anteil: 0.95, theorie: true, ready: "2026-10-01T08:00:00.000Z", theoryPassed: "2026-09-20T08:00:00.000Z" },
    ],
    lessons: [
      { id: "a1", date: "2026-10-13", von: "14:00", bis: "15:30", sid: "s1" },
      { id: "a2", date: TAG, von: "16:00", bis: "17:30", sid: "s1" },
      ...S2_ALT.map((d, i) => ({ id: "b" + i, date: d, von: "10:00", bis: "11:30", sid: "s2" })),
      { id: "bM", date: plusTage(1), von: "09:00", bis: "10:30", sid: "s2" },
      { id: "bS", date: plusTage(6), von: "10:00", bis: "11:30", sid: "s2", art: "sonder" },
      { id: "c1", date: plusTage(5), von: "14:00", bis: "15:30", sid: "s3" },
      { id: "d1", date: "2026-09-24", von: "10:00", bis: "11:30", sid: "s4" },
      { id: "d2", date: "2026-10-13", von: "10:00", bis: "11:30", sid: "s4", status: "nicht erschienen" },
      { id: "e1", date: "2026-10-11", von: "10:00", bis: "11:30", sid: "s5" },
      { id: "f1", date: "2026-10-08", von: "10:00", bis: "11:30", sid: "s6" },
      { id: "f2", date: plusTage(1), von: "12:00", bis: "13:30", sid: "s6", status: "abgebrochen" },
      { id: "g1", date: "2026-10-12", von: "10:00", bis: "11:30", sid: "s7" },
      { id: "g2", date: plusTage(2), von: "08:00", bis: "09:30", sid: "s7" },
      { id: "h1", date: "2026-09-28", von: "10:00", bis: "11:30", sid: "s8" },
    ],
    termine: [{ id: "P2", date: plusTage(9), von: "09:00", slots: ["s2"] }],
    exams: [{ id: "E2", sid: "s2", name: "Bernd Erfunden", date: "2026-09-30", von: "09:00", result: "fail", pruefer: "XY", note: "", attempt: 1, faults: [], eingriff: false, earnAt: "2026-09-30" }],
    fristen: { s7: { theorie_abgeschlossen_am: "2025-10-30" } },                 // Theorie bald (gelb)
    notizen: { s5: [{ id: "n1", schueler_id: "s5", art: "stopp", text: "Erfundener Stopp-Grund", gelesen: true, erstellt_am: "2026-10-13T08:00:00Z" }] },
    start: "routeHome",
  };
}
// Erwartete Reihenfolgen (nur Hauptliste, ohne Wartende)
const SOLL = {
  naechste: ["s1", "s2", "s7", "s3", "s4", "s5", "s6"],
  lange: ["s3", "s4", "s2", "s6", "s5", "s7", "s1"],
  stand: ["s2", "s1", "s7", "s6", "s5", "s4", "s3"],
  az: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
};
const REITER = [["ueberblick", "Überblick", "Schülerdatei"], ["plan", "Plan", "Ausbildungsplan"], ["termine", "Termine", "Termine"], ["pruefung", "Prüfung", "Prüfung"], ["notizen", "Notizen", "Notizen"]];
const ROUTE = { ueberblick: "routeDetail", plan: "routePlan", termine: "routeAkteTermine", pruefung: "routeAktePruefung", notizen: "routeNotes" };

async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    // Fremde Fenster (WhatsApp) nur mitschreiben, nicht öffnen
    window.__offen = []; window.open = (u) => { window.__offen.push(String(u)); return null; };
  });
  return { ctx, page, jsFehler };
}

// Daten in die App legen und die Startseite (sz.start) zeichnen. Zurück-Stapel wird geleert.
async function setze(page, sz) {
  await page.evaluate((sz) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    _fsAgg = null;
    try { _fsSetDrawer(false); } catch (e) {}
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      if (p.theorie) s.plan.theorie = true;
      if (p.next) s.next = p.next;
      if (p.sehhilfe) s.sehhilfe = true;
      if (p.reif) s.pruefungsreifManuell = true;
      if (p.theoriePct) s.theoriePct = p.theoriePct;
      if (p.ready) s.ready = p.ready;
      if (p.theoryPassed) s.theoryPassed = p.theoryPassed;
      if (p._fahrlehrerName) s._fahrlehrerName = p._fahrlehrerName;
      if (p._paketId) s._paketId = p._paketId;
      s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] };
      ensure(s);
      const ids = evalSkillsFor(s), k = Math.round(ids.length * (p.anteil || 0));
      ids.slice(0, k).forEach((id) => { s.plan.ampeln[id] = "gruen"; });
      if (p.protokoll && ids[0]) s.plan.ampelnZeit[ids[0]] = p.protokoll + "T15:00:00";
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: "", fc: null }));
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = JSON.parse(JSON.stringify(sz.exams));
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];
    DB.sichtbarkeit = Object.assign({}, DB.sichtbarkeit, { dash_nextstudent: true });
    _schuelerFristen = JSON.parse(JSON.stringify(sz.fristen));
    _bueroNotizen = JSON.parse(JSON.stringify(sz.notizen));
    _homeFormFilter = []; _homeColorFilter = []; _homeOhneTelefon = false;
    localStorage.setItem("serband-backup-stamp", String(Date.now()));
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    _navStack = [];
    if (sz.fsAgg) _fsAgg = sz.fsAgg;
    window[sz.start]();
  }, sz);
  await warte(page, 350);
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const gibtFunktion = (page, name) => page.evaluate((n) => typeof window[n] === "function", name);
const sheet = (page) => page.evaluate(() => {
  const s = document.getElementById("sheet");
  return { offen: !!s && s.classList.contains("open"), kopf: (s?.querySelector(".sheet-h")?.textContent || "").replace(/\s+/g, " ").trim(), text: (s?.textContent || "").replace(/\s+/g, " ").trim() };
});
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; }, sel);
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const norm = (t) => String(t || "").replace(/[\s  ]+/g, " ").replace(/[-—]/g, "–").trim();
async function klick(page, sel, ms = 400) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return `„${sel}“ fehlt`;
  await loc.first().click();
  await warte(page, ms);
  return null;
}
async function klickTitel(page, sel, soll) {
  const e = await klick(page, sel); if (e) return e;
  const ti = await titel(page);
  if (ti !== soll) return `Tipp auf „${sel}“ → Titel „${ti}“ statt „${soll}“`;
  return null;
}
async function reiterKlick(page, key) {
  const sel = `#view .akte-kopf .ak-reiter [data-akte="${key}"]`;
  if (!(await da(page, "#view .akte-kopf"))) return `kein .akte-kopf auf „${await titel(page)}“`;
  return klick(page, sel);
}
// Reihenfolge der Zeilen der Hauptliste (ohne Abschnitt „Wartet“)
const listenIds = (page) => page.evaluate(() => [...document.querySelectorAll("#view .s-card[data-id]")].filter((c) => !c.closest("#wartendBox") && c.getBoundingClientRect().height > 0).map((c) => c.dataset.id));
async function sortiere(page, key) {
  if (!(await da(page, `#view .sl-sort[data-sort="${key}"]`))) return `Chip .sl-sort[data-sort="${key}"] fehlt`;
  await page.locator(`#view .sl-sort[data-sort="${key}"]`).first().click();
  await warte(page, 300);
  return null;
}
const zeile = (page, sid) => page.evaluate((sid) => {
  const c = document.querySelector(`#view .s-card[data-id="${sid}"]`);
  if (!c) return null;
  const t = (s) => { const e = c.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; };
  const sub = c.querySelector(".sr-sub");
  return { row: c.classList.contains("s-row"), ring: t(".sr-ring"), name: t(".sr-name"), sub: t(".sr-sub"), rot: !!sub && sub.classList.contains("rot"), gelb: !!sub && sub.classList.contains("gelb"),
    h: c.getBoundingClientRect().height, ganz: (c.textContent || "").replace(/\s+/g, " ").trim() };
}, sid);
const datenStand = (page) => page.evaluate(() => JSON.stringify({ s: DB.students, l: DB.lessons, t: DB.termine, e: DB.exams }));
// Akte über die Funktion öffnen (route + id); fehlt die Funktion → Text
async function oeffne(page, key, sid) {
  const fn = ROUTE[key];
  if (!(await gibtFunktion(page, fn))) return `${fn} fehlt`;
  const err = await page.evaluate(([fn, sid]) => { try { window[fn](sid); return null; } catch (e) { return String(e); } }, [fn, sid]);
  await warte(page, 300);
  return err ? `${fn}(${sid}): ${err}` : null;
}
// Kopf einer Akte-Seite lesen
const kopf = (page) => page.evaluate(() => {
  const k = document.querySelector("#view .akte-kopf");
  if (!k) return null;
  const sicht = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
  const kt = k.getBoundingClientRect().top;
  // Steht sichtbarer Text über dem Kopf? (ausgenommen ausgeblendete Zurück-Zeile)
  const drueber = [...document.querySelectorAll("#view *")].filter((e) => !k.contains(e) && !e.contains(k) && sicht(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().bottom <= kt + 1).map((e) => e.textContent.trim().slice(0, 20));
  const name = k.querySelector(".ak-name");
  return {
    name: name ? name.textContent.replace(/\s+/g, " ").trim() : null, nameSicht: sicht(name),
    reiter: [...k.querySelectorAll(".ak-reiter [data-akte]")].map((b) => ({ k: b.dataset.akte, t: (b.textContent || "").replace(/\s+/g, " ").trim(), on: b.classList.contains("on"), h: b.getBoundingClientRect().height })),
    drueber,
  };
});
async function kopfFehler(page, soll, sid, sname) {
  const k = await kopf(page);
  if (!k) return [`kein .akte-kopf im #view (Titel „${await titel(page)}“)`];
  const f = [];
  const keys = k.reiter.map((r) => r.k).join(",");
  if (keys !== REITER.map((r) => r[0]).join(",")) f.push(`Reiter [${keys}]`);
  for (const [key, lab] of REITER) { const r = k.reiter.find((x) => x.k === key); if (r && r.t !== lab) f.push(`Reiter ${key} heißt „${r.t}“`); }
  const on = k.reiter.filter((r) => r.on).map((r) => r.k);
  if (on.length !== 1 || on[0] !== soll) f.push(`aktiv [${on.join(",")}] statt ${soll}`);
  if (soll === "ueberblick") { if (k.nameSicht) f.push("auf Überblick steht .ak-name sichtbar im Kopf (doppelt)"); }
  else if (!k.nameSicht || !norm(k.name).includes(sname)) f.push(`.ak-name „${k.name}“ statt ${sname}`);
  if (k.drueber.length) f.push(`Inhalt über dem Kopf: ${k.drueber.slice(0, 2).join(" | ")}`);
  return f;
}

// ---------- Hauptlauf bei 412 × 915 ----------
const { ctx, page, jsFehler } = await neueSeite(412, 915);
await setze(page, basisSzenario());

await pruefe("T0a", "Uhr steht fest: todayISO() = 2026-10-14, 10:30", async () => {
  const r = await page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes() }));
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) return `todayISO()=${r.iso}, ${r.h}:${r.m}`;
});
await pruefe("T0b", "Testdaten: stand() eindeutig s2>s1>s7>s6>s5>s4>s3, nur s8 wartet", async () => {
  const r = await page.evaluate(() => ({ st: Object.fromEntries(DB.students.map((s) => [s.id, stand(s)])), w: DB.students.filter((s) => wartetBuero(s)).map((s) => s.id) }));
  const f = [];
  for (let i = 1; i < SOLL.stand.length; i++) if (!(r.st[SOLL.stand[i - 1]] > r.st[SOLL.stand[i]])) f.push(`stand ${SOLL.stand[i - 1]}=${r.st[SOLL.stand[i - 1]]} nicht > ${SOLL.stand[i]}=${r.st[SOLL.stand[i]]}`);
  if (r.w.join(",") !== "s8") f.push(`wartend: [${r.w.join(",")}]`);
  return f;
});

// ===== L Schülerliste =====
await pruefe("L3b", "Standard-Sortierung ist „Als Nächstes dran“ (.sl-sort[data-sort=naechste].on, ohne Tippen)", async () => {
  const on = await page.evaluate(() => [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort));
  if (on.length !== 1 || on[0] !== "naechste") return `aktiver Chip [${on.join(",")}]` + ((await da(page, "#view .sl-sort")) ? "" : " (keine .sl-sort-Chips)");
  const ids = await listenIds(page);
  if (ids.join(",") !== SOLL.naechste.join(",")) return `Reihenfolge ${ids.join(",")} statt ${SOLL.naechste.join(",")}`;
});
await pruefe("L1a", "Kopf: h1.sl-titel „Schüler“ in Playfair", async () => {
  const r = await page.evaluate(() => { const e = document.querySelector("#view h1.sl-titel"); return e ? { t: e.textContent.trim(), f: getComputedStyle(e).fontFamily } : null; });
  if (!r) return "h1.sl-titel fehlt";
  const f = [];
  if (r.t !== "Schüler") f.push(`Text „${r.t}“`);
  if (!/Playfair/i.test(r.f)) f.push(`Schrift ${r.f}`);
  return f;
});
await pruefe("L1b", "Kopf: .sl-zahl „7 aktiv · 1 warten“", async () => {
  const t = await text(page, "#view .sl-zahl");
  if (t === null) return ".sl-zahl fehlt";
  if (norm(t) !== "7 aktiv · 1 warten") return `„${t}“`;
});
await pruefe("L1c", "Kopf ohne Wartende: .sl-zahl „8 aktiv“ (ohne „warten“)", async () => {
  const sz = basisSzenario(); const s8 = sz.students.find((s) => s.id === "s8"); delete s8.ready;
  await setze(page, sz);
  const t = await text(page, "#view .sl-zahl");
  await setze(page, basisSzenario());
  if (t === null) return ".sl-zahl fehlt";
  if (norm(t) !== "8 aktiv") return `„${t}“`;
});
await pruefe("L2a", "bleibt: Suche nach Telefon (#studentSearch „01702222“) zeigt nur Bernd", async () => {
  if (!(await da(page, "#studentSearch"))) return "#studentSearch fehlt";
  await page.fill("#studentSearch", "01702222"); await warte(page, 200);
  const ids = await listenIds(page);
  await page.fill("#studentSearch", ""); await warte(page, 150);
  if (ids.join(",") !== "s2") return `sichtbar: [${ids.join(",")}]`;
});
await pruefe("L2b", "bleibt: Suche nach Namen („greta“) zeigt nur Greta", async () => {
  await page.fill("#studentSearch", "greta"); await warte(page, 200);
  const ids = await listenIds(page);
  await page.fill("#studentSearch", ""); await warte(page, 150);
  if (ids.join(",") !== "s7") return `sichtbar: [${ids.join(",")}]`;
});
await pruefe("L2c", "bleibt: #homeFilterBtn öffnet das Fenster „Filter“", async () => {
  const e = await klick(page, "#homeFilterBtn"); if (e) return e;
  const s = await sheet(page);
  await page.evaluate(() => closeSheet()); await warte(page, 200);
  if (!s.offen || s.kopf !== "Filter") return `Fenster offen=${s.offen}, Kopf „${s.kopf}“`;
});
await pruefe("L3a", "Sortier-Chips .sl-sort: naechste/lange/stand/az mit richtigen Beschriftungen", async () => {
  const r = await page.evaluate(() => [...document.querySelectorAll("#view .sl-sort[data-sort]")].map((b) => [b.dataset.sort, (b.textContent || "").replace(/\s+/g, " ").trim()]));
  if (!r.length) return "keine .sl-sort[data-sort]-Chips";
  const soll = [["naechste", "Als Nächstes dran"], ["lange", "Lange nicht gefahren"], ["stand", "Nach Stand"], ["az", "A–Z"]];
  const f = [];
  if (r.map((x) => x[0]).join(",") !== soll.map((x) => x[0]).join(",")) f.push(`Chips [${r.map((x) => x[0]).join(",")}]`);
  for (const [k, t] of soll) { const x = r.find((y) => y[0] === k); if (x && norm(x[1]) !== norm(t)) f.push(`${k} heißt „${x[1]}“`); }
  return f;
});
for (const [id, key, txt] of [["L3c", "naechste", "nächster Termin aufsteigend, ohne Termin (auch abgebrochen) alphabetisch am Ende"], ["L3d", "lange", "nie gefahren zuerst, dann älteste letzte Fahrt („nicht erschienen“ zählt nicht)"], ["L3e", "stand", "Stand absteigend"]]) {
  await pruefe(id, `Sortierung „${key}“: ${txt}; Chip hat Klasse on`, async () => {
    const e = await sortiere(page, key); if (e) return e;
    const f = [];
    const on = await page.evaluate(() => [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort));
    if (on.join(",") !== key) f.push(`aktiv [${on.join(",")}]`);
    const ids = await listenIds(page);
    if (ids.join(",") !== SOLL[key].join(",")) f.push(`Reihenfolge ${ids.join(",")} statt ${SOLL[key].join(",")}`);
    return f;
  });
}
await pruefe("L3f", "bleibt: A–Z alphabetisch mit sichtbarer A–Z-Leiste (#alphaNav)", async () => {
  if (!(await da(page, '#view [data-sort="az"]'))) return "kein [data-sort=az]";
  await page.locator('#view [data-sort="az"]').first().click(); await warte(page, 300);
  const ids = await listenIds(page);
  const nav = await page.evaluate(() => { const n = document.getElementById("alphaNav"); return !!n && getComputedStyle(n).display !== "none" && n.querySelectorAll(".alpha-nav-btn").length; });
  const f = [];
  if (ids.join(",") !== SOLL.az.join(",")) f.push(`Reihenfolge ${ids.join(",")}`);
  if (!nav) f.push("A–Z-Leiste fehlt/unsichtbar");
  return f;
});
// Für die Zeilen-Prüfungen wieder „Als Nächstes dran“ (falls vorhanden)
if (await da(page, '#view .sl-sort[data-sort="naechste"]')) await sortiere(page, "naechste");

await pruefe("L4a", "Zeilen .s-card.s-row: .sr-ring „N%“ = stand(s), .sr-name, .sr-sub, Höhe ≥ 64 px", async () => {
  const f = [];
  const st = await page.evaluate(() => Object.fromEntries(DB.students.map((s) => [s.id, stand(s)])));
  for (const sid of SOLL.az) {
    const z = await zeile(page, sid);
    if (!z) { f.push(`${sid}: keine Zeile`); continue; }
    const fe = [];
    if (!z.row) fe.push("ohne .s-row");
    if (z.ring === null) fe.push(".sr-ring fehlt"); else if (!z.ring.replace(/\s/g, "").includes(`${st[sid]}%`)) fe.push(`Ring „${z.ring}“ statt ${st[sid]}%`);
    if (z.name === null) fe.push(".sr-name fehlt");
    if (z.sub === null) fe.push(".sr-sub fehlt");
    if (z.h < 63.5) fe.push(`${Math.round(z.h)} px hoch`);
    if (fe.length) f.push(`${sid}: ${fe.join(", ")}`);
    if (f.length >= 3) break;
  }
  return f;
});
await pruefe("L4b", "sr-sub mit Termin: „Heute 16:00 · Fokus“, „Morgen 09:00 · Fokus“, „Mo 19.10. 14:00 · Fokus“", async () => {
  const fokus = await page.evaluate(() => Object.fromEntries(DB.students.map((s) => [s.id, autoNext(s).text])));
  const f = [];
  for (const [sid, re, beschr] of [["s1", /^Heute,? 16:00 · /, "Heute 16:00 · "], ["s2", /^Morgen,? 09:00 · /, "Morgen 09:00 · "], ["s3", /^Mo,? 19\.10\.? 14:00 · /, "Mo 19.10. 14:00 · "]]) {
    const z = await zeile(page, sid);
    if (!z || z.sub === null) { f.push(`${sid}: .sr-sub fehlt`); continue; }
    const t = norm(z.sub);
    if (!re.test(t)) f.push(`${sid}: „${t}“ beginnt nicht mit „${beschr}“`);
    else if (!t.includes(norm(fokus[sid]))) f.push(`${sid}: Fokus „${fokus[sid]}“ fehlt in „${t}“`);
    if (z.rot || z.gelb) f.push(`${sid}: farbig markiert`);
  }
  return f;
});
await pruefe("L4c", "sr-sub ohne Termin, letzte Fahrt vor 20 Tagen: „Seit 20 Tagen nicht gefahren“, Klasse gelb", async () => {
  const z = await zeile(page, "s4");
  if (!z || z.sub === null) return ".sr-sub für s4 fehlt";
  const f = [];
  if (norm(z.sub) !== "Seit 20 Tagen nicht gefahren") f.push(`„${z.sub}“`);
  if (!z.gelb) f.push("ohne Klasse gelb");
  return f;
});
await pruefe("L4d", "sr-sub Büro-Stopp: Hinweis-Text, Klasse rot", async () => {
  const z = await zeile(page, "s5");
  if (!z || z.sub === null) return ".sr-sub für s5 fehlt";
  const f = [];
  if (!/stopp|Erfundener Stopp-Grund/i.test(z.sub)) f.push(`„${z.sub}“ ohne Stopp-Hinweis`);
  if (!z.rot) f.push("ohne Klasse rot");
  return f;
});
await pruefe("L4e", "sr-sub gelbe Frist geht vor dem Termin: Klasse gelb, nicht rot", async () => {
  const z = await zeile(page, "s7");
  if (!z || z.sub === null) return ".sr-sub für s7 fehlt";
  const f = [];
  if (!z.gelb) f.push(`„${z.sub}“ ohne Klasse gelb`);
  if (z.rot) f.push("Klasse rot");
  if (/08:00/.test(z.sub)) f.push(`zeigt den Termin statt der Frist: „${z.sub}“`);
  return f;
});
await pruefe("L4f", "sr-sub ohne Termin (abgebrochener zählt nicht), zuletzt vor 6 Tagen: nur Fokus", async () => {
  const z = await zeile(page, "s6");
  if (!z || z.sub === null) return ".sr-sub für s6 fehlt";
  const f = [];
  if (norm(z.sub) !== "Erfundener Fokus Einparken") f.push(`„${z.sub}“`);
  if (z.rot || z.gelb) f.push("farbig markiert");
  return f;
});
await pruefe("L4g", "bleibt: kleine Zeichen 👓 Sehhilfe, 🏁 Prüfungsreif, 📵 ohne Telefon in der Zeile", async () => {
  const f = [];
  for (const [sid, z] of [["s6", "👓"], ["s4", "🏁"], ["s3", "📵"]]) {
    const r = await zeile(page, sid);
    if (!r) f.push(`${sid}: keine Zeile`); else if (!r.ganz.includes(z)) f.push(`${sid}: ${z} fehlt`);
  }
  return f;
});
await pruefe("L4h", "bleibt: ganze Zeile tippbar → Akte (Titel „Schülerdatei“)", async () => {
  const sel = (await da(page, '#view .s-card[data-id="s1"] .sr-sub')) ? '#view .s-card[data-id="s1"] .sr-sub' : '#view .s-card[data-id="s1"]';
  const e = await klickTitel(page, sel, "Schülerdatei");
  await setze(page, basisSzenario());
  return e;
});
await pruefe("L5a", "bleibt: Abschnitt „Wartet“ (#wartendBox) mit Hans, Hans nicht in der Hauptliste", async () => {
  const r = await page.evaluate(() => { const b = document.getElementById("wartendBox"); return b ? { t: b.textContent.replace(/\s+/g, " "), hans: !!b.querySelector('.s-card[data-id="s8"]') } : null; });
  if (!r) return "#wartendBox fehlt";
  const f = [];
  if (!/Wartet/.test(r.t)) f.push("Überschrift „Wartet“ fehlt");
  if (!r.hans) f.push("Hans nicht im Abschnitt");
  if ((await listenIds(page)).includes("s8")) f.push("Hans auch in der Hauptliste");
  return f;
});
await pruefe("L5b", "Abschnitt „Wartet“ nutzt die gleichen Zeilen (.s-row mit .sr-ring/.sr-name/.sr-sub)", async () => {
  const r = await page.evaluate(() => { const c = document.querySelector('#wartendBox .s-card[data-id="s8"]'); return c ? { row: c.classList.contains("s-row"), ring: !!c.querySelector(".sr-ring"), name: !!c.querySelector(".sr-name"), sub: !!c.querySelector(".sr-sub") } : null; });
  if (!r) return "keine Zeile für Hans in #wartendBox";
  const f = Object.entries(r).filter(([, v]) => !v).map(([k]) => `${k} fehlt`);
  return f;
});
await pruefe("L6a", "bleibt: Plus-Knopf „Neuer Schüler“ sichtbar und öffnet „Neuer Schüler“", async () => {
  const r = await page.evaluate(() => { const f = document.getElementById("fab"); return f ? { an: getComputedStyle(f).display !== "none", t: f.textContent.trim() } : null; });
  if (!r || !r.an) return "Plus-Knopf nicht sichtbar";
  if (!/Neuer Schüler/.test(r.t)) return `Plus-Knopf „${r.t}“`;
  const e = await klickTitel(page, "#fab", "Neuer Schüler");
  await setze(page, basisSzenario());
  return e;
});

// ===== A Schülerakte =====
await pruefe("A1a", "Überblick (routeDetail): .akte-kopf mit 5 Reitern, „Überblick“ aktiv, kein doppelter Name", async () => {
  const e = await oeffne(page, "ueberblick", "s2"); if (e) return e;
  return kopfFehler(page, "ueberblick", "s2", "Bernd Erfunden");
});
for (const [id, key] of [["A1b", "plan"], ["A1c", "termine"], ["A1d", "pruefung"], ["A1e", "notizen"]]) {
  await pruefe(id, `${ROUTE[key]}: .akte-kopf oben, .ak-name, Reiter „${REITER.find((r) => r[0] === key)[1]}“ aktiv`, async () => {
    const e = await oeffne(page, key, "s2"); if (e) return e;
    return kopfFehler(page, key, "s2", "Bernd Erfunden");
  });
}
await pruefe("A1f", "Reiter-Tipp wechselt die Seite (Titel je Reiter), jeder Reiter ≥ 44 px", async () => {
  await setze(page, basisSzenario());
  let e = await oeffne(page, "ueberblick", "s2"); if (e) return e;
  const f = [];
  for (const [key, , soll] of [...REITER.slice(1), REITER[0]]) {
    e = await reiterKlick(page, key); if (e) { f.push(e); break; }
    const ti = await titel(page);
    if (ti !== soll) f.push(`${key} → „${ti}“ statt „${soll}“`);
    const k = await kopf(page);
    const klein = (k ? k.reiter : []).filter((r) => r.h < 43.5).map((r) => `${r.k} ${Math.round(r.h)}px`);
    if (klein.length) f.push(`auf ${key} zu klein: ${klein.join(", ")}`);
  }
  return f;
});

async function zurueckFolge(page, art) {
  await setze(page, basisSzenario());
  if (!(await da(page, '#view .s-card[data-id="s2"]'))) return "Zeile Bernd fehlt";
  let e = await klickTitel(page, '#view .s-card[data-id="s2"]', "Schülerdatei"); if (e) return e;
  for (const [key, , soll] of REITER.slice(1)) {
    e = await reiterKlick(page, key); if (e) return e;
    const ti = await titel(page); if (ti !== soll) return `${key} → „${ti}“`;
  }
  if (art === "knopf") {
    if (!(await page.locator("#navBackBtn").isVisible())) return "Zurück-Pfeil oben nicht sichtbar";
    await page.locator("#navBackBtn").click();
  } else await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate")));
  await warte(page, 350);
  const ti = await titel(page);
  if (ti !== "Schüler") return `nach einmal Zurück Titel „${ti}“ statt „Schüler“`;
}
await pruefe("A2a", "Liste → Akte → Plan → Termine → Prüfung → Notizen, einmal Zurück-Pfeil (#navBackBtn) → Schülerliste", () => zurueckFolge(page, "knopf"));
await pruefe("A2b", "dasselbe mit Android-Zurück (popstate) → Schülerliste", () => zurueckFolge(page, "android"));
await pruefe("A2c", "Heute → Akte (Jetzt-Karte) → Plan → Zurück → Heute", async () => {
  const sz = basisSzenario(); sz.start = "routeDashboard";
  await setze(page, sz);
  let e = await klickTitel(page, ".heute2 .h2-jetzt .h2-jetzt-mitte", "Schülerdatei"); if (e) return e;
  e = await reiterKlick(page, "plan"); if (e) return e;
  if ((await titel(page)) !== "Ausbildungsplan") return `Plan-Reiter → „${await titel(page)}“`;
  await page.locator("#navBackBtn").click(); await warte(page, 350);
  const ti = await titel(page);
  if (ti !== "Heute") return `Zurück → „${ti}“ statt „Heute“`;
});
await pruefe("A2d", "Reiterwechsel verlängert den Zurück-Stapel (_navStack) nicht", async () => {
  await setze(page, basisSzenario());
  let e = await klickTitel(page, '#view .s-card[data-id="s2"]', "Schülerdatei"); if (e) return e;
  const vorher = await page.evaluate(() => _navStack.length);
  for (const [key] of [...REITER.slice(1), REITER[0], REITER[2]]) { e = await reiterKlick(page, key); if (e) return e; }
  const nachher = await page.evaluate(() => _navStack.length);
  if (nachher !== vorher) return `Stapel ${vorher} → ${nachher}`;
});
// Prüf-Team Schritt 4: Die Zeile darf bleiben, wenn andere Knöpfe darin stehen (Plan: „Als PDF“), nur der alte Zurück-Knopf muss weg.
await pruefe("A3", "alter Zurück-Knopf (.back-row .back-btn) auf allen 5 Akte-Seiten ausgeblendet, PDF im Plan bleibt, kein JS-Fehler", async () => {
  await setze(page, basisSzenario());
  const f = [], vorher = jsFehler.length;
  const sichtbar = "(b) => { const r = b.getBoundingClientRect(); return r.height > 0 && getComputedStyle(b).visibility !== 'hidden'; }";
  for (const [key] of REITER) {
    const e = await oeffne(page, key, "s1"); if (e) { f.push(e); continue; }
    const r = await page.evaluate((sb) => { const sicht = eval(sb); return { zurueck: [...document.querySelectorAll("#view .back-row .back-btn")].some(sicht), pdf: !!document.getElementById("pdfPlanBtn") && sicht(document.getElementById("pdfPlanBtn")) }; }, sichtbar);
    if (r.zurueck) f.push(`${key}: alter Zurück-Knopf sichtbar`);
    if (key === "plan" && !r.pdf) f.push("plan: Knopf „Als PDF“ fehlt");
  }
  if (jsFehler.length > vorher) f.push(`JS-Fehler: ${jsFehler[vorher]}`);
  return f;
});
// P: Funde des Prüf-Teams Schritt 4
await pruefe("P1", "Notiz tippen, dann Reiter wechseln: Notiz wird gespeichert; nach „Notiz speichern“ führt Zurück zur Liste", async () => {
  await setze(page, basisSzenario());
  const r = await page.evaluate(async () => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    routeHome(); await w(100); routeDetail("s1"); await w(100);
    document.querySelector('#view .ak-r[data-akte="notizen"]').click(); await w(150);
    document.getElementById("noteArea").value = "Erfundene Notiz Reiter"; document.querySelector('#view .ak-r[data-akte="plan"]').click(); await w(150);
    const gespeichert = DB.students.find((x) => x.id === "s1").notiz;
    document.querySelector('#view .ak-r[data-akte="notizen"]').click(); await w(150);
    document.getElementById("saveNote").click(); await w(150);
    document.querySelector('#view .ak-r[data-akte="termine"]').click(); await w(150);
    navZurueck(); await w(150);
    return { gespeichert, titel: $("#tbTitle").textContent };
  });
  const f = [];
  if (r.gespeichert !== "Erfundene Notiz Reiter") f.push("Notiz beim Reiterwechsel verloren: " + r.gespeichert);
  if (r.titel !== "Schüler") f.push("Zurück nach dem Speichern führt zu „" + r.titel + "“");
  await setze(page, basisSzenario());
  return f;
});
await pruefe("P2", "Termine: Prüfung als Kalendertermin und auf der Tafel steht nur einmal", async () => {
  await setze(page, basisSzenario());
  const n = await page.evaluate(async () => {
    const t = DB.termine.find((x) => (x.slots || []).includes("s2"));
    DB.lessons.push({ id: "LPdoppelt", date: t.date, von: t.von || "09:00", bis: "10:00", art: "pruefung", sid: "s2", status: "geplant" });
    routeAkteTermine("s2"); await new Promise((k) => setTimeout(k, 150));
    const d = isoDE(t.date).slice(0, 6);
    return [...document.querySelectorAll("#view .at-zeile")].filter((z) => z.textContent.includes(d) && /Prüfung/.test(z.textContent)).length;
  });
  await setze(page, basisSzenario());
  if (n !== 1) return `Prüfung steht ${n}×`;
});

await pruefe("A4a", "Überblick: .akte-nav ohne „Plan“, mit Bogen und Historie", async () => {
  await oeffne(page, "ueberblick", "s1");
  const r = await page.evaluate(() => { const n = document.querySelector("#view .akte-nav"); return n ? [...n.querySelectorAll("[data-go]")].map((b) => b.dataset.go) : null; });
  if (!r) return ".akte-nav fehlt";
  const f = [];
  if (r.includes("plan")) f.push("Kachel „Plan“ noch da");
  if (!r.includes("profil")) f.push("Bogen fehlt");
  if (!r.includes("hist")) f.push("Historie fehlt");
  return f;
});
await pruefe("A4b", "bleibt: Bogen → „Persönlichkeitsbogen“, Historie → „Historie“", async () => {
  const f = [];
  await oeffne(page, "ueberblick", "s1");
  let e = await klickTitel(page, '#view .akte-nav [data-go="profil"]', "Persönlichkeitsbogen"); if (e) f.push(e);
  await oeffne(page, "ueberblick", "s1");
  e = await klickTitel(page, '#view .akte-nav [data-go="hist"]', "Historie"); if (e) f.push(e);
  return f;
});
await pruefe("A4c", "bleibt: Knöpfe der Akte ohne JS-Fehler (#editBtn, #shareStandBtn, #waKontaktBtn, #sehhilfeBtn, #protokollBtn, #theoEdit, #pruefReifBtn, #delBtn)", async () => {
  const f = [], vorher = jsFehler.length;
  await oeffne(page, "ueberblick", "s1");
  let e = await klickTitel(page, "#editBtn", "Schüler bearbeiten"); if (e) f.push(e);
  await oeffne(page, "ueberblick", "s1");
  const o0 = await page.evaluate(() => window.__offen.length);
  for (const sel of ["#shareStandBtn", "#waKontaktBtn", "#protokollBtn"]) {
    e = await klick(page, sel, 250); if (e) { f.push(e); continue; }
    try { await page.evaluate(() => closeSheet()); } catch (x) {}
  }
  const offen = await page.evaluate((n) => window.__offen.slice(n), o0);
  if (offen.filter((u) => /wa\.me|whatsapp/i.test(u)).length < 2) f.push(`WhatsApp nicht geöffnet (${offen.join(" | ") || "nichts"})`);
  await oeffne(page, "ueberblick", "s1");
  e = await klick(page, "#sehhilfeBtn", 200); if (e) f.push(e);
  else {
    const an = await page.evaluate(() => DB.students.find((s) => s.id === "s1").sehhilfe);
    await page.locator("#sehhilfeBtn").click(); await warte(page, 200);
    if (!an) f.push("Sehhilfe schaltet nicht um");
  }
  e = await klick(page, "#theoEdit", 250); if (e) f.push(e); else if (!(await sheet(page)).offen) f.push("#theoEdit öffnet kein Fenster");
  await page.evaluate(() => closeSheet()); await warte(page, 200);
  if (!(await da(page, "#pruefReifBtn"))) f.push("#pruefReifBtn fehlt");
  e = await klick(page, "#delBtn", 250); if (e) f.push(e); // Rückfrage wird abgelehnt
  if (!(await page.evaluate(() => DB.students.some((s) => s.id === "s1")))) f.push("Schüler trotz Abbruch gelöscht");
  if (jsFehler.length > vorher) f.push(`JS-Fehler: ${jsFehler[vorher]}`);
  await setze(page, basisSzenario());
  return f;
});

// A5 Termine
const termineText = (page) => page.evaluate(() => { const l = document.querySelector("#view .at-liste"); return l ? (l.textContent || "").replace(/\s+/g, " ") : null; });
await pruefe("A5a", "routeAkteTermine(id): Titel „Termine“, Liste .at-liste", async () => {
  const e = await oeffne(page, "termine", "s2"); if (e) return e;
  const f = [];
  if ((await titel(page)) !== "Termine") f.push(`Titel „${await titel(page)}“`);
  if (!(await da(page, "#view .at-liste"))) f.push(".at-liste fehlt");
  return f;
});
await pruefe("A5b", "kommende Termine zuerst, aufsteigend: 15.10. 09:00 Fahrstunde, 20.10. 10:00 Sonderfahrt, 23.10. 09:00 Prüfung; dann „Bisher“", async () => {
  const t = await termineText(page); if (t === null) return ".at-liste fehlt";
  const f = [];
  const p = ["15.10.", "20.10.", "23.10."].map((d) => t.indexOf(d));
  if (p.some((x) => x < 0)) f.push(`fehlt: ${["15.10.", "20.10.", "23.10."].filter((_, i) => p[i] < 0).join(", ")}`);
  else if (!(p[0] < p[1] && p[1] < p[2])) f.push("nicht aufsteigend");
  for (const w of ["09:00", "10:00", "Fahrstunde", "Sonderfahrt", "Prüfung"]) if (!t.includes(w)) f.push(`„${w}“ fehlt`);
  const bisher = (await text(page, "#view")).indexOf("Bisher");
  const ganz = await text(page, "#view");
  if (bisher < 0) f.push("Abschnitt „Bisher“ fehlt");
  else if (ganz.indexOf("23.10.") > bisher || ganz.indexOf("04.10.") < bisher) f.push("„Bisher“ steht nicht zwischen kommenden und vergangenen Terminen");
  return f;
});
await pruefe("A5c", "„Bisher“: nur die letzten 10 vergangenen (04.10. … 07.09., nicht 03.09./01.09.)", async () => {
  const t = await text(page, "#view"); if (!(await da(page, "#view .at-liste"))) return ".at-liste fehlt";
  const f = [];
  for (const d of S2_ALT.slice(2)) { const de = `${d.slice(8, 10)}.${d.slice(5, 7)}.`; if (!t.includes(de)) f.push(`${de} fehlt`); }
  for (const d of S2_ALT.slice(0, 2)) { const de = `${d.slice(8, 10)}.${d.slice(5, 7)}.`; if (t.includes(de)) f.push(`${de} angezeigt (mehr als 10)`); }
  return f;
});
await pruefe("A5d", "Tipp auf einen Termin öffnet openEventSheet für genau diesen Termin", async () => {
  if (!(await da(page, "#view .at-liste"))) return ".at-liste fehlt";
  await page.evaluate(() => { window.__es = []; const o = window.openEventSheet; window.__esOrig = o; window.openEventSheet = function () { window.__es.push([...arguments]); return o.apply(this, arguments); }; });
  try {
    await page.locator("#view .at-liste").getByText(/15\.10\./).first().click(); await warte(page, 300);
    const r = await page.evaluate(() => window.__es);
    const s = await sheet(page);
    await page.evaluate(() => closeSheet()); await warte(page, 200);
    if (!r.length) return "openEventSheet nicht aufgerufen";
    if (r[0][1] !== "bM") return `openEventSheet(${r[0].map(String).join(", ")}) statt Termin bM`;
    if (!s.offen) return "Fenster nicht offen";
  } finally { await page.evaluate(() => { window.openEventSheet = window.__esOrig; }); }
});
await pruefe("A5e", "„Termin vergeben“ (.at-neu) → freie Lücke → openAssignSlotSheet {sid, nachher}, Bernd zuerst → Fahrzeug → Titel „Termine“, neuer Termin in der Liste", async () => {
  await setze(page, basisSzenario());
  let e = await oeffne(page, "termine", "s2"); if (e) return e;
  const b = await text(page, "#view .at-neu");
  if (b === null) return ".at-neu fehlt";
  const f = [];
  if (!/Termin vergeben/.test(b)) f.push(`Knopf heißt „${b}“`);
  const fr = plusTage(2);
  await page.evaluate((fr) => {
    window.__dfsOrig = dayFreeSlots; dayFreeSlots = (d) => (d === fr ? [{ von: "16:00", bis: "17:30", art: "fahrstunde" }] : []);
    window.__as = []; const o = window.openAssignSlotSheet; window.__asOrig = o;
    window.openAssignSlotSheet = function () { window.__as.push(arguments[4] || null); return o.apply(this, arguments); };
  }, fr);
  try {
    await page.locator("#view .at-neu").first().click(); await warte(page, 350);
    const s1 = await sheet(page);
    if (!s1.offen) return f.concat("kein Fenster nach „Termin vergeben“");
    const luecke = page.locator("#sheet button", { hasText: "16:00" });
    if (!(await luecke.count())) return f.concat(`keine Lücke 16:00 im Fenster („${s1.text.slice(0, 80)}“)`);
    await luecke.first().click(); await warte(page, 350);
    const as = await page.evaluate(() => window.__as.map((o) => o && { sid: o.sid, nachher: typeof o.nachher }));
    if (!as.length) return f.concat("openAssignSlotSheet nicht aufgerufen");
    if (!as[0] || as[0].sid !== "s2") f.push(`opts.sid = ${as[0] && as[0].sid}`);
    if (!as[0] || as[0].nachher !== "function") f.push("opts.nachher fehlt");
    const erster = await page.evaluate(() => document.querySelector("#sheet .as-item")?.dataset.sid || null);
    if (erster !== "s2") f.push(`erster Schüler im Fenster: ${erster}`);
    e = await klick(page, '#sheet .as-item[data-sid="s2"]', 350); if (e) return f.concat(e);
    e = await klick(page, "#sheet .fz-opt", 450); if (e) return f.concat("Fahrzeug-Auswahl: " + e);
    const ti = await titel(page);
    if (ti !== "Termine") f.push(`danach Titel „${ti}“`);
    const neu = await page.evaluate((fr) => DB.lessons.filter((l) => l.sid === "s2" && l.date === fr && l.von === "16:00").length, fr);
    if (neu !== 1) f.push(`${neu} neue Termine in DB.lessons`);
    const t = await termineText(page);
    if (!t || !t.includes(`${fr.slice(8, 10)}.${fr.slice(5, 7)}.`) || !t.includes("16:00")) f.push("neuer Termin steht nicht in .at-liste");
    // Danach führt Zurück immer noch aus der Akte heraus (Stapel nicht verlängert)
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate"))); await warte(page, 350);
    if ((await titel(page)) !== "Schüler") f.push(`Zurück nach dem Buchen → „${await titel(page)}“`);
  } finally {
    await page.evaluate(() => { dayFreeSlots = window.__dfsOrig; window.openAssignSlotSheet = window.__asOrig; try { closeSheet(); } catch (e) {} });
    await setze(page, basisSzenario());
  }
  return f;
});
await pruefe("A5f", "Link „Historie“ auf Termine öffnet „Historie“", async () => {
  let e = await oeffne(page, "termine", "s2"); if (e) return e;
  const loc = page.locator("#view button, #view a, #view [role=button]", { hasText: "Historie" });
  if (!(await loc.count())) return "kein Knopf/Link „Historie“ auf Termine";
  await loc.first().click(); await warte(page, 350);
  const ti = await titel(page);
  if (ti !== "Historie") return `→ „${ti}“`;
});

// A6 Prüfung
await pruefe("A6a", "routeAktePruefung(id): Titel „Prüfung“", async () => {
  const e = await oeffne(page, "pruefung", "s2"); if (e) return e;
  if ((await titel(page)) !== "Prüfung") return `Titel „${await titel(page)}“`;
});
await pruefe("A6b", "Theorie: Bernd „bestanden“, Clara „40 %“ (nicht bestanden)", async () => {
  const f = [];
  let e = await oeffne(page, "pruefung", "s2"); if (e) return e;
  let t = norm(await text(page, "#view"));
  if (!/Theorie/.test(t) || !/bestanden/.test(t)) f.push("Bernd: Theorie bestanden fehlt");
  e = await oeffne(page, "pruefung", "s3"); if (e) return e;
  t = norm(await text(page, "#view"));
  if (!/40\s?%/.test(t)) f.push("Clara: 40 % fehlt");
  if (/Theorie[^.·]{0,20}✓|Theorie bestanden/.test(t)) f.push("Clara: Theorie als bestanden angezeigt");
  return f;
});
await pruefe("A6c", "Warteliste-Platz bei Prüfungsreifen: Hans „Platz 1“", async () => {
  const e = await oeffne(page, "pruefung", "s8"); if (e) return e;
  const t = norm(await text(page, "#view"));
  if (!/Warteliste/.test(t) || !/Platz 1\b/.test(t)) return "„Warteliste … Platz 1“ fehlt";
});
await pruefe("A6d", "kommende Prüfung aus DB.termine: Bernd 23.10. 09:00", async () => {
  const e = await oeffne(page, "pruefung", "s2"); if (e) return e;
  const t = norm(await text(page, "#view"));
  if (!/23\.10\./.test(t) || !t.includes("09:00")) return "23.10. 09:00 fehlt";
});
await pruefe("A6e", "bisheriges Ergebnis aus DB.exams: 30.09. nicht bestanden, Prüfer XY", async () => {
  const e = await oeffne(page, "pruefung", "s2"); if (e) return e;
  const t = norm(await text(page, "#view"));
  const f = [];
  if (!/30\.09\./.test(t)) f.push("Datum 30.09. fehlt");
  if (!/nicht bestanden/i.test(t)) f.push("„nicht bestanden“ fehlt");
  if (!/\bXY\b/.test(t)) f.push("Prüfer XY fehlt");
  return f;
});
await pruefe("A6f", "Knopf „Prüfung eintragen“ → routeExam (Titel „Prüfung eintragen“)", async () => {
  const e = await oeffne(page, "pruefung", "s2"); if (e) return e;
  const loc = page.locator("#view button, #view a", { hasText: "Prüfung eintragen" });
  if (!(await loc.count())) return "Knopf „Prüfung eintragen“ fehlt";
  await loc.first().click(); await warte(page, 350);
  const ti = await titel(page);
  if (ti !== "Prüfung eintragen") return `→ „${ti}“`;
});
await pruefe("A6g", "nur Anzeige: Liste (alle Sortierungen) und alle 5 Reiter ändern keine Daten", async () => {
  await setze(page, basisSzenario());
  const vorher = await datenStand(page);
  for (const k of ["naechste", "lange", "stand", "az"]) if (await da(page, `#view .sl-sort[data-sort="${k}"]`)) await sortiere(page, k);
  for (const sid of ["s1", "s2", "s3", "s8"]) for (const [key] of REITER) await oeffne(page, key, sid);
  const nachher = await datenStand(page);
  await setze(page, basisSzenario());
  if (vorher !== nachher) return "DB.students/lessons/termine/exams haben sich geändert";
});
await pruefe("A7", "Reiter unten: „Termine“ und „Prüfung“ markieren „Schüler“", async () => {
  const f = [];
  for (const key of ["termine", "pruefung"]) {
    const e = await oeffne(page, key, "s2"); if (e) { f.push(e); continue; }
    await warte(page, 100);
    const on = await page.evaluate(() => [...document.querySelectorAll(".tab-i.on")].map((b) => b.dataset.tab));
    if (on.join(",") !== "schueler") f.push(`${key}: aktiv [${on.join(",")}]`);
  }
  return f;
});

// ===== Gesamtansicht (_fsAgg) =====
function fsSzenario() {
  const sz = basisSzenario();
  sz.fsAgg = { fahrschuleId: "x", fahrschule: { name: "Erfundene Fahrschule" }, lehrer: [{ id: "lA", name: "Lehrer Alpha" }, { id: "lB", name: "Lehrer Beta" }], pakete: [{ id: "pT", name: "Turboboost" }] };
  sz.students.forEach((s, i) => { s._fahrlehrerName = i % 2 ? "Lehrer Beta" : "Lehrer Alpha"; });
  sz.students.find((s) => s.id === "s3")._paketId = "pT";
  return sz;
}
const fs = await neueSeite(412, 915);
await pruefe("L6b", "bleibt: Gesamtansicht gruppiert nach Fahrlehrer (Standard, ohne Tippen)", async () => {
  await setze(fs.page, fsSzenario());
  const r = await fs.page.evaluate(() => {
    const t = (document.getElementById("studentGrid") || document.getElementById("view")).textContent;
    return { a: t.indexOf("Lehrer Alpha"), b: t.indexOf("Lehrer Beta"), pos: Object.fromEntries(DB.students.map((s) => [s.id, t.indexOf(s.name)])), gruppe: Object.fromEntries(DB.students.map((s) => [s.id, s._fahrlehrerName])) };
  });
  if (r.a < 0 || r.b < 0) return "Gruppen-Überschriften fehlen";
  const f = [];
  const [erst, zweit] = r.a < r.b ? ["Lehrer Alpha", "Lehrer Beta"] : ["Lehrer Beta", "Lehrer Alpha"];
  const grenze = Math.max(r.a, r.b);
  for (const [sid, p] of Object.entries(r.pos)) {
    if (sid === "s8" || p < 0) continue;
    const g = r.gruppe[sid];
    if (g === erst && !(p > Math.min(r.a, r.b) && p < grenze)) f.push(`${sid} nicht unter ${g}`);
    if (g === zweit && !(p > grenze)) f.push(`${sid} nicht unter ${g}`);
  }
  return f;
});
await pruefe("L6c", "Gesamtansicht: Standard-Chip ist „A–Z“ (.sl-sort[data-sort=az].on)", async () => {
  const on = await fs.page.evaluate(() => [...document.querySelectorAll("#view .sl-sort.on")].map((b) => b.dataset.sort));
  if (on.join(",") !== "az") return `aktiv [${on.join(",")}]` + ((await da(fs.page, "#view .sl-sort")) ? "" : " (keine .sl-sort-Chips)");
});
await pruefe("L6d", "bleibt: Turbo-Filter (#fsTurboToggleBtn) zeigt nur Turbo-Schüler", async () => {
  const e = await klick(fs.page, "#fsTurboToggleBtn", 250); if (e) return e;
  const ids = await listenIds(fs.page);
  await fs.page.locator("#fsTurboToggleBtn").click(); await warte(fs.page, 200);
  if (ids.join(",") !== "s3") return `sichtbar [${ids.join(",")}]`;
});
await pruefe("A8a", "bleibt: Gesamtansicht-Akte hat _fsInjectDetailExtras (#fsDetailExtras)", async () => {
  const e = await oeffne(fs.page, "ueberblick", "s2"); if (e) return e;
  await warte(fs.page, 300);
  if (!(await da(fs.page, "#fsDetailExtras"))) return "#fsDetailExtras fehlt";
});
await pruefe("A8b", "Gesamtansicht: alle 5 Reiter öffnen ihre Seite mit .akte-kopf, keine JS-Fehler", async () => {
  const f = [];
  let e = await oeffne(fs.page, "ueberblick", "s2"); if (e) return e;
  for (const [key, , soll] of [...REITER.slice(1), REITER[0]]) {
    e = await reiterKlick(fs.page, key); if (e) { f.push(e); break; }
    if ((await titel(fs.page)) !== soll) f.push(`${key} → „${await titel(fs.page)}“`);
  }
  if (fs.jsFehler.length) f.push(`JS-Fehler: ${fs.jsFehler[0]}`);
  return f;
});
await fs.ctx.close();

await pruefe("Z1", "keine JS-Fehler im Hauptlauf", () => (jsFehler.length ? `${jsFehler.length} JS-Fehler, z. B. ${jsFehler[0]}` : null));
await ctx.close();

// ===== H Handy: Größen × hell/dunkel =====
const LANG = "Anna-Theodora Maximiliane Erfunden-Wolkensteinhausen von Grünberg-Hohenlohe";
const GROESSEN = [{ n: "360 hoch", w: 360, h: 740 }, { n: "412 hoch", w: 412, h: 915 }, { n: "915 quer", w: 915, h: 412 }];
const h = { wisch: [], knopf: [], name: [], kontrast: [], fehler: [] };
const SEITEN = [["liste", "routeHome", null], ...REITER.map(([k]) => [k, ROUTE[k], "s1"])];
for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = await neueSeite(g.w, g.h);
    const sz = basisSzenario(); sz.theme = theme; sz.students[0].name = LANG;
    await setze(s.page, sz);
    const name = `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;
    for (const [seite, fn, sid] of SEITEN) {
      if (!(await gibtFunktion(s.page, fn))) { h.wisch.push(`${name} ${seite}: ${fn} fehlt`); continue; }
      await s.page.evaluate(([fn, sid]) => { try { closeSheet(); } catch (e) {} window[fn](sid || undefined); }, [fn, sid]);
      await warte(s.page, 300);
      const m = await s.page.evaluate(([seite, LANG]) => {
        const W = document.documentElement.clientWidth, v = document.getElementById("view");
        const sicht = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none"; };
        const out = { wisch: document.documentElement.scrollWidth > W + 1 || (v && v.scrollWidth > v.clientWidth + 1), rand: [], klein: [], name: [], kontrast: [], fehlt: [] };
        const inScroller = (e) => { for (let p = e.parentElement; p && p !== v; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true; } return false; };
        for (const el of v.querySelectorAll("*")) {
          if (!sicht(el) || inScroller(el) || getComputedStyle(el).position === "fixed" || el.closest("#alphaNav")) continue;
          const r = el.getBoundingClientRect();
          if (r.right > W + 1) out.rand.push((typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + " +" + Math.round(r.right - W));
        }
        // Knöpfe der neuen Teile ≥ 44 px (Zeilen ≥ 64 px)
        const neu = [];
        const k = v.querySelector(".akte-kopf");
        if (seite === "liste") {
          neu.push(...v.querySelectorAll(".sl-sort, #homeFilterBtn"));
          for (const z of v.querySelectorAll(".s-card.s-row")) if (sicht(z) && z.getBoundingClientRect().height < 63.5) out.klein.push(`Zeile ${Math.round(z.getBoundingClientRect().height)}px`);
          if (!v.querySelector(".sl-sort")) out.fehlt.push(".sl-sort");
          if (!v.querySelector(".s-row")) out.fehlt.push(".s-row");
        } else {
          if (!k) out.fehlt.push(".akte-kopf"); else neu.push(...k.querySelectorAll("button, a, [data-akte]"));
          if (seite === "termine") neu.push(...v.querySelectorAll(".at-neu, .at-liste button, .at-liste a"));
          if (seite === "pruefung") neu.push(...v.querySelectorAll("button, a"));
        }
        for (const b of new Set(neu)) { if (!sicht(b)) continue; const r = b.getBoundingClientRect(); if (r.height < 43.5) out.klein.push(`„${(b.textContent || "").trim().slice(0, 14)}“ ${Math.round(r.height)}px`); }
        // langer Name bricht um: kein Überlauf, keine Auslassungspunkte
        const namen = seite === "liste" ? [...v.querySelectorAll(".sr-name")].filter((e) => e.textContent.includes(LANG.slice(0, 20))) : seite === "ueberblick" ? [...v.querySelectorAll(".detail-name")] : [...v.querySelectorAll(".akte-kopf .ak-name")];
        if (!namen.length) out.fehlt.push("Name-Element");
        for (const e of namen) {
          const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
          if (e.scrollWidth > e.clientWidth + 1 || r.right > W + 1 || cs.textOverflow === "ellipsis") out.name.push(`${e.className} läuft über/abgeschnitten`);
        }
        // Kontrast der neuen Texte ≥ 4.5:1 (Titel ≥ 3:1)
        const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const hg = (el) => { const ebenen = []; while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c && c.a > 0) { ebenen.push(c); if (c.a >= 1) break; } el = el.parentElement; } let f = { r: 255, g: 255, b: 255 }; if (!ebenen.length || ebenen[ebenen.length - 1].a < 1) f = rgb(getComputedStyle(document.body).backgroundColor) || f; for (const c of ebenen.reverse()) f = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) }; return f; };
        const lum = (c) => { const q = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * q(c.r) + 0.7152 * q(c.g) + 0.0722 * q(c.b); };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        for (const el of v.querySelectorAll(".sl-titel, .sl-zahl, .sl-sort, .sr-name, .sr-sub, .sr-ring, .akte-kopf *, .at-liste *, .at-neu")) {
          if (!sicht(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const b = hg(el), c = rgb(getComputedStyle(el).color); if (!c) continue;
          const cc = { r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a) };
          const q = ratio(cc, b), min = el.classList.contains("sl-titel") ? 3 : 4.5;
          if (q < min) out.kontrast.push(`„${el.textContent.trim().slice(0, 14)}“ ${q.toFixed(1)}:1`);
        }
        return out;
      }, [seite, LANG]);
      const wo = `${name} ${seite}`;
      if (m.wisch) h.wisch.push(`${wo}: seitlich wischbar`);
      if (m.rand.length) h.wisch.push(`${wo}: ${m.rand.slice(0, 2).join(", ")}`);
      if (m.fehlt.length) h.knopf.push(`${wo}: fehlt ${m.fehlt.join(", ")}`);
      if (m.klein.length) h.knopf.push(`${wo}: ${m.klein.slice(0, 3).join(", ")}${m.klein.length > 3 ? ` (+${m.klein.length - 3})` : ""}`);
      if (m.name.length) h.name.push(`${wo}: ${m.name[0]}`);
      if (m.fehlt.includes("Name-Element") && seite !== "ueberblick") h.name.push(`${wo}: kein Namens-Element`);
      if (m.kontrast.length) h.kontrast.push(`${wo}: ${m.kontrast.slice(0, 2).join(", ")}`);
    }
    if (s.jsFehler.length) h.fehler.push(`${name}: ${s.jsFehler[0]}`);
    await s.ctx.close();
  }
}
const kurz = (l) => (l.length > 6 ? l.slice(0, 6).concat(`(+${l.length - 6} weitere)`) : l);
await pruefe("H1", "360/412 hoch, 915 quer, hell+dunkel: Liste und 5 Akte-Seiten nicht seitlich wischbar, nichts über den Rand", () => kurz(h.wisch));
await pruefe("H2", "Knöpfe der neuen Teile ≥ 44 px (Reiter, Chips, Termine, Prüfung), Zeilen ≥ 64 px", () => kurz(h.knopf));
await pruefe("H3", "lange Namen brechen um (Zeile, Überblick, Akte-Kopf)", () => kurz(h.name));
await pruefe("H4", "Kontrast der neuen Texte hell+dunkel ≥ 4.5:1", () => kurz(h.kontrast));
await pruefe("H5", "keine JS-Fehler in den Handy-Größen", () => h.fehler);

await browser.close();
server.close();

// ---------- H7 Nichts kaputt: die anderen Tests ----------
const ANDERE = ["heute-test.mjs", "reiter-test.mjs", "fahrstunde-test.mjs", "handy-test.mjs", "buero-test.mjs", "app-notiz-test.mjs", "abgleich-test.mjs", "zwei-geraete-test.mjs", "zahlen-test.mjs", "rechnen-test.mjs"];
if (process.env.AKTE_SCHNELL) {
  await pruefe("H7", "alle bisherigen Tests grün", () => ({ skip: "AKTE_SCHNELL gesetzt" }));
} else {
  const dir = join(REPO, "scripts");
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", FAHR_SCHNELL: "1" };
  await pruefe("H7", `alle bisherigen Tests grün (${ANDERE.join(", ")})`, () => {
    const f = [];
    for (const n of ANDERE) {
      const r = spawnSync(process.execPath, [join(dir, n)], { cwd: ROOT, env, encoding: "utf8", timeout: 600000 });
      if (r.status !== 0) f.push(`${n} Exit ${r.status}${r.signal ? " " + r.signal : ""}: ${((r.stdout || "") + (r.stderr || "")).split("\n").filter((z) => /FEHLER|PROBLEM|Error/.test(z)).slice(0, 2).join(" / ")}`);
    }
    return f;
  });
}

console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
