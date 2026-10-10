// Test "Zwei Geräte": Handy (A) und Tablet (B) arbeiten mit demselben Konto. Der gesamte Stand liegt als EIN Snapshot
// in der Tabelle snapshots. SOLL: Vor dem Hochladen prüft das Gerät, ob ein anderes Gerät inzwischen gespeichert hat,
// und führt zusammen (3-Wege-Vergleich gegen den zuletzt gemeinsamen Stand, gemerkt in localStorage "serband-snapbasis-v1").
// Black-Box: geprüft wird nur, was in der Cloud und in DB der beiden Geräte ankommt.
// Die echte Datenbank wird nicht angesprochen: beide Geräte (zwei Browser-Kontexte) bekommen eine Attrappe für getSupa(),
// die jede Abfrage an EINE gemeinsame Server-Attrappe in Node weiterleitet.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zwei-geraete-test.mjs
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

/* ---------- Server-Attrappe (Node, gemeinsam für beide Geräte) ---------- */
const UID = "fl-1";
const C = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const srv = {
  snap: null,          // { user_id, data, updated_at } oder null
  zaehler: 0,          // für die Serveruhr
  nieGleich: false,    // Z9: .eq("updated_at", ...) trifft nie
  vorUpdate: null,     // Z8: async Funktion(dev), läuft einmal vor dem nächsten bedingten update dieses Geräts
  vorUpdateDev: null,
  log: [],             // { dev, op, treffer }
};
function jetzt() { // wie PostgREST: "2026-10-10T19:56:02.890123+00:00", streng steigend
  srv.zaehler++;
  const mikro = Date.parse("2026-10-10T19:56:02.890Z") * 1000 + srv.zaehler * 7919;
  const ms = Math.floor(mikro / 1000), my = String(mikro % 1000).padStart(3, "0");
  return new Date(ms).toISOString().slice(0, 19) + "." + String(ms % 1000).padStart(3, "0") + my + "+00:00";
}
function schreibe(data) { srv.snap = { user_id: UID, data: C(data), updated_at: jetzt() }; return srv.snap.updated_at; }
const SEED_ZEIT = "2026-10-10T10:00:00.123456+00:00";
function seedDaten() {
  return {
    students: [{ id: "X", name: "Xaver Test", plan: { ampeln: { a: "gelb" } }, notiz: "" }],
    lessons: [
      { id: "L1", sid: "X", date: "2026-11-03", von: "09:00", bis: "10:30", art: "fahrstunde", status: "geplant" },
      { id: "L2", sid: "X", date: "2026-11-04", von: "11:00", bis: "12:30", art: "fahrstunde", status: "geplant" },
    ],
    exams: [], termine: [],
    verdienst: { proUE: 50 },
    workCfg: { blockMin: 90 },
  };
}
function zuruecksetzen(daten) {
  srv.zaehler = 0; srv.nieGleich = false; srv.vorUpdate = null; srv.vorUpdateDev = null; srv.log = [];
  srv.snap = daten === null ? null : { user_id: UID, data: C(daten || seedDaten()), updated_at: SEED_ZEIT };
}
async function bedienen(dev, q) {
  const err = (code, message) => ({ data: null, error: { code, message } });
  if (q.table !== "snapshots") {
    if (q.op === "select") return q.mode === "many" ? { data: [], error: null } : { data: null, error: q.mode === "single" ? { code: "PGRST116", message: "keine Zeile" } : null };
    return q.retSel ? { data: q.mode === "single" ? {} : [], error: null } : { data: null, error: null };
  }
  const passt = (r) => !!r && q.filters.every(([c, v]) => (c === "updated_at" && srv.nieGleich ? false : r[c] === v));
  const proj = (r, cols) => {
    if (!cols || cols === "*") return C(r);
    const o = {}; cols.split(",").map((c) => c.trim()).filter(Boolean).forEach((c) => { o[c] = C(r[c]); }); return o;
  };
  if (q.op === "select") {
    srv.log.push({ dev, op: "select", cols: q.cols });
    const treffer = passt(srv.snap) ? [srv.snap] : [];
    if (q.mode === "single") return treffer.length === 1 ? { data: proj(treffer[0], q.cols), error: null } : err("PGRST116", "Die Abfrage lieferte " + treffer.length + " Zeilen");
    if (q.mode === "maybe") return { data: treffer.length ? proj(treffer[0], q.cols) : null, error: null };
    return { data: treffer.map((r) => proj(r, q.cols)), error: null };
  }
  if (q.op === "update") {
    if (srv.vorUpdate && srv.vorUpdateDev === dev) { const f = srv.vorUpdate; srv.vorUpdate = null; await f(); } // Wettlauf: ein anderes Gerät schreibt dazwischen
    const treffer = passt(srv.snap) ? [srv.snap] : [];
    srv.log.push({ dev, op: "update", treffer: treffer.length });
    if (treffer.length) { schreibe(q.payload.data); }
    const rows = treffer.length ? [{ updated_at: srv.snap.updated_at }] : [];
    return { data: q.retSel ? rows : null, error: null };
  }
  if (q.op === "upsert" || q.op === "insert") {
    const row = Array.isArray(q.payload) ? q.payload[0] : q.payload;
    srv.log.push({ dev, op: "upsert", treffer: 1 });
    schreibe(row.data);
    return q.retSel ? (q.mode === "single" ? { data: { updated_at: srv.snap.updated_at }, error: null } : { data: [{ updated_at: srv.snap.updated_at }], error: null }) : { data: null, error: null };
  }
  return err("XX000", "unbekannte Operation");
}

/* ---------- Attrappe im Browser: leitet jede Abfrage an Node weiter ---------- */
function attrappeEinbauen() {
  const bauer = (table) => {
    const q = { table, op: "select", filters: [], cols: "*", mode: "many", payload: null, opts: null, retSel: false };
    const b = {
      select(c) { if (q.op === "select") q.cols = c || "*"; else q.retSel = true; return b; },
      eq(c, v) { q.filters.push([c, v]); return b; },
      neq() { return b; }, in() { return b; }, is() { return b; }, or() { return b; }, order() { return b; }, range() { return b; }, limit() { return b; },
      single() { q.mode = "single"; return b; },
      maybeSingle() { q.mode = "maybe"; return b; },
      upsert(rows, o) { q.op = "upsert"; q.payload = rows; q.opts = o || {}; return b; },
      insert(rows) { q.op = "insert"; q.payload = rows; return b; },
      update(o) { q.op = "update"; q.payload = o; return b; },
      then(ok, fail) { return window.__srv(JSON.parse(JSON.stringify(q))).then(ok, fail); },
    };
    return b;
  };
  const client = {
    from: bauer,
    rpc() { return { then(ok, fail) { return Promise.resolve({ data: null, error: null }).then(ok, fail); } }; },
    auth: { getSession: async () => ({ data: { session: { user: { id: "fl-1" } } }, error: null }) },
  };
  window.getSupa = () => client;
  window.toast = () => {};
}
function geraetZuruecksetzen() { // wie ein frisch installiertes Gerät, angemeldet als fl-1
  ["serband-snapbasis-v1", STORE_KEY, "serband-sync-stamp", "serband-abgleich-v1", "serband-db-defekt"].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
  _authUser = { id: "fl-1" };
  _authProfile = { id: "fl-1", fahrschule_id: null, rolle: null };
  _pullOk = false; _cloudHatteDaten = false; _sitzungHatteDaten = false;
  try { _lokalDefekt = false; _fsAgg = null; _fsPersonalBackup = null; } catch (e) {}
  DB = { students: [], lessons: [], exams: [], termine: [] };
}

/* ---------- Zwei Geräte ---------- */
let konsole = [];
async function geraetOeffnen(name, breite) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 780 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => konsole.push(name + ": " + String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) konsole.push(name + ": " + m.text()); });
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.exposeFunction("__srv", (q) => bedienen(name, q));
  await page.clock.install(); // die 4-s-Sync-Zeitgeber laufen nie von allein
  await page.goto(basis + "index.html");
  await page.waitForTimeout(1200);
  await page.evaluate(attrappeEinbauen);
  return { name, page, ctx };
}
const A = await geraetOeffnen("A", 390);
const B = await geraetOeffnen("B", 820);

/* ---------- Hilfen ---------- */
const ev = (g, fn, arg) => g.page.evaluate(fn, arg);
async function neuesSzenario(daten) { // Server auf Ausgangsstand, beide Geräte frisch
  zuruecksetzen(daten);
  for (const g of [A, B]) await g.page.evaluate(geraetZuruecksetzen);
  konsole = [];
}
async function starte(g) { await ev(g, () => pullFromCloud()); } // wie der Start der App: Cloud lesen
const schreibzugriffe = (dev) => srv.log.filter((e) => e.dev === dev && (e.op === "update" || e.op === "upsert")).length;
// Wie save(): Die Tests ändern DB direkt, die App ruft danach immer save() auf (setzt den Merker "geändert").
const push = (g) => ev(g, () => { try { _snapGeaendert = true; } catch (e) {} return pushToCloud(); });
const cloud = () => (srv.snap ? C(srv.snap.data) : null);
const finde = (liste, id) => (liste || []).find((x) => x.id === id);
const ids = (liste) => (liste || []).map((x) => x.id).join();
const dbVon = (g) => ev(g, () => JSON.parse(JSON.stringify(DB)));
const sicher = async (g) => { await ev(g, () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {} }); };
const neuerTermin = (id, extra = {}) => Object.assign({ id, sid: "X", date: "2026-11-10", von: "14:00", bis: "15:30", art: "fahrstunde", status: "geplant" }, extra);
const neuerSchueler = (id, name) => ({ id, name, plan: { ampeln: {} }, notiz: "" });

/* ---------- Testfälle ---------- */
const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });

fall("Z1  Neuer Schüler (A) und neuer Termin (B) gehen beide nicht verloren", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna Neu"));
  if ((await push(A)) !== true) f("A: pushToCloud lieferte nicht true");
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  if ((await push(B)) !== true) f("B: pushToCloud lieferte nicht true");
  const c = cloud();
  if (!finde(c.students, "S-A")) f("Cloud: Schüler S-A fehlt (B hat A überschrieben)");
  if (!finde(c.lessons, "L-B")) f("Cloud: Termin L-B fehlt");
  const b = await dbVon(B);
  if (!finde(b.students, "S-A")) f("B.DB: Schüler S-A fehlt nach dem Zusammenführen");
  if (!finde(b.lessons, "L-B")) f("B.DB: eigener Termin L-B ging verloren");
});

fall("Z2  Termin gelöscht (A) und anderer Termin geändert (B)", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { DB.lessons = DB.lessons.filter((l) => l.id !== "L1"); });
  await push(A);
  await ev(B, () => { DB.lessons.find((l) => l.id === "L2").von = "11:30"; });
  await push(B);
  const c = cloud();
  if (finde(c.lessons, "L1")) f("Cloud: L1 ist wieder da (B hat die Löschung von A rückgängig gemacht)");
  const l2 = finde(c.lessons, "L2");
  if (!l2 || l2.von !== "11:30") f("Cloud: Änderung an L2 fehlt: " + (l2 && l2.von));
  const b = await dbVon(B);
  if (finde(b.lessons, "L1")) f("B.DB: L1 ist nach dem Zusammenführen noch da");
  const bl2 = finde(b.lessons, "L2");
  if (!bl2 || bl2.von !== "11:30") f("B.DB: eigene Änderung an L2 ging verloren");
});

fall("Z3  Änderung an Schüler X (A) bleibt, wenn B etwas anderes ändert", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { DB.students.find((s) => s.id === "X").plan.ampeln.a = "gruen"; });
  await push(A);
  await ev(B, () => { DB.lessons.find((l) => l.id === "L2").status = "abgesagt"; });
  await push(B);
  const x = finde(cloud().students, "X");
  if (!x || x.plan.ampeln.a !== "gruen") f("Cloud: Ampel von X ist nicht 'gruen': " + JSON.stringify(x && x.plan));
  const bx = finde((await dbVon(B)).students, "X");
  if (!bx || bx.plan.ampeln.a !== "gruen") f("B.DB: Ampel von X ist nicht 'gruen': " + JSON.stringify(bx && bx.plan));
  const l2 = finde(cloud().lessons, "L2");
  if (!l2 || l2.status !== "abgesagt") f("Cloud: Änderung von B an L2 fehlt");
});

fall("Z4  Beide ändern denselben Schüler: B (zuletzt) gewinnt, übrige Änderungen von A bleiben", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => {
    DB.students.find((x) => x.id === "X").plan.ampeln.a = "gruen";
    DB.students.push(s);
    DB.lessons.find((l) => l.id === "L1").von = "08:15";
  }, neuerSchueler("S-A", "Anna Neu"));
  await push(A);
  await ev(B, () => { DB.students.find((x) => x.id === "X").plan.ampeln.a = "rot"; });
  const r = await push(B);
  if (r !== true) f("B: pushToCloud lieferte " + r + " statt true");
  const c = cloud();
  const x = finde(c.students, "X");
  if (!x || x.plan.ampeln.a !== "rot") f("Cloud: X ist nicht B's Version ('rot'): " + JSON.stringify(x && x.plan));
  if (!finde(c.students, "S-A")) f("Cloud: Schüler S-A von A fehlt");
  const l1 = finde(c.lessons, "L1");
  if (!l1 || l1.von !== "08:15") f("Cloud: Änderung von A an L1 fehlt: " + (l1 && l1.von));
  const bx = finde((await dbVon(B)).students, "X");
  if (!bx || bx.plan.ampeln.a !== "rot") f("B.DB: X ist nicht B's Version");
});

fall("Z5  B war offline: beim Neustart wird zusammengeführt, nicht ersetzt", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-off"));
  await sicher(B); // B ist offline, sein Stand liegt nur im Gerät
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S2", "Zweit Schüler"));
  await push(A);
  await ev(B, () => { _pullOk = false; }); // B startet neu
  await starte(B);
  const b = await dbVon(B);
  if (!finde(b.lessons, "L-off")) f("B.DB: Offline-Termin L-off wurde vom Cloud-Stand ersetzt (verloren)");
  if (!finde(b.students, "S2")) f("B.DB: Schüler S2 aus der Cloud fehlt");
  const r = await push(B);
  if (r !== true) f("B: pushToCloud lieferte " + r + " statt true");
  const c = cloud();
  if (!finde(c.lessons, "L-off")) f("Cloud: L-off fehlt nach dem Hochladen");
  if (!finde(c.students, "S2")) f("Cloud: S2 fehlt nach dem Hochladen");
});

fall("Z6  Einstellungen: verdienst.proUE (A) und workCfg.blockMin (B)", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { DB.verdienst.proUE = 65; });
  await push(A);
  await ev(B, () => { DB.workCfg.blockMin = 120; });
  await push(B);
  const c = cloud();
  if (!c.verdienst || c.verdienst.proUE !== 65) f("Cloud: verdienst.proUE ist " + (c.verdienst && c.verdienst.proUE) + " statt 65");
  if (!c.workCfg || c.workCfg.blockMin !== 120) f("Cloud: workCfg.blockMin ist " + (c.workCfg && c.workCfg.blockMin) + " statt 120");
  const b = await dbVon(B);
  if (!b.verdienst || b.verdienst.proUE !== 65) f("B.DB: verdienst.proUE fehlt");
});

fall("Z7  Nichts geändert: kein Schreiben in snapshots, Ergebnis true", async (f) => {
  await neuesSzenario();
  await starte(B);
  const zeitVorher = srv.snap.updated_at;
  const vor = schreibzugriffe("B");
  const r = await push(B);
  if (r !== true) f("pushToCloud lieferte " + r + " statt true");
  const n = schreibzugriffe("B") - vor;
  if (n) f("B hat " + n + "x in snapshots geschrieben, obwohl nichts geändert war");
  if (srv.snap.updated_at !== zeitVorher) f("updated_at in der Cloud hat sich ohne Änderung verändert");
});

fall("Z8  Wettlauf: A schreibt zwischen B's Kopf-Lesen und B's Schreiben", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-race", "Rennen Test"));
  srv.vorUpdateDev = "B";
  srv.vorUpdate = async () => { await push(A); };
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  const r = await push(B);
  if (srv.vorUpdate) f("B hat gar kein bedingtes update gesendet (Hook nicht ausgelöst)");
  const updates = srv.log.filter((e) => e.dev === "B" && e.op === "update");
  if (!updates.length || updates[0].treffer !== 0) f("B's erstes bedingtes update traf nicht 0 Zeilen: " + JSON.stringify(updates));
  if (r !== true) f("B: pushToCloud lieferte " + r + " statt true");
  const c = cloud();
  if (!finde(c.students, "S-race")) f("Cloud: Schüler S-race von A fehlt (B hat A überschrieben)");
  if (!finde(c.lessons, "L-B")) f("Cloud: Termin L-B von B fehlt");
  if (!finde((await dbVon(B)).students, "S-race")) f("B.DB: S-race fehlt");
});

fall("Z9  Rückfall: Vergleich von updated_at klappt nie, B lädt trotzdem hoch", async (f) => {
  await neuesSzenario();
  await starte(B);
  srv.nieGleich = true;
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  const r = await push(B);
  if (r !== true) f("pushToCloud lieferte " + r + " statt true");
  if (!finde(cloud().lessons, "L-B")) f("Cloud: Änderung von B fehlt (kein Rückfall auf upsert)");
  if (!srv.log.some((e) => e.dev === "B" && e.op === "upsert")) f("B hat keinen upsert als Rückfall gesendet");
});

fall("Z10 Unterschiedliches _syncedAt auf demselben Termin zählt nicht als Änderung", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { const l = DB.lessons.find((x) => x.id === "L2"); l.von = "11:15"; l._syncedAt = 111; });
  await push(A);
  await ev(B, (s) => { DB.lessons.find((x) => x.id === "L2")._syncedAt = 222; DB.students.push(s); }, neuerSchueler("S-B", "Berta Neu"));
  const r = await push(B);
  if (r !== true) f("B: pushToCloud lieferte " + r + " statt true");
  const c = cloud();
  const l2 = finde(c.lessons, "L2");
  if (!l2 || l2.von !== "11:15") f("Cloud: Änderung von A an L2 wurde durch den bloßen Merker von B überschrieben: " + (l2 && l2.von));
  if (!finde(c.students, "S-B")) f("Cloud: Schüler S-B von B fehlt");
});

fall("Z11 Erster Start nach dem Update (ohne Merkzettel): der neuere Stand gilt ganz, Gelöschtes kommt nicht zurück", async (f) => {
  await neuesSzenario({ students: [neuerSchueler("S9", "Neun Schüler")], lessons: [], exams: [], termine: [] });
  // B: kein serband-snapbasis-v1, kein Sync-Stempel (älter als die Cloud), lokal ein Termin, den die Cloud nicht mehr hat
  // (z.B. auf A gelöscht). Ohne gemeinsamen Stand ist nicht erkennbar, ob er neu oder gelöscht ist: wie früher gilt die Cloud.
  await ev(B, (t) => { DB.lessons = [t]; localStorage.removeItem("serband-snapbasis-v1"); localStorage.removeItem("serband-sync-stamp"); }, neuerTermin("L9"));
  await starte(B);
  let b = await dbVon(B);
  if (!finde(b.students, "S9")) f("B.DB: Schüler S9 aus der Cloud fehlt");
  if (finde(b.lessons, "L9")) f("B.DB: alter Termin L9 kam zurück (Cloud ist neuer)");
  const r = await push(B);
  if (r !== true) f("B: pushToCloud lieferte " + r + " statt true");
  const c = cloud();
  if (!finde(c.students, "S9")) f("Cloud: S9 fehlt");
  if (finde(c.lessons, "L9")) f("Cloud: L9 wurde zurückgeholt");
  // Danach arbeitet B normal mit gemeinsamem Stand weiter: eine neue Änderung geht hoch.
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L10"));
  await push(B);
  if (!finde(cloud().lessons, "L10")) f("Cloud: neue Änderung von B nach dem ersten Start fehlt");
});

fall("Z12 Nach dem Zusammenführen ist DB gültig, keine Fehler in der Konsole", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna Neu"));
  await push(A);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  await push(B);
  for (const g of [A, B]) {
    const r = await ev(g, () => {
      try { ensureDB(); } catch (e) { return "ensureDB wirft: " + e.message; }
      if (!DB || typeof DB !== "object" || Array.isArray(DB)) return "DB ist kein Objekt";
      for (const k of ["students", "lessons", "exams", "termine"]) if (!Array.isArray(DB[k])) return "DB." + k + " ist keine Liste";
      return "";
    });
    if (r) f(g.name + ": " + r);
  }
  // die Konsolenprüfung für beide Geräte macht der Ausführer unten
});

fall("F1 Pingpong: beide legen gleichzeitig je einen Schüler an, danach nichts mehr - schreibt es trotzdem weiter?", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna"));
  await ev(B, (s) => { DB.students.push(s); }, neuerSchueler("S-B", "Berta"));
  await push(A); await push(B);
  const v0 = srv.log.filter((e) => e.op !== "select").length;
  for (let i = 0; i < 4; i++) { await push(A); await push(B); }
  const n = srv.log.filter((e) => e.op !== "select").length - v0;
  if (n) f("Ohne jede Änderung: " + n + " Schreibzugriffe in 4 Runden (Ping-Pong durch Listenreihenfolge)");
  const a = await dbVon(A), b = await dbVon(B);
  console.log("   Reihenfolge A: " + ids(a.students) + " | B: " + ids(b.students));
});
fall("F2 Eingabe während das Hochladen läuft geht nie hoch", async (f) => {
  await neuesSzenario();
  await starte(B);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  srv.vorUpdateDev = "B";
  srv.vorUpdate = async () => { await ev(B, () => { DB.lessons.find((l) => l.id === "L2").von = "07:07"; }); };
  await push(B);
  await push(B); // der Debounce-Push 4 s später
  const l2 = finde(cloud().lessons, "L2");
  if (!l2 || l2.von !== "07:07") f("Cloud: Änderung während des Hochladens fehlt (" + (l2 && l2.von) + "), Basis hielt sie für gesichert");
});
fall("F3 Beide ändern verschiedene Felder in verdienst", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { verdienst: { proUE: 50, fixum: 2100 } }));
  await starte(A); await starte(B);
  await ev(A, () => { DB.verdienst.proUE = 65; }); await push(A);
  await ev(B, () => { DB.verdienst.fixum = 2200; }); await push(B);
  const v = cloud().verdienst;
  if (v.proUE !== 65) f("proUE von A verloren: " + JSON.stringify(v));
});
fall("F4 Prüfer-Namen (Strings): A und B legen verschiedene an", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { pruefer: ["Alt"] }));
  await starte(A); await starte(B);
  await ev(A, () => { DB.pruefer.push("Mueller"); }); await push(A);
  await ev(B, () => { DB.pruefer.push("Meier"); }); await push(B);
  const p = cloud().pruefer;
  if (!p.includes("Mueller")) f("Prüfer von A verloren: " + JSON.stringify(p));
});
fall("F5 Zwei verschiedene Ampeln desselben Schülers", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { DB.students[0].plan.ampeln.a = "gruen"; }); await push(A);
  await ev(B, () => { DB.students[0].plan.ampeln.b = "rot"; }); await push(B);
  const x = cloud().students[0];
  if (x.plan.ampeln.a !== "gruen") f("Ampel a von A verloren: " + JSON.stringify(x.plan.ampeln));
});
fall("F6 A loescht Schueler, B aendert ihn", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, () => { DB.students = []; }); await push(A);
  await ev(B, () => { DB.students[0].notiz = "wichtig"; }); await push(B);
  const x = finde(cloud().students, "X");
  console.log("   F6 Ergebnis: Schueler X in Cloud: " + JSON.stringify(x && x.notiz));
});
fall("F7 Ein Termin ohne id -> ganze Liste wird als Feld behandelt", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { lessons: [{ sid: "X", date: "2026-11-03", von: "09:00", bis: "10:30", art: "fahrstunde", status: "geplant" }, { id: "L2", sid: "X", date: "2026-11-04" }] }));
  await starte(A); await starte(B);
  await ev(A, (t) => { DB.lessons.push(t); }, neuerTermin("L-A")); await push(A);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B")); await push(B);
  if (!finde(cloud().lessons, "L-A")) f("Termin L-A von A verloren (Liste mit id-losem Eintrag)");
});
fall("F8 Doppelte id in lessons", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { lessons: [{ id: "D", sid: "X", date: "2026-11-03", von: "09:00" }, { id: "D", sid: "X", date: "2026-11-05", von: "10:00" }] }));
  await starte(A); await starte(B);
  await ev(A, () => { DB.lessons[1].von = "12:00"; }); await push(A);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B")); await push(B);
  const c = cloud().lessons;
  console.log("   F8 Cloud: " + JSON.stringify(c.map((l) => l.id + "@" + l.von)));
  if (!c.some((l) => l.von === "12:00")) f("Änderung an zweitem D verloren");
});
fall("F9 Beide Geraete aendern eine Liste Trinkgeld/orte (Strings)", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { trinkgeld: [], orte: [] }));
  await starte(A); await starte(B);
  await ev(A, () => { DB.orte.push("Hbf"); }); await push(A);
  await ev(B, () => { DB.orte.push("Markt"); }); await push(B);
  if (!cloud().orte.includes("Hbf")) f("Ort von A verloren: " + JSON.stringify(cloud().orte));
});
fall("F10 Toast-Schleife: nach Zusammenfuehren bei ruhigem Betrieb kommt kein Toast mehr", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  for (const g of [A, B]) await ev(g, () => { window.__t = 0; window.toast = () => { window.__t++; }; });
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna")); await push(A);
  await ev(B, (s) => { DB.students.push(s); }, neuerSchueler("S-B", "Berta")); await push(B);
  for (let i = 0; i < 5; i++) { await push(A); await push(B); await ev(A, () => pullFromCloud()); await ev(B, () => pullFromCloud()); }
  const ta = await ev(A, () => window.__t), tb = await ev(B, () => window.__t);
  console.log("   Toasts A=" + ta + " B=" + tb + ", Writes=" + srv.log.filter((e) => e.op !== "select").length);
  if (ta > 1 || tb > 1) f("Zu viele Toasts: A=" + ta + " B=" + tb);
});
fall("F11 Gesamtansicht: B in _fsAgg, A schreibt; B push false, nach Verlassen Zusammenfuehren", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  await ev(B, () => { _fsPersonalBackup = { students: DB.students, lessons: DB.lessons, exams: DB.exams }; DB.students = DB.students.concat([{ id: "FREMD", name: "Fremd", plan: {} }]); _fsAgg = { lehrer: [] }; });
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna")); await push(A);
  const r = await push(B);
  console.log("   B in Gesamtansicht push=" + r);
  await ev(B, () => { DB.students = _fsPersonalBackup.students; _fsPersonalBackup = null; _fsAgg = null; });
  const r2 = await push(B);
  const c = cloud();
  if (r2 !== true) f("nach Verlassen push=" + r2);
  if (!finde(c.students, "S-A")) f("S-A fehlt"); if (!finde(c.lessons, "L-B")) f("L-B fehlt"); if (finde(c.students, "FREMD")) f("FREMD in Cloud");
});
fall("F12 Basis veraltet nach fehlgeschlagenem Hochladen (Fehler im update)", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(A, (s) => { DB.students.push(s); }, neuerSchueler("S-A", "Anna")); await push(A);
  // B: Zusammenfuehren klappt, update schlaegt fehl (Netz weg)
  await ev(B, (t) => { DB.lessons.push(t); }, neuerTermin("L-B"));
  await ev(B, () => { const g = getSupa(); const alt = g.from; g.from = (t) => { const b = alt(t); const u = b.update; b.update = () => { const x = u.apply(b, arguments); x.then = (ok, fail) => Promise.resolve({ data: null, error: { message: "offline" } }).then(ok, fail); return x; }; return b; }; window.__alt = alt; });
  const r = await push(B);
  await ev(B, () => { getSupa().from = window.__alt; });
  const bd = await dbVon(B);
  console.log("   B push offline=" + r + " B hat S-A=" + !!finde(bd.students, "S-A") + " L-B=" + !!finde(bd.lessons, "L-B"));
  const r2 = await push(B);
  const c = cloud();
  if (!finde(c.students, "S-A") || !finde(c.lessons, "L-B")) f("nach Wiederholung fehlt etwas: " + ids(c.students) + " / " + ids(c.lessons));
});
fall("G1 Erster Prüfername (A) geht verloren, wenn B danach etwas ganz anderes aendert", async (f) => {
  await neuesSzenario(Object.assign(seedDaten(), { pruefer: [], orte: [], prueferTags: [] }));
  await starte(A); await starte(B);
  await ev(A, () => { DB.pruefer.push("Mueller"); DB.orte.push("Hbf"); }); await push(A);
  await ev(B, () => { DB.lessons.find((l) => l.id === "L2").von = "11:30"; }); await push(B);
  const c = cloud();
  if (!c.pruefer.includes("Mueller")) f("Cloud: Prüfer von A weg: " + JSON.stringify(c.pruefer));
  if (!c.orte.includes("Hbf")) f("Cloud: Ort von A weg: " + JSON.stringify(c.orte));
  const b = await dbVon(B);
  console.log("   B.pruefer=" + JSON.stringify(b.pruefer));
});
fall("G2 Ansicht neu zeigen wirft Prüfungs-Eingabe weg", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(B, () => { routeExam("X"); _examChoice = "nicht"; _examFaults = ["f1", "f2"]; });
  const vor = await ev(B, () => JSON.stringify([_examChoice, _examFaults]));
  await ev(A, () => { DB.lessons.find((l) => l.id === "L2").von = "11:45"; }); await push(A);
  await ev(B, () => pullFromCloud()); // B holt, wie der Timer/Wiedereinstieg
  await ev(B, () => pushToCloud());
  const nach = await ev(B, () => JSON.stringify([_examChoice, _examFaults]));
  console.log("   Prüfungsansicht vorher=" + vor + " nachher=" + nach);
  if (vor !== nach) f("Prüfungs-Eingabe (Auswahl/Fehler) ging beim Übernehmen verloren");
});
fall("G3 Bogen-Assistent wird zurückgesetzt", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(B, () => { routeBogen("X"); WIZ = { id: "X", answers: { 0: 3, 1: 2 }, open: { q1: "", q2: "", q3: "" }, page: 1 }; wizPage(); });
  const h1 = await ev(B, () => document.getElementById("wizStart") ? "intro" : "wizard");
  await ev(A, () => { DB.lessons.find((l) => l.id === "L2").von = "11:45"; }); await push(A);
  await ev(B, () => pushToCloud());
  const h2 = await ev(B, () => document.getElementById("wizStart") ? "intro" : "wizard");
  console.log("   Bogen vorher=" + h1 + " nachher=" + h2);
  if (h1 !== h2) f("Fragebogen springt zurück auf Start");
});
fall("G4 Scrollposition / Detailansicht ohne route", async (f) => {
  await neuesSzenario();
  await starte(A); await starte(B);
  await ev(B, () => { routeHome(); });
  const t0 = await ev(B, () => document.getElementById("tbTitle").textContent);
  await ev(B, () => { document.getElementById("view") && 0; });
  console.log("   Titel " + t0);
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
console.log(rot ? `Zwei-Geräte-Test: ${rot} von ${faelle.length} Fall/Fälle rot.` : "Zwei-Geräte-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
