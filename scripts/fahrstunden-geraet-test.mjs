// Test "Fahrstunden verwalten" auf dem Fahrlehrer-Gerät (index.html): Die Leitung entfernt Stunden (geloescht=true, admin_entfernt_am),
// der Datenbank-Trigger lässt danach keine Änderung mehr zu (P0001). Geprüft: Stunde verschwindet vom Gerät und kommt nicht wieder.
// Gerüst und Attrappe stammen aus scripts/abgleich-test.mjs, ergänzt um den Trigger.
// Black-Box: geprüft wird nur, was auf dem (nachgebauten) Server und in DB ankommt.
// Die Datenbank wird nicht angesprochen: getSupa() wird durch eine Attrappe im Arbeitsspeicher ersetzt.
// Die 4-Sekunden-Verzögerung der Sync-Brücken läuft über page.clock, der Test wartet nicht in Echtzeit.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fahrstunden-geraet-test.mjs
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
        if (q.table === "kalender_termine" && alt && alt.admin_entfernt_am) return err("P0001", "Dieser Termin wurde von der Leitung entfernt.");
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
      if (q.table === "kalender_termine" && l.some((r) => r.admin_entfernt_am)) return err("P0001", "Dieser Termin wurde von der Leitung entfernt.");
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

const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });
const leitungEntfernt = (id) => aendereZeile("kalender_termine", id, { geloescht: true, admin_entfernt_am: new Date().toISOString(), aktualisiert_am: "+1s" });

fall("A  Abgeglichene Stunde: Leitung entfernt sie, Gerät verliert sie und bekommt sie nicht zurück", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("M-1"), serverTermin("M-2", { von: "15:00", bis: "16:30" })]);
  await ruf(() => pullTermineZuweisungen());
  const vor = await ruf(() => DB.lessons.filter((l) => l._syncedAt).map((l) => l.id).sort());
  if (vor.join() !== "M-1,M-2") return f("Vorbereitung: abgeglichen sind " + vor);
  await leitungEntfernt("M-1");
  await ruf(() => pullTermineZuweisungen());
  let ids = await dbIds("lessons");
  if (ids.includes("M-1")) f("M-1 ist nach dem Abruf noch auf dem Gerät");
  if (!ids.includes("M-2")) f("M-2 (nicht entfernt) ging verloren");
  await bruecke(); await ruf(() => pullTermineZuweisungen()); await lauf();
  ids = await dbIds("lessons");
  if (ids.includes("M-1")) f("M-1 ist nach Hochladen und erneutem Abruf wieder da");
  const z = await zeile("kalender_termine", "M-1");
  if (!z || z.geloescht !== true || !z.admin_entfernt_am) f("Server-Zeile M-1 wurde verändert/wiederbelebt: " + JSON.stringify(z && { g: z.geloescht, a: z.admin_entfernt_am }));
});

fall("B  Offline geänderte Stunde: Server lehnt mit P0001 ab, Stunde ist trotzdem weg", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("M-1"), serverTermin("M-2", { von: "15:00", bis: "16:30" })]);
  await ruf(() => pullTermineZuweisungen());
  // Offline: Gerät ändert M-1 (Leitung entfernt sie währenddessen)
  await leitungEntfernt("M-1");
  await ruf(() => { DB.lessons.find((l) => l.id === "M-1").von = "09:45"; DB.lessons.find((l) => l.id === "M-2").von = "15:15"; });
  await bruecke();
  const z = await zeile("kalender_termine", "M-1");
  if (!z || z.geloescht !== true || z.von !== "13:00") f("Server-Zeile M-1 wurde trotz Trigger verändert: " + JSON.stringify(z && { g: z.geloescht, von: z.von }));
  const z2 = await zeile("kalender_termine", "M-2");
  if (!z2 || z2.von !== "15:15") f("Übrige Änderung (M-2) kam wegen des Fehlers bei M-1 nicht an: " + (z2 && z2.von));
  await ruf(() => pullTermineZuweisungen());
  let ids = await dbIds("lessons");
  if (ids.includes("M-1")) f("M-1 ist nach dem nächsten Abruf noch auf dem Gerät");
  await bruecke(); await ruf(() => pullTermineZuweisungen()); await lauf();
  ids = await dbIds("lessons");
  if (ids.includes("M-1")) f("M-1 kam nach weiterem Hochladen wieder");
  if (!ids.includes("M-2")) f("M-2 ging verloren");
});

fall("C  Nur lokal angelegte, nie abgeglichene Stunde bleibt erhalten", async (f) => {
  await neu();
  await setzeTabelle("kalender_termine", [serverTermin("M-1")]);
  await ruf(() => pullTermineZuweisungen());
  await leitungEntfernt("M-1");
  // Neue Stunde nur lokal, Brücke noch nicht gelaufen (kein _syncedAt)
  await ruf(() => { DB.lessons.push({ id: "NEU-1", sid: null, date: "2026-11-10", von: "08:00", bis: "09:30", art: "fahrstunde", status: "geplant" }); });
  await ruf(() => pullTermineZuweisungen());
  let l = await ruf(() => DB.lessons.map((x) => ({ id: x.id, s: x._syncedAt })));
  if (!l.some((x) => x.id === "NEU-1")) f("NEU-1 wurde beim Abruf entfernt");
  if (l.some((x) => x.id === "M-1")) f("M-1 blieb trotz Entfernen");
  await bruecke(); await ruf(() => pullTermineZuweisungen());
  const z = await zeile("kalender_termine", "NEU-1");
  if (!z || z.geloescht !== false) f("NEU-1 kam nicht (aktiv) auf den Server: " + JSON.stringify(z && z.geloescht));
  if (!(await dbIds("lessons")).includes("NEU-1")) f("NEU-1 ist nach Hochladen und Abruf nicht mehr lokal");
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
console.log(rot ? `Fahrstunden-Geräte-Test: ${rot} von ${faelle.length} Fall/Fälle rot.` : "Fahrstunden-Geräte-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
