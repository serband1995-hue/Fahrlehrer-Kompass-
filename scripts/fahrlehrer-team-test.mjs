// W18 Fahrlehrer-Team-Test: 10 neu angelegte Fahrlehrer arbeiten vom ersten Anmelden bis zum Alltag (Anlass: die Fahrschule
// zahlt ab 01.12., mehrere Fahrlehrer gleichzeitig liefen noch nie live). Alles im echten Browser, ohne Netz, nur erfundene
// Namen („… Muster“). Aufruf:  NODE_PATH=$(npm root -g) node scripts/fahrlehrer-team-test.mjs      (Ziel: unter 5 Minuten)
// Gegenprobe:  W18_GEGENPROBE=1 …  → die Datenbank-Attrappe verrät fremde Schüler/Termine/Prüfungen (Zugriffsregeln aus,
//   Filter auf fahrlehrer_id werden ignoriert). Dann MÜSSEN die Trennungs-Prüfungen (T…) rot werden.
//
// WIE die Attrappe gebaut ist
//   * EINE Datenbank-Attrappe in Node (Tabellen als Listen). Sie bildet die Zugriffsregeln (RLS) aus supabase/schema/rechte-abzug.sql
//     nach: Fahrlehrer sieht/ändert nur Zeilen mit fahrlehrer_id = eigene ID in schueler, kalender_termine, kalender_pruefungen und
//     legt nur mit eigener fahrlehrer_id + eigener fahrschule_id an; profiles: Fahrlehrer nur sich selbst, Leitung/Büro alle der
//     Fahrschule (Leitung ändert nur Fahrlehrer), Profil-Schutz (Rolle, Fahrschule, E-Mail, aktiv, faehrt_selbst nur Super-Admin);
//     Urlaub/Schichten/Fahrzeuge: alle der Fahrschule lesen, Leitung/Büro schreiben (Fahrlehrer trägt nur eigenen Urlaub ein);
//     snapshots: nur eigener, updated_at setzt der „Server“; Super-Admin alles. Nicht nachgebildet: Trigger (Fahrcheck-Haken,
//     Zahlungssperre, Papierkorb …), Spaltenprüfung (unbekannte Spalten werden hingenommen), andere Tabellen (leer).
//   * Im Browser ersetzt eine Attrappe für supabase-js (window.supabase.createClient, per addInitScript) jede Abfrage durch einen Aufruf
//     an Node (exposeFunction, übersteht Neu-Laden). Die CDN-Datei der Bibliothek wird leer beantwortet. Die Sitzung liegt wie bei
//     supabase-js in localStorage (sb-<ref>-auth-token), Abmelden/Neustart laufen echt (doLogout → location.reload()).
//   * Anmeldung IMMER über die echte Anmeldemaske (#loEmail/#loPass/#loBtn → doLogin → afterLogin), nie per Abkürzung.
//
// WAS über die Oberfläche läuft und was über App-Funktionen (Speichern kommt in jedem Fall in der Attrappe an, das wird geprüft)
//   Oberfläche: Anmeldung, Nutzungsbedingungen (Scrollen, Haken, Bestätigen), Schüler anlegen (Formular, Klasse, Speichern),
//     Termin anlegen (Schüler wählen, Datum/Zeit, Eintragen, Fahrzeug-Auswahl), Termin verschieben (Bearbeiten-Fenster), Fahrstunde
//     bewerten und „Fertig“, Fahrcheck-Auswahl, Abmelden (Menü unten), Startseite „Fahrschule“ in den Einstellungen (Leitung/Super-Admin).
//   Funktionen: Fenster/Seiten öffnen (openAddLessonSheet, openEventSheet, routeFahrstunde, routeKalender, tabGo, routeSettings …),
//     Fahrzeug-Liste des Fahrlehrers (DB.workCfg.fahrzeuge, die gibt es in der App nur über Einstellungen), „Speichern jetzt“ statt
//     4 Sekunden Warten (_brueckenSofort + pushToCloud), Filter der Gesamtansicht (_fsCalLehrerFilter).
//
// WAS wie tief getestet wird (Laufzeit!)
//   Alle 8 Konten mit App (7 Fahrlehrer + Leitung, die selbst fährt) laufen in EINEM Browser-Kontext nacheinander (= dasselbe Handy):
//   Anmeldung, Nutzungsbedingungen, Startansicht, Schüler anlegen, Termin anlegen mit Fahrzeug, Verschieben, Fahrstunde abschließen,
//   Fahrcheck, Kalender, Trennung, Abmelden und Prüfung der Reste auf dem Gerät. Die 3 Fahrlehrer ohne App kommen nur über die
//   Gesamtansicht (Leitung/Super-Admin) und die Büro-Seite vor. Die Büro-Seite (buero.html) läuft mit der vorhandenen Attrappe
//   buero-vorfuehrung.js, gefüllt mit derselben Besetzung (dort gelten keine Zugriffsregeln, das Büro sieht alles).
// WAS DER TEST NICHT ABDECKT (ehrlich): echte Datenbank (Trigger, Spaltenprüfung, Papierkorb, Fahrcheck-Haken, Zahlungssperre, PIN-Anmeldung
//   des Büros mit echtem Server), E-Mail/Push, mehrere Geräte gleichzeitig am selben Konto (das macht zwei-geraete-test), Service Worker/Cache
//   (hier blockiert, Cache Storage wird zwar geprüft, ist aber leer), Zeitfenster-Wettläufe zwischen zwei Fahrlehrern, die GLEICHZEITIG speichern
//   (die Konten laufen nacheinander), echte Passwörter/Einladungs-E-Mails, Fahrlehrer-Akte/Klassen-Pflege im Büro, die Büro-Seite mit echten
//   Zugriffsregeln, Lohn/Abrechnung als eigene Rechnung (nur Statistik und Verkäufe & Provision werden geöffnet). Fahrlehrer ohne App melden sich
//   nie an; sie kommen nur in Listen/Auswahlen der Leitung, des Super-Admins und des Büros vor.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const GEGENPROBE = process.env.W18_GEGENPROBE === "1";
const T0 = Date.now();
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || r === "" || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);

/* ============================================================ Besetzung (erfunden) ============================================================ */
const FS = "fs-muster";
const PW = "Muster-1234";
const heuteBerlin = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const addTage = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const HEUTE = heuteBerlin, MORGEN = addTage(HEUTE, 1), UEBERMORGEN = addTage(HEUTE, 2);
// k = Kürzel, app = hat Zugang zur App, form = Klasse des ersten Schülers
const FL = [
  { k: "anna", name: "Anna Muster", klassen: ["B"], app: true, form: "B", sch: "Lena Schülermuster1" },
  { k: "annm", name: "Anna Mustermann", klassen: ["B", "BE"], app: true, form: "BE", sch: "Jonas Schülermuster2" },
  { k: "berta", name: "Berta Beispiel Muster", klassen: ["C", "CE"], app: true, form: "CE", sch: "Greta Schülermuster3" },
  { k: "carl", name: "Carl Muster", klassen: ["B"], app: true, form: "B", sch: "Elias Schülermuster4" },
  { k: "dora", name: "Dora Muster", klassen: ["B", "BE"], app: true, form: "BE", sch: "Sofia Schülermuster5" },
  { k: "emil", name: "Emil Muster", klassen: ["C", "CE"], app: true, form: "CE", sch: "Max Schülermuster6" },
  { k: "juerg", name: "Jürgen-Österreicher Müllerßöhn Muster", klassen: ["B"], app: true, form: "B", sch: "Emilia Schülermuster7" },
  { k: "fritz", name: "Fritz Muster", klassen: ["B"], app: false, form: "B", sch: "Ben Schülermuster8" },
  { k: "gerda", name: "Gerda Muster", klassen: ["B", "BE"], app: false, form: "BE", sch: "Hanna Schülermuster9" },
  { k: "hans", name: "Hans Muster", klassen: ["C", "CE"], app: false, form: "CE", sch: "Luca Schülermuster10" },
];
FL.forEach((f, i) => { f.id = "u-" + f.k; f.email = f.k + "@example.org"; f.nr = i + 1; f.sid = "s-" + f.k; });
const LEITUNG = { k: "lena", id: "u-lena", name: "Lena Leitung Muster", email: "lena@example.org", rolle: "fahrschule_admin", faehrt_selbst: true, app: true, form: "B", klassen: ["B"], sch: "Nora Schülermuster11" };
const BUERO = { k: "bea", id: "u-bea", name: "Bea Büro Muster", email: "bea@example.org", rolle: "buero" };
const SUPER = { k: "sam", id: "u-sam", name: "Sam Super Muster", email: "sam@example.org", rolle: "super_admin", klassen: ["B"], form: "B", sch: "Theo Schülermuster12" };
const MIT_APP = [...FL.filter((f) => f.app), LEITUNG];
const FZ1 = "Golf Schalter 1", FZ2 = "Golf Automatik 1";

/* ============================================================ Datenbank-Attrappe (Node) ============================================================ */
const tab = {};
const srv = { zaehler: 0, log: [], unbekanntGeschrieben: [] };
const C = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
function jetzt() { // wie PostgREST, streng steigend
  srv.zaehler++;
  const mikro = Date.parse("2026-11-26T08:00:00.000Z") * 1000 + srv.zaehler * 7919;
  const ms = Math.floor(mikro / 1000), my = String(mikro % 1000).padStart(3, "0");
  return new Date(ms).toISOString().slice(0, 19) + "." + String(ms % 1000).padStart(3, "0") + my + "+00:00";
}
function datenbankBauen() {
  const profil = (p, extra) => Object.assign({ id: p.id, name: p.name, email: p.email, rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, ohne_app: false,
    klassen: p.klassen || [], faehrt_selbst: false, agb_akzeptiert_version: null, slug: null, erstellt_am: "2026-11-20T08:00:00Z" }, extra || {});
  tab.profiles = [
    ...FL.map((f) => profil(f, { ohne_app: !f.app, email: f.app ? f.email : null })),
    profil(LEITUNG, { rolle: "fahrschule_admin", faehrt_selbst: true }),
    profil(BUERO, { rolle: "buero", klassen: [] }),
    profil(SUPER, { rolle: "super_admin" }),
  ];
  tab.fahrschulen = [{ id: FS, name: "Fahrschule Muster", aktiv: true, slug: "muster", konfiguration: {} }];
  tab.users = [...MIT_APP, SUPER, BUERO].map((p) => ({ id: p.id, email: p.email, password: PW }));
  tab.schueler = []; tab.kalender_termine = []; tab.kalender_pruefungen = []; tab.snapshots = [];
  [...FL, LEITUNG, SUPER].forEach((f) => {
    tab.schueler.push({ id: f.sid || "s-" + f.k, fahrschule_id: FS, fahrlehrer_id: f.id, name: f.sch, telefon: "0170 000" + String(f.nr || 90).padStart(4, "0"), status: "aktiv",
      bogen_ausgefuellt: false, ausbildung: { form: f.form || "B" }, klasse: null, erstellt_am: "2026-11-21T08:00:00Z", aktualisiert_am: "2026-11-21T08:00:00Z" });
    const sid = f.sid || "s-" + f.k;
    // je Fahrlehrer: eine Stunde heute früh und eine morgen. Anna und Carl fahren morgen 11:00 dasselbe Auto (Doppelbelegung).
    tab.kalender_termine.push({ id: "t-" + f.k + "-1", fahrschule_id: FS, fahrlehrer_id: f.id, schueler_id: sid, datum: HEUTE, von: "07:00", bis: "08:30", art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: "2026-11-21T08:00:00Z", buero_fc_status: "offen" });
    const doppelt = f.k === "anna" || f.k === "carl";
    tab.kalender_termine.push({ id: "t-" + f.k + "-2", fahrschule_id: FS, fahrlehrer_id: f.id, schueler_id: sid, datum: MORGEN, von: doppelt ? "11:00" : "13:" + String(10 + (f.nr || 0)).padStart(2, "0"), bis: doppelt ? "12:30" : "14:40", art: "fahrstunde", fahrzeug: doppelt ? FZ1 : null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: "2026-11-21T08:00:00Z", buero_fc_status: "offen" });
  });
  tab.fahrschule_urlaub = [
    { id: "ur-1", fahrschule_id: FS, fahrlehrer_id: "u-berta", mitarbeiter_name: "Berta Beispiel Muster", von: UEBERMORGEN, bis: addTage(UEBERMORGEN, 3), erstellt_von: "u-lena" },
    { id: "ur-2", fahrschule_id: FS, fahrlehrer_id: "u-juerg", mitarbeiter_name: FL[6].name, von: addTage(HEUTE, 5), bis: addTage(HEUTE, 9), erstellt_von: "u-lena" },
  ];
  tab.fahrschule_schichten = [
    { id: "sc-1", fahrschule_id: FS, mitarbeiter_name: "Anna Mustermann", datum: HEUTE, status: "arbeitet", notiz: null },
    { id: "sc-2", fahrschule_id: FS, mitarbeiter_name: FL[6].name, datum: MORGEN, status: "krank", notiz: "Test" },
  ];
  tab.fahrschule_fahrzeuge = [
    { id: "fz-1", fahrschule_id: FS, name: FZ1, typ: "schalt", aktiv: true, erstellt_am: "2026-01-01" },
    { id: "fz-2", fahrschule_id: FS, name: FZ2, typ: "automatik", aktiv: true, erstellt_am: "2026-01-02" },
  ];
}
// Zugriffsregeln (aus rechte-abzug.sql): darf diese Rolle diese Zeile lesen/ändern/anlegen/löschen?
function darf(me, t, op, row) {
  if (!me) return false;
  const S = me.rolle === "super_admin", L = me.rolle === "fahrschule_admin", B = me.rolle === "buero";
  const gleiche = row.fahrschule_id === me.fahrschule_id;
  if (GEGENPROBE && ["schueler", "kalender_termine", "kalender_pruefungen"].includes(t)) return true; // Gegenprobe: Zugriffsregeln aus
  switch (t) {
    case "schueler": case "kalender_termine": case "kalender_pruefungen":
      if (S) return true;
      if ((L || B) && gleiche) return op === "delete" ? L : true;
      if (op === "insert") return row.fahrlehrer_id === me.id && gleiche;
      if (op === "delete") return false;
      return row.fahrlehrer_id === me.id;
    case "profiles":
      if (S) return true;
      if (op === "select") return row.id === me.id || ((L || B) && gleiche);
      if (op === "update") return row.id === me.id || (L && gleiche && row.rolle === "fahrlehrer");
      return false;
    case "fahrschulen": return op === "select" ? (S || row.id === me.fahrschule_id) : S;
    case "fahrschule_urlaub":
      if (S) return true;
      if (op === "select") return gleiche;
      if ((L || B) && gleiche) return true;
      return op === "insert" && gleiche && row.erstellt_von === me.id;
    case "fahrschule_schichten": case "fahrschule_fahrzeuge":
      if (S) return true;
      return op === "select" ? gleiche : (L || B) && gleiche;
    case "snapshots": return op === "select" && S ? true : row.user_id === me.id;
    default: return true;
  }
}
const TABELLEN_MIT_RLS = ["schueler", "kalender_termine", "kalender_pruefungen", "profiles", "fahrschulen", "fahrschule_urlaub", "fahrschule_schichten", "fahrschule_fahrzeuge", "snapshots"];
const rlsFehler = () => ({ code: "42501", message: "new row violates row-level security policy" });
function passt(r, f) {
  const v = r[f.c];
  switch (f.k) {
    case "eq": return v === f.v;
    case "neq": return v !== f.v;
    case "in": return (f.v || []).includes(v);
    case "is": return f.v === null ? v == null : v === f.v;
    case "gte": return v != null && v >= f.v; case "gt": return v != null && v > f.v;
    case "lte": return v != null && v <= f.v; case "lt": return v != null && v < f.v;
    case "not": return f.op === "is" ? (f.v === null ? v != null : v !== f.v) : !passt(r, { k: f.op, c: f.c, v: f.v });
    case "contains": return Array.isArray(v) && (f.v || []).every((x) => v.includes(x));
    case "ilike": case "like": return new RegExp("^" + String(f.v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i").test(String(v ?? ""));
    default: return true; // or(...) u. a.: nicht nachgebildet
  }
}
srv.abgewiesen = [];
function bedienen(q, uid) {
  const r = bedienenRoh(q, uid);
  if (r && r.error && r.error.code === "42501") srv.abgewiesen.push(uid + " " + q.table + " " + q.op);
  return r;
}
function bedienenRoh(q, uid) {
  const me = (tab.profiles || []).find((p) => p.id === uid) || null;
  const t = q.table;
  srv.log.push({ uid, t, op: q.op });
  if (q.rpc) return { data: q.rpc === "termine_nicht_mehr_meine" ? [] : null, error: null };
  if (!tab[t]) tab[t] = [];
  const rls = TABELLEN_MIT_RLS.includes(t);
  const sichtbar = (r, op) => (!rls ? true : darf(me, t, op, r));
  // Gegenprobe: Filter auf fahrlehrer_id werden ignoriert (die Datenbank „verrät“ fremde Zeilen)
  const filter = (q.filters || []).filter((f) => !(GEGENPROBE && f.c === "fahrlehrer_id" && ["schueler", "kalender_termine", "kalender_pruefungen"].includes(t)));
  const trifft = (r) => filter.every((f) => passt(r, f));
  const err = (code, message) => ({ data: null, error: { code, message } });
  const antwort = (rows) => {
    if (q.mode === "single") return rows.length === 1 ? { data: C(rows[0]), error: null } : err("PGRST116", "Die Abfrage lieferte " + rows.length + " Zeilen");
    if (q.mode === "maybe") return rows.length > 1 ? err("PGRST116", "mehrere Zeilen") : { data: C(rows[0] || null), error: null };
    return { data: C(rows), error: null };
  };
  const projekt = (rows) => {
    if (!q.cols || q.cols === "*" || /[()]/.test(q.cols)) return rows;
    const sp = q.cols.split(",").map((c) => c.trim()).filter(Boolean);
    return rows.map((r) => { const o = {}; sp.forEach((c) => { o[c] = r[c]; }); return o; });
  };
  if (q.op === "select") {
    let rows = tab[t].filter((r) => sichtbar(r, "select") && trifft(r));
    for (const o of (q.order || []).slice().reverse()) rows = rows.slice().sort((a, b) => (a[o.c] > b[o.c] ? 1 : a[o.c] < b[o.c] ? -1 : 0) * (o.asc === false ? -1 : 1));
    const n = rows.length;
    if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
    if (q.limit != null) rows = rows.slice(0, q.limit);
    const r = q.head ? { data: null, error: null } : antwort(projekt(rows));
    if (q.count) r.count = n;
    return r;
  }
  if (!rls && !["snapshots"].includes(t)) srv.unbekanntGeschrieben.push(t + ":" + q.op);
  const defaults = (row) => {
    if (["kalender_termine", "kalender_pruefungen"].includes(t) && row.geloescht === undefined) row.geloescht = false;
    if (t === "schueler" && row.status === undefined) row.status = "aktiv";
    if (t === "snapshots") row.updated_at = jetzt();
    return row;
  };
  const geschuetzt = ["rolle", "fahrschule_id", "email", "aktiv", "faehrt_selbst"];
  const ergebnis = (rows) => (q.retSel ? antwort(projekt(rows)) : { data: null, error: null });
  if (q.op === "insert" || q.op === "upsert") {
    const zeilen = (Array.isArray(q.payload) ? q.payload : [q.payload]).map(C);
    const konflikt = (q.opts && q.opts.onConflict) || (t === "snapshots" ? "user_id" : "id");
    const out = [];
    for (const z of zeilen) {
      const alt = tab[t].find((r) => r[konflikt] === z[konflikt] && z[konflikt] != null);
      if (alt && q.op === "insert") return err("23505", "duplicate key");
      if (alt) {
        const neu = defaults(Object.assign({}, alt, z));
        if (!sichtbar(alt, "update") || !sichtbar(neu, "update")) return err("42501", rlsFehler().message);
        Object.assign(alt, neu); out.push(alt);
      } else {
        const neu = defaults(z);
        if (!sichtbar(neu, "insert")) return err("42501", rlsFehler().message);
        tab[t].push(neu); out.push(neu);
      }
    }
    return ergebnis(out);
  }
  if (q.op === "update") {
    const out = [];
    for (const r of tab[t].filter((x) => sichtbar(x, "update") && trifft(x))) {
      const neu = Object.assign({}, r, C(q.payload));
      if (t === "profiles" && !(me && me.rolle === "super_admin")) geschuetzt.forEach((k) => { neu[k] = r[k]; });
      if (t === "snapshots") neu.updated_at = jetzt();
      if (!sichtbar(neu, "update")) return err("42501", rlsFehler().message);
      Object.assign(r, neu); out.push(r);
    }
    return ergebnis(out);
  }
  if (q.op === "delete") {
    const weg = tab[t].filter((x) => sichtbar(x, "delete") && trifft(x));
    tab[t] = tab[t].filter((x) => !weg.includes(x));
    return ergebnis(weg);
  }
  return err("XX000", "unbekannte Operation");
}
function anmeldenServer(email, pw) {
  const u = (tab.users || []).find((x) => x.email === email && x.password === pw);
  if (!u) return { error: "Invalid login credentials" };
  return { user: { id: u.id, email: u.email } };
}

/* ============================================================ Attrappe im Browser ============================================================ */
function attrappeEinbauen() {
  const KEY = "sb-oectrvkjunntzsggyhxv-auth-token";
  const sitzung = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.user ? j : null; } catch (e) { return null; } };
  class Q {
    constructor(t) { this.q = { table: t, op: "select", filters: [], cols: "*", mode: "many", payload: null, opts: null, retSel: false, order: [], range: null, limit: null, count: null, head: false }; }
    select(c, o) { if (this.q.op === "select") { this.q.cols = c || "*"; if (o && o.count) { this.q.count = o.count; this.q.head = !!o.head; } } else this.q.retSel = true; return this; }
    f(k, c, v, extra) { this.q.filters.push(Object.assign({ k, c, v }, extra || {})); return this; }
    eq(c, v) { return this.f("eq", c, v); } neq(c, v) { return this.f("neq", c, v); } in(c, v) { return this.f("in", c, v); } is(c, v) { return this.f("is", c, v); }
    gte(c, v) { return this.f("gte", c, v); } gt(c, v) { return this.f("gt", c, v); } lte(c, v) { return this.f("lte", c, v); } lt(c, v) { return this.f("lt", c, v); }
    contains(c, v) { return this.f("contains", c, v); } ilike(c, v) { return this.f("ilike", c, v); } like(c, v) { return this.f("like", c, v); }
    not(c, op, v) { return this.f("not", c, v, { op }); } or(s) { return this.f("or", null, s); } match(o) { Object.keys(o || {}).forEach((c) => this.f("eq", c, o[c])); return this; }
    order(c, o) { this.q.order.push({ c, asc: !(o && o.ascending === false) }); return this; }
    range(a, b) { this.q.range = [a, b]; return this; } limit(n) { this.q.limit = n; return this; }
    single() { this.q.mode = "single"; return this; } maybeSingle() { this.q.mode = "maybe"; return this; }
    upsert(rows, o) { this.q.op = "upsert"; this.q.payload = rows; this.q.opts = o || {}; return this; }
    insert(rows) { this.q.op = "insert"; this.q.payload = rows; return this; }
    update(o) { this.q.op = "update"; this.q.payload = o; return this; }
    delete() { this.q.op = "delete"; return this; }
    abortSignal() { return this; }
    then(ok, nein) { const s = sitzung(); return window.__srv(JSON.parse(JSON.stringify(this.q)), s ? s.user.id : null).then(ok, nein); }
    catch(f) { return this.then(undefined, f); }
    finally(f) { return this.then((v) => { f(); return v; }, (e) => { f(); throw e; }); }
  }
  const client = {
    from: (t) => new Q(t),
    rpc: (name, args) => ({ then(ok, nein) { const s = sitzung(); return window.__srv({ rpc: name, args }, s ? s.user.id : null).then(ok, nein); } }),
    functions: { invoke: async () => ({ data: {}, error: null }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {},
    auth: {
      getSession: async () => { const s = sitzung(); return { data: { session: s }, error: null }; },
      getUser: async () => { const s = sitzung(); return { data: { user: s && s.user }, error: null }; },
      signInWithPassword: async ({ email, password }) => {
        const r = await window.__login(email, password);
        if (r.error) return { data: { user: null, session: null }, error: { message: r.error } };
        const s = { access_token: "tok-" + r.user.id, refresh_token: "ref-" + r.user.id, expires_at: Math.floor(Date.now() / 1000) + 3600, user: r.user };
        localStorage.setItem(KEY, JSON.stringify(s));
        return { data: { user: r.user, session: s }, error: null };
      },
      signOut: async () => { try { localStorage.removeItem(KEY); } catch (e) {} return { error: null }; },
      updateUser: async () => { const s = sitzung(); return { data: { user: s && s.user }, error: null }; },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
  window.supabase = { createClient: () => client };
}

/* ============================================================ Hilfen für den Browser ============================================================ */
const fehlerSammler = []; // JS-Fehler (pageerror) aller Schritte
async function neuerKontext(breite = 360, hoehe = 780) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE", serviceWorkers: "block" });
  await ctx.exposeFunction("__srv", (q, uid) => bedienen(q, uid));
  await ctx.exposeFunction("__login", (email, pw) => anmeldenServer(email, pw));
  await ctx.addInitScript(attrappeEinbauen);
  await ctx.route("**/*", (r) => {
    const u = r.request().url();
    if (u.startsWith(basis)) return r.continue();
    if (/cdn\.jsdelivr\.net\/npm\/@supabase/.test(u)) return r.fulfill({ contentType: "text/javascript", body: "" });
    return r.abort();
  });
  const page = await ctx.newPage();
  const dialoge = [];
  page.on("pageerror", (e) => fehlerSammler.push({ wo: page.__wo || "?", text: e.message }));
  page.on("dialog", (d) => { dialoge.push(d.message().slice(0, 100)); d.accept().catch(() => {}); });
  page.__dialoge = dialoge;
  return { ctx, page };
}
const bereit = (page, ms = 25000) => page.waitForFunction(() => {
  try {
    if (document.getElementById("agbGate")) return true;
    return !!(typeof _authUser !== "undefined" && _authUser && document.getElementById("loginOverlay").classList.contains("hidden") && _pullOk && _schuelerAbgerufen && _termineAbgerufen);
  } catch (e) { return false; }
}, null, { timeout: ms });
// Echte Anmeldemaske: Seite laden, E-Mail und Passwort eintippen, „Einloggen“
async function anmelden(page, u, pw = PW) {
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector("#loginOverlay:not(.hidden) #loEmail", { state: "visible", timeout: 15000 });
  await page.fill("#loEmail", u.email); await page.fill("#loPass", pw);
  await page.click("#loBtn");
  await bereit(page);
}
// Speichern jetzt (statt 4 s warten) und warten, bis alles in der Attrappe angekommen ist
async function flush(page) {
  await page.evaluate(async () => {
    const kurz = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 2; i++) { try { _brueckenSofort(); } catch (e) {} await kurz(80); await Promise.all([..._brueckenLauf]); }
    try { _snapGeaendert = true; await pushToCloud(); } catch (e) {}
  });
}
const heuteSeite = (page) => page.evaluate(() => todayISO());
const textSeite = (page) => page.evaluate(() => document.body.innerText);

/* ============================================================ Marker und Reste auf dem Gerät ============================================================ */
const neuName = (f) => "Neu" + f.nr + " Fahrschüler Muster";
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Markierungen einer Person: alles, woran man sie oder ihre Schüler erkennt (Namen genau, damit „Anna Muster“ nicht in „Anna Mustermann“ steckt)
function marker(f) {
  const m = [{ n: "Name", re: new RegExp(esc(f.name) + "(?![A-Za-zÄÖÜäöüß])") }, { n: "E-Mail", re: new RegExp(esc(f.email), "i") }, { n: "Konto-ID", re: new RegExp(esc(f.id) + "(?![A-Za-z0-9])") },
    { n: "Schüler", re: new RegExp(esc(f.sch)) }, { n: "Schüler-ID", re: new RegExp(esc(f.sid || "s-" + f.k) + "(?![A-Za-z0-9])") }];
  if (f.nr) m.push({ n: "neuer Schüler", re: new RegExp(esc(neuName(f))) });
  return m;
}
// Alles, was auf dem Gerät liegt: localStorage, sessionStorage, IndexedDB, Cache Storage, Seite (Text, HTML, Eingabefelder)
async function geraeteDump(page) {
  return page.evaluate(async () => {
    const o = { ls: {}, ss: {}, idb: {}, cache: {}, dom: "" };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o.ls[k] = localStorage.getItem(k); } } catch (e) {}
    try { for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); o.ss[k] = sessionStorage.getItem(k); } } catch (e) {}
    try {
      const dbs = (indexedDB.databases ? await indexedDB.databases() : []) || [];
      for (const d of dbs) {
        await new Promise((ok) => {
          const rq = indexedDB.open(d.name);
          rq.onerror = () => ok(); rq.onsuccess = () => {
            const db = rq.result; const namen = [...db.objectStoreNames]; o.idb[d.name] = {};
            if (!namen.length) { db.close(); return ok(); }
            const tx = db.transaction(namen, "readonly");
            let offen = namen.length;
            namen.forEach((n) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => { try { o.idb[d.name][n] = JSON.stringify(g.result); } catch (e) { o.idb[d.name][n] = "?"; } if (--offen === 0) { db.close(); ok(); } }; g.onerror = () => { if (--offen === 0) { db.close(); ok(); } }; });
          };
        });
      }
    } catch (e) {}
    try {
      for (const k of await caches.keys()) { o.cache[k] = []; const c = await caches.open(k); for (const rq of await c.keys()) { let t = ""; try { t = await (await c.match(rq)).text(); } catch (e) {} o.cache[k].push(rq.url + " " + t.slice(0, 200000)); } }
    } catch (e) {}
    o.dom = document.body.innerText + "\n" + document.documentElement.outerHTML + "\n" + [...document.querySelectorAll("input,textarea")].map((i) => i.value).join("\n");
    return o;
  });
}
// Findet Reste von f im Dump: Liste „Ort: Markierung“
function reste(dump, f) {
  const fund = [];
  const mm = marker(f);
  const pruef = (ort, text) => { for (const m of mm) if (m.re.test(String(text))) { fund.push(ort + " (" + m.n + ")"); break; } };
  for (const [k, v] of Object.entries(dump.ls)) pruef("localStorage „" + k + "“", v);
  for (const [k, v] of Object.entries(dump.ss)) pruef("sessionStorage „" + k + "“", v);
  for (const [d, stores] of Object.entries(dump.idb)) for (const [s, v] of Object.entries(stores)) pruef("IndexedDB " + d + "/" + s, v);
  for (const [k, l] of Object.entries(dump.cache)) l.forEach((e) => pruef("Cache Storage " + k + " " + e.split(" ")[0].replace(basis, "/"), e));
  const dom = mm.filter((m) => m.re.test(dump.dom)); if (dom.length) fund.push("Seite (DOM): " + dom.map((m) => m.n).join(", "));
  return fund;
}

/* ============================================================ Ein Arbeitstag eines Fahrlehrers mit App ============================================================ */
const flushLange = (page) => flush(page);
async function agbBestaetigen(page, u) {
  const r = await page.evaluate(() => { const b = document.getElementById("agbAcceptBtn"), box = document.getElementById("agbScrollBox"); return { da: !!b, aus: b && b.disabled, lang: box && box.scrollHeight > box.clientHeight + 8 }; });
  const f = [];
  if (!r.da) return ["Nutzungsbedingungen erscheinen nicht"];
  if (!r.aus) f.push("Bestätigen-Knopf schon vor Haken/Lesen aktiv");
  await page.evaluate(() => { const c = document.getElementById("agbCheck"); c.checked = true; c.dispatchEvent(new Event("change")); });
  if (r.lang) { const nurHaken = await page.evaluate(() => document.getElementById("agbAcceptBtn").disabled); if (!nurHaken) f.push("Knopf aktiv, ohne bis ans Ende gescrollt zu haben"); }
  await page.evaluate(() => { const b = document.getElementById("agbScrollBox"); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event("scroll")); });
  if (await page.evaluate(() => document.getElementById("agbAcceptBtn").disabled)) f.push("Knopf bleibt nach Haken und Scrollen gesperrt");
  else await page.click("#agbAcceptBtn");
  await page.waitForSelector("#agbGate", { state: "detached", timeout: 8000 }).catch(() => f.push("Nutzungsbedingungen bleiben stehen"));
  await bereit(page);
  const p = tab.profiles.find((x) => x.id === u.id);
  if (p.agb_akzeptiert_version !== "1.0") f.push("Zustimmung nicht in der Datenbank: " + p.agb_akzeptiert_version);
  return f;
}
async function schuelerAnlegen(page, name, form) {
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} tabGo("schueler"); }); await warte(page, 350);
  const knopf = await page.evaluate(() => { const k = [document.getElementById("emptyAdd"), document.getElementById("fab")].find((b) => b && getComputedStyle(b).display !== "none" && b.getBoundingClientRect().height > 0); return k ? k.id : null; });
  if (!knopf) return "kein Knopf zum Anlegen sichtbar";
  await page.click("#" + knopf); await warte(page, 350);
  await page.fill("#f_name", name);
  if (form) { const da = await page.$(`#formPills [data-form="${form}"]`); if (!da) return "Klasse " + form + " nicht wählbar (Pillen: " + (await page.evaluate(() => [...document.querySelectorAll("#formPills [data-form]")].map((b) => b.dataset.form).join(","))) + ")"; await da.click(); }
  await page.click("#saveBtn"); await warte(page, 400);
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
  return null;
}
async function terminAnlegen(page, sid, datum, von, fzName) {
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} openAddLessonSheet("fahrstunde"); }); await warte(page, 300);
  await page.click(`#alList .as-item[data-sid="${sid}"]`); await warte(page, 250);
  await page.fill("#alDate", datum); await page.fill("#alTime", von);
  await page.click("#alSave"); await warte(page, 350);
  if (fzName) { const fz = await page.$(`.fz-opt[data-fzid="fz-${fzName === FZ1 ? "s" : "a"}"]`); if (!fz) return "Fahrzeug-Auswahl fehlt"; await fz.click(); await warte(page, 350); }
  return page.evaluate(([sid, datum, von]) => { const l = DB.lessons.find((x) => x.sid === sid && x.date === datum && x.von === von); return l ? l.id : null; }, [sid, datum, von]);
}
async function abmelden(page) {
  const vor = page.__dialoge.length;
  await page.evaluate(() => openDrawer()); await warte(page, 500);
  await page.click("#drawerLogoutBtn", { timeout: 5000 });
  await page.waitForSelector("#loginOverlay:not(.hidden) #loEmail", { state: "visible", timeout: 15000 });
  await warte(page, 300);
  return page.__dialoge.slice(vor);
}
async function andereMarkerSichtbar(page, u, andere) {
  const txt = await textSeite(page);
  const gef = [];
  for (const a of andere) { if (a.id === u.id) continue; for (const m of marker(a)) { if (m.n === "Konto-ID" || m.n === "Schüler-ID") continue; if (m.re.test(txt)) { gef.push(a.name.split(" ")[0] + "(" + a.nr + "): " + m.n); break; } } }
  return gef;
}

const ALLE_PERSONEN = [...FL, LEITUNG, SUPER].map((p, i) => Object.assign({ nr: p.nr || 11 + i - FL.length }, p));
const fl2 = (p) => ALLE_PERSONEN.find((x) => x.id === p.id);
const fahrzeugeEinrichten = (page) => page.evaluate(([a, b]) => { DB.workCfg = DB.workCfg || {}; DB.workCfg.fahrzeuge = [{ id: "fz-s", name: a, typ: "schalt" }, { id: "fz-a", name: b, typ: "automatik" }]; save(); }, [FZ1, FZ2]);

async function arbeitstag(page, u, davor, tief) {
  const P = `[${u.name.slice(0, 22)}]`;
  const nr = fl2(u).nr;
  page.__wo = u.k;
  const erst = await page.evaluate(() => !!document.getElementById("agbGate"));
  await pruefe("A1", `${P} erste Anmeldung: Nutzungsbedingungen erscheinen, nach Bestätigung in der Datenbank`, async () => (erst ? agbBestaetigen(page, u) : "Nutzungsbedingungen erscheinen nicht (Profil ohne Zustimmung)"));
  if (await page.evaluate(() => !!document.getElementById("agbGate"))) return;
  await warte(page, 400);
  await pruefe("A2", `${P} eigene Startansicht (eigene Fahrlehrer-Ansicht, kein Gesamt, Menü passt zur Rolle)`, () => page.evaluate(([name, gesamtMoeglich]) => {
    const f = [];
    if (_fsAgg) f.push("Gesamtansicht statt eigener Ansicht");
    if (!_authProfile || _authProfile.name !== name) f.push("angemeldet als " + (_authProfile && _authProfile.name));
    if (!gesamtMoeglich && /Übersicht|Büro-Seite/.test(document.querySelector(".drawer-nav").textContent)) f.push("Fahrlehrer sieht Gesamt/Büro im Menü");
    if (!view.firstElementChild || view.textContent.trim().length < 5) f.push("leere Startseite");
    return f;
  }, [u.name, u.rolle === "fahrschule_admin"]));
  await pruefe("A3", `${P} Profil in der App: Name, Rolle, Klassen wie in der Datenbank`, () => page.evaluate(([name, klassen, rolle]) => {
    const f = []; const p = _authProfile || {};
    if (p.name !== name) f.push("Name " + p.name); if (p.rolle !== rolle) f.push("Rolle " + p.rolle);
    if (JSON.stringify(p.klassen || []) !== JSON.stringify(klassen)) f.push("Klassen " + JSON.stringify(p.klassen));
    return f;
  }, [u.name, u.klassen || [], u.rolle || "fahrlehrer"]));
  // Schüler vom Büro (Zuweisung) ist da
  await pruefe("A4", `${P} Schüler vom Büro kommt an, in der Schülerliste sichtbar`, async () => {
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} tabGo("schueler"); }); await warte(page, 400);
    const t = await textSeite(page);
    return t.includes(u.sch) ? null : "„" + u.sch + "“ fehlt in der Schülerliste";
  });
  const name = neuName(fl2(u));
  await pruefe("A5", `${P} Schüler anlegen über die Oberfläche (Klasse ${u.form}) → in der Datenbank mit eigener Fahrlehrer-ID`, async () => {
    const fehl = await schuelerAnlegen(page, name, u.form); if (fehl) return fehl;
    await flush(page);
    const z = tab.schueler.find((s) => s.name === name);
    if (!z) return "nicht in der Datenbank";
    const f = [];
    if (z.fahrlehrer_id !== u.id) f.push("fahrlehrer_id " + z.fahrlehrer_id); if (z.fahrschule_id !== FS) f.push("fahrschule_id " + z.fahrschule_id);
    if ((z.ausbildung || {}).form !== u.form) f.push("Klasse " + (z.ausbildung || {}).form + " statt " + u.form);
    return f;
  });
  const sid = await page.evaluate((n) => { const s = DB.students.find((x) => x.name === n); return s ? s.id : null; }, name);
  if (!sid) return;
  await fahrzeugeEinrichten(page);
  // Termin anlegen: Doppelbelegung gewollt bei Anna und Carl (gleiches Auto, gleiche Zeit)
  const fz = u.k === "anna" || u.k === "carl" ? FZ1 : (u.form === "B" ? FZ1 : FZ2);
  const von = u.k === "anna" || u.k === "carl" ? "10:00" : "10:" + String(5 * nr).padStart(2, "0");
  let lid = null;
  await pruefe("A6", `${P} Termin anlegen mit Fahrzeug (Oberfläche) → in der Datenbank (Fahrer, Schüler, Datum, Fahrzeug)`, async () => {
    lid = await terminAnlegen(page, sid, MORGEN, von, fz);
    if (!lid || typeof lid !== "string" || /fehlt/.test(lid)) return String(lid || "Termin nicht angelegt");
    await flush(page);
    const z = tab.kalender_termine.find((t) => t.id === lid);
    if (!z) return "nicht in der Datenbank";
    const f = [];
    if (z.fahrlehrer_id !== u.id) f.push("fahrlehrer_id " + z.fahrlehrer_id); if (z.schueler_id !== sid) f.push("schueler_id");
    if (z.datum !== MORGEN || z.von !== von) f.push("Zeit " + z.datum + " " + z.von); if (z.fahrzeug !== fz) f.push("Fahrzeug " + z.fahrzeug);
    return f;
  });
  if (tief) {
    await pruefe("A7", `${P} Termin verschieben (Bearbeiten-Fenster) → neues Datum in der Datenbank`, async () => {
      await page.evaluate(([lid, sid]) => { try { closeSheet(); } catch (e) {} openEventSheet("lesson", lid, sid); }, [lid, sid]); await warte(page, 300);
      await page.click("#esEdit"); await warte(page, 300);
      await page.fill("#esDate", UEBERMORGEN); await page.click("#esSave"); await warte(page, 400);
      await flush(page);
      const z = tab.kalender_termine.find((t) => t.id === lid);
      return z && z.datum === UEBERMORGEN && z.fahrlehrer_id === u.id ? null : "Datum in der Datenbank: " + (z && z.datum);
    });
    await pruefe("A8", `${P} Fahrstunde abschließen: bewerten, „Fertig“, „Nach der Stunde“, Stand in der Datenbank`, async () => {
      await page.evaluate(([lid]) => { try { closeSheet(); } catch (e) {} updateLesson(lid, { date: todayISO(), von: "06:00", bis: "07:30" }); routeFahrstunde(lid); }, [lid]); await warte(page, 400);
      const themen = await page.$$(".fm-thema"); if (!themen.length) return "keine Themen zum Bewerten";
      await themen[0].click(); await warte(page, 150);
      await page.click("#fmFertig"); await warte(page, 500);
      const titel = await page.evaluate(() => $("#tbTitle").textContent);
      await flush(page);
      const z = tab.schueler.find((s) => s.id === sid);
      const amp = z && z.ausbildung && z.ausbildung.plan && z.ausbildung.plan.ampeln;
      const f = [];
      if (titel !== "Nach der Stunde") f.push("Titel „" + titel + "“");
      if (!amp || !Object.keys(amp).length) f.push("Bewertung nicht in der Datenbank (schueler.ausbildung.plan.ampeln)");
      return f;
    });
    await pruefe("A9", `${P} Fahrcheck wählen (Oberfläche) → in der Datenbank`, async () => {
      await page.evaluate(([lid, sid]) => { openEventSheet("lesson", lid, sid); }, [lid, sid]); await warte(page, 300);
      await page.click("#esFC"); await warte(page, 250);
      await page.click('[data-fcset="v1"]'); await warte(page, 300);
      await flush(page);
      const z = tab.kalender_termine.find((t) => t.id === lid);
      return z && z.payload && z.payload.fc === "v1" ? null : "payload.fc = " + JSON.stringify(z && z.payload && z.payload.fc);
    });
  }
  await pruefe("A10", `${P} Kalender öffnen: eigener Termin und eigene Stunde vom Büro sichtbar`, async () => {
    const ziel = await page.evaluate(([lid]) => { const l = DB.lessons.find((x) => x.id === lid); _calView = "woche"; _calDate = l ? l.date : todayISO(); routeKalender(); return l ? l.date : null; }, [lid]); await warte(page, 400);
    const f = [];
    const hat = await page.evaluate(([lid]) => !!document.querySelector(`[data-evedit^="lesson|${lid}|"]`), [lid]);
    if (!hat) f.push("angelegter Termin fehlt im Kalender");
    const buero = await page.evaluate(([id]) => !!document.querySelector(`[data-evedit^="lesson|${id}|"]`), ["t-" + u.k + "-2"]);
    if (!buero && ziel !== MORGEN) {} else if (!buero) f.push("Stunde, die das Büro eingetragen hat, fehlt im Kalender");
    return f;
  });
  // Trennung (Schritt 3) in allen Ansichten
  await pruefe("T1", `${P} Trennung: Startseite, Schülerliste, Suche, Kalender zeigen nichts von anderen Fahrlehrern`, async () => {
    const f = [];
    const sicht = {};
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} routeDashboard(); }); await warte(page, 350); sicht.Startseite = await andereMarkerSichtbar(page, u, ALLE_PERSONEN);
    await page.evaluate(() => tabGo("schueler")); await warte(page, 350); sicht.Schülerliste = await andereMarkerSichtbar(page, u, ALLE_PERSONEN);
    await page.fill("#studentSearch", "Schülermuster"); await warte(page, 400); sicht.Suche = await andereMarkerSichtbar(page, u, ALLE_PERSONEN);
    const eigen = await textSeite(page); if (!eigen.includes(u.sch)) f.push("Suche findet den eigenen Schüler nicht");
    await page.fill("#studentSearch", "");
    for (const d of [MORGEN, HEUTE]) { await page.evaluate((d) => { _calView = "tag"; _calDate = d; routeKalender(); }, d); await warte(page, 350); sicht["Kalender " + d] = await andereMarkerSichtbar(page, u, ALLE_PERSONEN); }
    await page.evaluate(() => { _calView = "woche"; routeKalender(); }); await warte(page, 350); sicht.Kalenderwoche = await andereMarkerSichtbar(page, u, ALLE_PERSONEN);
    for (const [k, v] of Object.entries(sicht)) if (v.length) f.push(k + " zeigt " + v.join(", "));
    const dbFremd = await page.evaluate(([eigeneId, ids]) => ({ s: DB.students.filter((s) => ids.includes(s.id) && s.id !== eigeneId).map((s) => s.name), l: DB.lessons.filter((l) => l.id.startsWith("t-") && !l.id.startsWith("t-" + eigeneId)).length }), [u.sid || "s-" + u.k, ALLE_PERSONEN.map((x) => x.sid || "s-" + x.k)]);
    const lFremd = await page.evaluate((k) => DB.lessons.filter((l) => /^t-/.test(l.id) && !l.id.startsWith("t-" + k + "-")).map((l) => l.id), u.k);
    if (dbFremd.s.length) f.push("DB.students enthält fremde: " + dbFremd.s.join(", ")); if (lFremd.length) f.push("DB.lessons enthält fremde: " + lFremd.join(", "));
    return f;
  });
  const abgewiesenVor = srv.abgewiesen.length;
  if (u.rolle !== "fahrschule_admin") await pruefe("A13", `${P} Zugriffsregeln (Attrappe = Spiegel von rechte-abzug.sql): Urlaub/Schichten/Fahrzeuge der Fahrschule lesbar; Schüler, Termine, Profile, Snapshots nur eigene; fremde Zeilen weder anlegbar noch änderbar`, async () => {
    const fr = u.k === "carl" ? FL[4] : FL[3];
    return page.evaluate(async ([ich, fid, fsid, ftermin]) => {
      const f = []; const s = getSupa();
      const n = async (t, sp) => { const r = await s.from(t).select(sp || "*"); return r.data || []; };
      if ((await n("fahrschule_urlaub")).length < 2) f.push("Urlaub der Fahrschule nicht lesbar");
      if ((await n("fahrschule_schichten")).length < 2) f.push("Schichtplan nicht lesbar");
      if ((await n("fahrschule_fahrzeuge")).length < 2) f.push("Fahrzeuge nicht lesbar");
      const pr = await n("profiles"); if (pr.length !== 1 || pr[0].id !== ich) f.push("Profile: " + pr.length + " sichtbar statt nur dem eigenen");
      const sc = (await n("schueler")).filter((x) => x.fahrlehrer_id !== ich); if (sc.length) f.push(sc.length + " fremde Schüler lesbar");
      const te = (await n("kalender_termine")).filter((x) => x.fahrlehrer_id !== ich); if (te.length) f.push(te.length + " fremde Termine lesbar");
      const sn = (await n("snapshots", "user_id")).filter((x) => x.user_id !== ich); if (sn.length) f.push("fremder Snapshot lesbar");
      let r = await s.from("schueler").upsert([{ id: fsid, fahrschule_id: "fs-muster", fahrlehrer_id: ich, name: "Übernommen Muster" }], { onConflict: "id" });
      if (!r.error) f.push("fremden Schüler an sich gerissen (upsert klappte)");
      r = await s.from("schueler").upsert([{ id: "s-x-" + ich, fahrschule_id: "fs-muster", fahrlehrer_id: fid, name: "Untergeschoben Muster" }], { onConflict: "id" });
      if (!r.error) f.push("Schüler für einen anderen Fahrlehrer angelegt");
      r = await s.from("kalender_termine").update({ status: "abgebrochen" }).eq("id", ftermin).select("id");
      if (r.data && r.data.length) f.push("fremden Termin geändert");
      return f;
    }, [u.id, fr.id, fr.sid, "t-" + fr.k + "-2"]);
  });
  srv.abgewiesen.length = abgewiesenVor; // die absichtlichen Versuche oben zählen nicht für „die App schreibt nur Eigenes“
  await pruefe("A11", `${P} Daten dieses Fahrlehrers in der Datenbank nur unter seiner ID (nichts fremdes angelegt)`, () => {
    const f = [];
    for (const t of ["schueler", "kalender_termine"]) tab[t].filter((r) => r.fahrschule_id === FS && r.fahrlehrer_id !== u.id && (r.name === name || (r.id || "").includes(u.k + "-neu"))).forEach((r) => f.push(t + " " + r.id));
    return f;
  });
}

/* ============================================================ Phase A: die 8 Konten mit App in EINEM Browser (= ein Handy) ============================================================ */
datenbankBauen();
const KONTEXT_RESTE = [];
if (!process.env.W18_NUR || /A/.test(process.env.W18_NUR)) {
  const { ctx, page } = await neuerKontext(360, 780);
  let davor = null; const chain = process.env.W18_USER_MAX ? MIT_APP.slice(0, +process.env.W18_USER_MAX) : MIT_APP;
  for (const u of chain) {
    page.__wo = u.k;
    await pruefe("A0", `[${u.name.slice(0, 22)}] Anmeldung über die Maske (E-Mail/Passwort) bis zur fertigen App`, async () => {
      await anmelden(page, u); return null;
    });
    // Reste des vorigen Kontos: nach dem Abmelden von A und jetzt nach dem Anmelden von B
    if (davor) await pruefe("R1", `[${davor.name.slice(0, 22)} → ${u.name.slice(0, 22)}] nach dem Anmelden des Nächsten: nichts vom Vorgänger auf dem Gerät (Speicher, IndexedDB, Cache, Seite)`, async () => {
      const dump = await geraeteDump(page); return reste(dump, fl2(davor)).map((x) => x);
    });
    await arbeitstag(page, u, davor, ["anna", "annm", "berta", "lena"].includes(u.k)); // tiefe Schritte (verschieben, abschließen, Fahrcheck) für B, BE, CE und die Leitung
    // Die Fahrlehrer-Filterung im Schüler-Überblick merkt sich einen Fahrlehrer-NAMEN im Gerät (schueler-ueberblick.js SORT_KEY). Hier wird so ein Wert
    // eines Kollegen eingesetzt (die Attrappe kann den Überblick nicht liefern) – nach dem Abmelden darf er nicht bleiben.
    if (u.k === "anna") await page.evaluate(() => localStorage.setItem("kompass-su-sort-v1", JSON.stringify({ sort: "fahrlehrer", fl: "Carl Muster" })));
    await pruefe("A12", `[${u.name.slice(0, 22)}] Abmelden (Menü unten): Sicherung klappt (keine „nicht gesichert“-Frage), Anmeldemaske kommt`, async () => {
      const dl = await abmelden(page).then((d) => d.filter((x) => !/^Wirklich abmelden\?/.test(x))); return dl.length ? "unerwartete Rückfrage (Sicherung gescheitert?): " + dl.join(" | ") : null;
    });
    await pruefe("R0", `[${u.name.slice(0, 22)}] nach dem Abmelden: nichts von diesem Konto mehr auf dem Gerät (Speicher, IndexedDB, Cache, Seite)`, async () => {
      const dump = await geraeteDump(page); return reste(dump, fl2(u));
    });
    if (u.k === "anna") await pruefe("R2", `[${u.name.slice(0, 22)}] nach dem Abmelden: Filter-Merker „kompass-su-sort-v1“ (Kollegen-Name) ist weg`, () => page.evaluate(() => { const v = localStorage.getItem("kompass-su-sort-v1"); return v && /Carl Muster/.test(v) ? "bleibt auf dem Gerät: " + v : null; }));
    if (u.k === "anna") await page.evaluate(() => localStorage.removeItem("kompass-su-sort-v1")); // aufräumen, damit die nächsten Prüfungen nicht denselben Rest noch einmal melden
    davor = u;
  }
  await ctx.close();
}

/* ============================================================ Phase B: Leitung und Super-Admin sehen alle (Gesamtansicht) ============================================================ */
// Layout in einer Ansicht: nichts waagerecht wischbar, nichts über dem Rand, kein Namens-Text still abgeschnitten
async function layoutMessen(page) {
  return page.evaluate((namen) => {
    const f = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) f.push("Seite seitlich wischbar (" + de.scrollWidth + " > " + de.clientWidth + ")");
    const v = document.getElementById("view");
    if (v && v.scrollWidth > v.clientWidth + 1) f.push("Inhalt breiter als das Fenster (" + v.scrollWidth + " > " + v.clientWidth + ")");
    const w = de.clientWidth;
    const bez = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "");
    const imScroll = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true; } return false; };
    const unsichtbar = (el) => !!el.closest("#drawer, #sheet:not(.open), #fsCalTiles, #toast, #loginOverlay, #splash, [hidden], dialog:not([open]), select, option, svg");
    const draussen = [], abgeschnitten = [], kachel = [];
    const wortRe = namen.map((n) => new RegExp("(^|[^A-Za-zÄÖÜäöüß])" + n.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-zÄÖÜäöüß]|$)"));
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none" || unsichtbar(el)) continue;
      if (cs.position !== "fixed" && !imScroll(el) && (r.right > w + 1 || r.left < -1)) draussen.push(bez(el) + " (" + Math.round(r.left) + ".." + Math.round(r.right) + ")");
      // Namens-Text: still abgeschnitten (Rand ohne Auslassungspunkte oder mit …), wenn ein Fahrlehrername darin steht
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && /^(hidden|clip)$/.test(cs.overflowX) && !el.closest("select")) {
        const t = (el.textContent || "").trim();
        if (wortRe.some((re) => re.test(t))) (/(^|\s)(cw-fl|ct-fl)(\s|$)/.test(el.className) ? kachel : abgeschnitten).push(bez(el) + " „" + t.slice(0, 40) + "“");
      }
    }
    if (draussen.length) f.push("über dem Rand: " + [...new Set(draussen)].slice(0, 4).join(", "));
    if (abgeschnitten.length) f.push("Name abgeschnitten: " + [...new Set(abgeschnitten)].slice(0, 4).join(", "));
    if (kachel.length) f.push("KACHEL:Fahrlehrer-Name in der Kalender-Kachel abgeschnitten: " + [...new Set(kachel)].slice(0, 3).join(", "));
    return f;
  }, FL.map((x) => x.name));
}
async function zurGesamtansicht(page, u) {
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} routeSettings(); }); await warte(page, 400);
  await page.click('#ksStartKasten [data-ks-start="gesamt"]', { timeout: 5000 });
  await page.waitForFunction(() => !!_fsAgg && _fsAgg.lehrer && _fsAgg.lehrer.length > 0, null, { timeout: 15000 });
  await warte(page, 600);
}
const alleNamenInText = (txt, personen) => personen.filter((p) => !new RegExp(esc(p.name) + "(?![A-Za-zÄÖÜäöüß])").test(txt)).map((p) => p.name);
const ZEHN = FL;
async function gesamtPhase(u, rolleText, kurz) {
  const { ctx, page } = await neuerKontext(360, 780);
  page.__wo = "gesamt-" + u.k;
  const P = `[${rolleText}]`;
  await pruefe("G0", `${P} Anmeldung (Maske) und Startansicht eigene Ansicht`, async () => {
    await anmelden(page, u);
    if (await page.evaluate(() => !!document.getElementById("agbGate"))) { const f = await agbBestaetigen(page, u); if (f.length) return f; }
    return page.evaluate(() => (_fsAgg ? "startet in der Gesamtansicht" : null));
  });
  await pruefe("G1", `${P} Startseite „Fahrschule“ in den Einstellungen antippen → Gesamtansicht`, async () => { await zurGesamtansicht(page, u); });
  if (!(await page.evaluate(() => !!_fsAgg))) { await ctx.close(); return; }
  // Alles, was die Gesamtansicht zeigt, in einer Liste: dieselbe Liste dient dem Inhalts- und dem Handy-Test
  const ANS = [
    ["Übersicht", () => page.evaluate(() => { routeFahrschuleDashboard(); })],
    ["Fahrlehrer-Liste", () => page.evaluate(() => routeFahrschuleLehrer())],
    ["Schüler", () => page.evaluate(() => tabGo("schueler"))],
    ["Kalender (Tag)", () => page.evaluate(([d, ids]) => { _fsCalLehrerFilter = ids.slice(); _calView = "tag"; _calDate = d; routeKalender(); }, [MORGEN, FL.map((x) => x.id)])],
    ["Kalender (Woche)", () => page.evaluate(([d, ids]) => { _fsCalLehrerFilter = ids.slice(); _calView = "woche"; _calDate = d; routeKalender(); }, [MORGEN, FL.map((x) => x.id)])],
    ["Kalender-Filter", async () => { await page.evaluate(() => { _fsCalLehrerFilter = []; _calView = "woche"; routeKalender(); _fsOpenFilterPanel(); }); }],
    ["Schichtplan", () => page.evaluate(() => routeFahrschuleSchichtplan())],
    ["Urlaub", () => page.evaluate(() => routeFahrschuleUrlaub())],
    ["Urlaub eintragen", async () => { await page.evaluate(() => { routeFahrschuleUrlaub(); }); await warte(page, 500); await page.evaluate(() => fsUrlaubHinzufuegen()); }],
    ["Statistik", () => page.evaluate(() => routeFahrschuleStatistik())],
    ["Fahrzeuge", () => page.evaluate(() => routeFahrschuleFahrzeuge())],
  ];
  const oeffne = async (a) => { await page.evaluate(() => { try { closeSheet(); } catch (e) {} try { _fsCloseFilterPanel(); } catch (e) {} }); await a[1](); await warte(page, 700); };
  // Inhalte
  await pruefe("G2", `${P} Fahrlehrer-Liste der Gesamtansicht: alle 10 (beide Annas mit vollem Namen, ohne-App-Fahrlehrer auch)`, async () => {
    const f = [];
    const l = await page.evaluate(() => _fsAgg.lehrer.map((x) => ({ id: x.id, name: x.name })));
    ZEHN.forEach((x) => { if (!l.some((y) => y.id === x.id && y.name === x.name)) f.push("fehlt in _fsAgg.lehrer: " + x.name); });
    const namen = l.map((x) => x.name); if (new Set(namen).size !== namen.length) f.push("doppelte Namen in der Liste");
    await oeffne(ANS[1]); const t = await textSeite(page);
    const fehlt = alleNamenInText(t, ZEHN); if (fehlt.length) f.push("Liste zeigt nicht: " + fehlt.join(", "));
    return f;
  });
  await pruefe("G3", `${P} Schülerliste: alle Schüler der 10 Fahrlehrer (auch die der Fahrlehrer ohne App) sind da`, async () => {
    await oeffne(ANS[2]);
    let t = await textSeite(page); const f = [];
    // lange Liste: bis zum Ende scrollen
    await page.evaluate(async () => { for (let i = 0; i < 12; i++) { view.scrollTop = view.scrollHeight; await new Promise((r) => setTimeout(r, 60)); } });
    t = await textSeite(page);
    const erwartet = tab.schueler.filter((s) => s.status === "aktiv").map((s) => s.name);
    erwartet.forEach((n) => { if (!t.includes(n)) f.push("fehlt: " + n); });
    return f.slice(0, 5).concat(f.length > 5 ? ["… " + f.length + " fehlen"] : []);
  });
  if (!kurz) await pruefe("G4", `${P} Kalender-Filter (Oberfläche): beide Annas einzeln wählbar, jeder zeigt nur seine Termine`, async () => {
    const f = [];
    await page.evaluate(() => { _fsCalLehrerFilter = []; _fsCalFahrzeugFilter = []; });
    await page.evaluate((d) => { _calView = "tag"; _calDate = d; routeKalender(); _fsOpenFilterPanel(); }, MORGEN); await warte(page, 500);
    const namen = await page.evaluate(() => [...document.querySelectorAll("#fsFilterDrawer .fs-check-row span")].map((x) => x.textContent.trim()));
    const sollFl = ZEHN.map((x) => x.name);
    sollFl.forEach((n) => { if (!namen.includes(n)) f.push("Filter zeigt nicht: " + n); });
    if (new Set(namen).size !== namen.length) f.push("Filter: gleiche Beschriftung doppelt");
    for (const x of [FL[0], FL[1]]) {
      await page.evaluate((id) => { _fsCalLehrerFilter = []; routeKalender(); _fsOpenFilterPanel(); }, x.id); await warte(page, 300);
      await page.locator(`#fsFilterDrawer [data-fslehrer="${x.id}"]`).check({ timeout: 4000 }); await warte(page, 500);
      const t = await page.evaluate(() => document.getElementById("calBody") ? document.getElementById("calBody").innerText : view.innerText);
      const ids = await page.evaluate(() => [...document.querySelectorAll('[data-evedit^="lesson|"]')].map((e) => e.dataset.evedit.split("|")[1]));
      const fremd = ids.filter((id) => !id.startsWith("t-" + x.k + "-") && !/^[a-z0-9]/.test("") && tab.kalender_termine.some((tt) => tt.id === id && tt.fahrlehrer_id !== x.id));
      if (!ids.length) f.push(x.name + ": keine Termine im Filter"); if (fremd.length) f.push(x.name + ": Filter zeigt fremde Termine " + fremd.join(","));
    }
    return f;
  });
  if (!kurz) await pruefe("G5", `${P} Kalender, alle 10 Fahrlehrer gewählt: jede Stunde von morgen ist zu sehen`, async () => {
    await oeffne(ANS[3]);
    const dom = await page.evaluate(() => [...document.querySelectorAll('[data-evedit^="lesson|"]')].map((e) => e.dataset.evedit.split("|")[1]));
    const soll = tab.kalender_termine.filter((t) => t.datum === MORGEN && !t.geloescht && FL.some((x) => x.id === t.fahrlehrer_id)).map((t) => t.id);
    const fehlt = soll.filter((id) => !dom.includes(id));
    return fehlt.length ? "fehlen im Tageskalender: " + fehlt.join(", ") : null;
  });
  if (!kurz) await pruefe("G6", `${P} Kalender-Kacheln: die beiden Annas sind in der Kachel unterscheidbar (nicht nur „Anna“)`, async () => {
    await oeffne(ANS[3]);
    const tag = await page.evaluate(() => { const g = (id) => { const e = document.querySelector(`[data-evedit^="lesson|${id}|"]`); if (!e) return null; const n = e.querySelector(".ct-fl, .cw-fl"); return n ? n.textContent.trim() : e.innerText.replace(/\s+/g, " ").trim(); }; return [g("t-anna-2"), g("t-annm-2")]; });
    if (!tag[0] || !tag[1]) return "Kachel nicht gefunden " + JSON.stringify(tag);
    return tag[0] === tag[1] ? "beide Kacheln zeigen dieselbe Fahrlehrer-Beschriftung „" + tag[0] + "“ (nur Vorname, index.html _fsFlVorname)" : null;
  });
  if (!kurz) await pruefe("G7", `${P} Kalenderfarben: bei 10+ Fahrlehrern bekommt jeder eine eigene Farbe`, async () => {
    const farben = await page.evaluate((ids) => ids.map((id) => _fsKalFarbeFuer(id, _fsAgg.lehrer)), ZEHN.map((x) => x.id));
    const doppelt = farben.map((c, i) => [c, i]).filter(([c, i]) => farben.indexOf(c) !== i).map(([c, i]) => ZEHN[i].name.split(" ")[0] + "=" + ZEHN[farben.indexOf(c)].name.split(" ")[0] + " (" + c + ")");
    return doppelt.length ? "gleiche Farbe: " + doppelt.join(", ") : null;
  });
  if (!kurz) await pruefe("G8", `${P} Schichtplan und Urlaub nennen die Fahrlehrer mit vollem Namen`, async () => {
    const f = [];
    await oeffne(ANS[6]); let t = await textSeite(page);
    if (!t.includes("Anna Mustermann")) f.push("Schichtplan: „Anna Mustermann“ fehlt"); if (!t.includes(FL[6].name)) f.push("Schichtplan: langer Name fehlt");
    await oeffne(ANS[7]); t = await textSeite(page);
    if (!t.includes("Berta Beispiel Muster")) f.push("Urlaub: Berta fehlt"); if (!t.includes(FL[6].name)) f.push("Urlaub: langer Name fehlt");
    return f;
  });
  await pruefe("G9", `${P} Urlaub eintragen: Auswahl hat alle 10 (auch ohne App), Eintrag mit Fahrlehrer-ID in der Datenbank`, async () => {
    const f = [];
    await oeffne(ANS[8]);
    const opt = await page.evaluate(() => [...document.querySelectorAll("#urWer option")].map((o) => ({ v: o.value, t: o.textContent.trim() })));
    ZEHN.forEach((x) => { const o = opt.find((y) => y.v === x.id); if (!o) f.push("Auswahl ohne " + x.name); else if (o.t !== x.name) f.push("Auswahl „" + o.t + "“ statt „" + x.name + "“"); });
    await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "u-fritz"; w.dispatchEvent(new Event("change")); }); // Fahrlehrer ohne App
    const von = await page.$("#urVon"); if (von) { await page.fill("#urVon", addTage(HEUTE, 20)); await page.fill("#urBis", addTage(HEUTE, 21)); }
    await page.click("#urSpeichern"); await warte(page, 700);
    const z = tab.fahrschule_urlaub.find((r) => r.fahrlehrer_id === "u-fritz");
    if (!z) f.push("Urlaub für Fritz nicht in der Datenbank"); else if (z.mitarbeiter_name !== FL[7].name) f.push("Name im Urlaub „" + z.mitarbeiter_name + "“");
    return f;
  });
  if (!kurz) await pruefe("G10", `${P} Statistik nennt die Fahrlehrer; Fahrzeuge zeigt beide Autos`, async () => {
    const f = [];
    await oeffne(ANS[9]); let t = await textSeite(page);
    const fehlt = alleNamenInText(t, ZEHN.filter((x) => tab.kalender_pruefungen.some((e) => e.fahrlehrer_id === x.id))); if (fehlt.length) f.push("Statistik: " + fehlt.join(", "));
    await oeffne(ANS[10]); t = await textSeite(page);
    if (!t.includes(FZ1) || !t.includes(FZ2)) f.push("Fahrzeuge: " + FZ1 + "/" + FZ2 + " fehlen");
    return f;
  });
  if (!kurz) await pruefe("G11", `${P} Fahrlehrer-Auswahl in der Schülerakte: alle 10 mit vollem Namen, Zuweisen an einen Fahrlehrer ohne App wird gespeichert`, async () => {
    const f = [];
    const sid = "s-gerda";
    await page.evaluate((id) => { _fsCalLehrerFilter = []; routeDetail(id); }, sid); await warte(page, 900);
    const opt = await page.evaluate(() => [...document.querySelectorAll("#fsDetailLehrerSelect option")].map((o) => ({ v: o.value, t: o.textContent.trim() })));
    if (!opt.length) return "Auswahlfeld „Fahrlehrer“ fehlt in der Akte";
    ZEHN.forEach((x) => { const o = opt.find((y) => y.v === x.id); if (!o) f.push("Auswahl ohne " + x.name); else if (o.t !== x.name) f.push("„" + o.t + "“ statt „" + x.name + "“"); });
    const texte = opt.map((o) => o.t); if (new Set(texte).size !== texte.length) f.push("zwei Einträge mit gleicher Beschriftung");
    await page.selectOption("#fsDetailLehrerSelect", "u-hans"); await warte(page, 1200);
    const z = tab.schueler.find((s) => s.id === sid);
    if (!z || z.fahrlehrer_id !== "u-hans") f.push("Zuweisung nicht in der Datenbank (fahrlehrer_id = " + (z && z.fahrlehrer_id) + ")");
    return f;
  });
  await pruefe("G12", `${P} Doppelbelegung: zwei Fahrlehrer, gleiches Auto, gleiche Zeit wird erkannt (und ohne Überschneidung nicht)`, async () => {
    const f = [];
    const k = await page.evaluate(([a, b, c]) => ({ anna: _fsFahrzeugKonflikt(a[0], a[1], a[2], a[3]), carl: _fsFahrzeugKonflikt(b[0], b[1], b[2], b[3]), keiner: _fsFahrzeugKonflikt(c[0], c[1], c[2], c[3]) }),
      [["t-anna-2", MORGEN, "11:00", FZ1], ["t-carl-2", MORGEN, "11:00", FZ1], ["t-anna-2", MORGEN, "11:00", FZ2]]);
    if (k.anna !== "Carl Muster") f.push("bei Anna erkannt: " + k.anna); if (k.carl !== "Anna Muster") f.push("bei Carl erkannt: " + k.carl); if (k.keiner) f.push("falscher Alarm bei anderem Auto: " + k.keiner);
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} openEventSheet("lesson", "t-anna-2", "s-anna"); }); await warte(page, 400);
    await page.click("#esEdit"); await warte(page, 400);
    const t = await page.evaluate(() => document.getElementById("sheet").innerText);
    if (!/schon bei Carl Muster/.test(t)) f.push("Bearbeiten-Fenster warnt nicht („schon bei Carl Muster“)");
    await page.evaluate(() => closeSheet());
    return f;
  });
  if (!kurz) await pruefe("G13", `${P} die Termine, die die Fahrlehrer in der App angelegt haben, sind in der Gesamtansicht (mit richtigem Fahrer)`, async () => {
    const f = [];
    const eig = tab.kalender_termine.filter((t) => /^s[a-z0-9]{6,}$/.test(t.id) || (!t.id.startsWith("t-") && FL.concat([LEITUNG]).some((x) => x.id === t.fahrlehrer_id)));
    if (!eig.length) return "keine in der App angelegten Termine in der Datenbank (Phase A übersprungen?)";
    const dom = await page.evaluate(() => DB.lessons.filter((l) => !l._synthetic).map((l) => ({ id: l.id, f: l._fahrlehrerId })));
    eig.forEach((t) => { const d = dom.find((x) => x.id === t.id); if (!d) f.push("fehlt: " + t.id.slice(0, 8)); else if (d.f !== t.fahrlehrer_id) f.push("falscher Fahrer " + d.f); });
    return f.slice(0, 5);
  });
  // Handy: alle Ansichten bei 360×780 hoch und 740×360 quer
  for (const g of [{ n: "360×780 hoch", w: 360, h: 780 }, { n: "740×360 quer", w: 740, h: 360 }]) {
    await page.setViewportSize({ width: g.w, height: g.h }); await warte(page, 400);
    const probl = [], kachelProbl = [];
    for (const a of (kurz ? ANS.filter((x) => ["Übersicht", "Kalender (Tag)", "Urlaub eintragen"].includes(x[0])) : ANS)) {
      await oeffne(a);
      const m = await layoutMessen(page); m.forEach((x) => (x.startsWith("KACHEL:") ? kachelProbl : probl).push(a[0] + ": " + x.replace("KACHEL:", "")));
      await page.evaluate(() => { try { _fsCloseFilterPanel(); closeSheet(); } catch (e) {} });
    }
    await pruefe("L1", `${P} ${g.n}: mit 10 Namen (auch dem langen) nichts seitlich wischbar, nichts über dem Rand, kein Name abgeschnitten (${kurz ? 3 : ANS.length} Ansichten)`, () => probl);
    await pruefe("L2", `${P} ${g.n}: Fahrlehrer-Name in den Kalender-Kacheln (Wochenansicht) wird nicht abgeschnitten`, () => kachelProbl);
  }
  await ctx.close();
}
if (!process.env.W18_NUR || /B/.test(process.env.W18_NUR)) {
  await gesamtPhase(LEITUNG, "Leitung fährt selbst", false);
  await gesamtPhase(SUPER, "Super-Admin", true);
}

/* ============================================================ Phase C: Büro-Seite (buero.html) mit derselben Besetzung ============================================================ */
const BFS = "fs-test-1"; // Fahrschul-ID der vorhandenen Büro-Attrappe (buero-vorfuehrung.js)
const buero_fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
function bueroDaten() {
  const d = bauDaten(HEUTE);
  const um = (rows) => C(rows).map((r) => { if (r.fahrschule_id) r.fahrschule_id = BFS; return r; });
  const T = d.tabellen;
  T.profiles = um(tab.profiles).map((p) => Object.assign(p, { agb_akzeptiert_version: "1.0" }));
  T.schueler = um(tab.schueler).map((s) => Object.assign(s, { hat_simulator: false, hat_theorie_app: false, paket_id: null, ausbildungsart: "ersterwerb", klasse: null, vertrag_am: null }));
  T.kalender_termine = um(tab.kalender_termine); T.kalender_pruefungen = []; T.pruefungstermine = [];
  T.fahrschule_urlaub = um(tab.fahrschule_urlaub); T.fahrschule_schichten = um(tab.fahrschule_schichten); T.fahrschule_fahrzeuge = um(tab.fahrschule_fahrzeuge);
  T.fahrschule_empfehlungen = []; T.provisionen = []; T.theorie_teilnahme = [];
  d.konten = [{ id: BUERO.id, email: BUERO.email, password: PW }, { id: LEITUNG.id, email: LEITUNG.email, password: PW }, { id: SUPER.id, email: SUPER.email, password: PW }];
  return d;
}
async function bueroOeffnen(nutzer, breite, hash, wer) {
  const d = bueroDaten();
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  page.__wo = "buero";
  page.on("pageerror", (e) => fehlerSammler.push({ wo: "buero-" + nutzer.k, text: e.message }));
  page.on("dialog", (dl) => dl.accept().catch(() => {}));
  await page.route(/^http:\/\/127\.0\.0\.1:\d+\//, (r) => r.continue());
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: buero_fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([dd, sess]) => { window.__FAKE = { tabellen: dd.tabellen, konten: dd.konten, session: sess }; }, [d, { user: { id: nutzer.id, email: nutzer.email } }]);
  await page.goto(basis + "buero.html" + (hash || "#team")); await warte(page, 700);
  if (wer) { const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null); if (frage) { await page.click(`#werListe button:has-text("${wer}")`); await page.keyboard.type("7352", { delay: 20 }); await warte(page, 300); } }
  return { ctx, page };
}
const bueroSeite = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await warte(page, 800); return page.evaluate(() => (document.querySelector("main") || document.body).innerText); };
async function bueroPhase(nutzer, text, breiten) {
  const P = `[${text}]`;
  const { ctx, page } = await bueroOeffnen(nutzer, breiten[0], "#team", nutzer.rolle === "buero" ? "Paula Muster" : null);
  const nameDa = (t) => ZEHN.filter((x) => !new RegExp(esc(x.name) + "(?![A-Za-zÄÖÜäöüß])").test(t)).map((x) => x.name);
  await pruefe("C1", `${P} Fahrlehrer & Büro: alle 10 Namen, genau 3 mit „ohne App“`, async () => {
    const f = []; const t = await bueroSeite(page, "#team");
    const fehlt = nameDa(t); if (fehlt.length) f.push("fehlen: " + fehlt.join(", "));
    const ohne = (t.match(/ohne App/g) || []).length;
    // jede ohne-App-Zeile nennt „ohne App“ (Unterzeile) und die Zugangsspalte „ohne App“: 3 Fahrlehrer × 2
    const zeilen = await page.evaluate(() => [...document.querySelectorAll("table tbody tr")].filter((r) => /ohne App/.test(r.innerText)).map((r) => r.innerText.split("\n")[0].trim()));
    const soll = FL.filter((x) => !x.app).map((x) => x.name).sort();
    if (JSON.stringify(zeilen.slice().sort()) !== JSON.stringify(soll)) f.push("ohne App: " + zeilen.join(", ") + " statt " + soll.join(", "));
    return f;
  });
  await pruefe("C2", `${P} Kalender (morgen): alle 10 Fahrlehrer als Spalte, jede Stunde sichtbar`, async () => {
    const f = []; const t = await bueroSeite(page, "#kalender?tag=" + MORGEN);
    const fehlt = nameDa(t); if (fehlt.length) f.push("Spalten fehlen: " + fehlt.join(", "));
    FL.forEach((x) => { if (!t.includes(x.sch)) f.push("Stunde von " + x.name.split(" ")[0] + " fehlt (" + x.sch + ")"); });
    return f.slice(0, 5);
  });
  await pruefe("C3", `${P} Schüler-Liste: alle 10 Schüler, Fahrlehrer der ohne-App-Fahrlehrer sichtbar`, async () => {
    const f = []; const t = await bueroSeite(page, "#schueler");
    FL.forEach((x) => { if (!t.includes(x.sch)) f.push("fehlt: " + x.sch); });
    return f;
  });
  await pruefe("C4", `${P} Termin anlegen (Büro): Fahrlehrer-Auswahl hat alle 10 mit vollem Namen, auch die ohne App`, async () => {
    const f = []; await bueroSeite(page, "#kalender?tag=" + MORGEN);
    const knopf = await page.$("text=+ Termin"); if (!knopf) return "Knopf „+ Termin“ fehlt";
    await knopf.click(); await warte(page, 600);
    const opt = await page.evaluate(() => { const dl = document.querySelector("dialog[open]"); if (!dl) return null; return [...dl.querySelectorAll("select option")].map((o) => o.textContent.trim()); });
    if (!opt) return "Termin-Fenster geht nicht auf";
    FL.forEach((x) => { if (!opt.includes(x.name)) f.push("Auswahl ohne " + x.name); });
    const gleich = opt.filter((o, i) => opt.indexOf(o) !== i); if (gleich.length) f.push("doppelt: " + gleich.join(", "));
    await page.keyboard.press("Escape"); await warte(page, 300);
    return f;
  });
  await pruefe("C5", `${P} Urlaub und Schichtplan nennen die Fahrlehrer mit vollem Namen (auch den langen)`, async () => {
    const f = [];
    let t = await bueroSeite(page, "#urlaub");
    if (!t.includes("Berta Beispiel Muster")) f.push("Urlaub: Berta fehlt"); if (!t.includes(FL[6].name)) f.push("Urlaub: langer Name fehlt");
    t = await bueroSeite(page, "#schichtplan");
    if (!t.includes("Anna Mustermann")) f.push("Schichtplan: Anna Mustermann fehlt"); if (!t.includes(FL[6].name)) f.push("Schichtplan: langer Name fehlt");
    return f;
  });
  await pruefe("C6", `${P} Fahrzeuge: Doppelbelegung (Anna und Carl, gleiches Auto, gleiche Zeit) wird erkannt und mit beiden Namen gemeldet`, async () => {
    const f = []; const t = await bueroSeite(page, "#flotte");
    const n = await page.evaluate(() => fahrzeugKonflikte().length);
    if (n < 1) f.push("keine Doppelbelegung erkannt (fahrzeugKonflikte() = " + n + ")");
    if (!/Anna Muster(?!mann)/.test(t) || !/Carl Muster/.test(t)) f.push("Seite nennt nicht beide Fahrlehrer");
    const nav = await page.evaluate(() => (document.querySelector('nav a[href="#flotte"] .zahl') || {}).textContent || "");
    if (!nav) f.push("keine Zahl am Menüpunkt „Fahrzeuge“");
    return f;
  });
  await pruefe("C7", `${P} Statistik (#zahlen) und Verkäufe & Provision laden und sind nicht leer`, async () => {
    const t = await bueroSeite(page, "#zahlen"); const f = [];
    if (t.trim().length < 50) f.push("Statistik leer");
    const t2 = await bueroSeite(page, "#verkaeufe"); if (t2.trim().length < 20) f.push("Verkäufe & Provision leer");
    return f;
  });
  // Breite: 10 Spalten im Tageskalender, Team, Fahrzeuge
  for (const b of breiten) {
    await page.setViewportSize({ width: b, height: 860 }); await warte(page, 300);
    const probl = [];
    for (const h of ["#team", "#kalender?tag=" + MORGEN, "#kalender?ansicht=woche&tag=" + MORGEN, "#schueler", "#urlaub", "#schichtplan", "#flotte"]) {
      await bueroSeite(page, h);
      const r = await page.evaluate(() => { const de = document.documentElement; const w = de.clientWidth; const f = []; if (de.scrollWidth > w + 1) f.push("seitlich wischbar (" + de.scrollWidth + " > " + w + ")");
        const draussen = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width === 0 || cs.position === "fixed" || cs.visibility === "hidden") return false; if (e.closest("dialog:not([open]), [hidden], .k-gitter, .tabelle-wisch, table")) return false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; } return r.right > w + 1; }).slice(0, 3).map((e) => e.tagName + "." + String(e.className).split(" ")[0]);
        if (draussen.length) f.push("über dem Rand: " + draussen.join(", ")); return f; });
      r.forEach((x) => probl.push(h.split("?")[0] + ": " + x));
    }
    await pruefe("C8", `${P} ${b} px breit: mit 10 Fahrlehrern nichts seitlich wischbar, nichts über dem Rand`, () => probl);
  }
  await ctx.close();
}
if (!process.env.W18_NUR || /C/.test(process.env.W18_NUR)) {
  await bueroPhase(BUERO, "Büro", [1366, 1024]);
  await bueroPhase(LEITUNG, "Leitung (Büro-Seite)", [1366]);
}

/* ============================================================ Schluss: JS-Fehler und abgewiesene Zugriffe aller Schritte ============================================================ */
await pruefe("J1", "keine JS-Fehler (pageerror) in allen Schritten", () => [...new Set(fehlerSammler.map((x) => x.wo + ": " + x.text.slice(0, 120)))].slice(0, 6));
if (!GEGENPROBE) await pruefe("J2", "die Datenbank hat keinen Schreibzugriff wegen fehlender Rechte abgewiesen (die App schreibt nur Eigenes)", () => [...new Set(srv.abgewiesen)].slice(0, 6));
if (srv.unbekanntGeschrieben.length) console.log("Hinweis: Schreibzugriffe auf nicht nachgebildete Tabellen (nur Attrappe, nicht geprüft): " + [...new Set(srv.unbekanntGeschrieben)].join(", "));
await browser.close(); server.close();
console.log(`\nok ${okZahl}, FEHLER ${fehlerZahl}, Laufzeit ${Math.round((Date.now() - T0) / 1000)} s`);
process.exit(fehlerZahl ? 1 : 0);
