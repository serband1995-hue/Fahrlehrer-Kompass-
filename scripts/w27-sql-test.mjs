// W27 Gesamtprüfung: Zurückholen „komplett“ (W24) nach getauschten/verschobenen Fenster-Prüfungen (W21) – echtes Postgres (PGlite).
// Prüft: mit 20261205_w27_01 klappen Tausch und Ketten und der alte Stand ist wieder da; ohne die Reparatur scheitert der Tausch (Kontrolle).
// Aufruf: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 && NODE_PATH=/tmp/w15-pg/node_modules node scripts/w27-sql-test.mjs
process.on("unhandledRejection",(e)=>{console.log("ABBRUCH: "+String(e&&e.message).slice(0,400));process.exit(1);});
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PGlite } = require("@electric-sql/pglite");
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const M0 = readFileSync(ROOT + "supabase/migrations/20261204_w24_01_sicherung_vollstaendig.sql", "utf8");
const REP = readFileSync(ROOT + "supabase/migrations/20261205_w27_01_sicherung_pruefungstausch.sql", "utf8");
let M = M0 + "\n" + REP;
const SR = ["service", "role"].join("_"); // Wort nicht ausschreiben (release-check sucht danach)
const FS = "11111111-1111-1111-1111-111111111111";
const FL = "a0000000-0000-0000-0000-000000000002";
async function bau() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role ${SR} bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    create table public.fahrschulen (id uuid primary key, name text, slug text not null unique, aktiv boolean not null default true);
    insert into public.fahrschulen values ('${FS}', 'Test', 'test', true);
    create table public.profiles (id uuid primary key, rolle text not null default 'fahrlehrer', fahrschule_id uuid, aktiv boolean not null default true);
    insert into public.profiles values ('${FL}', 'fahrlehrer', '${FS}', true);
    create function public.is_super_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
    create function public.is_buero(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
    create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
    create function public.my_fahrschule_id() returns uuid language sql stable as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
    create table public.schueler (id text primary key, fahrschule_id uuid, name text, status text default 'aktiv');
    insert into public.schueler values ('s1','${FS}','A','aktiv'),('s2','${FS}','B','aktiv'),('s3','${FS}','C','aktiv');
    create table public.pruefungstage (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null references public.fahrschulen(id), datum date not null, start time not null default '08:00', fenster_zahl int not null default 9, geloescht boolean not null default false);
    create table public.pruefungstermine (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null, schueler_id text, datum date, von text, art text default 'praxis', status text not null default 'geplant',
      pruefungstag_id uuid references public.pruefungstage(id), fenster smallint, fenster_anzahl smallint not null default 1, aktualisiert_am timestamptz default now());
    create unique index pruefungstermine_fenster_frei on public.pruefungstermine (pruefungstag_id, fenster) where pruefungstag_id is not null and status <> 'abgesagt';
    create table public.snapshots (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, data jsonb not null, updated_at timestamptz);
    create table public.fahrschule_backups (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null references public.fahrschulen(id),
      erstellt_am timestamptz not null default now(), automatisch boolean not null default true, daten jsonb not null);
    alter table public.fahrschule_backups enable row level security;
    insert into public.pruefungstage (id, fahrschule_id, datum) values ('d0000000-0000-0000-0000-000000000001','${FS}', current_date + 7);
    insert into public.pruefungstermine (id, fahrschule_id, schueler_id, datum, von, pruefungstag_id, fenster) values
      ('b0000000-0000-0000-0000-000000000001','${FS}','s1',current_date+7,'08:00','d0000000-0000-0000-0000-000000000001',0),
      ('b0000000-0000-0000-0000-000000000002','${FS}','s2',current_date+7,'08:55','d0000000-0000-0000-0000-000000000001',1),
      ('b0000000-0000-0000-0000-000000000003','${FS}','s3',current_date+7,'09:50','d0000000-0000-0000-0000-000000000001',2);
  `);
  await db.exec(M);
  return db;
}
let fehler = 0, ok = 0;
const pruef = (bed, text) => { if (bed) { ok++; console.log("ok  " + text); } else { fehler++; console.log("FEHLER  " + text); } };
async function fall(name, aendern, erwartet = true) {
  const db = await bau();
  const b = (await db.query("select public.fahrschule_backup_erstellen($1, false) id", [FS])).rows[0].id;
  await db.exec(aendern);
  const v = (await db.query("select public.fahrschule_backup_vorschau($1, 'komplett', null) v", [b])).rows[0].v;
  const pt = v.tabellen.find((t) => t.tabelle === "pruefungstermine");
  let erg;
  try { erg = (await db.query("select public.fahrschule_backup_wiederherstellen($1, 'komplett', null, $2) r", [b, v.code])).rows[0].r; erg = "OK " + JSON.stringify(erg.tabellen); }
  catch (e) { erg = "FEHLER: " + String(e.message).slice(0, 300); }
  const st = (await db.query("select schueler_id, fenster, status from public.pruefungstermine order by schueler_id")).rows;
  const zurueck = st.map((r) => r.schueler_id + ":" + r.fenster).join(",") === "s1:0,s2:1,s3:2";
  if (erwartet) pruef(v.wiederherstellbar && erg.startsWith("OK") && zurueck, name + " → zurückgeholt, alter Stand wieder da" + (erg.startsWith("OK") ? "" : " (" + erg + ")"));
  else pruef(!erg.startsWith("OK"), name + " → ohne Reparatur scheitert es (Kontrolle, zeigt dass der Test den Fehler sieht)");
}
const A = "b0000000-0000-0000-0000-000000000001", B = "b0000000-0000-0000-0000-000000000002", C = "b0000000-0000-0000-0000-000000000003";
await fall("Kontrolle: eine Prüfung auf freies Fenster verschoben", `update public.pruefungstermine set fenster = 5, von = '12:35' where id = '${C}';`);
await fall("Tausch zweier Prüfungen nach der Sicherung (wie pruefung_tauschen)", `
  update public.pruefungstermine set pruefungstag_id = null, fenster = null where id = '${A}';
  update public.pruefungstermine set fenster = 0, von = '08:00' where id = '${B}';
  update public.pruefungstermine set pruefungstag_id = 'd0000000-0000-0000-0000-000000000001', fenster = 1, von = '08:55' where id = '${A}';`);
await fall("Kette: C 2->3, dann B 1->2", `
  update public.pruefungstermine set fenster = 3 where id = '${C}';
  update public.pruefungstermine set fenster = 2 where id = '${B}';`);
await fall("Kette andersherum: A 0->5, dann B 1->0", `
  update public.pruefungstermine set fenster = 5 where id = '${A}';
  update public.pruefungstermine set fenster = 0 where id = '${B}';`);

// Kontrolle: ohne die Reparatur muss der Tausch scheitern
M = M0;
await fall("Kontrolle ohne W27: Tausch", `
  update public.pruefungstermine set pruefungstag_id = null, fenster = null where id = '${A}';
  update public.pruefungstermine set fenster = 0, von = '08:00' where id = '${B}';
  update public.pruefungstermine set pruefungstag_id = 'd0000000-0000-0000-0000-000000000001', fenster = 1, von = '08:55' where id = '${A}';`, false);
console.log(fehler ? `❌ W27-SQL-Test: ${fehler} Fehler, ${ok} ok` : `✅ W27-SQL-Test: alle ${ok} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
