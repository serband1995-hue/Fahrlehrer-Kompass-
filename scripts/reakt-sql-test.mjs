// W15: Prüft die Reaktivierungs-Sperre der Datenbank in einem echten Postgres (PGlite, läuft in Node, ohne Netz).
// Spielt K8 (Sperre), K9 (Preisliste) und W15 (entfällt = keine Sperre) gegen eine kleine Attrappe des Schemas ein und
// vergleicht den Server mit kompass-rechnen.js (Büro und App): gleiche Sperre, gleiche Regel (reakt_regel), Rückweg, zweimal einspielbar.
// Aufruf: NODE_PATH=$(npm root -g) node scripts/reakt-sql-test.mjs   (braucht npm i -g @electric-sql/pglite@0.2.17)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KR = require(join(ROOT, "kompass-rechnen.js"));
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i -g @electric-sql/pglite@0.2.17 und mit NODE_PATH=$(npm root -g) starten.");
  process.exit(1);
}
const sql = (name) => readFileSync(join(ROOT, "supabase", name), "utf8");

let faelle = 0, fehler = 0;
// Schlüssel sortiert vergleichen (jsonb ordnet Schlüssel anders als JavaScript)
const fest = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((q) => [q, v[q]])) : v));
function gleich(name, erwartet, ist) {
  faelle++;
  const a = fest(erwartet), b = fest(ist);
  if (a !== b) { fehler++; console.log("ABWEICHUNG " + name + "\n  erwartet: " + a + "\n  ist:      " + b); }
}

const db = new PGlite();
const FS = "11111111-1111-4111-8111-111111111111", FS2 = "22222222-2222-4222-8222-222222222222";
const BUERO = "aaaaaaaa-0000-4000-8000-000000000001", FREMD = "aaaaaaaa-0000-4000-8000-000000000002", SA = "aaaaaaaa-0000-4000-8000-000000000003";

// ---------- Attrappe: nur was K8, K9 und W15 brauchen ----------
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table public.fahrschulen (id uuid primary key, name text);
  create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true, email text);
  create table public.fahrschule_pakete (id uuid primary key default gen_random_uuid(), fahrschule_id uuid);
  create table public.schueler (id text primary key, fahrschule_id uuid, name text not null, telefon text, email text, ausbildung jsonb,
    status text default 'aktiv', reakt_status text default 'pruefen', reakt_bezahlt_bis date, vertrag_am date, inaktiv_seit date);
  create table public.kalender_termine (id text primary key, schueler_id text, datum date, art text, geloescht boolean default false, geloescht_am timestamptz);
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select null::text $$;
  create or replace function public.k5_meine_fahrschule() returns uuid language sql stable security definer set search_path to 'public' as $$
    select p.fahrschule_id from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true) and coalesce(p.rolle, '') not in ('entfernt', '') $$;
  insert into public.fahrschulen values ('${FS}', 'Fahrschule Muster'), ('${FS2}', 'Andere Muster');
  insert into public.profiles values ('${BUERO}', '${FS}', 'buero', true, null), ('${FREMD}', '${FS2}', 'fahrlehrer', true, null), ('${SA}', null, 'super_admin', true, null);
`);
await db.exec(sql("migrations/20261123_k8_01_zahlung_sperre.sql"));
await db.exec(sql("migrations/20261123_k9_01_preisliste.sql"));
// Zeiten der Preise selbst setzen (der Schutz-Trigger stempelt sonst „jetzt“ und verbietet Vergangenheit)
await db.exec("alter table public.fahrschule_preise disable trigger fahrschule_preise_schutz");
const W15 = sql("migrations/20261126_w15_01_reakt_entfaellt.sql");
const RUECK = sql("rueckweg/20261126_w15_01_rueckweg.sql");

const heute = (await db.query("select (now() at time zone 'Europe/Berlin')::date::text as d")).rows[0].d;
const tag = (n) => KR.addDaysISO(heute, n);
const monate = (n) => KR.addMonthsISO(heute, n);

async function preiseSetzen(fs, zeilen) {
  await db.query("delete from public.fahrschule_preise where fahrschule_id = $1", [fs]);
  for (const z of zeilen) {
    await db.query("insert into public.fahrschule_preise (fahrschule_id, art, klasse, bezeichnung, einheit, betrag_cent, gueltig_ab, angelegt_am) values ($1,$2,$3,$4,'pauschal',$5,$6,$7)",
      [fs, z.art || "reaktivierung", z.klasse || null, z.bezeichnung || "Reaktivierung", z.betrag_cent, z.gueltig_ab, z.angelegt_am || z.gueltig_ab + "T10:00:00Z"]);
  }
}
async function preiseLesen(fs) {
  return (await db.query("select art, klasse, betrag_cent, gueltig_ab::text as gueltig_ab, angelegt_am::text as angelegt_am, id::text as id from public.fahrschule_preise where fahrschule_id = $1", [fs])).rows
    .map((r) => Object.assign(r, { angelegt_am: new Date(r.angelegt_am).toISOString() }));
}
async function schuelerSetzen(liste) {
  await db.exec("delete from public.kalender_termine; delete from public.schueler;");
  for (const s of liste) {
    await db.query("insert into public.schueler (id, fahrschule_id, name, reakt_status, reakt_bezahlt_bis, vertrag_am) values ($1,$2,$3,$4,$5,$6)",
      [s.id, s.fahrschule_id || FS, "Test Muster", s.reakt_status ?? "bezahlt", s.reakt_bezahlt_bis || null, s.vertrag_am || null]);
  }
}
async function gesperrt(id) {
  return (await db.query("select public.schueler_reakt_gesperrt(s) as g from public.schueler s where s.id = $1", [id])).rows[0].g === true;
}
async function alsNutzer(uid) { await db.query("select set_config('test.uid', $1, false)", [uid || ""]); }
async function regelVomServer(fs) { return (await db.query("select public.reakt_regel($1::uuid) as r", [fs])).rows[0].r; }

// ---------- 1. Vor W15: K8 sperrt trotz „entfällt“ (der gemeldete Fehler) ----------
await preiseSetzen(FS, [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: tag(-5) }]);
await schuelerSetzen([{ id: "s1", vertrag_am: monate(-13) }]);
gleich("vor W15: entfällt, trotzdem gesperrt (alter Fehler)", true, await gesperrt("s1"));

// ---------- 2. W15 einspielen (zweimal: muss wiederholbar sein) ----------
await db.exec(W15);
const erg = (await db.query(W15.slice(W15.lastIndexOf("select (select count(*)")))).rows[0];
gleich("Ergebnis-Abfrage", { funktionen: 4, gesperrt_neu: 1, regel_fuer_angemeldete: true, gesperrt_direkt: false }, { funktionen: Number(erg.funktionen), gesperrt_neu: Number(erg.gesperrt_neu), regel_fuer_angemeldete: erg.regel_fuer_angemeldete, gesperrt_direkt: erg.gesperrt_direkt });
await db.exec(W15);
gleich("nach W15: entfällt heute → frei", false, await gesperrt("s1"));

// ---------- 3. Feste Fälle ----------
const FAELLE = [
  ["kein Eintrag: alte Regel, gesperrt", [], { vertrag_am: monate(-13) }, true],
  ["240 €: gesperrt", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }], { vertrag_am: monate(-13) }, true],
  ["fällig heute: nicht gesperrt", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }], { vertrag_am: monate(-12) }, false],
  ["fällig gestern: gesperrt", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }], { reakt_bezahlt_bis: tag(-1) }, true],
  ["entfällt ab heute", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: heute }], { vertrag_am: monate(-13) }, false],
  ["entfällt erst ab morgen: heute noch gesperrt", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: tag(1) }], { vertrag_am: monate(-13) }, true],
  ["0 € heute (Entscheidung 2a): frei", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: 0, gueltig_ab: tag(-2) }], { vertrag_am: monate(-13) }, false],
  ["entfiel am Vertragstag, heute wieder 240 €: frei", [{ betrag_cent: null, gueltig_ab: monate(-20) }, { betrag_cent: 24000, gueltig_ab: monate(-6) }], { vertrag_am: monate(-14) }, false],
  ["entfiel erst nach dem Vertrag (vorbei): gesperrt", [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: monate(-10) }, { betrag_cent: 24000, gueltig_ab: monate(-2) }], { vertrag_am: monate(-14) }, true],
  ["gleicher Tag, später angelegt gilt (240 nach entfällt)", [{ betrag_cent: null, gueltig_ab: tag(-3), angelegt_am: tag(-3) + "T08:00:00Z" }, { betrag_cent: 24000, gueltig_ab: tag(-3), angelegt_am: tag(-3) + "T09:00:00Z" }], { vertrag_am: monate(-13) }, true],
  ["gleicher Tag, später angelegt gilt (entfällt nach 240)", [{ betrag_cent: 24000, gueltig_ab: tag(-3), angelegt_am: tag(-3) + "T08:00:00Z" }, { betrag_cent: null, gueltig_ab: tag(-3), angelegt_am: tag(-3) + "T09:00:00Z" }], { vertrag_am: monate(-13) }, false],
  ["Preis einer anderen Art zählt nicht", [{ art: "grundbetrag", klasse: "B", bezeichnung: "Grundbetrag", betrag_cent: null, gueltig_ab: tag(-3) }], { vertrag_am: monate(-13) }, true],
  ["befreit bleibt frei", [], { vertrag_am: monate(-30), reakt_status: "befreit" }, false],
  ["noch nicht geprüft sperrt nicht", [], { vertrag_am: monate(-30), reakt_status: "pruefen" }, false],
  ["ohne Vertragsdatum keine Sperre", [], {}, false],
  ["Monatsende 31. → 30./28.", [], { vertrag_am: "2025-01-31" }, true],
];
for (const [name, preise, s, erwartet] of FAELLE) {
  await preiseSetzen(FS, preise);
  await schuelerSetzen([Object.assign({ id: "f" }, s)]);
  gleich("Server: " + name, erwartet, await gesperrt("f"));
  const regel = KR.reaktRegelAusPreisen(await preiseLesen(FS));
  gleich("kompass-rechnen.js: " + name, erwartet, KR.reaktInfo(Object.assign({ reakt_status: "bezahlt" }, s), heute, regel).gesperrt);
}
// Preise einer anderen Fahrschule zählen nicht
await preiseSetzen(FS, []); await preiseSetzen(FS2, [{ betrag_cent: null, gueltig_ab: tag(-3) }]);
await schuelerSetzen([{ id: "f", vertrag_am: monate(-13) }]);
gleich("Server: entfällt bei einer anderen Fahrschule zählt nicht", true, await gesperrt("f"));
await preiseSetzen(FS2, []);

// ---------- 4. Termin-Sperre (Trigger aus K8) folgt der neuen Regel ----------
await alsNutzer(BUERO);
await preiseSetzen(FS, [{ betrag_cent: 24000, gueltig_ab: monate(-30) }]);
await schuelerSetzen([{ id: "t1", vertrag_am: monate(-13) }]);
let meldung = "";
try { await db.query("insert into public.kalender_termine (id, schueler_id, datum, art) values ('k1', 't1', $1, 'fahrstunde')", [tag(3)]); } catch (e) { meldung = String(e.message); }
gleich("Termin für Gesperrten abgelehnt (P0001)", true, /Zahlung ausstehend: Reaktivierung nicht bezahlt/.test(meldung));
await preiseSetzen(FS, [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: tag(-1) }]);
meldung = "";
try { await db.query("insert into public.kalender_termine (id, schueler_id, datum, art) values ('k2', 't1', $1, 'fahrstunde')", [tag(3)]); } catch (e) { meldung = String(e.message); }
gleich("Termin geht, wenn die Reaktivierung entfällt", "", meldung);

// ---------- 5. reakt_regel: nur Regel, keine Preise; nur eigene Fahrschule ----------
await preiseSetzen(FS, [{ betrag_cent: 24000, gueltig_ab: "2026-05-02" }, { betrag_cent: null, gueltig_ab: "2026-07-01" }, { betrag_cent: 24000, gueltig_ab: "2026-09-01" }, { betrag_cent: 0, gueltig_ab: "2027-01-01" }]);
const r1 = await regelVomServer(FS);
gleich("reakt_regel: Form", { monate: 12, frei: [{ ab: "2026-07-01", bis: "2026-08-31" }, { ab: "2027-01-01", bis: null }] }, r1);
gleich("reakt_regel: keine Beträge im Ergebnis", false, /24000|betrag/.test(JSON.stringify(r1)));
await alsNutzer(FREMD);
gleich("reakt_regel: fremde Fahrschule → null", null, await regelVomServer(FS));
await alsNutzer("");
gleich("reakt_regel: nicht angemeldet → null", null, await regelVomServer(FS));
await alsNutzer(SA);
gleich("reakt_regel: Super-Admin darf", r1, await regelVomServer(FS));
gleich("reakt_regel: ohne Einträge leer", { monate: 12, frei: [] }, await regelVomServer(FS2));
await alsNutzer(BUERO);
gleich("reakt_regel: Büro sieht die andere Fahrschule nicht", null, await regelVomServer(FS2));
const rechte = (await db.query(`select has_function_privilege('authenticated', 'public.reakt_frei_am(uuid, date)', 'execute') as frei,
  has_function_privilege('authenticated', 'public.reakt_monate(uuid)', 'execute') as monate, has_function_privilege('anon', 'public.reakt_regel(uuid)', 'execute') as anon`)).rows[0];
gleich("Hilfsfunktionen nicht direkt aufrufbar", { frei: false, monate: false, anon: false }, rechte);

// ---------- 6. Zufallsvergleich Server ↔ kompass-rechnen.js (Regel und Sperre) ----------
let seed = 20261124;
const zufall = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
for (let runde = 0; runde < 60; runde++) {
  const zeilen = [];
  for (let i = 0, n = zufall(5); i < n; i++) {
    const ab = tag(zufall(1200) - 900), c = [null, 0, 24000, 19900][zufall(4)];
    zeilen.push({ betrag_cent: c, gueltig_ab: ab, angelegt_am: ab + "T" + String(8 + zufall(10)).padStart(2, "0") + ":00:00Z" });
    if (zufall(4) === 0) zeilen.push({ betrag_cent: [null, 24000][zufall(2)], gueltig_ab: ab, angelegt_am: ab + "T19:30:00Z" }); // gleicher Tag
  }
  await preiseSetzen(FS, zeilen);
  const server = await regelVomServer(FS);
  const js = KR.reaktRegelAusPreisen(await preiseLesen(FS));
  gleich("Zufall " + runde + ": reakt_regel = reaktRegelAusPreisen", server, js);
  const schueler = [];
  for (let i = 0; i < 8; i++) {
    const st = ["bezahlt", "pruefen", "befreit", null][zufall(4)];
    schueler.push({ id: "z" + i, reakt_status: st, vertrag_am: zufall(6) ? tag(-zufall(1100)) : null, reakt_bezahlt_bis: zufall(3) === 0 ? tag(zufall(400) - 200) : null });
  }
  await schuelerSetzen(schueler);
  for (const s of schueler) {
    gleich(`Zufall ${runde}/${s.id}: Sperre Server = App/Büro`, await gesperrt(s.id), KR.reaktInfo(s, heute, server).gesperrt);
  }
  // Tag für Tag: reakt_frei_am = reaktFreiAm über die Regel
  for (const d of [tag(-900), tag(-400), tag(-1), heute, tag(1), tag(300)]) {
    const f = (await db.query("select public.reakt_frei_am($1::uuid, $2::date) as f", [FS, d])).rows[0].f;
    gleich(`Zufall ${runde}: frei am ${d}`, f, KR.reaktFreiAm(server, d));
  }
}

// ---------- 7. Rückweg: alte Regel zurück, neue Funktionen weg; danach wieder einspielbar ----------
await preiseSetzen(FS, [{ betrag_cent: 24000, gueltig_ab: monate(-30) }, { betrag_cent: null, gueltig_ab: tag(-5) }]);
await schuelerSetzen([{ id: "r1", vertrag_am: monate(-13) }]);
await db.exec(RUECK);
const rk = (await db.query(RUECK.slice(RUECK.lastIndexOf("select (select count(*)")))).rows[0];
gleich("Rückweg: Ergebnis-Abfrage", { neue_funktionen: 0, gesperrt_alt: 1 }, { neue_funktionen: Number(rk.neue_funktionen), gesperrt_alt: Number(rk.gesperrt_alt) });
gleich("Rückweg: wieder gesperrt wie vorher", true, await gesperrt("r1"));
gleich("Rückweg: Standardrecht wieder da", true, (await db.query("select has_function_privilege('authenticated', 'public.schueler_reakt_gesperrt(public.schueler)', 'execute') as x")).rows[0].x);
await db.exec(W15);
gleich("nach erneutem Einspielen: frei", false, await gesperrt("r1"));

console.log(fehler ? `Reaktivierung-SQL-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Reaktivierung-SQL-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
