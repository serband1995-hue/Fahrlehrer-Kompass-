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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
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
      const l = rows.filter(passt);
      zaehle(stats.updates, q.table, l.length);
      const patch = C(q.payload);
      if (["schueler", "kalender_termine", "kalender_pruefungen"].includes(q.table) && patch.aktualisiert_am === undefined) patch.aktualisiert_am = new Date().toISOString();
      l.forEach((r) => Object.assign(r, patch));
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
  if ((await dbIds("students")).length !== 0) return f("Vorbereitung: Cloud-Stand wurde geladen, Fall nicht nachgestellt");
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
