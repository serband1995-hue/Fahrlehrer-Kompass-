// Test der Zahlen und des Kalenders in der Fahrlehrer-App (index.html): UE-Zählung, Prüfungen, Stand, Wochen-Kachel,
// Pauschale, Fahrcheck-Soll, Warteliste, Statistik, "Rest dieser Woche", Ziehen, Löschen-Rückfrage, Fahrcheck-Beschriftung.
// Die Datenbank wird nicht angesprochen (nicht eingeloggt, nur Arbeitsspeicher/localStorage des Test-Browsers).
// "Heute" ist fest: Mittwoch 2026-11-11, 12:00 Ortszeit (Europe/Berlin) über page.clock.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zahlen-test.mjs
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
let konsole = [];
let dialogAntwort = true; // true = OK, false = Abbrechen
page.on("pageerror", (e) => konsole.push(String(e)));
page.on("dialog", (d) => (dialogAntwort ? d.accept() : d.dismiss()).catch(() => {}));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.clock.install({ time: new Date("2026-11-11T12:00:00+01:00") });
await page.goto(basis + "index.html");
await page.waitForTimeout(1200);

/* ---------- Hilfen ---------- */
const D = "2026-11-11"; // heute (Mittwoch)
const ruf = (code, arg) => page.evaluate(code, arg);
async function neu(extra = {}) { // frische DB mit erfundenen Daten
  await page.evaluate((e) => {
    try { sessionStorage.clear(); } catch (x) {}
    DB = Object.assign({ students: [], lessons: [], exams: [], termine: [] }, e);
    ensureDB();
    DB.verdienst = Object.assign({}, DB.verdienst, { proUE: 23, startUE: 0 });
    delete DB.verdienstPin;
    window.__e = e;
  }, extra);
  konsole = [];
  dialogAntwort = true;
}
const schueler = (id, name, extra = {}) => Object.assign({ id, name, telefon: "" }, extra);
const les = (id, date, von, bis, extra = {}) => Object.assign({ id, date, von, bis, art: "fahrstunde", sid: null, name: "", status: "geplant", note: "", fc: null }, extra);
const zahl = (s) => Math.round(s * 100) / 100;

const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });

/* ---------- Fälle ---------- */
fall("1  Prüfung nicht doppelt (Kalendertermin + Prüfungstafel)", async (f) => {
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [les("P1", D, "09:00", "09:55", { art: "pruefung", sid: "S1" })],
    termine: [{ id: "T1", date: D, von: "09:00", slots: ["S1"] }],
  });
  const r = await ruf((d) => ({ due: dayUE(d), total: ueRange(d, d).total, ev: dayEvents(d).map((e) => ({ id: e.id, kind: e.kind, doppelt: e.doppelt })) }), D);
  if (zahl(r.due) !== 2) f("dayUE = " + r.due + ", erwartet 2");
  if (zahl(r.total) !== 2) f("ueRange().total = " + r.total + ", erwartet 2");
  const kal = r.ev.find((e) => e.id === "P1");
  if (!kal) f("Kalendertermin P1 fehlt in dayEvents: " + JSON.stringify(r.ev));
  else if (kal.doppelt !== true) f("Kalendertermin P1 hat kein doppelt:true: " + JSON.stringify(kal));
});

fall("2  Prüfung mit Ergebnis (Kalendertermin + exams) zählt 2 UE", async (f) => {
  const gestern = "2026-11-10";
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [les("P1", gestern, "09:00", "09:55", { art: "pruefung", sid: "S1" })],
    exams: [{ id: "E1", sid: "S1", name: "Anna Muster", date: gestern, result: "pass", pruefer: "P" }],
  });
  const r = await ruf((d) => { const u = ueRange(d, d); return { total: u.total, fcDone: u.fcDone }; }, gestern);
  if (zahl(r.total) !== 2) f("ueRange().total = " + r.total + ", erwartet 2");
  if (zahl(r.fcDone) !== 2) f("fcDone = " + r.fcDone + ", erwartet 2");
});

fall("2b Ergebnis erst am Folgetag eingetragen: Prüfung zählt trotzdem nur einmal", async (f) => {
  const vorgestern = "2026-11-09", gestern = "2026-11-10";
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [les("P1", vorgestern, "09:00", "09:55", { art: "pruefung", sid: "S1" })],
    exams: [{ id: "E1", sid: "S1", name: "Anna Muster", date: gestern, result: "pass", pruefer: "P" }],
  });
  const r = await ruf((a) => { const u = ueRange(a[0], a[1]); return { total: u.total, fcDone: u.fcDone }; }, [vorgestern, gestern]);
  if (zahl(r.total) !== 2) f("ueRange().total = " + r.total + ", erwartet 2");
  if (zahl(r.fcDone) !== 2) f("fcDone = " + r.fcDone + ", erwartet 2");
});

fall("2c Prüfung nur als Kalendertermin (Büro) zählt in die Prognose", async (f) => {
  await neu({ students: [schueler("S1", "Anna Muster")], lessons: [les("P1", "2026-11-20", "09:00", "09:55", { art: "pruefung", sid: "S1" })] });
  const r = await ruf((d) => ueRange(d, d).fcCounted, "2026-11-20");
  if (zahl(r) !== 2) f("fcCounted = " + r + ", erwartet 2");
});

fall("3  Zwei Schüler, Prüfung am selben Tag = 4 UE", async (f) => {
  await neu({
    students: [schueler("S1", "Anna Muster"), schueler("S2", "Ben Beispiel")],
    lessons: [
      les("P1", D, "09:00", "09:55", { art: "pruefung", sid: "S1" }),
      les("P2", D, "10:00", "10:55", { art: "pruefung", sid: "S2" }),
    ],
  });
  const r = await ruf((d) => ({ due: dayUE(d), total: ueRange(d, d).total }), D);
  if (zahl(r.due) !== 4) f("dayUE = " + r.due + ", erwartet 4");
  if (zahl(r.total) !== 4) f("ueRange().total = " + r.total + ", erwartet 4");
});

fall("4  Umschreiber: alle Ampeln grün (außer Sonderfahrten) = 100 %", async (f) => {
  await neu();
  const r = await ruf(() => {
    const bau = (id, umschr) => {
      const s = { id, name: "Stand " + id, telefon: "", umschreiber: umschr };
      DB.students.push(s); ensure(s);
      stufenFor(s).forEach((st) => { if (st.key !== "sonder") st.items.forEach((it) => { s.plan.ampeln[it.id] = "gruen"; }); });
      s.plan.theorie = true;
      return s;
    };
    const u = bau("U1", true), n = bau("N1", false);
    return { umschreiber: stand(u), normal: stand(n) };
  });
  if (r.umschreiber !== 100) f("Umschreiber: stand = " + r.umschreiber + ", erwartet 100");
  if (!(r.normal < 100)) f("Ohne Umschreiber: stand = " + r.normal + ", erwartet < 100 (Kontrollfall)");
});

fall("5  Kachel 'Diese Woche verdient' zählt nur Vergangenes, keine Theorie", async (f) => {
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [
      les("TH", D, "18:00", "19:30", { art: "theorie" }),
      les("ZU", "2026-11-12", "10:00", "11:30", { sid: "S1" }),
      les("VG", "2026-11-10", "10:00", "11:30", { sid: "S1" }), // 90 Min = 2 UE, vergangen, ohne fc-Vermerk
    ],
  });
  const erwartet = 2 * 23;
  const fn = await ruf(() => (typeof wocheVerdientEuro === "function" ? wocheVerdientEuro() : "fehlt"));
  await ruf(() => routeDashboard());
  const kachel = await page.evaluate(() => {
    const t = [...document.querySelectorAll(".d-tile")].find((b) => /verdient/i.test(b.textContent));
    if (!t) return null;
    const n = t.querySelector(".dt-n");
    return { attr: n && n.dataset.count, text: t.textContent.trim() };
  });
  if (!kachel) f("Kachel 'Diese Woche verdient' nicht gefunden");
  else if (+kachel.attr !== erwartet) f("Kachel zeigt " + kachel.attr + " €, erwartet " + erwartet + " (" + kachel.text.slice(0, 40) + ")");
  if (fn === "fehlt") f("wocheVerdientEuro() existiert noch nicht");
  else if (fn !== erwartet) f("wocheVerdientEuro() = " + fn + ", erwartet " + erwartet);
});

fall("6  Keine Urlaubs-/Feiertagspauschale mehr (Verdienst-Ansicht, Einstellungen)", async (f) => {
  await neu({
    lessons: ["2026-11-03", "2026-11-04"].map((d, i) => les("B" + i, d, "08:00", "17:00", { art: "block", name: "Urlaub", blockTyp: "urlaub" })),
  });
  await ruf(() => { DB.verdienst.feiertagsUrlaubsPauschale = 100; routeStats("cur"); });
  const stat = await ruf(() => document.querySelector("#view").textContent);
  if (/Pauschale/i.test(stat)) f("Verdienst-Ansicht enthält noch den Text 'Pauschale'");
  await ruf(() => routeSettings());
  const feld = await ruf(() => !!document.querySelector('[id*="auschale" i]'));
  if (feld) f("Einstellungen haben noch ein Eingabefeld für die Pauschale");
});

fall("7  Fahrcheck-Soll: Termin heute Abend zählt um 12:00 noch nicht", async (f) => {
  const t = (id, von, bis) => ({ id, date: D, von, bis, art: "fahrstunde", status: "geplant", fc: null, sid: "S1" });
  const r = await ruf(([d, a, b]) => ({
    abend: KR.fcSoll([a], d, d, d).soll,
    frueh: KR.fcSoll([b], d, d, d).soll,
  }), [D, t("A", "18:00", "19:30"), t("F", "08:00", "09:30")]);
  if (r.abend !== 0) f("Termin 18:00-19:30 zählt schon zum Soll: " + r.abend + " (erwartet 0)");
  if (!(r.frueh > 0)) f("Termin 08:00-09:30 zählt nicht zum Soll: " + r.frueh);
});

fall("8  Warteliste: Entfernen hält, manuell wieder hinzufügen geht", async (f) => {
  await neu();
  await ruf(() => {
    const s = { id: "W1", name: "Wanda Warte", telefon: "" };
    DB.students.push(s); ensure(s);
    s.theoryPassed = new Date().toISOString();
    s.plan.theorie = true;
    evalSkillsFor(s).forEach((id) => { s.plan.ampeln[id] = "gruen"; });
    s.ready = new Date().toISOString();
  });
  const stand0 = await ruf(() => stand(DB.students[0]));
  if (stand0 < 90) return f("Testaufbau: stand = " + stand0 + " (< 90)");
  if (!(await ruf(() => waitlist().some((s) => s.id === "W1")))) return f("Schüler steht nicht auf der Warteliste (Aufbau)");
  await ruf(() => routeWaitlist());
  const knopf = await page.$('[data-remove-id="W1"]');
  if (!knopf) return f("Entfernen-Knopf auf der Warteliste nicht gefunden");
  dialogAntwort = true;
  await knopf.evaluate((el) => el.click()); // evaluate statt click: mit page.clock hängt die Warte-auf-Animation von Playwright
  await page.waitForTimeout(150);
  await ruf(() => syncTheoriePraxis());
  if (await ruf(() => waitlist().some((s) => s.id === "W1"))) f("Schüler steht nach Entfernen + syncTheoriePraxis() wieder auf der Warteliste");
  await ruf(() => setReady(DB.students[0]));
  if (!(await ruf(() => waitlist().some((s) => s.id === "W1")))) f("Manuell hinzufügen (setReady) bringt ihn nicht auf die Warteliste");
});

fall("9  Statistik zählt Test-Schüler nicht", async (f) => {
  await neu({ students: [schueler("S1", "Anna Muster"), schueler("S2", "Ben Beispiel"), schueler("T1", "Test Schüler")] });
  const dummy = await ruf(() => isDummyStudent(DB.students[2]));
  if (!dummy) f("isDummyStudent('Test Schüler') ist nicht true");
  await ruf(() => routeStats("cur"));
  const z = await page.evaluate(() => {
    const o = {};
    document.querySelectorAll(".mini-stat").forEach((m) => { const l = m.querySelector(".ms-l"), v = m.querySelector(".ms-v"); if (l && v) o[l.textContent.trim()] = v.dataset.count ?? v.textContent.trim(); });
    return o;
  });
  if (z["Aktiv"] !== "2") f("'Aktiv' = " + z["Aktiv"] + ", erwartet 2");
  if (z["Gesamt"] !== "2") f("'Gesamt' = " + z["Gesamt"] + ", erwartet 2");
});

fall("10 'Rest dieser Woche': Theorie, Büro-Arten, Vergangenes zählen nicht", async (f) => {
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [
      les("TH", D, "18:00", "19:30", { art: "theorie" }),
      les("VT", "2026-11-12", "09:00", "10:30", { art: "vortest", sid: "S1" }),
      les("VG", D, "08:00", "09:30", { sid: "S1" }), // heute, schon vorbei
      les("ZU", "2026-11-12", "13:00", "14:30", { sid: "S1" }),
    ],
  });
  const r = await ruf((d) => countRange(d, "2026-11-14").planned, D);
  if (r !== 1) f("planned = " + r + ", erwartet 1 (nur die zukünftige Fahrstunde)");
});

fall("11 Urlaub/Blocker ist im Kalender nicht ziehbar", async (f) => {
  await neu({
    students: [schueler("S1", "Anna Muster")],
    lessons: [
      les("BL", "2026-11-12", "08:00", "12:00", { art: "block", name: "Urlaub", blockTyp: "urlaub" }),
      les("FS", "2026-11-12", "13:00", "14:30", { sid: "S1" }),
    ],
  });
  await ruf((d) => { _calView = "woche"; _calDate = d; routeKalender(); }, D);
  const r = await page.evaluate(() => {
    const chip = (id) => [...document.querySelectorAll("[data-evedit]")].find((e) => (e.dataset.evedit || "").split("|")[1] === id);
    const b = chip("BL"), n = chip("FS");
    return { block: !!b, blockDrag: b ? b.hasAttribute("data-dragid") : null, normalDrag: n ? n.hasAttribute("data-dragid") : null };
  });
  if (!r.block) return f("Block-Chip in der Wochenansicht nicht gefunden");
  if (r.normalDrag !== true) f("Kontrolle: normale Fahrstunde hat kein data-dragid (Testaufbau)");
  if (r.blockDrag) f("Block-Chip hat data-dragid (ist ziehbar)");
});

fall("12 'Hat nicht stattgefunden (löschen)' fragt erst nach", async (f) => {
  const mk = () => neu({ students: [schueler("S1", "Anna Muster")], lessons: [les("FS", "2026-11-10", "10:00", "11:30", { sid: "S1" })] });
  const offen = async () => { await ruf(() => openFCMenu("FS")); const b = await page.$("[data-fcdel]"); if (!b) throw new Error("data-fcdel nicht gefunden"); return b; };
  await mk();
  dialogAntwort = false;
  await (await offen()).evaluate((el) => el.click());
  await page.waitForTimeout(150);
  if (!(await ruf(() => DB.lessons.some((l) => l.id === "FS")))) f("Termin wurde trotz Abbrechen gelöscht (oder ohne Rückfrage)");
  await mk();
  dialogAntwort = true;
  await (await offen()).evaluate((el) => el.click());
  await page.waitForTimeout(150);
  if (await ruf(() => DB.lessons.some((l) => l.id === "FS"))) f("Termin blieb trotz Bestätigen erhalten");
  dialogAntwort = true;
});

fall("13 Fahrcheck-Beschriftung: halb_bewusst ist nicht '2 FC erhalten'", async (f) => {
  await neu({ students: [schueler("S1", "Anna Muster")], lessons: [les("FS", "2026-11-10", "10:00", "11:30", { sid: "S1", fc: "halb_bewusst" })] });
  await ruf(() => openEventSheet("lesson", "FS", "S1"));
  const t = await ruf(() => document.querySelector("#sheet").textContent);
  if (!/Fahrcheck/.test(t)) return f("Fahrcheck-Knopf im Termin-Fenster nicht gefunden: " + t.slice(0, 100));
  if (/2 FC erhalten/.test(t)) f("Termin-Fenster zeigt '2 FC erhalten' für fc:'halb_bewusst'");
});

/* ---------- Ausführen ---------- */
let rot = 0;
for (const { name, fn } of faelle) {
  const probleme = [];
  try { await fn((t) => probleme.push(t)); } catch (e) { probleme.push("Testfehler: " + String(e.message || e).split("\n")[0]); }
  if (konsole.length) probleme.push("Konsole: " + konsole.join(" | ").slice(0, 300));
  if (probleme.length) { rot++; console.log("ROT   " + name); probleme.forEach((p) => console.log("        - " + p)); }
  else console.log("GRÜN  " + name);
}
await browser.close(); server.close();
console.log(rot ? `Zahlen-Test: ${rot} von ${faelle.length} Fall/Fälle rot.` : "Zahlen-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
