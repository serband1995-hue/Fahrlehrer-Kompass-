// Test des Abgleichs App <-> Büro (index.html): Datenverlust-Fälle bei Schülern, Terminen, Prüfungen, Snapshot und Backup.
// Black-Box: geprüft wird nur, was auf dem (nachgebauten) Server und in DB ankommt.
// Die Datenbank wird nicht angesprochen: getSupa() wird durch eine Attrappe im Arbeitsspeicher ersetzt.
// Die 4-Sekunden-Verzögerung der Sync-Brücken läuft über page.clock, der Test wartet nicht in Echtzeit.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/abgleich-test.mjs
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
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
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

/* ---------- Testfälle ---------- */
const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });

fall("1  Neuer Büro-Termin bleibt erhalten und kommt aufs Gerät", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("T-neu")]);
  await setzeLokal("lessons", [termin("X1")]);
  await bruecke();
  const z = await zeile("kalender_termine", "T-neu");
  if (!z || z.geloescht !== false) f("T-neu wurde auf dem Server gelöscht/verändert: " + JSON.stringify(z && { geloescht: z.geloescht }));
  await ruf(() => pullTermineZuweisungen());
  if (!(await dbIds("lessons")).includes("T-neu")) f("T-neu kam nach dem Abruf nicht in DB.lessons");
});

fall("2  Hochgeladener Termin, lokal gelöscht, wird auf dem Server gelöscht", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  if (!(await zeile("kalender_termine", "L1"))) return f("L1 wurde gar nicht hochgeladen");
  await setzeLokal("lessons", [termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  const z = await zeile("kalender_termine", "L1");
  if (!z || z.geloescht !== true) f("L1 ist auf dem Server nicht geloescht:true: " + JSON.stringify(z && z.geloescht));
  const z2 = await zeile("kalender_termine", "L2");
  if (!z2 || z2.geloescht !== false) f("L2 (noch vorhanden) wurde fälschlich gelöscht");
});

fall("2b Abgerufener Termin, lokal gelöscht, wird auf dem Server gelöscht", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("T-b"), serverTermin("T-c", { von: "15:00", bis: "16:30" })]);
  await setzeLokal("lessons", [termin("X1")]);
  await ruf(() => pullTermineZuweisungen());
  const ids = await dbIds("lessons");
  if (!ids.includes("T-b")) return f("T-b wurde nicht abgerufen: " + ids);
  await setzeLokal("lessons", (await ruf(() => DB.lessons)).filter((l) => l.id !== "T-b"));
  await bruecke();
  const z = await zeile("kalender_termine", "T-b");
  if (!z || z.geloescht !== true) f("T-b ist auf dem Server nicht geloescht:true: " + JSON.stringify(z && z.geloescht));
  const c = await zeile("kalender_termine", "T-c");
  if (!c || c.geloescht !== false) f("T-c (noch vorhanden) wurde fälschlich gelöscht");
});

fall("3  Büro-Änderung (abgesagt) wird nicht überschrieben", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("T1"), termin("T2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  await aendereZeile("kalender_termine", "T1", { status: "abgesagt", aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons.find((l) => l.id === "T2").von = "11:30"; });
  await bruecke();
  const z = await zeile("kalender_termine", "T1");
  if (!z || z.status !== "abgesagt") f("T1 auf dem Server ist nicht mehr 'abgesagt': " + (z && z.status));
  await ruf(() => pullTermineZuweisungen());
  const lok = await ruf(() => (DB.lessons.find((l) => l.id === "T1") || {}).status);
  if (lok !== "abgesagt") f("T1 lokal nicht 'abgesagt': " + lok);
  const t2 = await zeile("kalender_termine", "T2");
  if (!t2 || t2.von !== "11:30") f("Eigene Änderung an T2 kam nicht auf den Server: " + (t2 && t2.von));
});

fall("4  Keine Schleife: weitere Abrufe ändern nichts", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  await ruf(() => pullTermineZuweisungen());
  await lauf(); // was der Abruf noch auslöst, soll jetzt durch sein
  const vorherDB = await ruf(() => JSON.stringify(DB.lessons));
  const vorherServer = JSON.stringify(await tabelle("kalender_termine"));
  await zaehlerNull();
  await ruf(() => { window.__toasts = []; });
  await ruf(() => pullTermineZuweisungen());
  await ruf(() => pullTermineZuweisungen());
  await lauf();
  const toasts = await ruf(() => window.__toasts);
  if (toasts.some((t) => /Kalender von der Fahrschule aktualisiert|neue[rn]? Termin/.test(t))) f("Toast trotz keiner Änderung: " + toasts.join(" | "));
  const n = await zaehler("upserts", "kalender_termine");
  if (n) f("Brücke schreibt erneut (" + n + " Zeilen) ohne Änderung");
  if ((await ruf(() => JSON.stringify(DB.lessons))) !== vorherDB) f("DB.lessons hat sich durch weitere Abrufe verändert");
  if (JSON.stringify(await tabelle("kalender_termine")) !== vorherServer) f("Server-Termine haben sich ohne Änderung verändert");
});

fall("5  Nur Geändertes wird gesendet", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" }), termin("L3", { von: "13:00", bis: "14:30" })]);
  await bruecke();
  if ((await tabelle("kalender_termine")).length !== 3) return f("Erster Sync hat nicht alle 3 Termine geschrieben");
  await zaehlerNull();
  await ruf(() => { DB.lessons.find((l) => l.id === "L2").von = "11:15"; });
  await bruecke();
  const n = await zaehler("upserts", "kalender_termine");
  if (n !== 1) f("Brücke schrieb " + n + " statt 1 Zeile");
  const z = await zeile("kalender_termine", "L2");
  if (!z || z.von !== "11:15") f("Die geänderte Zeile kam nicht an");
});

fall("6  Büro ändert Schüler (Name/Telefon): Gerät übernimmt, schreibt nicht zurück", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111" }, { id: "S2", name: "Ben Probe", telefon: "" }]);
  await bruecke();
  if (!(await zeile("schueler", "S1"))) return f("S1 wurde nicht hochgeladen");
  await aendereZeile("schueler", "S1", { name: "Anna Beispiel", telefon: "0170 2222222", aktualisiert_am: "+1s" });
  await ruf(() => pullSchuelerZuweisungen());
  const s = await ruf(() => DB.students.find((x) => x.id === "S1"));
  if (!s || s.name !== "Anna Beispiel" || s.telefon !== "0170 2222222") f("Gerät hat Büro-Änderung nicht übernommen: " + JSON.stringify(s && { n: s.name, t: s.telefon }));
  await bruecke();
  const z = await zeile("schueler", "S1");
  if (!z || z.name !== "Anna Beispiel" || z.telefon !== "0170 2222222") f("Brücke hat den alten Stand zurückgeschrieben: " + JSON.stringify(z && { n: z.name, t: z.telefon }));
});

fall("7  Neuer Büro-Schüler (noch nicht abgerufen) wird nicht als gelöscht markiert", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "" }]);
  await bruecke();
  await setzeTabelle("schueler", (await tabelle("schueler")).concat([serverSchueler("S-neu", "Clara Neu")]));
  await ruf(() => { DB.students[0].notiz = "geändert"; });
  await bruecke();
  const z = await zeile("schueler", "S-neu");
  if (!z || z.status === "geloescht") f("S-neu wurde auf status 'geloescht' gesetzt");
});

fall("8  Prüfungen: bekannte lokal gelöscht -> Server geloescht, unbekannte bleibt", async (f) => {
  await neu();
  const ex = (id) => ({ id, sid: "S1", date: "2026-11-05", result: null, pruefer: "Prüfer A", attempt: 1 });
  await setzeLokal("exams", [ex("E1"), ex("E2")]);
  await bruecke();
  if (!(await zeile("kalender_pruefungen", "E1"))) return f("E1 wurde nicht hochgeladen");
  await setzeTabelle("kalender_pruefungen", (await tabelle("kalender_pruefungen")).concat([{
    id: "E-neu", fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", schueler_id: "S9", datum: "2026-11-09", result: null, pruefer: null,
    attempt: 1, geloescht: false, payload: {}, aktualisiert_am: "2026-10-09T08:00:00.000Z",
  }]));
  await setzeLokal("exams", [ex("E2")]);
  await bruecke();
  const e1 = await zeile("kalender_pruefungen", "E1");
  if (!e1 || e1.geloescht !== true) f("E1 (lokal gelöscht) ist nicht geloescht:true");
  const e2 = await zeile("kalender_pruefungen", "E2");
  if (!e2 || e2.geloescht !== false) f("E2 (noch vorhanden) wurde fälschlich gelöscht");
  const en = await zeile("kalender_pruefungen", "E-neu");
  if (!en || en.geloescht !== false) f("Unbekannte Server-Prüfung E-neu wurde gelöscht");
});

fall("9  Defekter Speicher wird gesichert, Cloud-Stand gewinnt trotz neuem Stempel", async (f) => {
  await ruf(() => { localStorage.setItem(STORE_KEY, "{kaputt"); });
  await page.reload();
  await page.waitForTimeout(1200);
  const defekt = await ruf(() => localStorage.getItem("serband-db-defekt"));
  if (!defekt || !defekt.includes("{kaputt")) f("serband-db-defekt enthält den kaputten Text nicht: " + JSON.stringify(defekt));
  konsole = [];
  await neu({ speicher: false, db: false }); // Speicher bleibt, wie die App ihn nach dem Neustart hinterlassen hat
  await setzeTabelle("snapshots", [{
    user_id: "fl-1", updated_at: "2026-01-01T00:00:00.000Z",
    data: { students: [{ id: "A", name: "Eins Test" }, { id: "B", name: "Zwei Test" }], lessons: [], exams: [] },
  }]);
  await ruf(() => localStorage.setItem("serband-sync-stamp", String(Date.parse("2026-10-01T00:00:00Z"))));
  await ruf(() => pullFromCloud());
  const ids = await dbIds("students");
  if (ids.join() !== "A,B") f("Cloud-Daten nicht übernommen, DB.students = [" + ids + "]");
  await ruf(() => { ["serband-db-defekt", STORE_KEY, "serband-sync-stamp"].forEach((k) => localStorage.removeItem(k)); });
});

fall("10 Leerer Stand wird nicht hochgeladen (Gerät startete leer, Cloud hat Daten)", async (f) => {
  await neu();
  await setzeTabelle("snapshots", [{
    user_id: "fl-1", updated_at: "2026-10-09T08:00:00.000Z",
    data: { students: [{ id: "A", name: "Eins Test" }, { id: "B", name: "Zwei Test" }], lessons: [], exams: [] },
  }]);
  // Gerät ist leer und hält sich für aktueller (Stempel neuer) - z.B. leerer Speicher nach Neuinstallation.
  await ruf(() => { DB = { students: [], lessons: [], exams: [] }; _sitzungHatteDaten = false; localStorage.setItem("serband-sync-stamp", String(Date.parse("2026-10-10T08:00:00Z"))); });
  await ruf(() => pullFromCloud());
  // Ein leeres Gerät übernimmt den Cloud-Stand, auch wenn sein Stempel neuer ist.
  if ((await dbIds("students")).length !== 2) f("Leeres Gerät hat den Cloud-Stand nicht übernommen");
  // Schlug das Laden fehl und das Gerät ist weiter leer, darf es die Cloud nicht leeren.
  await ruf(() => { DB = { students: [], lessons: [], exams: [] }; _sitzungHatteDaten = false; });
  await zaehlerNull();
  const r = await ruf(() => pushToCloud());
  const n = await zaehler("upserts", "snapshots");
  if (n) f("pushToCloud hat " + n + "x in snapshots geschrieben");
  if (r !== false) f("pushToCloud lieferte " + r + " statt false");
  const snap = (await tabelle("snapshots"))[0];
  if (!snap || !(snap.data.students || []).length) f("Snapshot auf dem Server wurde geleert");
  // Bewusst alles gelöscht (Gerät hatte in dieser Sitzung Daten): darf hoch.
  await ruf(() => { _sitzungHatteDaten = true; });
  const r2 = await ruf(() => pushToCloud());
  if (r2 !== true) f("Bewusst geleerter Stand wird nicht hochgeladen");
});

fall("10b Brücke wartet, bis der Kalender einmal abgerufen ist", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [{ id: "T1", fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", datum: "2026-11-03", von: "10:00", bis: "11:30", art: "fahrstunde", status: "abgesagt", geloescht: false, payload: {}, aktualisiert_am: "2026-10-10T09:00:00.000Z" }]);
  await ruf(() => { _termineAbgerufen = false; DB.lessons = [{ id: "T1", date: "2026-11-03", von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", _syncedAt: 1 }]; save(); });
  await page.clock.runFor(12000);
  const t = (await tabelle("kalender_termine")).find((r) => r.id === "T1");
  if (t.status !== "abgesagt") f("Brücke hat vor dem Abruf die Büro-Absage überschrieben");
  await ruf(() => pullTermineZuweisungen());
  const lok = await ruf(() => DB.lessons.find((l) => l.id === "T1").status);
  if (lok !== "abgesagt") f("Abruf hat die Absage nicht übernommen: " + lok);
});

fall("11 Über 1000 Termine: Abruf entfernt keinen lokalen Termin", async (f) => {
  await neu();
  const viele = [];
  for (let i = 0; i < 1200; i++) viele.push(serverTermin("T" + String(i).padStart(4, "0"), { datum: "2026-12-" + String(1 + (i % 28)).padStart(2, "0"), von: String(6 + (i % 12)).padStart(2, "0") + ":00" }));
  await setzeTabelle("kalender_termine", viele);
  // Das Gerät hat alle 1200 einmal abgerufen (Deckel kurz aufgehoben, wie bei seitenweisem Abruf).
  await ruf(() => { window.__fake.deckel = 100000; });
  await ruf(() => pullTermineZuweisungen());
  await ruf(() => { window.__fake.deckel = 1000; });
  const bekannt = (await dbIds("lessons")).length;
  if (bekannt !== 1200) return f("Vorbereitung: Gerät kennt " + bekannt + " statt 1200 Termine");
  await ruf(() => pullTermineZuweisungen());
  const danach = (await dbIds("lessons")).length;
  if (danach !== 1200) f("Nach dem Abruf nur noch " + danach + " statt 1200 Termine lokal");
});

fall("12 Backup einspielen in der Fahrschul-Gesamtansicht ist gesperrt", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "" }]);
  let offen = true;
  try {
    await ruf(() => { ensureDB(); _fsAgg = { fahrschuleId: "fs-1", fahrschule: { name: "Testfahrschule" }, lehrer: [] }; routeSettings(); });
  } catch (e) { offen = false; f("Einstellungen ließen sich in der Gesamtansicht nicht öffnen: " + String(e).slice(0, 120)); }
  if (offen && (await page.$("#impFile"))) {
    const backup = { app: "serband", version: 1, datum: new Date().toISOString(), data: { students: [{ id: "imp1", name: "Importiert Test" }], lessons: [], exams: [] } };
    await page.setInputFiles("#impFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForTimeout(500);
    const ids = await dbIds("students");
    if (ids.join() !== "S1") f("Backup hat DB ersetzt: DB.students = [" + ids + "]");
  }
  await ruf(() => { _fsAgg = null; });
});

fall("13 Backup einspielen löscht auf dem Server nichts (D2)", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("T-buero")]);
  await setzeTabelle("schueler", [serverSchueler("S2", "Bea Muster")]);
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "" }]);
  await setzeLokal("lessons", [termin("L1")]);
  await ruf(() => pullSchuelerZuweisungen());
  await ruf(() => pullTermineZuweisungen());
  await bruecke();
  const ids = await dbIds("lessons");
  if (!ids.includes("T-buero")) return f("Vorbereitung: T-buero nicht abgerufen: " + ids);
  await ruf(() => { ensureDB(); routeSettings(); });
  const backup = { app: "serband", version: 1, datum: new Date().toISOString(), data: { students: [{ id: "S1", name: "Anna Muster" }], lessons: [termin("L1")], exams: [] } };
  await page.setInputFiles("#impFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.waitForTimeout(300);
  await lauf(); await lauf(12000);
  const z = await zeile("kalender_termine", "T-buero");
  if (!z || z.geloescht !== false) f("Büro-Termin nach dem Einspielen auf dem Server gelöscht: " + JSON.stringify(z && z.geloescht));
  const s2 = await zeile("schueler", "S2");
  if (!s2 || s2.status !== "aktiv") f("Schüler S2 nach dem Einspielen nicht mehr aktiv: " + (s2 && s2.status));
  if (!(await dbIds("lessons")).includes("T-buero")) f("Büro-Termin kam nach dem Einspielen nicht wieder aufs Gerät");
});

fall("13b Backup einspielen: Stand der Datei gilt für ihre eigenen Termine (D2)", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  const datei = await ruf(() => JSON.parse(JSON.stringify(DB.lessons)));
  // nach dem Backup: L1 verschoben, L2 gelöscht
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "L2"); DB.lessons[0].von = "15:00"; DB.lessons[0].bis = "16:30"; save(); });
  await lauf();
  await ruf(() => { ensureDB(); routeSettings(); });
  const backup = { app: "serband", version: 1, datum: new Date().toISOString(), data: { students: [], lessons: datei, exams: [] } };
  await page.setInputFiles("#impFile", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.waitForTimeout(300);
  await lauf(); await lauf(12000);
  const l1 = await zeile("kalender_termine", "L1"), l2 = await zeile("kalender_termine", "L2");
  if (!l1 || l1.von !== "09:00") f("L1 nicht auf den Stand der Datei zurück: " + (l1 && l1.von));
  if (!l2 || l2.geloescht !== false) f("L2 aus der Datei nicht wiederhergestellt: " + JSON.stringify(l2 && l2.geloescht));
  const ids = await dbIds("lessons");
  if (!ids.includes("L1") || !ids.includes("L2")) f("Gerät hat nach dem Abruf nicht beide Termine: " + ids);
});

fall("14 Gelöschter Termin kommt vor dem Hochladen nicht als „neu“ zurück", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  // Löschen und sofort (vor der Brücke) abrufen, z. B. Minuten-Abruf in den 4 Sekunden oder Neustart
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "L1"); });
  await ruf(() => pullTermineZuweisungen());
  if ((await dbIds("lessons")).includes("L1")) return f("L1 kam durch den Abruf als neuer Termin zurück");
  await bruecke();
  const z = await zeile("kalender_termine", "L1");
  if (!z || z.geloescht !== true) f("L1 danach auf dem Server nicht gelöscht: " + JSON.stringify(z && z.geloescht));
});

fall("15 Gelöschter Schüler kommt vor dem Hochladen nicht als „neu“ zurück", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "" }, { id: "S3", name: "Xaver Muster", telefon: "" }]);
  await bruecke();
  if (!(await zeile("schueler", "S3"))) return f("Vorbereitung: S3 nicht hochgeladen");
  await ruf(() => { DB.students = DB.students.filter((s) => s.id !== "S3"); });
  await ruf(() => pullSchuelerZuweisungen());
  if ((await dbIds("students")).includes("S3")) return f("S3 kam durch den Abruf als neuer Schüler zurück");
  await bruecke();
  const z = await zeile("schueler", "S3");
  if (!z || z.status !== "geloescht") f("S3 danach auf dem Server nicht gelöscht: " + (z && z.status));
});

fall("16 Beim Schließen der App laufen die Brücken sofort", async (f) => {
  await neu();
  await setzeLokal("lessons", [termin("L1"), termin("L2", { von: "11:00", bis: "12:30" })]);
  await bruecke();
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "L1"); save(); _brueckenSofort(); });
  await page.clock.runFor(50); await page.waitForTimeout(150);
  await page.waitForFunction(() => window.__fake.stats.inflight === 0);
  const z = await zeile("kalender_termine", "L1");
  if (!z || z.geloescht !== true) f("Löschung nicht sofort hochgeladen: " + JSON.stringify(z && z.geloescht));
});

fall("17 Theorie bestanden vom Büro setzt den Plan und beendet „wartet auf Theorie“ (T1)", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Ben Muster", telefon: "", plan: { ampeln: {}, stunden: {}, fahrcheck: {}, sonder: { ueberland: [], autobahn: [], nacht: [] }, theorie: false, notes: {} }, theorieWait: "2026-10-01T10:00:00.000Z" }]);
  await bruecke();
  await aendereZeile("schueler", "S1", { theorie_bestanden_am: "2026-11-05", aktualisiert_am: "+1s" });
  await ruf(() => pullSchuelerZuweisungen());
  const s1 = await ruf(() => { const s = DB.students.find((x) => x.id === "S1"); return { t: s.plan.theorie, w: s.theorieWait || null, p: s.theoryPassed || null, warte: wartetBuero(s) }; });
  if (!s1.t) f("plan.theorie nicht gesetzt");
  if (s1.w) f("theorieWait noch gesetzt");
  if (!s1.p || !s1.p.startsWith("2026-11-05")) f("theoryPassed falsch: " + s1.p);
  if (s1.warte === "theorie") f("App sagt weiter „wartet auf Theorie“");
  // Fahrlehrer schaltet selbst wieder aus: nächster Abruf schaltet NICHT wieder an
  await ruf(() => { const s = DB.students.find((x) => x.id === "S1"); s.plan.theorie = false; delete s.theoryPassed; });
  await ruf(() => pullSchuelerZuweisungen());
  if (await ruf(() => DB.students.find((x) => x.id === "S1").plan.theorie)) f("Abruf überstimmt das Umschalten des Fahrlehrers");
});

fall("18 Büro nimmt „Theorie bestanden“ zurück: Plan zurück, wartet wieder auf Theorie (T1)", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Ben Muster", telefon: "", plan: { ampeln: {}, stunden: {}, fahrcheck: {}, sonder: { ueberland: [], autobahn: [], nacht: [] }, theorie: false, notes: {} }, theorieWait: "2026-10-01T10:00:00.000Z" }]);
  await bruecke();
  await aendereZeile("schueler", "S1", { theorie_bestanden_am: "2026-11-05", aktualisiert_am: "+1s" });
  await ruf(() => pullSchuelerZuweisungen());
  await aendereZeile("schueler", "S1", { theorie_bestanden_am: null, aktualisiert_am: "+1s" });
  await ruf(() => pullSchuelerZuweisungen());
  const s1 = await ruf(() => { const s = DB.students.find((x) => x.id === "S1"); return { t: s.plan.theorie, w: s.theorieWait || null, p: s.theoryPassed || null }; });
  if (s1.t || s1.p) f("Plan nach Rücknahme nicht zurückgesetzt: " + JSON.stringify(s1));
  if (s1.w !== "2026-10-01T10:00:00.000Z") f("wartet nach Rücknahme nicht wieder auf Theorie: " + s1.w);
});

fall("19 Übergebener Schüler, den der vorige Fahrlehrer ausgeblendet hatte, ist beim neuen sichtbar (D1)", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "" }]);
  await setzeTabelle("schueler", [serverSchueler("S9", "Uwe Muster", { ausbildung: { ausgeblendetAm: "2026-11-01T10:00:00.000Z" } })]);
  await ruf(() => pullSchuelerZuweisungen());
  const r = await ruf(() => { const s = DB.students.find((x) => x.id === "S9"); return s ? { aus: s.ausgeblendetAm || null, aktiv: activeStudents().some((x) => x.id === "S9") } : null; });
  if (!r) return f("Schüler nicht übernommen");
  if (r.aus || !r.aktiv) f("Schüler beim neuen Fahrlehrer ausgeblendet: " + JSON.stringify(r));
});

fall("20 W14: Büro ändert Telefon, Gerät hat sonst etwas am Schüler geändert – Telefon vom Büro bleibt", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111", notiz: "" }]);
  await bruecke();
  if (!(await zeile("schueler", "S1"))) return f("S1 wurde nicht hochgeladen");
  await aendereZeile("schueler", "S1", { telefon: "0170 3333333", name: "Anna Beispiel", aktualisiert_am: "+1s" });
  // Fahrlehrer ändert offline etwas anderes am Schüler (Brücke kam noch nicht dazu)
  await ruf(() => { DB.students.find((x) => x.id === "S1").notiz = "offline geschrieben"; });
  await ruf(() => pullSchuelerZuweisungen());
  const s = await ruf(() => { const x = DB.students.find((y) => y.id === "S1"); return { n: x.name, t: x.telefon, no: x.notiz }; });
  if (s.t !== "0170 3333333" || s.n !== "Anna Beispiel") f("Gerät hat Name/Telefon vom Büro nicht übernommen: " + JSON.stringify(s));
  if (s.no !== "offline geschrieben") f("eigene Änderung verloren");
  await bruecke();
  const z = await zeile("schueler", "S1");
  if (!z || z.telefon !== "0170 3333333" || z.name !== "Anna Beispiel") f("Brücke schrieb alten Namen/alte Nummer zurück: " + JSON.stringify(z && { n: z.name, t: z.telefon }));
  if (!z || !z.ausbildung || z.ausbildung.notiz !== "offline geschrieben") f("eigene Änderung kam nicht an");
});

fall("21 W14: Gerät ändert Telefon selbst – eigener Stand gilt weiter (wie bisher)", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111" }]);
  await bruecke();
  await aendereZeile("schueler", "S1", { name: "Anna Beispiel", aktualisiert_am: "+1s" });
  await ruf(() => { DB.students.find((x) => x.id === "S1").telefon = "0160 4444444"; });
  await ruf(() => pullSchuelerZuweisungen());
  const s = await ruf(() => DB.students.find((y) => y.id === "S1").telefon);
  if (s !== "0160 4444444") f("eigene Telefonnummer überschrieben: " + s);
});

fall("22 W14: Behörde-Blatt – Büro hat Bewerbernummer inzwischen geändert: Büro-Stand bleibt, Rückgängig nimmt meine", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111" }]);
  await bruecke();
  await aendereZeile("schueler", "S1", { bewerbernummer: "ALT-1", vorbesitz: null });
  await ruf(() => { _schuelerFristen = { S1: { bewerbernummer: "ALT-1", vorbesitz: null } }; openBehoerdeSheet(DB.students.find((x) => x.id === "S1")); });
  await page.waitForSelector("#bhNr");
  await aendereZeile("schueler", "S1", { bewerbernummer: "BUERO-2" }); // Büro ändert, während das Blatt offen ist
  // Blatt fährt mit Animation ein (Uhr der Seite steht): direkt im DOM tippen
  await ruf(() => { document.querySelector("#bhNr").value = "APP-3"; document.querySelector('#bhVorbesitz .pill[data-k="AM"]').click(); document.querySelector("#bhSpeichern").click(); });
  await page.waitForTimeout(150); await page.waitForFunction(() => !window.__fake || window.__fake.stats.inflight === 0);
  let z = await zeile("schueler", "S1");
  if (z.bewerbernummer !== "BUERO-2") f("Büro-Änderung überschrieben: " + z.bewerbernummer);
  if (JSON.stringify(z.vorbesitz) !== JSON.stringify(["AM"])) f("Vorbesitz nicht gespeichert: " + JSON.stringify(z.vorbesitz));
  const t = await page.textContent("#toast");
  if (!/Bewerbernummer/.test(t) || !/Meine nehmen/.test(t) || !/Gespeichert/.test(t)) return f("Hinweis fehlt: " + t + " · Server: " + JSON.stringify({ b: z.bewerbernummer, v: z.vorbesitz }));
  await ruf(() => document.querySelector("#toast .ut-btn").click());
  await page.waitForTimeout(150); await page.waitForFunction(() => !window.__fake || window.__fake.stats.inflight === 0);
  z = await zeile("schueler", "S1");
  if (z.bewerbernummer !== "APP-3") f("Rückgängig hat meine Eingabe nicht gespeichert: " + z.bewerbernummer);
});

fall("23 W14: Gesamtansicht – Leitung ändert Paket und Notiz, App/Büro haben inzwischen Stand und Telefon geändert: nichts geht verloren", async (f) => {
  await neu();
  await setzeTabelle("schueler", [serverSchueler("S9", "Clara Muster", { paket_id: "p1", ausbildung: { notiz: "alt", plan: { a: 1 } } })]);
  await ruf(() => {
    const row = window.__fake.T.schueler[0];
    _fsAgg = { fahrschuleId: "fs-1", fahrschule: { name: "Testfahrschule" }, lehrer: [{ id: "fl-1", name: "Fahr Lehrer" }], fahrzeuge: [], pakete: [] };
    DB = { students: [_fsMapSchueler(row, () => "Fahr Lehrer")], lessons: [], exams: [], termine: [] };
    _fsBaseline = { students: JSON.parse(JSON.stringify(DB.students)), lessons: [], exams: [] };
  });
  // inzwischen: Fahrlehrer-App ändert den Ausbildungsstand, Büro die Telefonnummer
  await aendereZeile("schueler", "S9", { telefon: "0170 5555555", ausbildung: { notiz: "alt", plan: { a: 2 } } });
  await ruf(() => { const s = DB.students[0]; s._paketId = "p2"; s.notiz = "von Leitung"; });
  const ok = await ruf(() => _fsSyncAggJetzt());
  const z = await zeile("schueler", "S9");
  await ruf(() => { _fsAgg = null; _fsBaseline = null; });
  if (!ok) f("Speichern meldete Fehler");
  if (z.paket_id !== "p2") f("Paket nicht gespeichert: " + z.paket_id);
  if (z.telefon !== "0170 5555555") f("Telefon vom Büro überschrieben: " + z.telefon);
  if (!z.ausbildung || !z.ausbildung.plan || z.ausbildung.plan.a !== 2) f("Ausbildungsstand der App überschrieben: " + JSON.stringify(z.ausbildung && z.ausbildung.plan));
  if (!z.ausbildung || z.ausbildung.notiz !== "von Leitung") f("Notiz der Leitung fehlt: " + JSON.stringify(z.ausbildung && z.ausbildung.notiz));
});

fall("24 W14: Büro ändert Klasse – Gerät übernimmt und lädt den Schüler nicht erneut hoch", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111", form: "B" }]);
  await bruecke();
  await ruf(() => pullSchuelerZuweisungen());
  await bruecke();
  await aendereZeile("schueler", "S1", { klasse: "CE", aktualisiert_am: "+1s" });
  await ruf(() => pullSchuelerZuweisungen());
  const form = await ruf(() => DB.students.find((x) => x.id === "S1").form);
  if (form !== "CE") return f("Klasse vom Büro nicht übernommen: " + form);
  await zaehlerNull();
  await bruecke();
  const n = await zaehler("upserts", "schueler");
  if (n !== 0) f("Übernahme vom Büro gilt als eigene Änderung: " + n + " Schüler hochgeladen");
});

fall("25 W14: Gesamtansicht – Leitung und Büro ändern dasselbe Telefon: Büro-Stand bleibt, Anzeige zeigt ihn, Hinweis", async (f) => {
  await neu();
  await setzeTabelle("schueler", [serverSchueler("S9", "Clara Muster", { ausbildung: { notiz: "alt" } })]);
  await ruf(() => {
    const row = window.__fake.T.schueler[0];
    _fsAgg = { fahrschuleId: "fs-1", fahrschule: { name: "Testfahrschule" }, lehrer: [{ id: "fl-1", name: "Fahr Lehrer" }], fahrzeuge: [], pakete: [] };
    DB = { students: [_fsMapSchueler(row, () => "Fahr Lehrer")], lessons: [], exams: [], termine: [] };
    _fsBaseline = { students: JSON.parse(JSON.stringify(DB.students)), lessons: [], exams: [] };
  });
  await aendereZeile("schueler", "S9", { telefon: "0170 BUERO" });
  await ruf(() => { DB.students[0].telefon = "0160 LEITUNG"; });
  await ruf(() => _fsSyncAggJetzt());
  const z = await zeile("schueler", "S9");
  const r = await ruf(() => ({ t: DB.students[0].telefon, b: _fsBaseline.students[0].telefon, toast: document.getElementById("toast").textContent }));
  await ruf(() => { _fsAgg = null; _fsBaseline = null; });
  if (z.telefon !== "0170 BUERO") f("Büro-Stand überschrieben: " + z.telefon);
  if (r.t !== "0170 BUERO" || r.b !== "0170 BUERO") f("Anzeige/Vergleichsstand zeigt nicht den Server-Stand: " + JSON.stringify(r));
  if (!/woanders/.test(r.toast)) f("Hinweis fehlt: " + r.toast);
});

fall("20b W14c: Büro ändert Telefon, Gerät ändert sonst etwas und lädt hoch, BEVOR es abruft – Telefon vom Büro bleibt", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111", notiz: "" }]);
  await bruecke();
  if (!(await zeile("schueler", "S1"))) return f("S1 wurde nicht hochgeladen");
  await aendereZeile("schueler", "S1", { telefon: "0170 3333333", name: "Anna Beispiel", aktualisiert_am: "+1s" });
  // Fahrlehrer war offline und ändert etwas anderes am Schüler; die Brücke lädt hoch, bevor ein Abruf kommt
  await ruf(() => { DB.students.find((x) => x.id === "S1").notiz = "offline geschrieben"; });
  await bruecke();
  const z = await zeile("schueler", "S1");
  if (!z || z.telefon !== "0170 3333333" || z.name !== "Anna Beispiel") f("Brücke schrieb alten Namen/alte Nummer zurück: " + JSON.stringify(z && { n: z.name, t: z.telefon }));
  if (!z || !z.ausbildung || z.ausbildung.notiz !== "offline geschrieben") f("eigene Änderung kam nicht an: " + JSON.stringify(z && z.ausbildung));
  // danach holt das Gerät den Stand vom Büro und lädt nichts erneut hoch
  await ruf(() => pullSchuelerZuweisungen());
  const s = await ruf(() => { const x = DB.students.find((y) => y.id === "S1"); return { n: x.name, t: x.telefon, no: x.notiz }; });
  if (s.t !== "0170 3333333" || s.n !== "Anna Beispiel") f("Gerät hat Name/Telefon vom Büro nicht übernommen: " + JSON.stringify(s));
  if (s.no !== "offline geschrieben") f("eigene Änderung auf dem Gerät verloren");
  await zaehlerNull();
  await bruecke();
  const z2 = await zeile("schueler", "S1");
  if (!z2 || z2.telefon !== "0170 3333333") f("Zweiter Lauf drehte das Telefon zurück: " + (z2 && z2.telefon));
});

fall("20c W14c: Schüler auf dem Server nicht mehr da – Brücke legt ihn wie bisher neu an (mit Name)", async (f) => {
  await neu();
  await setzeLokal("students", [{ id: "S1", name: "Anna Muster", telefon: "0151 1111111", notiz: "" }]);
  await bruecke();
  await setzeTabelle("schueler", []);
  await ruf(() => { DB.students.find((x) => x.id === "S1").notiz = "neu"; });
  await bruecke();
  const z = await zeile("schueler", "S1");
  if (!z) return f("Schüler nicht wieder angelegt");
  if (z.name !== "Anna Muster" || z.telefon !== "0151 1111111") f("Name/Telefon fehlen: " + JSON.stringify({ n: z.name, t: z.telefon }));
});

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

fall("26 W14b: Gesamtansicht – Leitung verschiebt Termin, Fahrlehrer hat inzwischen „durchgeführt“ und Notiz gesetzt: nichts geht verloren", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { payload: { notiz: "alt" } })] });
  await aendereZeile("kalender_termine", "T1", { status: "durchgefuehrt", payload: { notiz: "vom Fahrlehrer" }, aktualisiert_am: "+1s" });
  await ruf(() => { const l = DB.lessons[0]; l.von = "15:00"; l.bis = "16:30"; });
  const ok = await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  const lok = await ruf(() => ({ status: DB.lessons[0].status, notiz: DB.lessons[0].notiz, von: DB.lessons[0].von }));
  await gesamtEnde();
  if (!ok) f("Speichern meldete Fehler");
  if (z.von !== "15:00" || z.bis !== "16:30") f("Neue Uhrzeit nicht gespeichert: " + z.von + "–" + z.bis);
  if (z.status !== "durchgefuehrt") f("Status vom Fahrlehrer zurückgedreht: " + z.status);
  if (!z.payload || z.payload.notiz !== "vom Fahrlehrer") f("Notiz vom Fahrlehrer zurückgedreht: " + JSON.stringify(z.payload));
  if (lok.status !== "durchgefuehrt" || lok.notiz !== "vom Fahrlehrer" || lok.von !== "15:00") f("Ansicht zeigt nicht den Stand vom Server: " + JSON.stringify(lok));
});

fall("27 W14b: Gesamtansicht – dieselbe Uhrzeit hier und woanders geändert: Stand von woanders bleibt, Hinweis", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await aendereZeile("kalender_termine", "T1", { von: "10:00", aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons[0].von = "15:00"; DB.lessons[0].status = "abgesagt"; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  const r = await ruf(() => ({ von: DB.lessons[0].von, b: _fsBaseline.lessons[0].von }));
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (z.von !== "10:00") f("Stand von woanders überschrieben: " + z.von);
  if (z.status !== "abgesagt") f("Eigene Änderung (Status) fehlt: " + z.status);
  if (r.von !== "10:00" || r.b !== "10:00") f("Ansicht/Vergleichsstand zeigt nicht den Server-Stand: " + JSON.stringify(r));
  if (!/woanders/.test(hinweis)) f("Hinweis fehlt: " + hinweis);
});

fall("28 W14b: Gesamtansicht – Termin woanders gelöscht, hier geändert: kommt nicht zurück, auch nicht beim nächsten Speichern", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1"), serverTermin("T2")] });
  await aendereZeile("kalender_termine", "T1", { geloescht: true, aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons.find((l) => l.id === "T1").von = "15:00"; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  const ids = await dbIds("lessons");
  await zaehlerNull();
  await ruf(() => { DB.lessons.find((l) => l.id === "T2").von = "16:00"; });
  await gesamtSpeichern();
  const z2 = await zeile("kalender_termine", "T1");
  const n = await zaehler("upserts", "kalender_termine");
  await gesamtEnde();
  if (z.geloescht !== true || z2.geloescht !== true) f("Gelöschter Termin kam zurück");
  if (z.von !== "13:00") f("Gelöschter Termin wurde trotzdem geändert: " + z.von);
  if (ids.includes("T1")) f("Ansicht zeigt den woanders gelöschten Termin noch");
  if (n !== 0) f("Zweites Speichern legte etwas neu an: " + n);
});

fall("29 W14b: Gesamtansicht – Nutzlast Feld für Feld: Leitung ändert Kilometer, Fahrlehrer unterschreibt: beides bleibt", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { payload: { km: 10 } })] });
  await aendereZeile("kalender_termine", "T1", { payload: { km: 10, signed: true, signedAt: "2026-11-24T10:00:00Z" }, aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons[0].km = 20; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (!z.payload || z.payload.km !== 20) f("Kilometer der Leitung fehlen: " + JSON.stringify(z.payload));
  if (!z.payload || z.payload.signed !== true || !z.payload.signedAt) f("Unterschrift vom Fahrlehrer verloren: " + JSON.stringify(z.payload));
});

fall("30 W14b: Gesamtansicht – Spalten wie „Kurs bezahlt“ landen nicht in der Nutzlast, Büro-Stand bleibt", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { kurs_bezahlt: false, buero_fc_status: "offen" })] });
  await aendereZeile("kalender_termine", "T1", { kurs_bezahlt: true, buero_fc_status: "abgegeben" });
  await ruf(() => { DB.lessons[0].von = "15:00"; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (z.von !== "15:00") f("Uhrzeit nicht gespeichert: " + z.von);
  if (z.kurs_bezahlt !== true || z.buero_fc_status !== "abgegeben") f("Büro-Spalten zurückgedreht: " + z.kurs_bezahlt + " / " + z.buero_fc_status);
  const kopien = Object.keys(z.payload || {}).filter((k) => ["kurs_bezahlt", "buero_fc_status", "buero_fc_nachgereicht_am", "theorie_bestanden", "interessent_name", "_fahrlehrerId", "_fahrlehrerName"].includes(k));
  if (kopien.length) f("Spalten-Kopien in der Nutzlast: " + kopien.join(", "));
});

fall("31 W14b: Gesamtansicht – Prüfung: Leitung ändert Datum, Fahrlehrer trägt Ergebnis ein: beides bleibt", async (f) => {
  await neu();
  await gesamt({ pruefungen: [serverPruefung("P1", { payload: { ort: "Offenbach" } })] });
  await aendereZeile("kalender_pruefungen", "P1", { result: "bestanden", pruefer: "Herr Prüfer", aktualisiert_am: "+1s" });
  await ruf(() => { DB.exams[0].date = "2026-12-05"; });
  const ok = await gesamtSpeichern();
  const z = await zeile("kalender_pruefungen", "P1");
  const lok = await ruf(() => DB.exams[0].result);
  await gesamtEnde();
  if (!ok) f("Speichern meldete Fehler");
  if (z.datum !== "2026-12-05") f("Neues Datum nicht gespeichert: " + z.datum);
  if (z.result !== "bestanden" || z.pruefer !== "Herr Prüfer") f("Ergebnis vom Fahrlehrer zurückgedreht: " + z.result + " / " + z.pruefer);
  if (!z.payload || z.payload.ort !== "Offenbach") f("Nutzlast verloren: " + JSON.stringify(z.payload));
  if (lok !== "bestanden") f("Ansicht zeigt das Ergebnis nicht: " + lok);
});

fall("32 W14b: Gesamtansicht – Löschen, Termin und Prüfung inzwischen woanders geändert: nicht gelöscht, wieder sichtbar, Hinweis", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1"), serverTermin("T2")], pruefungen: [serverPruefung("P1")] });
  await aendereZeile("kalender_termine", "T1", { status: "durchgefuehrt", aktualisiert_am: "+1s" });
  await aendereZeile("kalender_pruefungen", "P1", { result: "bestanden", aktualisiert_am: "+1s" });
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "T1"); DB.exams = []; });
  await gesamtSpeichern();
  const t1 = await zeile("kalender_termine", "T1"), p1 = await zeile("kalender_pruefungen", "P1");
  const r = await ruf(() => ({ t: DB.lessons.map((l) => l.id + ":" + l.status).sort().join(","), p: DB.exams.map((e) => e.id + ":" + e.result).join(","),
    bT: _fsBaseline.lessons.map((l) => l.id).sort().join(","), bP: _fsBaseline.exams.map((e) => e.id).join(",") }));
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (t1.geloescht) f("Woanders geänderter Termin wurde gelöscht");
  if (p1.geloescht) f("Woanders geänderte Prüfung wurde gelöscht");
  if (r.t !== "T1:durchgefuehrt,T2:geplant" || r.p !== "P1:bestanden") f("Ansicht zeigt die Einträge nicht wieder: " + JSON.stringify(r));
  if (r.bT !== "T1,T2" || r.bP !== "P1") f("Vergleichsstand passt nicht: " + JSON.stringify(r));
  if (!/nicht gelöscht/.test(hinweis) || !/nochmal ansehen/.test(hinweis)) f("Hinweis fehlt: " + hinweis);
});

fall("32b W14b: Gesamtansicht – Storno abgelehnt (inzwischen geändert): Verlaufseintrag „storniert“ verschwindet wieder, Rückgängig-Hinweis bleibt", async (f) => {
  await neu();
  await gesamt({ schueler: [serverSchueler("S1", "Anna Muster", { ausbildung: { hist: [] } })], termine: [serverTermin("T1", { schueler_id: "S1" })] });
  await ruf(() => { _authProfile = { id: "fl-1", fahrschule_id: "fs-1", rolle: "fahrschule_admin" }; stornoLesson("T1", "Falsch eingetragen", false); });
  const vorher = await ruf(() => (DB.students[0].hist || []).filter((h) => h.typ === "storno").length);
  await aendereZeile("kalender_termine", "T1", { status: "durchgefuehrt", aktualisiert_am: "+1s" });
  await gesamtSpeichern();
  const nachher = await ruf(() => (DB.students[0].hist || []).filter((h) => h.typ === "storno").length);
  await lauf(2500); // der geänderte Verlauf geht mit dem nächsten Speichern hinaus
  const s = await zeile("schueler", "S1"), t1 = await zeile("kalender_termine", "T1");
  const storno = await ruf(() => _stornoWert("T1"));
  await gesamtEnde();
  if (vorher !== 1) return f("Testaufbau: Storno-Eintrag fehlt (" + vorher + ")");
  if (t1.geloescht) f("Termin trotz Änderung woanders gelöscht");
  if (nachher !== 0) f("Verlaufseintrag „storniert“ steht noch beim Schüler");
  if (((s.ausbildung || {}).hist || []).some((h) => h.typ === "storno")) f("Verlaufseintrag „storniert“ steht noch auf dem Server");
  if (storno) f("Storno-Wunsch nicht vergessen");
});

fall("32c W14b: Gesamtansicht – „Gespeichert ✓“ verdrängt keinen Rückgängig-Hinweis", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1"), serverTermin("T2")] });
  await ruf(() => { toastUndo("Stunde storniert", () => {}); DB.lessons[1].von = "16:00"; });
  await gesamtSpeichern();
  const r = await ruf(() => { const t = document.getElementById("toast"); return { undo: t.classList.contains("undo"), text: t.textContent }; });
  await gesamtEnde();
  if (!r.undo) f("Rückgängig-Hinweis ersetzt durch: " + r.text);
});

fall("33 W14b: Gesamtansicht – Löschen ohne Änderung woanders: wird gelöscht (wie bisher)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1"), serverTermin("T2")], pruefungen: [serverPruefung("P1")] });
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "T1"); DB.exams = []; });
  const ok = await gesamtSpeichern();
  const t1 = await zeile("kalender_termine", "T1"), t2 = await zeile("kalender_termine", "T2"), p1 = await zeile("kalender_pruefungen", "P1");
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (!ok) f("Speichern meldete Fehler");
  if (!t1.geloescht || !p1.geloescht) f("Nicht gelöscht: Termin " + t1.geloescht + ", Prüfung " + p1.geloescht);
  if (t2.geloescht) f("Falscher Termin gelöscht");
  if (hinweis !== "Gespeichert ✓") f("Unerwarteter Hinweis: " + hinweis);
});

fall("33b W14b: Gesamtansicht – Löschen, Büro hat inzwischen „Kurs bezahlt“ gesetzt: nicht gelöscht (Büro-Prüfer)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { art: "erstehilfe", kurs_bezahlt: false })] });
  await aendereZeile("kalender_termine", "T1", { kurs_bezahlt: true });
  await ruf(() => { DB.lessons = []; });
  await gesamtSpeichern();
  const t1 = await zeile("kalender_termine", "T1");
  const ids = await dbIds("lessons");
  await gesamtEnde();
  if (t1.geloescht) f("Termin trotz Büro-Änderung gelöscht");
  if (!ids.includes("T1")) f("Termin erscheint nicht wieder");
});

fall("33c W14b: Gesamtansicht – hier neu angelegter Termin lässt sich nach dem Speichern wieder löschen", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await ruf(() => { DB.lessons.push({ id: "T-neu", sid: null, date: "2026-11-05", von: "08:00", bis: "09:30", art: "fahrstunde", status: "geplant", _fahrlehrerId: "fl-1", notiz: "neu" }); });
  await gesamtSpeichern();
  const vorher = await zeile("kalender_termine", "T-neu");
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "T-neu"); });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T-neu");
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (!vorher) return f("Neuer Termin nicht angelegt");
  if (!z.geloescht) f("Neuer Termin ließ sich nicht löschen");
  if (/nicht gelöscht/.test(hinweis)) f("Falscher Hinweis: " + hinweis);
  const kopien = Object.keys(vorher.payload || {}).filter((k) => ["kurs_bezahlt", "buero_fc_status", "_fahrlehrerId", "status", "von"].includes(k));
  if (kopien.length) f("Kopien in der Nutzlast des neuen Termins: " + kopien.join(", "));
});

fall("33d W14b: Gesamtansicht – alter Status in der Nutzlast fällt beim Schreiben weg (Büro liest ihn vor der Spalte)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { payload: { status: "nicht erschienen", notiz: "bleibt", kurs_bezahlt: false, buero_fc_status: "offen" } })] });
  await ruf(() => { DB.lessons[0].status = "abgesagt"; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (z.status !== "abgesagt") f("Status nicht gespeichert: " + z.status);
  if (z.payload && "status" in z.payload) f("Alter Status steht noch in der Nutzlast: " + z.payload.status);
  if (!z.payload || z.payload.notiz !== "bleibt") f("Nutzlast verloren: " + JSON.stringify(z.payload));
  // Daten-Prüfer: ohne die alten Kopien meldete der Abruf der Fahrlehrer-App jede Minute „aktualisiert“
  if (!z.payload || z.payload.kurs_bezahlt !== false || z.payload.buero_fc_status !== "offen") f("Alte Kopien aus der Nutzlast entfernt (App-Schleife): " + JSON.stringify(z.payload));
});

fall("33e W14b: Gesamtansicht – Termin ändert sich genau beim Löschen: nicht gelöscht, Hinweis (Daten-Prüfer)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1"), serverTermin("T2")] });
  await ruf(() => { window.__fake.vorUpdate = (q, T) => { if (q.table !== "kalender_termine" || !q.payload || q.payload.geloescht !== true) return; const r = T.kalender_termine.find((x) => x.id === "T1"); r.status = "durchgefuehrt"; r.aktualisiert_am = "2026-11-24T12:00:00.000Z"; }; });
  await ruf(() => { DB.lessons = DB.lessons.filter((l) => l.id !== "T1"); });
  await gesamtSpeichern();
  const t1 = await zeile("kalender_termine", "T1");
  const ids = await dbIds("lessons");
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (t1.geloescht) f("Gerade geänderter Termin wurde gelöscht");
  if (!ids.includes("T1")) f("Termin erscheint nicht wieder");
  if (!/nicht gelöscht/.test(hinweis)) f("Hinweis fehlt: " + hinweis);
});

fall("35b W14b: Gesamtansicht – neuer Termin, danach Fehler: Wiederholung schreibt ihn nicht mehr ganz neu (Daten-Prüfer)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await ruf(() => { window.__fake.gesperrt = ["T1"]; DB.lessons[0].von = "15:00";
    DB.lessons.push({ id: "T-neu", sid: null, date: "2026-11-05", von: "08:00", bis: "09:30", art: "fahrstunde", status: "geplant", _fahrlehrerId: "fl-1" }); });
  const ok1 = await gesamtSpeichern();
  // inzwischen unterschreibt der Fahrlehrer die neue Stunde
  await aendereZeile("kalender_termine", "T-neu", { payload: { signed: true }, aktualisiert_am: "+1s" });
  await ruf(() => { window.__fake.gesperrt = null; });
  const ok2 = await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T-neu"), t1 = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (ok1) f("Erstes Speichern meldete trotz Fehler Erfolg");
  if (!ok2) f("Zweites Speichern meldete Fehler");
  if (!z || !z.payload || z.payload.signed !== true) f("Unterschrift auf dem neuen Termin überschrieben: " + JSON.stringify(z && z.payload));
  if (t1.von !== "15:00") f("Ausstehende Änderung nicht nachgeholt: " + t1.von);
});

fall("35c W14b: Gesamtansicht – Neuladen während des Speicherns wartet, bis das Speichern fertig ist (Daten-Prüfer)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  const r = await ruf(async () => {
    const altLaden = _fsLoadAggData, altDarf = _fsDarfGesamt; const laeuftBeimLaden = [];
    _fsLoadAggData = async () => { laeuftBeimLaden.push(!!_fsSyncLaeuftP); return false; };
    _fsDarfGesamt = () => true;
    try {
      DB.lessons[0].von = "15:00";
      const p = _fsSyncAggJetzt(); const q = _fsRefreshAggData();
      await p; await q;
    } finally { _fsLoadAggData = altLaden; _fsDarfGesamt = altDarf; }
    return laeuftBeimLaden;
  });
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (z.von !== "15:00") f("Änderung nicht gespeichert: " + z.von);
  if (r.length !== 1 || r[0] !== false) f("Neuladen lief, während noch gespeichert wurde: " + JSON.stringify(r));
});

fall("35d W14b: Gesamtansicht – Trigger ändert die Nutzlast beim eigenen Speichern, hier wird weitergetippt, dann gelöscht: wird gelöscht (Daten-Prüfer, Fall E)", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1", { payload: { signed: true, signatureSnap: { a: 1 } } })] });
  await ruf(() => {
    // wie termin_nachweis_spur: Uhrzeit einer unterschriebenen Stunde geändert → Unterschrift ungültig
    window.__fake.nachUpdate = (l) => { l.forEach((r) => { if (r.payload && r.payload.signed === true) r.payload = Object.assign({}, r.payload, { signed: false, signatureSnap: null, signaturUngueltig: { am: "t" } }); }); };
    window.__fake.vorUpdate = () => { DB.lessons[0].notiz = "weiter getippt"; };
    DB.lessons[0].von = "15:00";
  });
  await gesamtSpeichern();
  const lok = await ruf(() => ({ signed: DB.lessons[0].signed, notiz: DB.lessons[0].notiz }));
  await ruf(() => { window.__fake.nachUpdate = null; DB.lessons = []; });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  const hinweis = await letzterHinweis();
  await gesamtEnde();
  if (lok.signed !== false) f("Ansicht zeigt die ungültige Unterschrift nicht: " + JSON.stringify(lok));
  if (lok.notiz !== "weiter getippt") f("Weitergetipptes verloren: " + JSON.stringify(lok));
  if (!z.geloescht) f("Nicht gelöscht, obwohl niemand sonst etwas geändert hat (" + hinweis + ")");
});

fall("35e W14b: Gesamtansicht – Löschen, dann „Rückgängig“: alte Kopien in der Nutzlast bleiben, keine Abruf-Schleife in der Fahrlehrer-App (Richter, R4)", async (f) => {
  await neu();
  const alt = serverTermin("T1", { kurs_bezahlt: true, buero_fc_status: "abgegeben", payload: { notiz: "x", kurs_bezahlt: false, buero_fc_status: "offen", interessent_name: "", theorie_gesperrt_bis: null, buero_fc_nachgereicht_am: null, interessent_telefon: "", signed: true }, erstellt_von: "bu-1" });
  await setzeTabelle("kalender_termine", [JSON.parse(JSON.stringify(alt))]);
  await ruf(() => pullTermineZuweisungen());
  const appLessons = await ruf(() => JSON.parse(JSON.stringify(DB.lessons)));
  await gesamt({ termine: [alt] });
  await ruf(() => { window.__geloescht = DB.lessons[0]; DB.lessons = []; });
  await gesamtSpeichern();
  await ruf(() => { DB.lessons.push(window.__geloescht); });
  await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  // Fahrlehrer-App ruft danach dreimal ab
  await ruf(() => { window.__toasts.length = 0; });
  await setzeLokal("lessons", appLessons);
  await ruf(() => { DB.students = []; });
  const zahl = [];
  for (let i = 0; i < 3; i++) { await ruf(() => pullTermineZuweisungen()); zahl.push(await ruf(() => window.__toasts.filter((t) => /aktualisiert/.test(t)).length)); await page.clock.runFor(61000); }
  if (z.geloescht) f("„Rückgängig“ holt den Termin nicht zurück");
  if (z.kurs_bezahlt !== true || z.buero_fc_status !== "abgegeben" || !z.payload.signed) f("Spalten/Nutzlast verloren: " + JSON.stringify(z));
  if (z.erstellt_von !== "bu-1") f("Ersteller überschrieben: " + z.erstellt_von);
  if (zahl[2] > zahl[0]) f("Fahrlehrer-App meldet bei jedem Abruf erneut „aktualisiert“: " + zahl.join(","));
});

fall("34 W14b: Gesamtansicht – Zeile ändert sich zwischen Lesen und Schreiben: neu gelesen, nichts zurückgedreht", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await ruf(() => { window.__fake.vorUpdate = (q, T) => { if (q.table !== "kalender_termine") return; const r = T.kalender_termine.find((x) => x.id === "T1"); r.status = "durchgefuehrt"; r.aktualisiert_am = "2026-11-24T12:00:00.000Z"; }; });
  await ruf(() => { DB.lessons[0].von = "15:00"; });
  await zaehlerNull();
  const ok = await gesamtSpeichern();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (!ok) f("Speichern meldete Fehler");
  if (z.von !== "15:00") f("Uhrzeit nicht gespeichert: " + z.von);
  if (z.status !== "durchgefuehrt") f("Änderung zwischen Lesen und Schreiben zurückgedreht: " + z.status);
});

fall("35 W14b: Gesamtansicht – ohne Recht auf die Zeile: Fehler statt „Gespeichert“, kein Endlos-Versuch", async (f) => {
  await neu();
  await gesamt({ termine: [serverTermin("T1")] });
  await ruf(() => { window.__fake.gesperrt = ["T1"]; DB.lessons[0].von = "15:00"; });
  const ok = await gesamtSpeichern();
  const hinweis = await letzterHinweis();
  const z = await zeile("kalender_termine", "T1");
  await gesamtEnde();
  if (ok) f("Speichern meldete Erfolg");
  if (!/Fehler beim Speichern/.test(hinweis)) f("Kein Fehler-Hinweis: " + hinweis);
  if (z.von !== "13:00") f("Zeile trotzdem geändert: " + z.von);
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
console.log(rot ? `Abgleich-Test: ${rot} von ${faelle.length} Fall/Fälle rot.` : "Abgleich-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
