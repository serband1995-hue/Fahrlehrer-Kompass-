// W28: Abgleich App <-> Server für Büro-Termine (vortest/simulator/beratung/mpu): die App lädt alte Kopien nie hoch, löscht sie nie,
// räumt sie lokal immer weg; die Gesamtansicht schreibt sie nicht. (Vom Fehlersucher Daten gebaut, nach abgleich-test.mjs.)
// Black-Box: geprüft wird nur, was auf dem (nachgebauten) Server und in DB ankommt.
// Die Datenbank wird nicht angesprochen: getSupa() wird durch eine Attrappe im Arbeitsspeicher ersetzt.
// Die 4-Sekunden-Verzögerung der Sync-Brücken läuft über page.clock, der Test wartet nicht in Echtzeit.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/w28-abgleich-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.APP_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), ".."); // APP_ROOT: anderen Stand der App prüfen
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
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); // GitHub: eigener Browser, hier: vorinstalliert
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
let konsole = [];
page.on("pageerror", (e) => konsole.push(String(e)));
page.on("dialog", (d) => d.accept().catch(() => {}));
await page.route(/vendor\/supabase-js|fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.clock.install();
await page.goto(basis + "index.html");
await page.waitForTimeout(1200);

/* ---------- Attrappe für Supabase (läuft im Browser) ---------- */
function attrappeEinbauen() {
  const C = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const T = {};
  ["schueler", "kalender_termine", "kalender_pruefungen", "snapshots", "schueler_privat", "schueler_verschiebungen",
    "schueler_notizen", "schueler_notiz_gelesen", "profiles", "fahrschul_fristen", "public_bookings"].forEach((n) => { T[n] = []; });
  const stats = { inflight: 0, upserts: {}, upsertAufrufe: {}, updates: {}, inserts: {} };
  const fake = { T, stats, deckel: 1000 };
  const zaehle = (o, t, n) => { o[t] = (o[t] || 0) + n; };
  const tab = (n) => (T[n] = T[n] || []);
  const proj = (r, cols) => {
    if (!cols || cols === "*" || /[()]/.test(cols)) return C(r);
    const o = {}; cols.split(",").map((c) => c.trim()).filter(Boolean).forEach((c) => { o[c] = C(r[c]); }); return o;
  };
  function ausfuehren(q) {
    const rows = tab(q.table);
    const passt = (r) => q.filters.every((f) => f(r));
    const err = (code, message) => ({ data: null, error: { code, message } });
    const liefere = (liste, cols) => {
      const data = liste.map((r) => proj(r, cols));
      if (q.mode === "single") return data.length === 1 ? { data: data[0], error: null } : err("PGRST116", "Die Abfrage lieferte " + data.length + " Zeilen");
      if (q.mode === "maybe") return data.length > 1 ? err("PGRST116", "mehrere Zeilen") : { data: data[0] || null, error: null };
      return { data, error: null };
    };
    if (q.op === "select") {
      let l = rows.filter(passt);
      if (q.order) { const { c, asc } = q.order; l = l.slice().sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
      let max = fake.deckel;
      if (q.lim != null) max = Math.min(max, q.lim);
      if (q.range) { l = l.slice(q.range[0]); max = Math.min(max, q.range[1] - q.range[0] + 1); }
      return liefere(l.slice(0, max), q.cols);
    }
    if (q.op === "upsert" || q.op === "insert") {
      const keys = ((q.opts && q.opts.onConflict) || "id").split(",").map((k) => k.trim());
      const betroffen = [];
      const arbeit = [];
      for (const raw of q.payload) {
        const row = C(raw);
        Object.keys(row).forEach((k) => { if (row[k] === undefined) delete row[k]; });
        const alt = q.op === "upsert" ? rows.find((r) => keys.every((k) => r[k] === row[k])) : null;
        if (alt && alt.fahrlehrer_id && row.fahrlehrer_id && alt.fahrlehrer_id !== row.fahrlehrer_id) {
          return err("42501", "new row violates row-level security policy for table \"" + q.table + "\"");
        }
        arbeit.push([alt, row]);
      }
      if (q.op === "upsert") { zaehle(stats.upserts, q.table, q.payload.length); zaehle(stats.upsertAufrufe, q.table, 1); }
      else zaehle(stats.inserts, q.table, q.payload.length);
      for (const [alt, row] of arbeit) {
        if (q.table === "snapshots") row.updated_at = new Date().toISOString(); // Trigger: Serverzeit
        if (["schueler", "kalender_termine", "kalender_pruefungen"].includes(q.table) && row.aktualisiert_am === undefined) row.aktualisiert_am = new Date().toISOString();
        if (alt) { Object.assign(alt, row); betroffen.push(alt); } else { rows.push(row); betroffen.push(row); }
      }
      return q.retSel ? liefere(betroffen, q.retCols) : { data: null, error: null };
    }
    if (q.op === "update") {
      // W14b: Test-Haken – „jemand ändert die Zeile genau jetzt“ (einmalig) und „kein Recht“ (Zeile wird nie getroffen)
      if (fake.vorUpdate) { const h = fake.vorUpdate; fake.vorUpdate = null; h(q, T); }
      const l = rows.filter(passt).filter((r) => !(fake.gesperrt || []).includes(r.id));
      zaehle(stats.updates, q.table, l.length);
      const patch = C(q.payload);
      if (["schueler", "kalender_termine", "kalender_pruefungen"].includes(q.table) && patch.aktualisiert_am === undefined) patch.aktualisiert_am = new Date().toISOString();
      l.forEach((r) => Object.assign(r, patch));
      if (fake.nachUpdate) fake.nachUpdate(l); // W14b: wie ein BEFORE-UPDATE-Trigger, der die Zeile noch ändert
      return q.retSel ? liefere(l, q.retCols) : { data: null, error: null };
    }
    return err("XX000", "unbekannte Operation");
  }
  function bauer(table) {
    const q = { table, op: "select", filters: [], cols: "*", order: null, range: null, lim: null, mode: "many", payload: null, opts: null, retSel: false, retCols: "*" };
    const b = {
      select(c) { if (q.op === "select") q.cols = c || "*"; else { q.retSel = true; q.retCols = c || "*"; } return b; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return b; },
      neq(c, v) { q.filters.push((r) => r[c] !== v); return b; },
      in(c, a) { q.filters.push((r) => (a || []).includes(r[c])); return b; },
      is(c, v) { q.filters.push((r) => (r[c] === undefined ? null : r[c]) === v); return b; },
      or() { return b; },
      order(c, o) { q.order = { c, asc: !o || o.ascending !== false }; return b; },
      range(a, z) { q.range = [a, z]; return b; },
      limit(n) { q.lim = n; return b; },
      single() { q.mode = "single"; return b; },
      maybeSingle() { q.mode = "maybe"; return b; },
      upsert(rows, o) { q.op = "upsert"; q.payload = Array.isArray(rows) ? rows : [rows]; q.opts = o || {}; return b; },
      insert(rows) { q.op = "insert"; q.payload = Array.isArray(rows) ? rows : [rows]; return b; },
      update(o) { q.op = "update"; q.payload = o; return b; },
      then(ok, fail) {
        stats.inflight++;
        return Promise.resolve().then(() => ausfuehren(q)).finally(() => { stats.inflight--; }).then(ok, fail);
      },
    };
    return b;
  }
  fake.client = {
    from: bauer,
    rpc(name) {
      let data = null;
      if (name === "termine_nicht_mehr_meine") data = [];
      else if (name === "schueler_uebergabe_historie") data = { fahrstunden: [], pruefungen: [] };
      return { then(ok, fail) { return Promise.resolve({ data, error: null }).then(ok, fail); } };
    },
    auth: { getSession: async () => ({ data: { session: { user: { id: "fl-1" } } }, error: null }) },
  };
  window.__fake = fake;
  window.getSupa = () => fake.client;
  window.__toasts = [];
  if (!window.__toastOrig) window.__toastOrig = window.toast;
  window.toast = (m) => { window.__toasts.push(String(m)); try { window.__toastOrig(m); } catch (e) {} };
}

function grundzustand(opts) {
  ["_schuelerSyncDebounce", "_termineSyncDebounce", "_pruefungenSyncDebounce", "_saveSyncDebounce"].forEach((n) => {
    try { clearTimeout(eval(n)); } catch (e) {}
  });
  if (opts.speicher) ["serband-abgleich-v1", STORE_KEY, "serband-sync-stamp", "serband-db-defekt"].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
  _authUser = { id: "fl-1" };
  _authProfile = { id: "fl-1", fahrschule_id: "fs-1", rolle: null };
  _pullOk = true;
  // Wie nach dem Login: die Abrufe sind gelaufen, die Brücken dürfen schreiben.
  try { _termineAbgerufen = true; _schuelerAbgerufen = true; _sitzungHatteDaten = false; } catch (e) {}
  try { _fsAgg = null; _fsPersonalBackup = null; } catch (e) {}
  try { _schuelerAbrufLaeuft = false; _schuelerFristen = {}; _bueroNotizen = {}; } catch (e) {}
  if (opts.db) DB = { students: [], lessons: [], exams: [], termine: [] };
}

/* ---------- Hilfen im Test ---------- */
async function lauf(ms = 4500) { // lässt die 4-s-Brücken laufen und wartet, bis die Attrappe ruhig ist
  await page.clock.runFor(ms);
  await page.waitForTimeout(120);
  await page.waitForFunction(() => !window.__fake || window.__fake.stats.inflight === 0);
  await page.waitForTimeout(60);
}
async function neu({ speicher = true, db = true } = {}) {
  try { await lauf(); } catch (e) {}
  await page.evaluate(attrappeEinbauen);
  await page.evaluate(`(${grundzustand.toString()})(${JSON.stringify({ speicher, db })})`);
  konsole = [];
}
const speichern = () => page.evaluate(() => save());
const bruecke = async () => { await speichern(); await lauf(); };
const tabelle = (n) => page.evaluate((t) => JSON.parse(JSON.stringify(window.__fake.T[t])), n);
const zeile = async (n, id) => (await tabelle(n)).find((r) => r.id === id);
const setzeTabelle = (n, rows) => page.evaluate(([t, r]) => { window.__fake.T[t] = r; }, [n, rows]);
const aendereZeile = (n, id, patch) => page.evaluate(([t, i, p]) => {
  const r = window.__fake.T[t].find((x) => x.id === i);
  if (!r) throw new Error("Zeile fehlt: " + i);
  if (p.aktualisiert_am === "+1s") p.aktualisiert_am = new Date(Date.now() + 1000).toISOString();
  Object.assign(r, p);
}, [n, id, patch]);
const zaehler = (art, t) => page.evaluate(([a, tt]) => window.__fake.stats[a][tt] || 0, [art, t]);
const zaehlerNull = () => page.evaluate(() => { const s = window.__fake.stats; s.upserts = {}; s.upsertAufrufe = {}; s.updates = {}; s.inserts = {}; });
const dbIds = (feld) => page.evaluate((f) => (DB[f] || []).map((x) => x.id), feld);
const ruf = (code) => page.evaluate(code);

const termin = (id, extra = {}) => Object.assign({ id, sid: null, date: "2026-11-03", von: "09:00", bis: "10:30", art: "fahrstunde", status: "geplant" }, extra);
const serverTermin = (id, extra = {}) => Object.assign({
  id, fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", schueler_id: null, datum: "2026-11-04", von: "13:00", bis: "14:30",
  art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: "2026-10-09T08:00:00.000Z",
}, extra);
const serverSchueler = (id, name, extra = {}) => Object.assign({
  id, fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", name, telefon: "0151 0000000", status: "aktiv", ausbildung: {}, bogen_ausgefuellt: false,
  aktualisiert_am: "2026-10-09T08:00:00.000Z",
}, extra);
const setzeLokal = (feld, liste) => page.evaluate(([f, l]) => { DB[f] = l; }, [feld, liste]);


/* ---------- W14b: Gesamtansicht speichert Termine und Prüfungen sicher ---------- */
const serverPruefung = (id, extra = {}) => Object.assign({
  id, fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", schueler_id: "S1", datum: "2026-12-01", result: null, pruefer: null, attempt: 1,
  geloescht: false, payload: {}, aktualisiert_am: "2026-10-09T08:00:00.000Z",
}, extra);
// Gesamtansicht mit dem Stand der Attrappe öffnen (wie _fsLoadAggData: Zeilen → Einträge, Vergleichsstand = Kopie)
async function gesamt({ termine = [], pruefungen = [], schueler = [] } = {}) {
  await setzeTabelle("schueler", schueler);
  await setzeTabelle("kalender_termine", termine);
  await setzeTabelle("kalender_pruefungen", pruefungen);
  await ruf(() => {
    _fsAgg = { fahrschuleId: "fs-1", fahrschule: { name: "Testfahrschule" }, lehrer: [{ id: "fl-1", name: "Fahr Lehrer" }], fahrzeuge: [], pakete: [] };
    const t = document.getElementById("toast"); t.classList.remove("show", "undo"); t.textContent = ""; // kein Hinweis aus dem Fall davor
    const T = window.__fake.T, ln = () => "Fahr Lehrer";
    DB = { students: T.schueler.map((r) => _fsMapSchueler(JSON.parse(JSON.stringify(r)), ln)), lessons: T.kalender_termine.map((r) => _fsMapTermin(JSON.parse(JSON.stringify(r)), ln)),
      exams: T.kalender_pruefungen.map((r) => _fsMapPruefung(JSON.parse(JSON.stringify(r)), ln)), termine: [] };
    _fsBaseline = JSON.parse(JSON.stringify({ students: DB.students, lessons: DB.lessons, exams: DB.exams }));
  });
}
const gesamtSpeichern = () => ruf(() => _fsSyncAggJetzt());
const gesamtEnde = () => ruf(() => { _fsAgg = null; _fsBaseline = null; window.__fake.vorUpdate = null; window.__fake.nachUpdate = null; window.__fake.gesperrt = null; });
const letzterHinweis = () => ruf(() => document.getElementById("toast").textContent);
const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });
const lokalMit = (liste) => setzeLokal("lessons", liste);
const bueroZeile = (id, extra = {}) => serverTermin(id, Object.assign({ art: "vortest", datum: "2026-12-01", von: "10:00", bis: "11:00", payload: { notiz: "vom Büro" } }, extra));

fall("A Backup einspielen (alte Kopie ohne _syncedAt) eines Büro-Termins gelöscht auf Server", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [bueroZeile("V1", { geloescht: true, datum: "2026-12-09" })]);
  await lokalMit([termin("X1"), termin("V1", { art: "vortest", date: "2026-12-01" })]);
  await bruecke();
  const z = await zeile("kalender_termine", "V1");
  if (!z || z.geloescht !== false) return;
  f("V1 (vom Büro gelöscht) ist wieder aktiv, datum=" + z.datum + " (App hat Büro-Termin überschrieben/wiederbelebt)");
});
fall("A2 dito: Büro hat Zeit geändert, alte lokale Kopie überschreibt", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [bueroZeile("V2", { von: "14:00", bis: "15:00", art: "mpu" })]);
  await lokalMit([termin("X1"), termin("V2", { art: "mpu", date: "2026-12-01", von: "10:00", bis: "11:00" })]);
  await bruecke();
  const z = await zeile("kalender_termine", "V2");
  if (z.von !== "14:00") f("V2 auf dem Server überschrieben: von=" + z.von + ", payload=" + JSON.stringify(z.payload));
});
fall("B Bekannte lokale Kopie (synchron) wird beim Abruf entfernt, Server unberührt", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("X1"), termin("V3")]);
  await bruecke(); // hochgeladen als Fahrstunde (so war es vor dem Update), danach macht das Büro daraus Simulator
  await aendereZeile("kalender_termine", "V3", { art: "simulator", aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons.find((l) => l.id === "V3").art = "simulator"; }); // alte Kopie mit Büro-Art (z. B. Snapshot)
  await ruf(() => pullTermineZuweisungen());
  const ids = await dbIds("lessons");
  if (ids.includes("V3")) f("V3 noch lokal");
  await bruecke();
  const z = await zeile("kalender_termine", "V3");
  if (!z || z.geloescht) f("V3 auf Server weg/gelöscht");
});
fall("C Lokal gelöscht (Nutzer), Server-Art Büro: nicht gelöscht", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("X1"), termin("V4")]);
  await bruecke(); // Gerät kennt V4 (Gedächtnis)
  await aendereZeile("kalender_termine", "V4", { art: "beratung", aktualisiert_am: "+1s" });
  await setzeLokal("lessons", [termin("X1")]);
  await bruecke();
  const z = await zeile("kalender_termine", "V4");
  if (!z || z.geloescht) f("V4 wurde gelöscht");
});
fall("D Server liefert nur Büro-Arten, >3 alte Kopien: Kopien werden lokal weggeräumt", async (f) => {
  await neu();
  const l = [1,2,3,4,5].map(i => termin("W" + i, { art: "vortest", von: "0" + i + ":00", bis: "0" + i + ":30" }));
  await setzeLokal("lessons", l);
  await bruecke();
  await ruf(() => pullTermineZuweisungen());
  const ids = await dbIds("lessons");
  if (ids.length) f("alte Büro-Kopien bleiben in der App (" + ids.length + "), Sperre 'Server liefert keine Termine' greift: zählt in Statistik/Kalender");
});
fall("G Alte Büro-Kopie lokal (z. B. Backup), Büro hat daraus inzwischen eine Fahrstunde gemacht: App löscht sie nicht", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("X1"), termin("G1")]);
  await bruecke(); // Gerät kennt G1 (Gedächtnis), Server: Fahrstunde
  await ruf(() => { DB.lessons.find((l) => l.id === "G1").art = "simulator"; }); // alte Kopie (Backup) mit Büro-Art
  await bruecke();
  const z = await zeile("kalender_termine", "G1");
  if (!z || z.geloescht) f("G1 (auf dem Server eine Fahrstunde) wurde von der App gelöscht: " + JSON.stringify(z && { art: z.art, geloescht: z.geloescht }));
});
// Fall E (Büro stuft um, Fahrlehrer ändert dieselbe Stunde binnen ~60 s): allgemeiner Wettlauf jeder Büro-Änderung, nicht W28-spezifisch;
// mit Migration 20261206_w28_01 lehnt die Datenbank das für Fahrlehrer ab. Darum hier nicht geprüft.
fall("F Gesamtansicht: kein Löschen/Schreiben von Büro-Terminen (Baseline gefiltert)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await setzeTabelle("kalender_termine", (await tabelle("kalender_termine")).concat([bueroZeile("V5")]));
  await ruf(() => { DB.lessons[0].von = "15:00"; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "V5");
  await gesamtEnde();
  if (!z || z.geloescht || z.datum !== "2026-12-01") f("V5 verändert " + JSON.stringify(z));
});

let rot = 0;
for (const { name, fn } of faelle) {
  const probleme = [];
  try { await fn((t) => probleme.push(t)); } catch (e) { probleme.push("Testfehler: " + String(e.message || e).split("\n")[0]); }
  if (probleme.length) { rot++; console.log("ROT   " + name); probleme.forEach((p) => console.log("        - " + p)); }
  else console.log("GRÜN  " + name);
}
await browser.close(); server.close();
console.log(rot ? `❌ ${rot} Fall/Fälle rot` : `✅ W28-Abgleich: alle ${faelle.length} Fälle grün`);
process.exit(rot ? 1 : 0);
