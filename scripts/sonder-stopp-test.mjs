// Sonderfahrt-Stopp-Test: Die Büro-Rückfrage „STOPP vom Büro … Trotzdem eintragen?“ soll auch kommen, wenn aus dem
// Ausbildungsplan heraus NEUE Kalendertermine entstehen (Sonderfahrt-Zeit übernehmen, Terminvorschläge, Plan-Datum → Kalender).
// Geschrieben VOR dem Bau: gegen den alten Stand sind T1, T5 und T6 (Fälle „Nein“) rot. Das ist gewollt.
// Punkte mit „bleibt“ prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// confirm() wird im Browser ersetzt (Zähler + Texte + feste Antwort), es erscheint kein echtes Fenster.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/sonder-stopp-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), SONDER_SCHNELL=1 (T9: die anderen Tests nicht mitlaufen lassen).
// T9 läuft auch nicht, wenn dieser Test selbst von einem anderen *-test.mjs gestartet wurde (dessen SCHNELL-Schalter gesetzt oder
// der aufrufende Prozess ist ein *-test.mjs) – sonst liefen alle Tests mehrfach ineinander.
//
// Geprüfte Funktionen (index.html):
//   commitSonderZeit(s, grp, idx, date, von)    – Plan → „Kalendertermin“-Blatt → Übernehmen
//   buchMultiTermine(sid, cfg, ausgewaehlt)     – Terminvorschläge; cfg.art "sonder" (+ cfg.grp) oder "fahrstunde" (Übungsfahrt)
//   syncSonderToKalender(s, grp, idx, iso)      – Plan-Datum einer Sonderfahrt in den Kalender übernehmen
//                                                 (heißt der Bau sie ensureSonderTermin, wird diese genommen)
//   openAssignSlotSheet(date, von, bis, art)    – freier Slot → Schüler tippen → finishBooking (fragt schon heute)
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

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const STOPP_TEXT = "Erfundener Stopp: Rechnung offen, bitte erst ins Büro";
const INFO_TEXT = "Erfundene Info: neue Handynummer";

// Im Browser: Testdaten setzen, confirm ersetzen, Hilfen.
// s1 = mit Stopp (und einer Info), s2 = ohne Notiz, s3 = nur Info.
const HILFEN = `
window.__t = {
  setze() {
    try { closeSheet(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" };
      s.plan.sonder = { ueberland: [{ d: "01.10.26", iso: "2026-10-01" }], autobahn: [], nacht: [] }; ensure(s); return s; };
    DB.students = [mk("s1", "Stella Erfunden-Stopp"), mk("s2", "Otto Erfunden-Ohne"), mk("s3", "Ina Erfunden-Info")];
    DB.lessons = [
      { id: "L1", date: "2026-10-12", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s1", name: "", status: "geplant", note: "", fc: null },
      { id: "L2", date: "2026-10-12", von: "10:00", bis: "11:30", art: "fahrstunde", sid: "s2", name: "", status: "geplant", note: "", fc: null },
    ];
    DB.termine = []; DB.exams = [];
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];   // ensureDB füllt sonst Standard-Autos ein
    _bueroNotizen = {
      s1: [{ id: "n1", art: "stopp", text: ${JSON.stringify(STOPP_TEXT)}, gelesen: true }, { id: "n2", art: "info", text: ${JSON.stringify(INFO_TEXT)}, gelesen: true }],
      s3: [{ id: "n3", art: "info", text: ${JSON.stringify(INFO_TEXT)}, gelesen: true }],
    };
    _navStack = [];
    save();
  },
  conf(antwort) { window.__c = { n: 0, texte: [] }; window.confirm = (t) => { window.__c.n++; window.__c.texte.push(String(t)); return antwort; }; },
  stud: (id) => DB.students.find((x) => x.id === id),
  plan: (id) => JSON.stringify(DB.students.find((x) => x.id === id).plan.sonder),
  lessons: () => JSON.parse(JSON.stringify(DB.lessons)),
  // Fehler beim Aufruf abfangen (zählt als JS-Fehler)
  ruf(fn) { try { fn(); return null; } catch (e) { return String(e && e.message || e); } },
  // Plan-Datum → Kalender: neuer Name (falls gebaut) oder der bisherige
  syncFn() { return typeof window.ensureSonderTermin === "function" ? window.ensureSonderTermin : (typeof window.syncSonderToKalender === "function" ? window.syncSonderToKalender : null); },
};`;

async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => { jsFehler.push(`echtes Dialogfenster (${d.type()}): ${d.message().slice(0, 60)}`); d.dismiss().catch(() => {}); });
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
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

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const { ctx, page: p, jsFehler } = await neueSeite(412, 915);
// Liste aller Fälle ohne Stopp (T7b sammelt, ob irgendwo gefragt wurde)
const ohneStoppFragen = [];

// Prüft Rückfrage-Text: genau einmal, enthält STOPP und den Stopp-Text
function pruefeFrage(c, f, wo, genau = 1) {
  if (c.n !== genau) { f.push(`${wo}: confirm ${c.n}× aufgerufen statt ${genau}×`); return; }
  for (const t of c.texte) {
    if (!t.includes("STOPP")) f.push(`${wo}: Rückfrage ohne „STOPP“ („${t.slice(0, 60)}“)`);
    if (!t.includes(STOPP_TEXT)) f.push(`${wo}: Rückfrage ohne Notiztext`);
  }
}

await pruefe("T0", "Testaufbau: Uhr steht fest (todayISO() = 2026-10-14), Testdaten und Büro-Notizen gesetzt, Funktionen vorhanden", async () => {
  const r = await p.evaluate(() => { __t.setze(); return { iso: todayISO(), n: DB.students.length, notiz: (_bueroNotizen.s1 || []).length,
    fn: ["commitSonderZeit", "buchMultiTermine", "openAssignSlotSheet", "addLesson"].filter((n) => typeof window[n] !== "function"), sync: !!__t.syncFn() }; });
  const f = [];
  if (r.iso !== TAG) f.push(`todayISO()=${r.iso}`);
  if (r.n !== 3) f.push(`${r.n} Schüler`);
  if (r.notiz !== 2) f.push(`_bueroNotizen.s1 hat ${r.notiz} Einträge`);
  if (r.fn.length) f.push(`fehlt: ${r.fn.join(", ")}`);
  if (!r.sync) f.push("weder ensureSonderTermin noch syncSonderToKalender vorhanden");
  return f;
});

// ===== T1/T2/T3: commitSonderZeit legt NEUEN Termin an =====
const DATUM_SF = "2026-10-20", VON_SF = "13:00";
async function commitNeu(sid, antwort, grp = "ueberland", idx = 1) {
  return p.evaluate(({ sid, antwort, grp, idx, DATUM_SF, VON_SF }) => {
    __t.setze(); try { routePlan(sid); } catch (e) {}
    __t.conf(antwort);
    const vorPlan = __t.plan(sid), vorN = DB.lessons.length;
    const err = __t.ruf(() => commitSonderZeit(__t.stud(sid), grp, idx, DATUM_SF, VON_SF));
    const key = sid + ":" + grp + ":" + idx;
    const neu = DB.lessons.slice(vorN);
    const r = { err, c: window.__c, vorPlan, nachPlan: __t.plan(sid), vorN, nachN: DB.lessons.length, neu, eintrag: __t.stud(sid).plan.sonder[grp][idx] || null, key };
    try { closeSheet(); } catch (e) {}
    return r;
  }, { sid, antwort, grp, idx, DATUM_SF, VON_SF });
}

await pruefe("T1", "commitSonderZeit mit Stopp, Antwort „Nein“: kein neuer Termin, Plan-Eintrag unverändert, genau eine Rückfrage mit STOPP + Notiztext", async () => {
  const r = await commitNeu("s1", false), f = [];
  if (r.err) f.push(`JS-Fehler: ${r.err}`);
  pruefeFrage(r.c, f, "commitSonderZeit");
  if (r.nachN !== r.vorN) f.push(`${r.nachN - r.vorN} neue(r) Termin(e) in DB.lessons (${r.neu.map((l) => `${l.art} ${l.date} ${l.von}`).join(", ")})`);
  if (r.nachPlan !== r.vorPlan) f.push(`Plan geändert: vorher ${r.vorPlan}, nachher ${r.nachPlan}`);
  return f;
});

await pruefe("T2", "commitSonderZeit mit Stopp, Antwort „Ja“: genau ein neuer Termin (art sonder, srcSonder), Plan-Eintrag gesetzt", async () => {
  const r = await commitNeu("s1", true), f = [];
  if (r.err) f.push(`JS-Fehler: ${r.err}`);
  if (r.c.n > 1) f.push(`confirm ${r.c.n}× aufgerufen`);
  if (r.neu.length !== 1) f.push(`${r.neu.length} neue Termine statt 1`);
  else {
    const l = r.neu[0];
    if (l.art !== "sonder") f.push(`art „${l.art}“`);
    if (l.srcSonder !== r.key) f.push(`srcSonder „${l.srcSonder}“ statt „${r.key}“`);
    if (l.date !== DATUM_SF || l.von !== VON_SF) f.push(`Termin ${l.date} ${l.von} statt ${DATUM_SF} ${VON_SF}`);
    if (l.sid !== "s1") f.push(`sid ${l.sid}`);
  }
  if (!r.eintrag || r.eintrag.iso !== DATUM_SF) f.push(`Plan-Eintrag ${JSON.stringify(r.eintrag)}`);
  return f;
});

await pruefe("T3", "commitSonderZeit ohne Stopp (keine Notiz / nur Info): keine Rückfrage, Termin entsteht", async () => {
  const f = [];
  for (const sid of ["s2", "s3"]) {
    const r = await commitNeu(sid, false);
    const wo = sid === "s2" ? "ohne Notiz" : "nur Info";
    if (r.err) f.push(`${wo}: JS-Fehler ${r.err}`);
    if (r.c.n) { f.push(`${wo}: confirm ${r.c.n}× („${r.c.texte[0].slice(0, 50)}“)`); ohneStoppFragen.push(`commitSonderZeit ${wo}`); }
    if (r.neu.length !== 1 || r.neu[0].srcSonder !== r.key) f.push(`${wo}: ${r.neu.length} neue Termine (erwartet 1 mit srcSonder ${r.key})`);
    if (!r.eintrag || r.eintrag.iso !== DATUM_SF) f.push(`${wo}: Plan-Eintrag ${JSON.stringify(r.eintrag)}`);
  }
  return f;
});

// ===== T4: commitSonderZeit ändert nur (verknüpfter Termin / Umwandlung) =====
await pruefe("T4", "commitSonderZeit mit Stopp, aber nur Zeit ändern (srcSonder schon da) oder Fahrstunde am selben Tag umwandeln: keine Rückfrage, kein neuer Termin, Verhalten wie bisher", async () => {
  const r = await p.evaluate(() => {
    const aus = {};
    // a) verknüpfter Termin existiert schon
    __t.setze(); try { routePlan("s1"); } catch (e) {}
    DB.students[0].plan.sonder.ueberland[1] = { d: "20.10.26", iso: "2026-10-20" };
    DB.lessons.push({ id: "LX", date: "2026-10-20", von: "13:00", bis: "14:30", art: "sonder", sid: "s1", name: "", status: "geplant", note: "Überlandfahrt", fc: null, srcSonder: "s1:ueberland:1" });
    __t.conf(false);
    let n = DB.lessons.length;
    const errA = __t.ruf(() => commitSonderZeit(__t.stud("s1"), "ueberland", 1, "2026-10-21", "15:00"));
    const lx = DB.lessons.find((l) => l.id === "LX");
    aus.a = { err: errA, c: window.__c, neu: DB.lessons.length - n, lx: lx && { date: lx.date, von: lx.von, art: lx.art }, eintrag: __t.stud("s1").plan.sonder.ueberland[1] };
    // b) Fahrstunde am selben Tag wird umgewandelt
    __t.setze(); try { routePlan("s1"); } catch (e) {}
    DB.lessons.push({ id: "LF", date: "2026-10-22", von: "09:00", bis: "10:30", art: "fahrstunde", sid: "s1", name: "", status: "geplant", note: "", fc: null });
    __t.conf(false);
    n = DB.lessons.length;
    const errB = __t.ruf(() => commitSonderZeit(__t.stud("s1"), "autobahn", 0, "2026-10-22", "09:00"));
    const lf = DB.lessons.find((l) => l.id === "LF");
    aus.b = { err: errB, c: window.__c, neu: DB.lessons.length - n, lf: lf && { art: lf.art, srcSonder: lf.srcSonder || null }, eintrag: __t.stud("s1").plan.sonder.autobahn[0] || null };
    try { closeSheet(); } catch (e) {}
    return aus;
  });
  const f = [];
  const a = r.a, b = r.b;
  if (a.err) f.push(`Zeit ändern: JS-Fehler ${a.err}`);
  if (a.c.n) f.push(`Zeit ändern: confirm ${a.c.n}×`);
  if (a.neu) f.push(`Zeit ändern: ${a.neu} neue Termine`);
  if (!a.lx || a.lx.date !== "2026-10-21" || a.lx.von !== "15:00" || a.lx.art !== "sonder") f.push(`Zeit ändern: Termin ${JSON.stringify(a.lx)} statt 2026-10-21 15:00 sonder`);
  if (!a.eintrag || a.eintrag.iso !== "2026-10-21") f.push(`Zeit ändern: Plan-Eintrag ${JSON.stringify(a.eintrag)}`);
  if (b.err) f.push(`Umwandeln: JS-Fehler ${b.err}`);
  if (b.c.n) f.push(`Umwandeln: confirm ${b.c.n}×`);
  if (b.neu) f.push(`Umwandeln: ${b.neu} neue Termine`);
  if (!b.lf || b.lf.art !== "sonder" || b.lf.srcSonder !== "s1:autobahn:0") f.push(`Umwandeln: Fahrstunde ${JSON.stringify(b.lf)} statt sonder mit srcSonder s1:autobahn:0`);
  if (!b.eintrag || b.eintrag.iso !== "2026-10-22") f.push(`Umwandeln: Plan-Eintrag ${JSON.stringify(b.eintrag)}`);
  return f;
});

// ===== T5: buchMultiTermine (Terminvorschläge) =====
const SLOTS = [{ date: "2026-10-26", von: "18:00", bis: "19:30", fahrzeug: "—" }, { date: "2026-10-28", von: "18:00", bis: "19:30", fahrzeug: "—" }];
async function multi(sid, cfg, antwort) {
  return p.evaluate(({ sid, cfg, antwort, SLOTS }) => {
    __t.setze(); try { routePlan(sid); } catch (e) {}
    __t.conf(antwort);
    const vorPlan = __t.plan(sid), vorN = DB.lessons.length;
    const err = __t.ruf(() => buchMultiTermine(sid, cfg, JSON.parse(JSON.stringify(SLOTS))));
    const r = { err, c: window.__c, vorPlan, nachPlan: __t.plan(sid), neu: DB.lessons.slice(vorN), weg: vorN > DB.lessons.length };
    try { closeSheet(); } catch (e) {}
    return r;
  }, { sid, cfg, antwort, SLOTS });
}
const CFG_SONDER = { art: "sonder", grp: "nacht" };
const CFG_UEBUNG = { art: "fahrstunde", grp: null };

await pruefe("T5a", "buchMultiTermine Sonderfahrt (nacht) mit Stopp, „Nein“: kein Termin, Plan unverändert, genau eine Rückfrage mit STOPP + Notiztext", async () => {
  const r = await multi("s1", CFG_SONDER, false), f = [];
  if (r.err) f.push(`JS-Fehler: ${r.err}`);
  pruefeFrage(r.c, f, "buchMultiTermine sonder");
  if (r.neu.length) f.push(`${r.neu.length} Termin(e) angelegt`);
  if (r.nachPlan !== r.vorPlan) f.push(`Plan geändert: ${r.nachPlan}`);
  return f;
});
await pruefe("T5b", "buchMultiTermine Übungsfahrt mit Stopp, „Nein“: kein Termin, Plan unverändert, genau eine Rückfrage mit STOPP + Notiztext", async () => {
  const r = await multi("s1", CFG_UEBUNG, false), f = [];
  if (r.err) f.push(`JS-Fehler: ${r.err}`);
  pruefeFrage(r.c, f, "buchMultiTermine Übungsfahrt");
  if (r.neu.length) f.push(`${r.neu.length} Termin(e) angelegt`);
  if (r.nachPlan !== r.vorPlan) f.push(`Plan geändert: ${r.nachPlan}`);
  return f;
});
await pruefe("T5c", "buchMultiTermine mit Stopp, „Ja“: Sonderfahrt → 2 Termine art sonder mit srcSonder + Plan-Einträge; Übungsfahrt → 2 Termine art fahrstunde; höchstens eine Rückfrage je Buchung", async () => {
  const f = [];
  const a = await multi("s1", CFG_SONDER, true);
  if (a.err) f.push(`sonder: JS-Fehler ${a.err}`);
  if (a.c.n > 1) f.push(`sonder: confirm ${a.c.n}×`);
  if (a.neu.length !== 2) f.push(`sonder: ${a.neu.length} Termine statt 2`);
  const keys = a.neu.map((l) => l.srcSonder).sort().join(",");
  if (a.neu.some((l) => l.art !== "sonder") || keys !== "s1:nacht:0,s1:nacht:1") f.push(`sonder: ${a.neu.map((l) => `${l.art}/${l.srcSonder}`).join(", ")}`);
  const nacht = JSON.parse(a.nachPlan).nacht;
  if (!(nacht[0] && nacht[0].iso === SLOTS[0].date && nacht[1] && nacht[1].iso === SLOTS[1].date)) f.push(`sonder: Plan nacht ${JSON.stringify(nacht)}`);
  const b = await multi("s1", CFG_UEBUNG, true);
  if (b.err) f.push(`Übungsfahrt: JS-Fehler ${b.err}`);
  if (b.c.n > 1) f.push(`Übungsfahrt: confirm ${b.c.n}×`);
  if (b.neu.length !== 2 || b.neu.some((l) => l.art !== "fahrstunde" || l.sid !== "s1")) f.push(`Übungsfahrt: ${b.neu.map((l) => `${l.art}/${l.sid}`).join(", ") || "keine"} (erwartet 2× fahrstunde)`);
  if (b.nachPlan !== b.vorPlan) f.push("Übungsfahrt: Plan geändert");
  return f;
});
await pruefe("T5d", "bleibt: buchMultiTermine ohne Stopp (keine Notiz / nur Info): keine Rückfrage, Termine entstehen", async () => {
  const f = [];
  for (const sid of ["s2", "s3"]) for (const [cfg, n] of [[CFG_SONDER, "sonder"], [CFG_UEBUNG, "Übungsfahrt"]]) {
    const r = await multi(sid, cfg, false);
    const wo = `${sid === "s2" ? "ohne Notiz" : "nur Info"} ${n}`;
    if (r.err) f.push(`${wo}: JS-Fehler ${r.err}`);
    if (r.c.n) { f.push(`${wo}: confirm ${r.c.n}×`); ohneStoppFragen.push(`buchMultiTermine ${wo}`); }
    if (r.neu.length !== 2) f.push(`${wo}: ${r.neu.length} Termine statt 2`);
  }
  return f;
});

// ===== T6: Plan-Datum → Kalender (syncSonderToKalender / ensureSonderTermin) =====
const DATUM_SYNC = "2026-10-23";
async function sync(sid, antwort, vorbereiten = "") {
  return p.evaluate(({ sid, antwort, DATUM_SYNC, vorbereiten }) => {
    __t.setze(); try { routePlan(sid); } catch (e) {}
    if (vorbereiten) (0, eval)(vorbereiten);
    __t.conf(antwort);
    const fn = __t.syncFn();
    if (!fn) return { fehlt: true };
    const s = __t.stud(sid);
    s.plan.sonder.ueberland[2] = { d: isoToShort(DATUM_SYNC), iso: DATUM_SYNC };   // so steht es im Plan, wenn das Datum übernommen wird
    const vorN = DB.lessons.length;
    const err = __t.ruf(() => fn(s, "ueberland", 2, DATUM_SYNC));
    const key = sid + ":ueberland:2";
    const r = { err, c: window.__c, neu: DB.lessons.slice(vorN), mitKey: DB.lessons.filter((l) => l.srcSonder === key).map((l) => ({ date: l.date, art: l.art })), key, name: fn.name };
    try { closeSheet(); } catch (e) {}
    return r;
  }, { sid, antwort, DATUM_SYNC, vorbereiten });
}

await pruefe("T6a", "Plan-Datum → Kalender mit Stopp, „Nein“: kein Kalendertermin, kein JS-Fehler, genau eine Rückfrage mit STOPP + Notiztext", async () => {
  const r = await sync("s1", false), f = [];
  if (r.fehlt) return "Funktion fehlt";
  if (r.err) f.push(`${r.name}: JS-Fehler ${r.err}`);
  pruefeFrage(r.c, f, r.name);
  if (r.neu.length || r.mitKey.length) f.push(`${r.name}: ${r.neu.length} Termin(e) angelegt (${r.mitKey.map((l) => l.date).join(", ")})`);
  return f;
});
await pruefe("T6b", "Plan-Datum → Kalender mit Stopp, „Ja“: genau ein Termin art sonder mit srcSonder am Plan-Datum", async () => {
  const r = await sync("s1", true), f = [];
  if (r.fehlt) return "Funktion fehlt";
  if (r.err) f.push(`${r.name}: JS-Fehler ${r.err}`);
  if (r.c.n > 1) f.push(`confirm ${r.c.n}×`);
  if (r.mitKey.length !== 1 || r.mitKey[0].date !== DATUM_SYNC || r.mitKey[0].art !== "sonder") f.push(`${r.name}: Termine mit ${r.key}: ${JSON.stringify(r.mitKey)}`);
  return f;
});
await pruefe("T6c", "bleibt: Plan-Datum → Kalender ohne Stopp (keine Notiz / nur Info): keine Rückfrage, Termin entsteht", async () => {
  const f = [];
  for (const sid of ["s2", "s3"]) {
    const r = await sync(sid, false);
    if (r.fehlt) return "Funktion fehlt";
    const wo = sid === "s2" ? "ohne Notiz" : "nur Info";
    if (r.err) f.push(`${wo}: JS-Fehler ${r.err}`);
    if (r.c.n) { f.push(`${wo}: confirm ${r.c.n}×`); ohneStoppFragen.push(`${r.name} ${wo}`); }
    if (r.mitKey.length !== 1 || r.mitKey[0].date !== DATUM_SYNC) f.push(`${wo}: Termine mit ${r.key}: ${JSON.stringify(r.mitKey)}`);
  }
  return f;
});
await pruefe("T6d", "bleibt: Plan-Datum → Kalender mit Stopp, aber Termin schon verknüpft (nur Datum ändern): keine Rückfrage, kein zweiter Termin", async () => {
  const r = await sync("s1", false, `DB.lessons.push({ id: "LS", date: "2026-10-19", von: "10:00", bis: "11:30", art: "sonder", sid: "s1", name: "", status: "geplant", note: "Überlandfahrt", fc: null, srcSonder: "s1:ueberland:2" });`), f = [];
  if (r.fehlt) return "Funktion fehlt";
  if (r.err) f.push(`JS-Fehler ${r.err}`);
  if (r.c.n) f.push(`confirm ${r.c.n}×`);
  if (r.neu.length) f.push(`${r.neu.length} neue Termine`);
  if (r.mitKey.length !== 1 || r.mitKey[0].date !== DATUM_SYNC) f.push(`verknüpfter Termin ${JSON.stringify(r.mitKey)} (Datum soll ${DATUM_SYNC} sein)`);
  return f;
});

// ===== T7: finishBooking (Kalender → freier Slot → Schüler) bleibt =====
async function slotBuchen(sid, antwort) {
  return p.evaluate(({ sid, antwort }) => {
    __t.setze();
    try { routeKalender(); } catch (e) {}
    __t.conf(antwort);
    const vorN = DB.lessons.length;
    let err = __t.ruf(() => openAssignSlotSheet("2026-10-27", "14:00", "15:30", "fahrstunde"));
    const b = document.querySelector(`#asList .as-item[data-sid="${sid}"]`);
    if (!b) err = (err ? err + "; " : "") + `#asList .as-item[data-sid=${sid}] fehlt`;
    else { const e2 = __t.ruf(() => b.click()); if (e2) err = (err ? err + "; " : "") + e2; }
    // Fahrzeug-Blatt (openVehiclePicker) erscheint nur nach „Ja“ bzw. ohne Stopp: das eine Testauto wählen
    const fz = document.querySelector("#sheet .fz-opt");
    if (fz) { const e3 = __t.ruf(() => fz.click()); if (e3) err = (err ? err + "; " : "") + e3; }
    const r = { err, c: window.__c, neu: DB.lessons.slice(vorN).map((l) => ({ art: l.art, sid: l.sid, date: l.date, von: l.von })) };
    try { closeSheet(); } catch (e) {}
    return r;
  }, { sid, antwort });
}
await pruefe("T7a", "bleibt: openAssignSlotSheet → finishBooking mit Stopp fragt wie bisher (Nein: kein Termin, Ja: ein Termin)", async () => {
  const f = [];
  const a = await slotBuchen("s1", false);
  if (a.err) f.push(`Nein: ${a.err}`);
  pruefeFrage(a.c, f, "finishBooking Nein");
  if (a.neu.length) f.push(`Nein: ${a.neu.length} Termin(e) angelegt`);
  const b = await slotBuchen("s1", true);
  if (b.err) f.push(`Ja: ${b.err}`);
  pruefeFrage(b.c, f, "finishBooking Ja");
  if (b.neu.length !== 1 || b.neu[0].sid !== "s1" || b.neu[0].date !== "2026-10-27" || b.neu[0].von !== "14:00") f.push(`Ja: neue Termine ${JSON.stringify(b.neu)}`);
  return f;
});
await pruefe("T7b", "bleibt: ohne Stopp nirgends eine Rückfrage (finishBooking + alle Fälle aus T3, T5d, T6c)", async () => {
  const f = [];
  for (const sid of ["s2", "s3"]) {
    const r = await slotBuchen(sid, false);
    const wo = sid === "s2" ? "ohne Notiz" : "nur Info";
    if (r.err) f.push(`finishBooking ${wo}: ${r.err}`);
    if (r.c.n) { f.push(`finishBooking ${wo}: confirm ${r.c.n}×`); }
    if (r.neu.length !== 1) f.push(`finishBooking ${wo}: ${r.neu.length} Termine statt 1`);
  }
  for (const x of ohneStoppFragen) f.push(`Rückfrage bei ${x}`);
  return f;
});
await pruefe("T7c", "bleibt: keine JS-Fehler und keine echten Dialogfenster im ganzen Lauf", () => jsFehler.map((e) => e.split("\n")[0]));

await ctx.close();
await browser.close();
server.close();

// ---------- T9 Nichts kaputt: die anderen Tests ----------
// Eltern-Prozess ist selbst „node …/xyz-test.mjs“ (nicht die Shell, in der man den Test von Hand startet)?
const elternTest = (() => {
  try {
    const a = readFileSync(`/proc/${process.ppid}/cmdline`, "utf8").split("\0").filter(Boolean);
    return /(^|\/)node(js)?$/.test(a[0] || "") && a.slice(1).some((x) => /-test\.mjs$/.test(x));
  } catch (e) { return false; }
})();
const verschachtelt = ["SEITEN_SCHNELL", "HEUTE_SCHNELL", "AKTE_SCHNELL", "FAHR_SCHNELL", "WETTER_SCHNELL", "WETTER2_SCHNELL", "ORDNUNG_SCHNELL"].filter((v) => process.env[v]);
if (process.env.SONDER_SCHNELL) {
  await pruefe("T9", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "SONDER_SCHNELL gesetzt" }));
} else if (elternTest || verschachtelt.length) {
  await pruefe("T9", "alle anderen scripts/*-test.mjs grün", () => ({ skip: `läuft selbst unter einem anderen Test (${elternTest ? "Eltern-Prozess ist ein *-test.mjs" : verschachtelt.join(", ") + " gesetzt"})` }));
} else {
  const dir = join(REPO, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "sonder-stopp-test.mjs").sort();
  // Die anderen Tests sollen nicht ihrerseits noch einmal alle Tests (oder diesen hier) starten.
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", AKTE_SCHNELL: "1", FAHR_SCHNELL: "1", SEITEN_SCHNELL: "1", WETTER_SCHNELL: "1", WETTER2_SCHNELL: "1", ORDNUNG_SCHNELL: "1", SONDER_SCHNELL: "1" };
  await pruefe("T9", `alle anderen Tests grün (${tests.join(", ")})`, () => {
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
