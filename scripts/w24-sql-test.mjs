// W24: Trockenlauf der Migration 20261204_w24_01 (vollständige Sicherung + Wiederherstellung), ihres Rückwegs und der
// Live-Probe scripts/sql/w24-probe.sql in PGlite (echtes Postgres in Node, ohne Netz, ohne Live-Datenbank).
//
// Ehrlich: PGlite prüft eine ATTRAPPE. Die Tabellen sind aus Migrationen und Code nachgebaut, nicht 1:1 live (nur ein Teil
// der Tabellen; fehlende überspringt die Sicherung von selbst). Die Beleg-Auslöser sind wörtlich aus 20261201_w19_02.
// Absichtlich eingebaut: Auslöser, die Zeilen verändern (Zeitstempel, Papierkorb, Belegnummer, „Beleg fest“), damit sichtbar
// wird, ob das Zurückschreiben sie wirklich ausschaltet; eine unbekannte Tabelle mit fahrschule_id („entdeckt“).
//
// Aufruf:  npm i --silent --no-save --prefix /tmp/w18-pg @electric-sql/pglite@0.2.17
//          NODE_PATH=/tmp/w18-pg/node_modules node scripts/w24-sql-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i --silent --no-save --prefix /tmp/w18-pg @electric-sql/pglite@0.2.17 und mit NODE_PATH=/tmp/w18-pg/node_modules starten.");
  process.exit(1);
}
const lies = (p) => readFileSync(join(ROOT, p), "utf8");
const M = lies("supabase/migrations/20261204_w24_01_sicherung_vollstaendig.sql");
const R = lies("supabase/rueckweg/20261204_w24_01_rueckweg.sql");
const PROBE = lies("scripts/sql/w24-probe.sql");
const BELEGE = lies("supabase/migrations/20261201_w19_02_zahlungsbelege.sql");

let faelle = 0, fehler = 0;
function ok(name, bedingung, detail) {
  faelle++;
  if (bedingung) console.log("ok   " + name);
  else { fehler++; console.log("FEHLER " + name + (detail !== undefined ? "\n       " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 3000) : "")); }
}

// ---------- 0. Textprüfung ----------
const ohneKomm = (t) => t.replace(/^\s*--.*$/gm, "").replace(/--[^\n']*$/gm, "");
ok("Probe: genau ein DO-Block, endet mit raise W24_ERGEBNIS", (PROBE.match(/^do \$w24p\$/gm) || []).length === 1 && /raise exception 'W24_ERGEBNIS %'/.test(PROBE));
ok("Probe: kein drop/alter/grant/revoke/create/truncate", !/\b(drop|alter|grant|revoke|create|truncate)\b/i.test(ohneKomm(PROBE)));
ok("Probe: E-Mails nur @example.invalid", !/@(?!example\.invalid)[a-z0-9-]+\.[a-z]+/i.test(ohneKomm(PROBE)));
for (const [n, t] of [["Probe", PROBE], ["Migration", M], ["Rückweg", R]]) ok(n + ": nennt nie das Akademie-Projekt", !t.includes("fxgljvhpikjcejhghgbp"));
ok("Migration: nie Rechte für anon", !/grant[^;]*\banon\b/i.test(ohneKomm(M)));
ok("Migration: Wiederherstellen/Vorschau/Erstellen nur für Angemeldete und den Server", (ohneKomm(M).match(/grant execute[^;]*;/gi) || []).every((g) => !/\b(public|anon)\b/i.test(g.replace(/public\./g, ""))));
ok("Migration: keine Schlüssel oder Passwörter", !new RegExp("(eyJ[a-zA-Z0-9]{20,}|" + ["service", "role", "key"].join("_") + "|sk_live|password\\s*=)", "i").test(M));

// ---------- 1. Attrappe ----------
const SR = ["service", "role"].join("_");
const FS = "11111111-1111-1111-1111-111111111111", FS2 = "22222222-2222-2222-2222-222222222222";
const U = { buero: "a0000000-0000-0000-0000-000000000001", fl1: "a0000000-0000-0000-0000-000000000002",
  leitung: "a0000000-0000-0000-0000-000000000004", fremd: "a0000000-0000-0000-0000-000000000005", super: "a0000000-0000-0000-0000-000000000006" };

async function baueDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role ${SR} bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') $$;
    grant usage on schema auth to anon, authenticated;
    create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
      email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
    create table public.fahrschulen (id uuid primary key, name text, slug text not null unique, aktiv boolean not null default true);
    insert into public.fahrschulen (id, name, slug) values ('${FS}', 'Test', 'test'), ('${FS2}', 'Andere', 'andere');
    create table public.profiles (id uuid primary key, email text, name text, rolle text not null default 'fahrlehrer', fahrschule_id uuid, aktiv boolean not null default true, faehrt_selbst boolean default false);
    create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $$
      begin insert into public.profiles (id, email, rolle, aktiv) values (new.id, new.email, 'fahrlehrer', true); return new; end $$;
    create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
    insert into public.profiles (id, rolle, fahrschule_id, aktiv) values ('${U.buero}', 'buero', '${FS}', true), ('${U.fl1}', 'fahrlehrer', '${FS}', true),
      ('${U.leitung}', 'fahrschule_admin', '${FS}', true), ('${U.fremd}', 'fahrschule_admin', '${FS2}', true), ('${U.super}', 'super_admin', null, true);
    create function public.is_super_admin(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin' and aktiv) $$;
    create function public.is_buero(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero' and aktiv) $$;
    create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin' and aktiv) $$;
    create function public.my_fahrschule_id() returns uuid language sql stable security definer set search_path to 'public' as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
    create function public.buero_bearbeiter() returns text language sql stable as $$ select null::text $$;
    create function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
      select public.is_super_admin(auth.uid()) or ((public.is_buero(auth.uid()) or public.is_fahrschule_admin(auth.uid())) and fs = public.my_fahrschule_id()) $$;

    create table public.aenderungsprotokoll (id bigserial primary key, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text,
      geaendert_von uuid, bearbeiter text, grund text, erstellt_am timestamptz default now());
    create table public.fahrschule_pakete (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade, name text not null);
    create table public.schueler (id text primary key, fahrschule_id uuid references public.fahrschulen(id), fahrlehrer_id uuid, name text,
      status text not null default 'aktiv', geaendert_am timestamptz default now(), paket_id uuid references public.fahrschule_pakete(id));
    create table public.schueler_eltern (schueler_id text primary key references public.schueler(id) on delete cascade, fahrschule_id uuid not null, email text);
    create function public.att_eltern_spur() returns trigger language plpgsql as $$ begin return new; end $$;
    create trigger schueler_eltern_spur after insert or update on public.schueler_eltern for each row execute function public.att_eltern_spur();
    -- Auslöser wie live: verändert Zeilen (Zeitstempel) und schreibt Protokoll
    create function public.att_schueler_stempel() returns trigger language plpgsql as $$ begin new.geaendert_am := clock_timestamp(); return new; end $$;
    create trigger trg_att_schueler_stempel before insert or update on public.schueler for each row execute function public.att_schueler_stempel();
    create function public.att_schueler_protokoll() returns trigger language plpgsql security definer set search_path to 'public' as $$
      begin if new.status is distinct from old.status then
        insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu) values (new.fahrschule_id, 'schueler', new.id, 'status', old.status, new.status);
      end if; return new; end $$;
    create trigger trg_schueler_protokoll after update on public.schueler for each row execute function public.att_schueler_protokoll();
    create table public.schueler_notizen (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null, schueler_id text not null references public.schueler(id) on delete cascade, text text);

    create table public.kalender_termine (id text primary key, fahrschule_id uuid not null, fahrlehrer_id uuid not null, schueler_id text, datum date not null,
      von text, bis text, art text, fahrzeug text, status text, geloescht boolean not null default false, payload jsonb default '{}',
      aktualisiert_am timestamptz default now(), geloescht_am timestamptz);
    create function public.att_termin() returns trigger language plpgsql as $$ begin
      new.aktualisiert_am := clock_timestamp();
      if new.geloescht and new.geloescht_am is null then new.geloescht_am := clock_timestamp(); end if;
      if not new.geloescht then new.geloescht_am := null; end if;
      return new; end $$;
    create trigger trg_termin_zy_papierkorb before insert or update on public.kalender_termine for each row execute function public.att_termin();
    create table public.kalender_pruefungen (id text primary key, fahrschule_id uuid not null, fahrlehrer_id uuid not null, schueler_id text, datum date,
      result text, geloescht boolean not null default false, payload jsonb default '{}');
    create table public.fahrschule_fahrzeuge (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null references public.fahrschulen(id),
      name text not null, typ text, klasse text, aktiv boolean not null default true, erstellt_am timestamptz default now());
    create table public.fahrschule_einstellungen (fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade, schluessel text not null,
      wert jsonb not null, geaendert_am timestamptz not null default now(), geaendert_von uuid default auth.uid(), primary key (fahrschule_id, schluessel));
    create function public.fahrschule_einstellung(fs uuid, k text) returns jsonb language sql stable security definer set search_path to 'public' as $$
      select wert from public.fahrschule_einstellungen where fahrschule_id = fs and schluessel = k $$;
    create table public.snapshots (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, data jsonb not null, updated_at timestamptz);
    create function public.snapshots_set_server_zeit() returns trigger language plpgsql as $$ begin new.updated_at := clock_timestamp(); return new; end $$;
    create trigger trg_snapshots_server_zeit before insert or update on public.snapshots for each row execute function public.snapshots_set_server_zeit();
    create table public.buero_personen (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null, name text not null, pin_hash text, hat_pin boolean not null default false);
    insert into public.buero_personen (fahrschule_id, name, pin_hash, hat_pin) values ('${FS}', 'Muster', 'GEHEIMER-HASH', true);
    create table public.buero_sitzungen (token_hash text primary key, person_id uuid, fahrschule_id uuid not null, user_id uuid not null);
    insert into public.buero_sitzungen values ('TOKEN-HASH', null, '${FS}', '${U.buero}');
    create table public.schueler_notiz_gelesen (notiz_id uuid not null references public.schueler_notizen(id) on delete cascade, fahrlehrer_id uuid not null, gelesen_am timestamptz not null default now(), primary key (notiz_id, fahrlehrer_id));
    -- Tabelle der Liste OHNE die erwartete Spalte (Schema geändert): darf die Sicherung nicht brechen, wird „entdeckt“
    create table public.provisionen (id uuid primary key default gen_random_uuid(), schueler_id text, betrag numeric);
    insert into public.provisionen (schueler_id, betrag) values ('s1', 5), ('sx', 7);
    -- unbekannte Tabelle (soll „entdeckt“ und gesichert werden)
    create table public.att_neu (id serial primary key, fahrschule_id uuid, wert text);
    insert into public.att_neu (fahrschule_id, wert) values ('${FS}', 'a'), ('${FS2}', 'b');

    create table public.fahrschule_backups (id uuid primary key default gen_random_uuid(), fahrschule_id uuid not null references public.fahrschulen(id),
      erstellt_am timestamptz not null default now(), automatisch boolean not null default true, daten jsonb not null);
    alter table public.fahrschule_backups enable row level security;
    grant select, insert, update, delete on public.fahrschule_backups to authenticated;
    create policy "Fahrschule-Admin/Buero erstellt eigene Backups" on public.fahrschule_backups as PERMISSIVE for INSERT to public
      with check (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
    create policy "Fahrschule-Admin/Buero sieht eigene Backups" on public.fahrschule_backups as PERMISSIVE for SELECT to public
      using (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
    create policy "Super Admin alles - Backups" on public.fahrschule_backups as PERMISSIVE for ALL to public using (is_super_admin(auth.uid()));
    grant select, insert, update, delete on public.schueler, public.kalender_termine, public.fahrschule_einstellungen to authenticated;
  `);
  // Belege wörtlich (ohne den Einstellungs-Constraint-Teil, die Attrappe hat keinen)
  await db.exec(BELEGE.replace(/-- ===== 1\. Einstellungs-Schlüssel =====[\s\S]*?-- ===== 2\./, "-- ===== 2."));
  // Altbestand: Format-1-Sicherung (wie k1_04)
  await db.exec(`insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, erstellt_am)
    values ('${FS}', true, '{"schueler":[{"id":"alt1"}],"kalender_termine":[],"kalender_pruefungen":[],"fahrschule_fahrzeuge":[]}', now() - interval '3 days');`);
  // Bestand der Fahrschule
  await db.exec(`
    insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values ('s1', '${FS}', '${U.fl1}', 'Eins'), ('s2', '${FS}', '${U.fl1}', 'Zwei'), ('sx', '${FS2}', '${U.fremd}', 'Fremd');
    update public.schueler set status = 'geloescht' where id = 's2';
    insert into public.schueler_notizen (fahrschule_id, schueler_id, text) values ('${FS}', 's1', 'Notiz eins'), ('${FS2}', 'sx', 'fremde Notiz');
    insert into public.schueler_notiz_gelesen (notiz_id, fahrlehrer_id) select id, '${U.fl1}' from public.schueler_notizen;
    insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art, geloescht)
      values ('t1', '${FS}', '${U.fl1}', 's1', current_date, '08:00', '09:30', 'fahrstunde', false), ('t2', '${FS}', '${U.fl1}', 's1', current_date, '10:00', '11:30', 'fahrstunde', true),
             ('tx', '${FS2}', '${U.fremd}', 'sx', current_date, '08:00', '09:30', 'fahrstunde', false);
    insert into public.fahrschule_fahrzeuge (fahrschule_id, name, aktiv) values ('${FS}', 'Golf', true), ('${FS}', 'Alt-Polo', false);
    insert into public.snapshots (user_id, data) values ('${U.fl1}', '{"students":[1,2,3]}');
    insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values ('${FS}', 's1', 'Eins', current_date, 50, 'Fahrstunde', 'ueberweisung');
  `);
  return db;
}

async function als(db, uid, sql, params) {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claims', $1, true)", [uid ? JSON.stringify({ sub: uid, role: "authenticated" }) : ""]);
    await db.exec(uid === null ? "set local role anon" : "set local role authenticated");
    const r = await db.query(sql, params || []);
    await db.exec("commit");
    return { rows: r.rows, n: r.affectedRows };
  } catch (e) {
    try { await db.exec("rollback"); } catch (e2) {}
    return { fehler: String(e.message || e) };
  }
}
const eins = async (db, sql, p) => (await db.query(sql, p || [])).rows[0];

async function probe(db) {
  try { await db.exec(PROBE); return { text: "keine Ausnahme" }; } catch (e) {
    const t = String(e.message || e); const m = t.match(/W24_ERGEBNIS (\{.*\})/s);
    return { text: t, erg: m ? JSON.parse(m[1]) : null };
  }
}

process.on("unhandledRejection", (e) => { console.error("ABBRUCH: " + (e && e.message)); process.exit(1); });
const db = await baueDb();

// ---------- 2. Migration ----------
let f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Migration läuft durch", f === "", f);
f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Migration ein zweites Mal: läuft (idempotent)", f === "", f);
let r = await eins(db, "select anlass, format, zaehlung from public.fahrschule_backups where daten ? 'schueler' and format = 1");
ok("Altbestand Format 1: Anlass und Zählung nachgetragen, Daten unverändert", r && r.anlass === "nacht" && r.zaehlung.schueler === 1 && r.zaehlung.kalender_termine === 0, r);
r = await eins(db, "select count(*)::int n from pg_policies where tablename = 'fahrschule_backups' and cmd = 'INSERT'");
ok("Client-INSERT-Regel entfernt", r.n === 0, r);
r = await eins(db, "select array_agg(tabelle order by tabelle) t from public.w24_tabellen() where entdeckt");
ok("Unbekannte Tabelle und Listen-Tabelle ohne erwartete Spalte werden entdeckt (Sicherung bricht nicht)", JSON.stringify(r.t) === '["att_neu","provisionen"]', r);

// ---------- 3. App/Büro-Aufruf wie heute ----------
r = await als(db, U.buero, "select public.fahrschule_backup_erstellen($1, false) id", [FS]);
ok("Büro: „Jetzt sichern“ wie bisher", !r.fehler && r.rows[0].id, r);
const BK = r.rows && r.rows[0].id;
r = await eins(db, "select format, anlass, automatisch, zaehlung, arten, groesse_bytes, daten from public.fahrschule_backups where id = $1", [BK]);
ok("Sicherung: Format 2, von Hand, Zählung (2 Schüler inkl. gelöschtem, 2 Termine inkl. Papierkorb, 2 Fahrzeuge, 1 Notiz, 1 Beleg, 1 Handy-Stand, entdeckt 1)",
  r.format === 2 && r.anlass === "hand" && r.automatisch === false && r.zaehlung.schueler === 2 && r.zaehlung.kalender_termine === 2 && r.zaehlung.fahrschule_fahrzeuge === 2
  && r.zaehlung.schueler_notizen === 1 && r.zaehlung.provisionen === 1 && r.zaehlung.zahlungsbelege === 1 && r.zaehlung.snapshots === 1 && r.zaehlung.att_neu === 1 && r.arten.att_neu === "entdeckt"
  && r.arten.zahlungsbelege === "anhaengen" && r.arten.snapshots === "auf_wunsch" && r.groesse_bytes > 500, { z: r.zaehlung, a: r.arten });
ok("Sicherung enthält nichts der fremden Fahrschule", !JSON.stringify(r.daten).includes(FS2) && !JSON.stringify(r.daten).includes('"sx"'));
ok("Handy-Stände nur im geschützten Teil (nicht in daten)", !JSON.stringify(r.daten).includes("students"), Object.keys(r.daten.tabellen || {}));
ok("Keine Anmeldedaten: kein PIN-Hash, keine Sitzungen; Büro-Person und Notiz-gelesen (1) drin", !JSON.stringify(r.daten).includes("GEHEIMER-HASH") && !JSON.stringify(r.daten).includes("TOKEN-HASH")
  && r.zaehlung.buero_personen === 1 && r.zaehlung.schueler_notiz_gelesen === 1 && !("buero_sitzungen" in r.zaehlung), r.zaehlung);
r = await als(db, U.buero, "select count(*)::int n from public.fahrschule_backups_privat");
ok("Büro liest den geschützten Teil nicht", !r.fehler ? r.rows[0].n === 0 : true, r);
r = await als(db, U.super, "select count(*)::int n from public.fahrschule_backups_privat");
ok("Super-Admin liest den geschützten Teil", !r.fehler && r.rows[0].n >= 1, r);
r = await als(db, U.fl1, "select public.fahrschule_backup_erstellen($1, false) id", [FS]);
ok("Fahrlehrer: keine Berechtigung", /Keine Berechtigung/.test(r.fehler || ""), r);
r = await als(db, U.buero, "insert into public.fahrschule_backups (fahrschule_id, automatisch, daten) values ($1, false, '{}')", [FS]);
ok("Büro: direktes INSERT verweigert", /row-level security|permission/i.test(r.fehler || ""), r);
r = await als(db, U.buero, "select id, format, anlass, zaehlung, groesse_bytes from public.fahrschule_backups where fahrschule_id = $1 order by erstellt_am desc", [FS]);
ok("Büro liest die Liste mit Zählung und Größe (ohne Daten)", !r.fehler && r.rows.length === 2 && r.rows[0].zaehlung && r.rows[0].groesse_bytes > 0, r);
r = await als(db, null, "select public.fahrschule_backup_erstellen($1, false) id", [FS]);
ok("anon: verweigert", !!r.fehler, r);

// ---------- 4. Vorschau / Wiederherstellen aus dem Büro-Ablauf ----------
await db.exec(`delete from public.kalender_termine where id = 't1'; update public.fahrschule_fahrzeuge set name = 'Golf neu' where name = 'Golf';
  insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art) values ('t3', '${FS}', '${U.fl1}', 's1', current_date, '12:00', '13:00', 'fahrstunde');`);
r = await als(db, U.buero, "select public.fahrschule_backup_vorschau($1, 'komplett', null) v", [BK]);
const V = r.rows && r.rows[0].v;
ok("Büro: Vorschau komplett 1/1/1, darf nicht wiederherstellen", V && V.einfuegen === 1 && V.aendern === 1 && V.loeschen === 1 && V.darf_wiederherstellen === false, r.fehler || (V && { e: V.einfuegen, a: V.aendern, l: V.loeschen }));
r = await als(db, U.leitung, "select public.fahrschule_backup_wiederherstellen($1, 'komplett', null, $2) v", [BK, V && V.code]);
ok("Leitung: Wiederherstellen mit Code aus der Vorschau", !r.fehler && r.rows[0].v.ok, r);
r = await eins(db, "select (select count(*)::int from public.kalender_termine where fahrschule_id = $1 and id in ('t1','t2')) a, (select count(*)::int from public.kalender_termine where id = 't3') b, (select name from public.fahrschule_fahrzeuge where fahrschule_id = $1 and aktiv) c", [FS]);
ok("Danach: t1 zurück, Papierkorb t2 da, t3 weg, Fahrzeugname zurück", r.a === 2 && r.b === 0 && r.c === "Golf", r);
r = await eins(db, "select geloescht_am is not null g from public.kalender_termine where id = 't2'");
const t2orig = await eins(db, "select x ->> 'geloescht_am' g from public.fahrschule_backups b, jsonb_array_elements(b.daten -> 'tabellen' -> 'kalender_termine') x where b.id = $1 and x ->> 'id' = 't1'", [BK]);
ok("Auslöser waren aus: t1 kommt mit altem Zeitstempel zurück", (await eins(db, `select (select to_jsonb(k) ->> 'aktualisiert_am' from public.kalender_termine k where id = 't1') = (select x ->> 'aktualisiert_am' from public.fahrschule_backups b, jsonb_array_elements(b.daten -> 'tabellen' -> 'kalender_termine') x where b.id = $1 and x ->> 'id' = 't1') gleich`, [BK])).gleich === true, t2orig);
r = await eins(db, "select count(*)::int n from pg_trigger where not tgisinternal and tgenabled = 'D'");
ok("Alle Auslöser wieder an", r.n === 0, r);
r = await eins(db, "select count(*)::int n from public.fahrschule_backups where anlass = 'vor_wiederherstellung' and hinweis ? 'ergebnis'");
ok("Vorher-Sicherung mit Ergebnis-Vermerk", r.n === 1, r);
r = await als(db, U.super, "select public.fahrschule_backup_vorschau($1, 'komplett', null) v", [BK]);
ok("Super-Admin: Vorschau jeder Fahrschule, danach nichts zu tun", !r.fehler && r.rows[0].v.einfuegen + r.rows[0].v.aendern + r.rows[0].v.loeschen === 0 && r.rows[0].v.darf_wiederherstellen, r);

// Fehler mitten im Zurückschreiben → nichts geändert, Auslöser an
await db.exec(`delete from public.kalender_termine where id = 't1';`);
r = await als(db, U.leitung, "select public.fahrschule_backup_vorschau($1, 'ergaenzen', null) v", [BK]);
const V2 = r.rows[0].v;
// Störung: Prüfregel der Tabelle (bleibt beim Zurückschreiben aktiv, anders als Auslöser)
await db.exec(`alter table public.kalender_termine add constraint att_stoerer check (id <> 't1');`);
r = await als(db, U.leitung, "select public.fahrschule_backup_wiederherstellen($1, 'ergaenzen', null, $2) v", [BK, V2.code]);
const nachStoer = await eins(db, "select (select count(*)::int from public.kalender_termine where id = 't1') t1, (select count(*)::int from public.fahrschule_backups where anlass = 'vor_wiederherstellung') vor, (select count(*)::int from pg_trigger where not tgisinternal and tgenabled = 'D') aus");
ok("Fehler beim Zurückschreiben: alles zurück (keine Vorher-Sicherung übrig, Auslöser an, nichts eingefügt)", !!r.fehler && nachStoer.t1 === 0 && nachStoer.vor === 1 && nachStoer.aus === 0, { r, nachStoer });
await db.exec(`alter table public.kalender_termine drop constraint att_stoerer;`);
// Code veraltet: Stand ändert sich zwischen Vorschau und Bestätigung
await db.exec(`update public.schueler set name = 'Eins geändert' where id = 's1';`);
r = await als(db, U.leitung, "select public.fahrschule_backup_wiederherstellen($1, 'ergaenzen', null, $2) v", [BK, V2.code]);
ok("Stand nach der Vorschau geändert: Code passt nicht mehr", /Stand hat sich/.test(r.fehler || ""), r);

// ---------- 4b. Funde Fehlersucher Daten (W24) ----------
await db.exec(`update public.schueler set name = 'Eins' where id = 's1';`);
r = await als(db, U.buero, "select public.fahrschule_backup_erstellen($1, false) id", [FS]);
const BK2 = r.rows[0].id;
await db.exec(`insert into public.fahrschule_pakete (fahrschule_id, name) values ('${FS}', 'Neu');`);
await db.exec(`update public.schueler set paket_id = (select id from public.fahrschule_pakete where name = 'Neu') where id = 's1';
  alter table public.schueler_eltern disable trigger schueler_eltern_spur;`);
r = await als(db, U.leitung, "select public.fahrschule_backup_vorschau($1, 'komplett', null) v", [BK2]);
let VV = r.rows[0].v;
r = await als(db, U.leitung, "select public.fahrschule_backup_wiederherstellen($1, 'komplett', null, $2) v", [BK2, VV.code]);
let q = await eins(db, "select (select paket_id from public.schueler where id = 's1') p, (select count(*)::int from public.fahrschule_pakete) n");
ok("Komplett: neues Paket weg, obwohl ein Schüler darauf zeigte (Fremdschlüssel am Ende geprüft)", !r.fehler && q.p === null && q.n === 0, { r, q });
q = await eins(db, "select (select tgenabled from pg_trigger where tgname = 'schueler_eltern_spur') e, (select count(*)::int from pg_constraint where contype = 'f' and condeferrable) d");
ok("Von Hand ausgeschalteter Auslöser bleibt aus; Fremdschlüssel wieder nicht aufschiebbar", q.e === "D" && q.d === 0, q);
await db.exec(`alter table public.schueler_eltern enable trigger schueler_eltern_spur;
  insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values ('s9', '${FS}', '${U.fl1}', 'Neu');
  insert into public.schueler_eltern (schueler_id, fahrschule_id, email) values ('s9', '${FS}', 'eltern@example.invalid');`);
r = await als(db, U.leitung, "select public.fahrschule_backup_vorschau($1, 'komplett', array['schueler']) v", [BK2]);
VV = r.rows[0].v;
ok("Nur „Schüler“ gewählt, Löschen würde Eltern-Kontakte mitlöschen: abgewiesen (folge_loeschung)", VV.wiederherstellbar === false && VV.grund === "folge_loeschung", VV.grund);
r = await als(db, U.leitung, "select public.fahrschule_backup_vorschau($1, 'komplett', null) v", [BK2]);
VV = r.rows[0].v;
r = await als(db, U.leitung, "select public.fahrschule_backup_wiederherstellen($1, 'komplett', null, $2) v", [BK2, VV.code]);
q = await eins(db, "select (select count(*)::int from public.schueler where id = 's9') s, (select count(*)::int from public.schueler_eltern) e");
ok("Alles gewählt: neuer Schüler samt Eltern-Kontakt weg (beides in der Vorschau)", !r.fehler && q.s === 0 && q.e === 0, { r, q });

// ---------- 5. Live-Probe in der Attrappe ----------
const P = await probe(db);
ok("Probe endet mit W24_ERGEBNIS", !!P.erg, P.text.slice(0, 3000));
if (P.erg) {
  ok("Probe: alle_ok", P.erg.alle_ok === true, P.erg.pflicht_fehler);
  for (const x of P.erg.pruefungen.filter((x) => !x.ok)) console.log("       · " + x.kat + ": " + x.name + " → " + JSON.stringify(x.ist).slice(0, 400));
  console.log(`       Probe: ${P.erg.pruefungen_ok}/${P.erg.pruefungen_gesamt} Prüfungen ok`);
}
r = await eins(db, "select (select count(*)::int from public.fahrschulen where name like 'W24 Probe%') fs, (select count(*)::int from auth.users where email like 'w24-%') u");
ok("Probe hinterlässt nichts", r.fs === 0 && r.u === 0, r);

// ---------- 6. Rückweg ----------
f = ""; try { await db.exec(R); } catch (e) { f = String(e.message); }
ok("Rückweg läuft durch", f === "", f);
r = await als(db, U.buero, "select public.fahrschule_backup_erstellen($1, false) id", [FS]);
ok("Nach Rückweg: altes Sichern geht wieder", !r.fehler, r);
r = await eins(db, "select count(*)::int n from pg_proc where proname like 'w24\\_%' or proname in ('fahrschule_backup_vorschau', 'fahrschule_backup_wiederherstellen')");
ok("Nach Rückweg: neue Funktionen weg", r.n === 0, r);
f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Migration nach Rückweg erneut einspielbar", f === "", f);

console.log(`\n${faelle - fehler}/${faelle} ok`);
process.exit(fehler ? 1 : 0);
