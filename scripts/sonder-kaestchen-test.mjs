// Sonderfahrt-Kästchen-Test (W13 PR 2): Ein Sonder-Termin füllt im Ausbildungsplan so viele Kästchen, wie Sonderfahrt-Einheiten
// hineinpassen (KR.sonderMinuten(), Vorgabe 45 Minuten): 90 Minuten = 2 Kästchen. Gilt beim Anlegen aus dem Plan, beim
// Verknüpfen eines vorhandenen Termins, bei „Mehrere Termine planen“, bei „Welche Sonderfahrt?“, beim Lösen und Löschen
// (jeweils mit Rückgängig für alle Kästchen) und bei einer neuen Zeit. Alte Termine mit nur einem Kästchen laufen weiter.
// Jeder Prüfpunkt gibt eine Zeile „ok“ oder „FEHLER“ aus.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/sonder-kaestchen-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.slice(0, 10).join(" · ") : r}`);
}

// ---------- Rechnung ohne Browser (kompass-rechnen.js) ----------
const KR = require(join(ROOT, "kompass-rechnen.js"));
await pruefe("K1", "KR: Vorgabe 45 Minuten; volle Einheiten (90 = 2, 45 = 1, 60 = 1, 80 = 1, 120 = 2, 135 = 3), über Mitternacht 22:30–00:00 = 2, Tippfehler 10–09 Uhr und ohne Zeit = 1; eigene Einheit 90 → 90 Min = 1; Unsinn → 45", () => {
  const f = [], e = (v, b) => KR.sonderEinheiten(v, b);
  KR.setzeSonderMinuten(null);
  if (KR.sonderMinuten() !== 45) f.push(`Vorgabe ${KR.sonderMinuten()}`);
  for (const [v, b, soll] of [["10:00", "11:30", 2], ["10:00", "10:45", 1], ["10:00", "11:00", 1], ["10:00", "12:15", 3], ["10:00", "11:20", 1], ["10:00", "12:00", 2], ["22:30", "00:00", 2], ["23:00", "02:00", 4], ["10:00", "09:00", 1], ["", "", 1], ["10:00", "10:00", 1]])
    if (e(v, b) !== soll) f.push(`${v}–${b}: ${e(v, b)} statt ${soll}`);
  if (KR.terminMinuten("22:30", "00:00") !== 90 || KR.terminMinuten("10:00", "09:00") !== 0 || KR.terminMinuten("23:00", "05:00") !== 360) f.push("terminMinuten über Mitternacht falsch");
  if (KR.sonderEinheitenAusMinuten(135) !== 3 || KR.sonderEinheitenAusMinuten(80) !== 1 || KR.sonderEinheitenAusMinuten(0) !== 0) f.push("Minuten-Summe abgerundet falsch");
  KR.setzeSonderMinuten(90);
  if (KR.sonderMinuten() !== 90 || e("10:00", "11:30") !== 1 || KR.sonderEinheitenAusMinuten(135) !== 1) f.push("Einheit 90 wirkt nicht");
  KR.setzeSonderMinuten("60");
  if (KR.sonderMinuten() !== 60) f.push("Text „60“ wird nicht gelesen");
  for (const x of ["abc", 20, 120, 45.5, {}]) { KR.setzeSonderMinuten(x); if (KR.sonderMinuten() !== 45) f.push(`Unsinn ${JSON.stringify(x)} ergibt ${KR.sonderMinuten()}`); }
  KR.setzeSonderMinuten(null);
  if (KR.fcGebucht({ art: "sonder", von: "10:00", bis: "11:30" }) !== 2) f.push("Fahrchecks bleiben nicht bei 45 Minuten");
  if (KR.fcVomBuero({ art: "sonder", von: "10:00", bis: "11:30", status: "nicht erschienen", bueroFcAnzahl: 2 }) !== 0) f.push("ausgefallen zählt mit Zahl vom Büro");
  return f;
});

// ---------- App im Browser ----------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); // wie die anderen Tests: in GitHub ohne festen Pfad
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const HILFEN = `
window.__t = {
  setze(blockMin) {
    try { closeSheet(); } catch (e) {}
    ensureAusbildungsplaene(); ensureDB();
    KR.setzeSonderMinuten(null);
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" };
      s.plan.sonder = { ueberland: [{ d: "01.10.26", iso: "2026-10-01" }], autobahn: [], nacht: [] }; ensure(s); return s; };
    DB.students = [mk("s1", "Erfunden Eins"), mk("s2", "Erfunden Zwei"), mk("s3", "Erfunden Drei")];
    DB.lessons = [
      { id: "L1", date: "2026-10-20", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s1", name: "", status: "geplant", note: "", fc: null },
      { id: "L2", date: "2026-10-22", von: "10:00", bis: "11:30", art: "fahrstunde", sid: "s2", name: "", status: "geplant", note: "Erfunden", fc: null },
    ];
    DB.termine = []; DB.exams = [];
    DB.workCfg.blockMin = blockMin || 90;
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];
    _bueroNotizen = {};
    _navStack = [];
    try { const t = document.getElementById("toast"); t._undos = []; t.classList.remove("show", "undo"); } catch (e) {}
    save();
  },
  plan: (sid, g) => DB.students.find((x) => x.id === sid).plan.sonder[g].map((o) => (o && o.iso) || null),
  termine: (sid) => DB.lessons.filter((l) => l.sid === sid && l.srcSonder).map((l) => ({ id: l.id, art: l.art, date: l.date, von: l.von, bis: l.bis, key: l.srcSonder, idx: l.srcSonderIdx || null })),
  lesson: (id) => { const l = DB.lessons.find((x) => x.id === id); return l ? JSON.parse(JSON.stringify(l)) : null; },
  rueck() { const b = document.querySelector("#toast .ut-btn"); if (!b) return false; b.click(); return true; },
};`;

const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const p = await ctx.newPage();
const jsFehler = [];
p.on("pageerror", (e) => jsFehler.push(e.message));
p.on("dialog", (d) => { jsFehler.push(`echtes Dialogfenster (${d.type()}): ${d.message().slice(0, 60)}`); d.dismiss().catch(() => {}); });
await p.clock.setFixedTime(JETZT);
await p.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await p.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await p.waitForTimeout(600);
await p.evaluate((h) => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
  (0, eval)(h);
}, HILFEN);
const warte = (ms = 250) => p.waitForTimeout(ms);
const T = "2026-10-26", T2 = "2026-10-28";

await pruefe("K2", "Plan → Kalendertermin (90 Min): Kästchen 2 gewählt, Kästchen 2 und 3 bekommen das Datum, ein Termin mit srcSonder …:1 und srcSonderIdx [1,2]; das von Hand abgehakte Kästchen 1 bleibt; Rückgängig leert beide und löscht den Termin", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "ueberland", 1, T, "10:00"), { T });
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland")), tm = await p.evaluate(() => __t.termine("s1"));
  if (JSON.stringify(plan.slice(0, 3)) !== JSON.stringify(["2026-10-01", T, T])) f.push(`Plan ${JSON.stringify(plan)}`);
  if (tm.length !== 1 || tm[0].key !== "s1:ueberland:1" || JSON.stringify(tm[0].idx) !== "[1,2]" || tm[0].bis !== "11:30") f.push(`Termine ${JSON.stringify(tm)}`);
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(300);
  const plan2 = await p.evaluate(() => __t.plan("s1", "ueberland")), tm2 = await p.evaluate(() => __t.termine("s1"));
  if (JSON.stringify(plan2.slice(0, 3)) !== JSON.stringify(["2026-10-01", null, null])) f.push(`nach Rückgängig Plan ${JSON.stringify(plan2)}`);
  if (tm2.length || (await p.evaluate(() => DB.lessons.filter((l) => l.sid === "s1" && l.art === "sonder").length))) f.push("nach Rückgängig steht noch ein Termin");
  return f;
});

await pruefe("K3", "Terminlänge 45 Minuten (blockMin 45): nur 1 Kästchen, kein srcSonderIdx (wie bisher)", async () => {
  await p.evaluate(() => __t.setze(45));
  await p.evaluate(({ T }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "autobahn", 0, T, "10:00"), { T });
  const plan = await p.evaluate(() => __t.plan("s1", "autobahn")), tm = await p.evaluate(() => __t.termine("s1"));
  const f = [];
  if (plan[0] !== T || plan[1]) f.push(`Plan ${JSON.stringify(plan)}`);
  if (tm.length !== 1 || tm[0].idx !== null) f.push(`Termine ${JSON.stringify(tm)}`);
  return f;
});

await pruefe("K4", "Verknüpfen: vorhandene Übungsfahrt (90 Min) am Tag wird zur Autobahnfahrt und füllt 2 Kästchen; Rückgängig: wieder Übungsfahrt ohne Verknüpfung, beide Kästchen leer", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(() => commitSonderZeit(DB.students.find((x) => x.id === "s2"), "autobahn", 0, "2026-10-22", "10:00"));
  const l = await p.evaluate(() => __t.lesson("L2")), plan = await p.evaluate(() => __t.plan("s2", "autobahn"));
  if (!l || l.art !== "sonder" || l.srcSonder !== "s2:autobahn:0" || JSON.stringify(l.srcSonderIdx) !== "[0,1]") f.push(`Termin ${JSON.stringify(l)}`);
  if (plan[0] !== "2026-10-22" || plan[1] !== "2026-10-22") f.push(`Plan ${JSON.stringify(plan)}`);
  if ((await p.evaluate(() => DB.lessons.length)) !== 2) f.push("neuer Termin statt Umwandlung");
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(300);
  const l2 = await p.evaluate(() => __t.lesson("L2")), plan2 = await p.evaluate(() => __t.plan("s2", "autobahn"));
  if (!l2 || l2.art !== "fahrstunde" || l2.srcSonder || l2.srcSonderIdx || l2.note !== "Erfunden" || l2.bis !== "11:30") f.push(`nach Rückgängig Termin ${JSON.stringify(l2)}`);
  if (plan2[0] || plan2[1]) f.push(`nach Rückgängig Plan ${JSON.stringify(plan2)}`);
  return f;
});

// Hilfe: frischer 90-Minuten-Termin aus dem Plan (s1, Überland ab Kästchen 2)
async function mitTermin() {
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "ueberland", 1, T, "10:00"), { T });
  await p.evaluate(() => { const t = document.getElementById("toast"); t._undos = []; t.classList.remove("show", "undo"); }); // Rückgängig vom Anlegen verwerfen
  return (await p.evaluate(() => __t.termine("s1")))[0];
}

await pruefe("K5", "Lösen über das 2. Kästchen („Kalendereintrag entfernen“): der Termin ist weg, Kästchen 2 und 3 leer, das von Hand abgehakte Kästchen 1 bleibt", async () => {
  const f = [], t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  const ex = await p.evaluate(() => { const l = _sfTerminZu("s1", "ueberland", 2); return l ? l.id : null; });
  if (ex !== t.id) f.push("2. Kästchen findet den Termin nicht");
  await p.evaluate(() => removeSonderFromKalender(DB.students.find((x) => x.id === "s1"), "ueberland", 2));
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (await p.evaluate((id) => !!__t.lesson(id), t.id)) f.push("Termin noch da");
  if (JSON.stringify(plan.slice(0, 3)) !== JSON.stringify(["2026-10-01", null, null])) f.push(`Plan ${JSON.stringify(plan)}`);
  return f;
});

await pruefe("K6", "Löschen im Kalender mit Rückgängig: beide Kästchen leer; Rückgängig holt Termin und beide Kästchen zurück", async () => {
  const f = [], t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  await p.evaluate((id) => deleteLessonMitRueckgaengig(id, () => {}), t.id);
  await warte(200);
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (plan[1] || plan[2]) f.push(`nach Löschen Plan ${JSON.stringify(plan)}`);
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(400);
  const plan2 = await p.evaluate(() => __t.plan("s1", "ueberland")), l = await p.evaluate((id) => __t.lesson(id), t.id);
  if (!l || JSON.stringify(l.srcSonderIdx) !== "[1,2]") f.push(`Termin nach Rückgängig ${JSON.stringify(l)}`);
  if (plan2[1] !== T || plan2[2] !== T || plan2[0] !== "2026-10-01") f.push(`Plan nach Rückgängig ${JSON.stringify(plan2)}`);
  return f;
});

await pruefe("K7", "deleteLesson (z. B. Storno einer Online-Buchung) leert beide Kästchen", async () => {
  const t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  await p.evaluate((id) => deleteLesson(id), t.id);
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  return plan[1] || plan[2] ? `Plan ${JSON.stringify(plan)}` : null;
});

await pruefe("K8", "Neue Zeit über das 2. Kästchen: derselbe Termin, neues Datum in beiden Kästchen, kein zweiter Termin; Rückgängig stellt das alte Datum wieder her", async () => {
  const f = [], t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  await p.evaluate(({ T2 }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "ueberland", 2, T2, "14:00"), { T2 });
  const tm = await p.evaluate(() => __t.termine("s1")), plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (tm.length !== 1 || tm[0].id !== t.id || tm[0].date !== T2 || tm[0].von !== "14:00" || JSON.stringify(tm[0].idx) !== "[1,2]") f.push(`Termine ${JSON.stringify(tm)}`);
  if (plan[1] !== T2 || plan[2] !== T2 || plan[3]) f.push(`Plan ${JSON.stringify(plan)}`);
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(300);
  const tm2 = await p.evaluate(() => __t.termine("s1")), plan2 = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (tm2.length !== 1 || tm2[0].date !== T || tm2[0].von !== "10:00") f.push(`nach Rückgängig ${JSON.stringify(tm2)}`);
  if (plan2[1] !== T || plan2[2] !== T) f.push(`Plan nach Rückgängig ${JSON.stringify(plan2)}`);
  return f;
});

await pruefe("K9", "Mehrere Termine planen: 4 Überland offen, 3 Vorschläge à 90 Min → nur 2 Termine (je 2 Kästchen), alle 5 Kästchen voll; Rückgängig leert die 4 und löscht beide", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  const cfg = { art: "sonder", grp: "ueberland", fahrzeugTyp: "egal" };
  const slots = [{ date: "2026-10-26", von: "10:00", bis: "11:30", fahrzeug: "—" }, { date: "2026-10-27", von: "10:00", bis: "11:30", fahrzeug: "—" }, { date: "2026-10-28", von: "10:00", bis: "11:30", fahrzeug: "—" }];
  await p.evaluate(({ cfg, slots }) => buchMultiTermine("s3", cfg, slots), { cfg, slots });
  const tm = await p.evaluate(() => __t.termine("s3")), plan = await p.evaluate(() => __t.plan("s3", "ueberland"));
  if (tm.length !== 2) f.push(`${tm.length} Termine statt 2: ${JSON.stringify(tm)}`);
  if (JSON.stringify(tm.map((x) => x.idx)) !== "[[1,2],[3,4]]") f.push(`Kästchen ${JSON.stringify(tm.map((x) => x.idx))}`);
  if (JSON.stringify(plan.slice(0, 5)) !== JSON.stringify(["2026-10-01", "2026-10-26", "2026-10-26", "2026-10-27", "2026-10-27"])) f.push(`Plan ${JSON.stringify(plan)}`);
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(300);
  const plan2 = await p.evaluate(() => __t.plan("s3", "ueberland"));
  if ((await p.evaluate(() => __t.termine("s3"))).length) f.push("nach Rückgängig noch Termine");
  if (JSON.stringify(plan2.slice(0, 5)) !== JSON.stringify(["2026-10-01", null, null, null, null])) f.push(`Plan nach Rückgängig ${JSON.stringify(plan2)}`);
  return f;
});

await pruefe("K10", "Mehrere Termine planen, Suche: Vorschläge reichen genau für die offenen Kästchen (4 offen, 90-Min-Plätze → 2 Vorschläge), Hinweis nennt „zählt als 2“", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  const r = await p.evaluate(() => {
    const cfg = { art: "sonder", grp: "ueberland", fahrzeugTyp: "egal", von: "2026-10-15", bis: "2026-12-15", zeitVon: "08:00", zeitBis: "20:00", proWoche: 7 };
    const tr = findeMultiSlots("s3", cfg);
    openMultiTerminErgebnis("s3", cfg, tr);
    const txt = (document.querySelector(".sheet") || document.body).innerText;
    try { closeSheet(); } catch (e) {}
    return { n: tr.length, einh: tr.map((t) => _sfEinh(t.von, t.bis)), hinweis: /Noch 4 Überlandfahrten offen/.test(txt) && /zählt als 2/.test(txt) };
  });
  const summe = r.einh.reduce((a, b) => a + b, 0);
  if (!r.n) return "keine Vorschläge gefunden (Arbeitszeiten der Attrappe?)";
  if (summe < 4 || summe - r.einh[r.einh.length - 1] >= 4) f.push(`${r.n} Vorschläge mit ${JSON.stringify(r.einh)} Kästchen für 4 offene`);
  if (r.einh.some((e) => e > 1) && !r.hinweis) f.push("Hinweis „Noch 4 … offen“ / „zählt als 2“ fehlt");
  return f;
});

await pruefe("K11", "„Welche Sonderfahrt?“ beim Ändern der Art: Nachtfahrt 1 gewählt, 90-Min-Termin füllt Nacht 1 und 2", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(() => { openSFPickerForLesson("L1", "s1", "2026-10-20", "08:00", "09:30", "", "sonder", null); });
  await warte(200);
  const geklickt = await p.evaluate(() => { const b = document.querySelector('.sf-opt[data-grp="nacht"][data-idx="0"]'); if (!b) return false; b.click(); return true; });
  if (!geklickt) return "Auswahl Nacht 1 fehlt";
  await warte(200);
  const l = await p.evaluate(() => __t.lesson("L1")), plan = await p.evaluate(() => __t.plan("s1", "nacht"));
  if (!l || l.art !== "sonder" || l.srcSonder !== "s1:nacht:0" || JSON.stringify(l.srcSonderIdx) !== "[0,1]") f.push(`Termin ${JSON.stringify(l)}`);
  if (plan[0] !== "2026-10-20" || plan[1] !== "2026-10-20" || plan[2]) f.push(`Plan ${JSON.stringify(plan)}`);
  return f;
});

await pruefe("K12", "Alter Termin (vor dem Update, nur srcSonder, 90 Min): wird über sein Kästchen gefunden, Löschen leert nur dieses eine Kästchen", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(() => { const s = DB.students.find((x) => x.id === "s1"); s.plan.sonder.autobahn = [{ d: "26.10.26", iso: "2026-10-26" }, { d: "05.10.26", iso: "2026-10-05" }];
    DB.lessons.push({ id: "ALT", date: "2026-10-26", von: "10:00", bis: "11:30", art: "sonder", sid: "s1", name: "", status: "geplant", note: "Autobahnfahrt", fc: null, srcSonder: "s1:autobahn:0" }); save(); });
  if ((await p.evaluate(() => { const l = _sfTerminZu("s1", "autobahn", 0); return l && l.id; })) !== "ALT") f.push("alter Termin nicht gefunden");
  if (await p.evaluate(() => !!_sfTerminZu("s1", "autobahn", 1))) f.push("Kästchen 2 gehört fälschlich zum alten Termin");
  await p.evaluate(() => deleteLesson("ALT"));
  const plan = await p.evaluate(() => __t.plan("s1", "autobahn"));
  if (plan[0] || plan[1] !== "2026-10-05") f.push(`Plan ${JSON.stringify(plan)}`);
  return f;
});

await pruefe("K13", "Von Hand abgehaktes Nachbar-Kästchen bleibt: Kästchen 2 gewählt, 3 schon abgehakt → Termin belegt 2 und 4", async () => {
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => { const s = DB.students.find((x) => x.id === "s1"); s.plan.sonder.ueberland[2] = { d: "03.10.26", iso: "2026-10-03" };
    commitSonderZeit(s, "ueberland", 1, T, "10:00"); }, { T });
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland")), tm = await p.evaluate(() => __t.termine("s1"));
  const f = [];
  if (JSON.stringify(plan.slice(0, 4)) !== JSON.stringify(["2026-10-01", T, "2026-10-03", T])) f.push(`Plan ${JSON.stringify(plan)}`);
  if (tm.length !== 1 || JSON.stringify(tm[0].idx) !== "[1,3]") f.push(`Termine ${JSON.stringify(tm)}`);
  return f;
});

await pruefe("K14", "Letztes Kästchen gewählt: das 2. Kästchen kommt aus einem freien davor; nie mehr als das Soll; ist nichts mehr frei, belegt der Termin nur 1", async () => {
  const f = [];
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "nacht", 2, T, "19:30"), { T });
  let plan = await p.evaluate(() => __t.plan("s1", "nacht"));
  if (JSON.stringify(plan.slice(0, 3)) !== JSON.stringify([T, null, T]) || plan.length > 3) f.push(`Plan ${JSON.stringify(plan)}`);
  await p.evaluate(({ T2 }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "nacht", 1, T2, "19:30"), { T2 });
  plan = await p.evaluate(() => __t.plan("s1", "nacht"));
  const tm = await p.evaluate(() => __t.termine("s1"));
  if (JSON.stringify(plan.slice(0, 3)) !== JSON.stringify([T, T2, T]) || plan.length > 3) f.push(`Plan danach ${JSON.stringify(plan)}`);
  const zweiter = tm.find((x) => x.date === T2);
  if (!zweiter || zweiter.idx !== null) f.push(`2. Termin ${JSON.stringify(zweiter)}`);
  return f;
});

await pruefe("K15", "Eigene Einheit 90 Minuten (KR.setzeSonderMinuten(90)): ein 90-Min-Termin füllt nur 1 Kästchen", async () => {
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => { KR.setzeSonderMinuten(90); commitSonderZeit(DB.students.find((x) => x.id === "s1"), "autobahn", 0, T, "10:00"); }, { T });
  const plan = await p.evaluate(() => __t.plan("s1", "autobahn"));
  await p.evaluate(() => KR.setzeSonderMinuten(null));
  return plan[0] === T && !plan[1] ? null : `Plan ${JSON.stringify(plan)}`;
});

await pruefe("K16", "Abgleich: srcSonderIdx landet in der Nutzlast (payload) und kommt beim Zurücklesen wieder an", async () => {
  const t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  const r = await p.evaluate((id) => {
    const altP = _authProfile, altU = _authUser;
    _authProfile = { fahrschule_id: "fs-erfunden" }; _authUser = { id: "u-erfunden" };
    try {
      const z = _terminZeile(DB.lessons.find((l) => l.id === id));
      const m = _terminMerge({ id: z.id, schueler_id: z.schueler_id, datum: z.datum, von: z.von, bis: z.bis, art: z.art, fahrzeug: z.fahrzeug, status: z.status, payload: z.payload });
      return { p: z.payload.srcSonderIdx || null, m: m.srcSonderIdx || null, k: m.srcSonder };
    } finally { _authProfile = altP; _authUser = altU; }
  }, t.id);
  return JSON.stringify(r.p) === "[1,2]" && JSON.stringify(r.m) === "[1,2]" && r.k === "s1:ueberland:1" ? null : JSON.stringify(r);
});

await pruefe("K17", "Einheit aus den Einstellungen (KE, fahrstunden.sonderfahrt → minuten): Wert der Fahrschule gilt sofort nach dem Laden; andere Fahrschule ohne Zeile → 45; ungültiger Wert → 45; Abmelden → 45", async () => {
  const r = await p.evaluate(async () => {
    if (!window.KE) return { fehlt: true };
    const sb = (zeilen) => ({ from: () => { const q = { select: () => q, eq: async () => ({ data: zeilen, error: null }) }; return q; } });
    const o = [];
    await KE.lade(sb([{ schluessel: "fahrstunden.sonderfahrt", wert: { minuten: 60 } }]), "fs-a"); o.push(KR.sonderMinuten());
    await KE.lade(sb([]), "fs-b"); o.push(KR.sonderMinuten());
    await KE.lade(sb([{ schluessel: "fahrstunden.sonderfahrt", wert: { minuten: 200 } }]), "fs-c"); o.push(KR.sonderMinuten());
    await KE.lade(sb([{ schluessel: "fahrstunden.sonderfahrt", wert: { minuten: 90 } }]), "fs-d"); o.push(KR.sonderMinuten());
    KE.leeren(); o.push(KR.sonderMinuten());
    try { ["fs-a", "fs-b", "fs-c", "fs-d"].forEach((f) => localStorage.removeItem("ke:" + f)); } catch (e) {}
    return { o };
  });
  if (r.fehlt) return "window.KE fehlt";
  return JSON.stringify(r.o) === "[60,45,45,90,45]" ? null : `Werte ${JSON.stringify(r.o)} statt [60,45,45,90,45]`;
});

await pruefe("K18", "Plan zeichnen (buildSonder) mit 2 belegten Kästchen: Zähler zeigt 3 bei Überland, keine JS-Fehler", async () => {
  await mitTermin();
  const r = await p.evaluate(() => { const s = DB.students.find((x) => x.id === "s1"); try { openStudent && openStudent(s.id); } catch (e) {} return sfCount(s.plan.sonder.ueberland); });
  return r === 3 ? null : `Zähler ${r}`;
});

await pruefe("K20", "Rückgängig nach einem Neuaufbau des Plans (anderes Kalender-Blatt geöffnet und abgebrochen): neuer Termin, neue Zeit und Verknüpfen stellen die Kästchen richtig zurück (Fable F1)", async () => {
  const f = [];
  const zwischendurch = () => p.evaluate(async () => { openSonderKalenderSheet("s1", "autobahn", 3); await new Promise((r) => setTimeout(r, 150)); document.querySelector("#sfkCancel").click(); });
  // neu
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "ueberland", 1, T, "10:00"), { T });
  await zwischendurch();
  if (!(await p.evaluate(() => __t.rueck()))) f.push("neu: kein Rückgängig");
  await warte(300);
  let plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (plan[1] || plan[2] || (await p.evaluate(() => __t.termine("s1"))).length) f.push(`neu: Plan ${JSON.stringify(plan)}`);
  // neue Zeit
  const t = await mitTermin();
  await p.evaluate(({ T2 }) => commitSonderZeit(DB.students.find((x) => x.id === "s1"), "ueberland", 1, T2, "14:00"), { T2 });
  await zwischendurch();
  if (!(await p.evaluate(() => __t.rueck()))) f.push("neue Zeit: kein Rückgängig");
  await warte(300);
  plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  const tm = await p.evaluate(() => __t.termine("s1"));
  if (plan[1] !== T || plan[2] !== T || tm.length !== 1 || tm[0].date !== T || (t && tm[0].id !== t.id)) f.push(`neue Zeit: Plan ${JSON.stringify(plan)} Termine ${JSON.stringify(tm)}`);
  // Verknüpfen
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(() => commitSonderZeit(DB.students.find((x) => x.id === "s2"), "autobahn", 0, "2026-10-22", "10:00"));
  await p.evaluate(async () => { openSonderKalenderSheet("s2", "nacht", 0); await new Promise((r) => setTimeout(r, 150)); document.querySelector("#sfkCancel").click(); });
  if (!(await p.evaluate(() => __t.rueck()))) f.push("Verknüpfen: kein Rückgängig");
  await warte(300);
  plan = await p.evaluate(() => __t.plan("s2", "autobahn"));
  if (plan[0] || plan[1] || (await p.evaluate(() => __t.lesson("L2").art)) !== "fahrstunde") f.push(`Verknüpfen: Plan ${JSON.stringify(plan)}`);
  return f;
});

await pruefe("K21", "Zwei Sonderfahrten kurz nacheinander, ein Tipp auf „Rückgängig“ (zusammengefasst): beide Termine weg, alle Kästchen leer", async () => {
  await p.evaluate(() => __t.setze(90));
  await p.evaluate(({ T, T2 }) => { const s = DB.students.find((x) => x.id === "s1"); commitSonderZeit(s, "ueberland", 1, T, "10:00"); commitSonderZeit(s, "autobahn", 0, T2, "10:00"); }, { T, T2 });
  const f = [];
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(400);
  const u = await p.evaluate(() => __t.plan("s1", "ueberland")), a = await p.evaluate(() => __t.plan("s1", "autobahn"));
  if (u[1] || u[2] || a[0] || a[1]) f.push(`Plan Überland ${JSON.stringify(u)} Autobahn ${JSON.stringify(a)}`);
  if ((await p.evaluate(() => __t.termine("s1"))).length) f.push("Termine noch da");
  return f;
});

await pruefe("K22", "„Welche Sonderfahrt?“: Kästchen, die schon zu einem anderen Termin gehören, sind nicht wählbar und mit „belegt“ markiert; das 2. Kästchen überspringt sie (Fable F2)", async () => {
  const f = [];
  await mitTermin(); // Überland [1,2]
  await p.evaluate(() => { openSFPickerForLesson("L1", "s1", "2026-10-20", "08:00", "09:30", "", "sonder", null); });
  await warte(200);
  const r = await p.evaluate(() => [1, 2, 3].map((i) => { const b = document.querySelector(`.sf-opt[data-grp="ueberland"][data-idx="${i}"]`); return b ? { dis: b.disabled, txt: b.textContent } : null; }));
  if (!r[0] || !r[0].dis || !/belegt/.test(r[0].txt) || !r[1] || !r[1].dis || !r[2] || r[2].dis) f.push(`Knöpfe ${JSON.stringify(r)}`);
  await p.evaluate(() => { document.querySelector('.sf-opt[data-grp="ueberland"][data-idx="1"]').click(); });
  await warte(150);
  if ((await p.evaluate(() => __t.lesson("L1").art)) !== "fahrstunde") f.push("belegtes Kästchen ließ sich wählen");
  await p.evaluate(() => { const b = document.querySelector('.sf-opt[data-grp="ueberland"][data-idx="3"]'); b && b.click(); });
  await warte(200);
  const l = await p.evaluate(() => __t.lesson("L1")), plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (!l || JSON.stringify(l.srcSonderIdx) !== "[3,4]" || plan[3] !== "2026-10-20" || plan[4] !== "2026-10-20" || plan[1] !== T) f.push(`Termin ${JSON.stringify(l && l.srcSonderIdx)} Plan ${JSON.stringify(plan)}`);
  return f;
});

await pruefe("K23", "Stornieren einer Sonderfahrt mit 2 Kästchen: beide leer; Rückgängig stellt beide wieder her", async () => {
  const f = [], t = await mitTermin();
  if (!t) return "kein Termin angelegt";
  await p.evaluate((id) => stornoLesson(id, "Erfundener Grund", () => {}), t.id);
  await warte(200);
  const plan = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (plan[1] || plan[2]) f.push(`nach Storno ${JSON.stringify(plan)}`);
  if (!(await p.evaluate(() => __t.rueck()))) f.push("kein Rückgängig");
  await warte(400);
  const plan2 = await p.evaluate(() => __t.plan("s1", "ueberland"));
  if (plan2[1] !== T || plan2[2] !== T) f.push(`nach Rückgängig ${JSON.stringify(plan2)}`);
  return f;
});

await pruefe("K24", "Liste passt nicht zum Schlüssel (ein altes Gerät hat den Termin umgehängt): es gilt nur das Kästchen aus srcSonder, fremde Kästchen bleiben (Fable F3)", async () => {
  await p.evaluate(() => __t.setze(90));
  const r = await p.evaluate(() => {
    const s = DB.students.find((x) => x.id === "s1");
    s.plan.sonder.nacht = [{ d: "26.10.26", iso: "2026-10-26" }, { d: "05.10.26", iso: "2026-10-05" }, { d: "06.10.26", iso: "2026-10-06" }];
    DB.lessons.push({ id: "UM", date: "2026-10-26", von: "19:30", bis: "21:00", art: "sonder", sid: "s1", name: "", status: "geplant", note: "", fc: null, srcSonder: "s1:nacht:0", srcSonderIdx: [1, 2] });
    const idx = _sfIdx(DB.lessons.find((l) => l.id === "UM"));
    deleteLesson("UM");
    return { idx, plan: __t.plan("s1", "nacht") };
  });
  return JSON.stringify(r.idx) === "[0]" && JSON.stringify(r.plan) === JSON.stringify([null, "2026-10-05", "2026-10-06"]) ? null : JSON.stringify(r);
});

await pruefe("K25", "Einheit: Wechsel der Fahrschule (Gesamtansicht) – eine späte Antwort der vorigen wird verworfen, und gleich nach dem Wechsel gilt nie der Wert der vorigen", async () => {
  const r = await p.evaluate(async () => {
    if (!window.KE) return { fehlt: true };
    let los; const spaet = new Promise((ok) => { los = ok; });
    const sbSpaet = { from: () => { const q = { select: () => q, eq: async () => { await spaet; return { data: [{ schluessel: "fahrstunden.sonderfahrt", wert: { minuten: 90 } }], error: null }; } }; return q; } };
    const sbY = { from: () => { const q = { select: () => q, eq: async () => ({ data: [{ schluessel: "fahrstunden.sonderfahrt", wert: { minuten: 60 } }], error: null }) }; return q; } };
    const sbZ = { from: () => { const q = { select: () => q, eq: () => new Promise(() => {}) }; return q; } }; // antwortet nie
    const a = KE.lade(sbSpaet, "fs-x");
    await KE.lade(sbY, "fs-y");
    los(); await a;
    const o = { wert: KR.sonderMinuten() };
    KE.lade(sbZ, "fs-z"); _sonderMinAusKE(); o.sofort = KR.sonderMinuten(); // wie beim Wechsel in die Gesamtansicht
    KE.leeren();
    try { ["fs-x", "fs-y", "fs-z"].forEach((f) => localStorage.removeItem("ke:" + f)); } catch (e) {}
    return o;
  });
  if (r.fehlt) return "window.KE fehlt";
  return r.wert === 60 && r.sofort === 45 ? null : JSON.stringify(r);
});

await pruefe("K26", "Fahrcheck-Liste der Leitung in der App (fsFcStatus): „fehlt“ leert Nachreich-Datum und Zahl; „nachträglich“ setzt Datum und alle gebuchten; zweites „Abgegeben“ lässt die Zahl vom Büro stehen", async () => {
  const r = await p.evaluate(async () => {
    const upd = [];
    const kette = { update: (u) => { upd.push(u); return kette; }, eq: async () => ({ error: null }) };
    const alt = window.getSupa; window.getSupa = () => ({ from: () => kette });
    const altR = window._fsRefreshAggData; window._fsRefreshAggData = async () => {};
    DB.lessons.push({ id: "FC1", date: "2026-10-12", von: "10:00", bis: "11:30", art: "sonder", sid: "s1", status: "geplant", buero_fc_status: "abgegeben", buero_fc_anzahl: 1 });
    try {
      await fsFcStatus("FC1", "fehlt", false);
      await fsFcStatus("FC1", "abgegeben", true);
      await fsFcStatus("FC1", "abgegeben", false);
    } catch (e) { upd.push({ fehler: String(e.message || e) }); }
    window.getSupa = alt; window._fsRefreshAggData = altR;
    DB.lessons = DB.lessons.filter((l) => l.id !== "FC1");
    return upd;
  });
  const f = [];
  const [a, b, c] = r;
  if (!a || a.buero_fc_nachgereicht_am !== null || a.buero_fc_anzahl !== null) f.push(`fehlt: ${JSON.stringify(a)}`);
  if (!b || !b.buero_fc_nachgereicht_am || b.buero_fc_anzahl !== 2) f.push(`nachträglich: ${JSON.stringify(b)}`);
  if (!c || "buero_fc_anzahl" in c) f.push(`2. Abgegeben: ${JSON.stringify(c)}`);
  return f;
});

await pruefe("K27", "Alter Termin (1 Kästchen, 90 Min) bekommt beim Verschieben auf einen anderen Tag (gleiche Länge) kein zweites Kästchen; das von Hand abgehakte Nachbar-Kästchen bleibt allein (Bedienung Fund 2)", async () => {
  await p.evaluate(() => __t.setze(90));
  const r = await p.evaluate(({ T2 }) => {
    const s = DB.students.find((x) => x.id === "s1");
    s.plan.sonder.autobahn = [{ d: "26.10.26", iso: "2026-10-26" }, { d: "26.10.26", iso: "2026-10-26" }];
    DB.lessons.push({ id: "ALT2", date: "2026-10-26", von: "10:00", bis: "11:30", art: "sonder", sid: "s1", name: "", status: "geplant", note: "Autobahnfahrt", fc: null, srcSonder: "s1:autobahn:0" });
    commitSonderZeit(s, "autobahn", 0, T2, "10:00");
    const l = DB.lessons.find((x) => x.id === "ALT2");
    return { idx: l.srcSonderIdx || null, date: l.date, plan: __t.plan("s1", "autobahn") };
  }, { T2 });
  return r.idx === null && r.date === T2 && r.plan[0] === T2 && r.plan[1] === "2026-10-26" && !r.plan[2] ? null : JSON.stringify(r);
});

await pruefe("K28", "Abruf vom Server: hat ein anderes Gerät den Termin auf 1 Kästchen gestellt (ohne srcSonderIdx), fällt die Liste auch hier weg (Daten-Prüfer Fund 2)", async () => {
  const r = await p.evaluate(async () => {
    const altSupa = window.getSupa, altP = _authProfile, altU = _authUser;
    const rows = [];
    const mk = () => { const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: rows, error: null }), then: undefined }; return q; };
    window.getSupa = () => ({ from: () => mk(), rpc: async () => ({ data: [], error: null }) });
    _authUser = { id: "u-erfunden" }; _authProfile = { fahrschule_id: "fs-erfunden" };
    try {
      ensureDB();
      const l = { id: "PT1", date: "2026-10-26", von: "10:00", bis: "11:30", art: "sonder", sid: "s1", status: "geplant", note: "x", fc: null, srcSonder: "s1:ueberland:1", srcSonderIdx: [1, 2], _syncedAt: 1 };
      DB.lessons = [l];
      const mem = _abglLaden(); mem.termine.PT1 = _abglWertVon("termine", l);
      rows.push({ id: "PT1", schueler_id: "s1", datum: "2026-10-26", von: "10:00", bis: "10:45", art: "sonder", fahrzeug: null, status: "geplant", aktualisiert_am: new Date(Date.now() + 1e5).toISOString(), payload: { note: "x", fc: null, srcSonder: "s1:ueberland:1" } });
      await pullTermineZuweisungen();
      const a = DB.lessons.find((x) => x.id === "PT1");
      return { bis: a && a.bis, idx: a ? a.srcSonderIdx || null : "weg", key: a && a.srcSonder };
    } finally { window.getSupa = altSupa; _authProfile = altP; _authUser = altU; }
  });
  return r.bis === "10:45" && r.idx === null && r.key === "s1:ueberland:1" ? null : JSON.stringify(r);
});

await pruefe("K19", "keine JS-Fehler und keine echten Dialogfenster im ganzen Lauf", async () => jsFehler);

await browser.close();
server.close();
console.log(`${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
