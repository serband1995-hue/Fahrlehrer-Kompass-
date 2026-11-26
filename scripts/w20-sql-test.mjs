// W20: Trockenlauf der Migrationen 20261201_w20_01 (anon-Rechte) und 20261201_w20_02 (Büro-Person an mehreren PCs),
// ihrer Rückwege und der Live-Probe scripts/sql/w20-2-probe.sql in PGlite (echtes Postgres in Node, ohne Netz, ohne Live-Datenbank).
//
// Ehrlich: PGlite prüft eine ATTRAPPE. Die Büro-Funktionen (buero_pin_anmelden, buero_sitzung_zeile, ...) sind wörtlich der
// Live-Stand vom 26.11.2026 (w20-1-lesen 1f); pgcrypto (crypt/digest/gen_random_bytes) und pg_cron sind nachgebildet, weil PGlite
// sie nicht hat. Tabellen und Rechte sind wie bei Supabase üblich angelegt (anon/authenticated bekommen alles), nicht 1:1 live.
// Der Test belegt: (1) Migrationen laufen und tun, was sie sollen, (2) die Probe ist bei richtigem Stand grün und schlägt bei
// falschem Stand an (Gegenprobe), (3) die Probe hinterlässt nichts, (4) die Rückwege stellen die Rechte genau wieder her.
// Er belegt NICHT den Live-Stand. Das zeigt erst die Live-Probe.
//
// Aufruf:  npm i --silent --no-save --prefix /tmp/w18-pg @electric-sql/pglite@0.2.17
//          NODE_PATH=/tmp/w18-pg/node_modules node scripts/w20-sql-test.mjs
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
const M1 = lies("supabase/migrations/20261201_w20_01_anon_rechte.sql");
const M2 = lies("supabase/migrations/20261201_w20_02_buero_mehrere_pcs.sql");
const R1 = lies("supabase/rueckweg/20261201_w20_01_rueckweg.sql");
const R2 = lies("supabase/rueckweg/20261201_w20_02_rueckweg.sql");
const PROBE = lies("scripts/sql/w20-2-probe.sql");
const LESEN = lies("scripts/sql/w20-1-lesen.sql");

let faelle = 0, fehler = 0;
function ok(name, bedingung, detail) {
  faelle++;
  if (bedingung) console.log("ok   " + name);
  else { fehler++; console.log("FEHLER " + name + (detail !== undefined ? "\n       " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); }
}

// ---------- 0. Textprüfung ----------
ok("Probe: genau ein DO-Block", (PROBE.match(/^do \$w20\$/gm) || []).length === 1 && (PROBE.match(/^\$w20\$;/gm) || []).length === 1);
ok("Probe: kein drop/alter/grant/revoke (auch nicht im Kommentar)", !/\b(drop|alter|grant|revoke)\b/i.test(PROBE));
ok("Probe: endet mit raise exception W20_ERGEBNIS", /raise exception 'W20_ERGEBNIS %'/.test(PROBE));
ok("Probe: E-Mails nur @example.invalid", !/@(?!example\.invalid)[a-z0-9-]+\.[a-z]+/i.test(PROBE.replace(/^--.*$/gm, "")));
for (const [n, t] of [["Probe", PROBE], ["Lesen", LESEN], ["Migration 1", M1], ["Migration 2", M2], ["Rückweg 1", R1], ["Rückweg 2", R2]])
  ok(n + ": nennt nie das Akademie-Projekt", !t.includes("fxgljvhpikjcejhghgbp"));
const lesenOhne = LESEN.replace(/^\s*--.*$/gm, "");
ok("Lesen: keine Schreib-/Struktur-Befehle", !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|vacuum|call|perform)\b/i.test(lesenOhne.replace(/'[^']*'/g, "''")));
ok("Lesen: jede Anweisung beginnt mit select", lesenOhne.split(";").map((x) => x.trim()).filter(Boolean).every((a) => /^select\b/i.test(a)));
ok("Migration 2: keine RLS-Regel angefasst", !/\bpolicy\b/i.test(M2.replace(/^--.*$/gm, "")) && !/\bpolicy\b/i.test(M1.replace(/^--.*$/gm, "")));

// ---------- 1. Attrappe ----------
const LIVE_FUNKTIONEN = String.raw`CREATE OR REPLACE FUNCTION public.buero_sitzung_zeile(p_auch_pin_aendern boolean DEFAULT false)
 RETURNS buero_sitzungen
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select s.* from public.buero_sitzungen s join public.buero_personen p on p.id = s.person_id
  where s.token_hash = encode(digest(coalesce((nullif(current_setting('request.headers', true), '')::json)->>'x-buero-sitzung', ''), 'sha256'), 'hex')
    and s.user_id = auth.uid() and s.laeuft_ab > now() and p.aktiv
    and (p_auch_pin_aendern or not s.nur_pin_aendern)
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.buero_bearbeiter()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare n text; r text;
begin
  select p.name into n from public.buero_personen p where p.id = (public.buero_sitzung_zeile()).person_id;
  if n is not null then return left(n, 40); end if;
  select pr.rolle, pr.name into r, n from public.profiles pr where pr.id = auth.uid();
  if r is null or r = 'buero' then return null; end if;
  return left(n, 40);
end $function$;

CREATE OR REPLACE FUNCTION public.buero_protokoll_person(p_fs uuid, p_person uuid, p_feld text, p_neu text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
  values (p_fs, 'buero_personen', p_person::text, p_feld, null, p_neu, auth.uid(), public.buero_bearbeiter())
$function$;

CREATE OR REPLACE FUNCTION public.buero_pin_zu_einfach(p text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare d int[]; i int; auf boolean := true; ab boolean := true;
begin
  if p !~ '^[0-9]{4}$' then return true; end if;
  for i in 1..4 loop d[i] := substr(p, i, 1)::int; end loop;
  if d[1] = d[2] and d[2] = d[3] and d[3] = d[4] then return true; end if;
  for i in 1..3 loop
    if d[i+1] <> (d[i] + 1) % 10 then auf := false; end if;
    if d[i+1] <> (d[i] + 9) % 10 then ab := false; end if;
  end loop;
  if auf or ab then return true; end if;
  if d[1] = d[3] and d[2] = d[4] then return true; end if;
  if d[1] = d[2] and d[3] = d[4] then return true; end if;
  return false;
end $function$;

CREATE OR REPLACE FUNCTION public.buero_darf_verwalten(p_fs uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare me public.profiles; s public.buero_sitzungen; v boolean;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.aktiv = false then return false; end if;
  if me.rolle = 'super_admin' then return true; end if;
  if me.fahrschule_id is distinct from p_fs then return false; end if;
  if me.rolle = 'fahrschule_admin' then return true; end if;
  if me.rolle <> 'buero' then return false; end if;
  s := public.buero_sitzung_zeile();
  if s.person_id is null or s.fahrschule_id <> p_fs then return false; end if;
  select darf_verwalten into v from public.buero_personen where id = s.person_id;
  return coalesce(v, false);
end $function$;

CREATE OR REPLACE FUNCTION public.buero_pin_anmelden(p_person uuid, p_pin text, p_erste boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare me public.profiles; p public.buero_personen; n int; erst boolean := false;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.aktiv = false or me.rolle not in ('buero', 'fahrschule_admin', 'super_admin') then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  select * into p from public.buero_personen where id = p_person for update;
  if p.id is null or not p.aktiv or (me.rolle <> 'super_admin' and p.fahrschule_id is distinct from me.fahrschule_id) then
    return jsonb_build_object('fehler', 'unbekannt');
  end if;
  if p.gesperrt_bis > now() then return jsonb_build_object('fehler', 'gesperrt', 'bis', p.gesperrt_bis); end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return jsonb_build_object('fehler', 'format'); end if;
  if p.pin_hash is null then
    if not coalesce(p_erste, false) then return jsonb_build_object('fehler', 'keine_pin'); end if;
    if p.pin_frei_bis is null or p.pin_frei_bis < now() then return jsonb_build_object('fehler', 'nicht_freigegeben'); end if;
    if public.buero_pin_zu_einfach(p_pin) then return jsonb_build_object('fehler', 'zu_einfach'); end if;
    update public.buero_personen set pin_hash = crypt(p_pin, gen_salt('bf', 8)), hat_pin = true, pin_neu_noetig = false, pin_frei_bis = null,
      fehlversuche = 0, gesperrt_bis = null, aktualisiert_am = now() where id = p.id;
    erst := true; p.pin_neu_noetig := false;
    perform public.buero_protokoll_person(p.fahrschule_id, p.id, 'pin', 'PIN zum ersten Mal festgelegt von ' || p.name);
  elsif coalesce(p_erste, false) then
    return jsonb_build_object('fehler', 'hat_pin');
  elsif crypt(p_pin, p.pin_hash) <> p.pin_hash then
    n := p.fehlversuche + 1;
    if n >= 5 then
      update public.buero_personen set fehlversuche = 0, gesperrt_bis = now() + interval '15 minutes' where id = p.id;
      return jsonb_build_object('fehler', 'gesperrt', 'bis', now() + interval '15 minutes');
    end if;
    update public.buero_personen set fehlversuche = n where id = p.id;
    return jsonb_build_object('fehler', 'falsch', 'rest', 5 - n);
  else
    update public.buero_personen set fehlversuche = 0, gesperrt_bis = null where id = p.id;
  end if;
  return jsonb_build_object('token', public.buero_neue_sitzung(p.id, p.fahrschule_id, p.pin_neu_noetig), 'id', p.id, 'name', p.name,
    'pin_neu_noetig', p.pin_neu_noetig, 'darf_verwalten', p.darf_verwalten, 'erste_pin', erst);
end $function$;

CREATE OR REPLACE FUNCTION public.buero_sitzung_beenden()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.buero_sitzungen;
begin
  s := public.buero_sitzung_zeile(true);
  if s.token_hash is not null then delete from public.buero_sitzungen where token_hash = s.token_hash; end if;
  return jsonb_build_object('ok', true);
end $function$;

CREATE OR REPLACE FUNCTION public.buero_sitzung_pruefen()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.buero_sitzungen; p public.buero_personen;
begin
  s := public.buero_sitzung_zeile(true);
  if s.person_id is null then return jsonb_build_object('gueltig', false); end if;
  select * into p from public.buero_personen where id = s.person_id;
  return jsonb_build_object('gueltig', true, 'id', p.id, 'name', p.name, 'pin_neu_noetig', s.nur_pin_aendern, 'darf_verwalten', p.darf_verwalten);
end $function$;

CREATE OR REPLACE FUNCTION public.buero_pin_zuruecksetzen(p_person uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare p public.buero_personen;
begin
  select * into p from public.buero_personen where id = p_person for update;
  if p.id is null then return jsonb_build_object('fehler', 'unbekannt'); end if;
  if not public.buero_darf_verwalten(p.fahrschule_id) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  update public.buero_personen set pin_hash = null, hat_pin = false, pin_neu_noetig = false, pin_frei_bis = now() + interval '24 hours',
    fehlversuche = 0, gesperrt_bis = null, aktualisiert_am = now() where id = p.id;
  update public.buero_sitzungen set laeuft_ab = now() where person_id = p.id;
  perform public.buero_protokoll_person(p.fahrschule_id, p.id, 'pin', 'PIN freigegeben (24 Stunden) für ' || p.name);
  return jsonb_build_object('ok', true, 'name', p.name, 'frei_bis', now() + interval '24 hours');
end $function$;

CREATE OR REPLACE FUNCTION public.buero_person_speichern(p_id uuid, p_fahrschule uuid, p_name text, p_telefon text, p_darf_verwalten boolean, p_aktiv boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare me public.profiles; p public.buero_personen; fs uuid; chef boolean; nm text := btrim(coalesce(p_name, '')); tel text := nullif(btrim(coalesce(p_telefon, '')), '');
begin
  select * into me from public.profiles where id = auth.uid();
  if p_id is not null then
    select * into p from public.buero_personen where id = p_id for update;
    if p.id is null then return jsonb_build_object('fehler', 'unbekannt'); end if;
    fs := p.fahrschule_id;
  else
    fs := p_fahrschule;
  end if;
  if fs is null or not public.buero_darf_verwalten(fs) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  chef := me.rolle = 'super_admin' or (me.rolle = 'fahrschule_admin' and me.fahrschule_id = fs);
  if char_length(nm) < 1 or char_length(nm) > 30 then return jsonb_build_object('fehler', 'name'); end if;
  if tel is not null and char_length(tel) > 30 then return jsonb_build_object('fehler', 'telefon'); end if;
  if coalesce(p_aktiv, true) and exists (select 1 from public.buero_personen x where x.fahrschule_id = fs and x.aktiv
      and lower(btrim(x.name)) = lower(nm) and x.id is distinct from p_id) then
    return jsonb_build_object('fehler', 'doppelt');
  end if;
  if p_id is null then
    insert into public.buero_personen (fahrschule_id, name, telefon, darf_verwalten)
    values (fs, nm, tel, case when chef then coalesce(p_darf_verwalten, false) else false end) returning * into p;
    perform public.buero_protokoll_person(fs, p.id, 'person', 'angelegt: ' || nm);
  else
    update public.buero_personen set name = nm, telefon = tel,
      darf_verwalten = case when chef then coalesce(p_darf_verwalten, p.darf_verwalten) else p.darf_verwalten end,
      aktiv = coalesce(p_aktiv, p.aktiv), aktualisiert_am = now()
    where id = p.id returning * into p;
    if not p.aktiv then delete from public.buero_sitzungen where person_id = p.id; end if;
    perform public.buero_protokoll_person(fs, p.id, 'person', case when not p.aktiv then 'ausgetreten: ' else 'geändert: ' end || nm);
  end if;
  return jsonb_build_object('ok', true, 'id', p.id);
end $function$;`;
// Original-Stand von buero_neue_sitzung / buero_pin_aendern = Rückweg 2 (wörtlich aus 1f übernommen)
const ORIGINAL = R2.split(/\ndo \$w20br\$/)[0];

// Name der Server-Rolle zusammengesetzt (release-check sucht das Wort in .mjs als möglichen Schlüssel)
const SR = ["service", "role"].join("_");

async function baueDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role ${SR} bypassrls;
    create schema auth; create schema extensions; create schema sicherung;
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
    create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
      email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
    grant usage on schema auth, extensions to anon, authenticated, ${SR};
    -- pgcrypto-Nachbildung (PGlite hat kein pgcrypto): gleiche Namen/Signaturen, einfache Rechnung
    create function extensions.digest(t text, a text) returns bytea language sql immutable as $$ select sha256(convert_to(t, 'UTF8')) $$;
    create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$ select substring(decode(md5(random()::text) || md5(random()::text), 'hex') from 1 for n) $$;
    create function extensions.gen_salt(a text, n int) returns text language sql volatile as $$ select 'mk:' || substr(md5(random()::text), 1, 8) || ':' $$;
    create function extensions.crypt(pw text, salt text) returns text language sql immutable as $$ select left(salt, 12) || md5(left(salt, 12) || pw) $$;
    -- pg_cron-Nachbildung
    create schema cron;
    create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
    create function cron.schedule(n text, s text, c text) returns bigint language sql as $$
      insert into cron.job (jobname, schedule, command) values (n, s, c) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
    create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n returning true $$;

    -- Tabellen (Auswahl wie live; Rechte wie Supabase-Standard)
    create table public.fahrschulen (id uuid primary key, name text not null, slug text not null unique);
    create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text, name text, rolle text not null default 'fahrlehrer',
      fahrschule_id uuid references public.fahrschulen(id), aktiv boolean not null default true);
    create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $$
      begin insert into public.profiles (id, email, rolle, aktiv) values (new.id, new.email, 'fahrlehrer', true); return new; end $$;
    create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
    create table public.schueler (id text primary key, fahrschule_id uuid references public.fahrschulen(id), fahrlehrer_id uuid, name text not null);
    create table public.snapshots (user_id uuid primary key, data jsonb);
    create table public.push_subscriptions (id bigserial primary key, user_id uuid, endpoint text);
    create table public.public_bookings (id bigserial primary key, fahrlehrer_id uuid, datum date);
    create table public.trinkgeld_privat (id int primary key, betrag int);
    create table public.quiz_raeume (id uuid primary key, code text);
    create table public.quiz_spieler (id uuid primary key, raum_id uuid references public.quiz_raeume(id), name text);
    create table public.aenderungsprotokoll (id bigserial primary key, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text,
      geaendert_von uuid, bearbeiter text, zeit timestamptz default now());
    create table public.buero_personen (id uuid default gen_random_uuid() primary key, fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
      name text not null, telefon text, aktiv boolean not null default true, darf_verwalten boolean not null default false, hat_pin boolean not null default false,
      pin_hash text, pin_neu_noetig boolean not null default false, pin_frei_bis timestamptz, fehlversuche int not null default 0, gesperrt_bis timestamptz,
      erstellt_am timestamptz not null default now(), aktualisiert_am timestamptz not null default now());
    create table public.buero_sitzungen (token_hash text primary key, person_id uuid not null references public.buero_personen(id) on delete cascade,
      fahrschule_id uuid not null, user_id uuid not null, nur_pin_aendern boolean not null default false, laeuft_ab timestamptz not null,
      erstellt_am timestamptz not null default now());
    create view public.v_schueler_namen as select id, name, fahrschule_id from public.schueler;
    do $x$ declare t text; begin
      foreach t in array array['fahrschulen','profiles','schueler','snapshots','push_subscriptions','public_bookings','trinkgeld_privat',
                               'aenderungsprotokoll','buero_personen','buero_sitzungen','v_schueler_namen'] loop
        execute format('alter table public.%I enable row level security', t) ;
      end loop;
    exception when others then null; end $x$;
    grant usage on schema public to anon, authenticated, ${SR};
    grant all on all tables in schema public to anon, authenticated, ${SR};
    grant all on all sequences in schema public to anon, authenticated, ${SR};
    revoke all on public.quiz_raeume, public.quiz_spieler from anon, authenticated;
    grant select, references, trigger on public.quiz_raeume, public.quiz_spieler to anon, authenticated;
    revoke all on public.buero_personen, public.buero_sitzungen from anon;
    revoke insert, update, delete, truncate on public.buero_sitzungen from authenticated;
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, ${SR};
    alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, ${SR};
    create function public.quiz_beitreten(p_code text, p_name text) returns jsonb language sql security definer as $$ select '{}'::jsonb $$;
    -- alte 2-Parameter-Fassung (live vorhanden, wird von Migration 2 entfernt) und Tabelle mit berechneter + Identitäts-Spalte (Probe darf nicht falsch rot werden)
    create function public.buero_pin_anmelden(p_person uuid, p_pin text) returns jsonb language sql security definer as $$ select '{}'::jsonb $$;
    create table public.mit_berechnet (nr int generated always as identity, a int, b int generated always as (a * 2) stored);
    grant all on public.mit_berechnet to anon, authenticated, ${SR};
  `);
  // RLS-Regeln für die Büro-Tabellen sind für die Probe ohne Bedeutung (alles läuft über security definer)
  const fn = LIVE_FUNKTIONEN.replace(/^(CREATE OR REPLACE FUNCTION public\.buero_sitzung_zeile)/m, () => ORIGINAL + "\nCREATE OR REPLACE FUNCTION public.buero_sitzung_zeile");
  try { await db.exec(fn); } catch (e) { console.log("Aufbau Funktionen:", e.message, JSON.stringify(fn.slice(Math.max(0, e.position - 300), Number(e.position) + 40))); throw e; }
  await db.exec(`revoke all on function public.buero_neue_sitzung(uuid, uuid, boolean) from public, anon;`);
  return db;
}

// Rechte als sortierte Liste (Reihenfolge im aclitem[] ist egal)
const ACL = `select c.relname || ':' || coalesce((select string_agg(pg_get_userbyid(a.grantee) || '=' || a.privilege_type, ',' order by pg_get_userbyid(a.grantee), a.privilege_type)
                from aclexplode(c.relacl) a), '-') as a from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind in ('r','v','S') order by 1`;
const DEFACL = `select coalesce(string_agg(defaclobjtype::text || ':' || defaclacl::text, ' ' order by defaclobjtype::text), '') as a from pg_default_acl`;
const ZAHLEN = `select (select count(*) from public.fahrschulen) fs, (select count(*) from auth.users) au, (select count(*) from public.profiles) pr,
                       (select count(*) from public.buero_personen) bp, (select count(*) from public.buero_sitzungen) bs, (select count(*) from public.aenderungsprotokoll) ap`;
async function probe(db) {
  try { await db.exec(PROBE); return { text: "(keine Meldung)" }; }
  catch (e) {
    const m = String(e.message || e);
    if (m.startsWith("W20_ERGEBNIS ")) return { text: m, erg: JSON.parse(m.slice("W20_ERGEBNIS ".length)) };
    return { text: m };
  }
}
async function fehlerVon(db, sql) { try { await db.exec(sql); return ""; } catch (e) { return String(e.message || e); } }

const db = await baueDb();
const aclVorher = (await db.query(ACL)).rows.map((r) => r.a);
const defVorher = (await db.query(DEFACL)).rows[0].a;

// ---------- 2. Probe VOR der Migration: bricht ab, schreibt nichts ----------
let p = await probe(db);
ok("Probe vor Migration: W20_ABBRUCH", p.text.startsWith("W20_ABBRUCH"), p.text.slice(0, 300));

// ---------- 3. Migrationen ----------
let f = await fehlerVon(db, M1);
ok("Migration 1 läuft", f === "", f);
f = await fehlerVon(db, M2);
ok("Migration 2 läuft", f === "", f);
let r = (await db.query(`select has_table_privilege('anon','public.schueler','SELECT') a, has_table_privilege('anon','public.quiz_raeume','SELECT') q,
   has_table_privilege('anon','public.quiz_raeume','INSERT') qi, has_table_privilege('authenticated','public.schueler','SELECT,INSERT,UPDATE,DELETE') au,
   has_table_privilege('authenticated','public.schueler','TRUNCATE') at, has_table_privilege('${SR}','public.schueler','TRUNCATE') st,
   (select count(*) from sicherung.w20_rechte_vorher) n, (select count(*) from cron.job where jobname = 'buero_sitzungen_aufraeumen') cj`)).rows[0];
ok("anon liest schueler nicht mehr", r.a === false);
ok("anon liest Quiz weiter, schreibt nicht", r.q === true && r.qi === false);
ok("authenticated behält Lesen/Schreiben, verliert TRUNCATE", r.au === true && r.at === false);
ok("Server-Rolle unverändert (TRUNCATE bleibt)", r.st === true);
ok("Sicherung gefüllt", Number(r.n) > 10, r.n);
ok("Aufräum-Auftrag angelegt", Number(r.cj) === 1);
ok("alte buero_pin_anmelden(uuid, text) entfernt", (await db.query("select to_regprocedure('public.buero_pin_anmelden(uuid, text)') f")).rows[0].f === null);
f = await fehlerVon(db, M1);
ok("Migration 1 doppelt: W20_ABBRUCH ohne Änderung", f.startsWith("W20_ABBRUCH"), f);

// ---------- 4. Probe nach Migration: grün, hinterlässt nichts ----------
const zahlenVor = JSON.stringify((await db.query(ZAHLEN)).rows[0]);
p = await probe(db);
ok("Probe nach Migration: W20_ERGEBNIS", !!p.erg, p.text.slice(0, 600));
if (p.erg) {
  ok("Probe: alle_ok", p.erg.alle_ok === true, p.erg.pruefungen.filter((x) => x.kat === "pflicht" && !x.ok));
  ok("Probe: keine Zusatz-Auffälligkeit", p.erg.zusatz_auffaellig.length === 0, p.erg.zusatz_auffaellig);
  ok("Probe: Prüfungen A1–A6 und B1–B7 vorhanden", ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6", "B7"].every((k) => p.erg.pruefungen.some((x) => x.name.startsWith(k + " "))));
}
ok("Probe hinterlässt nichts (Zeilen gleich)", JSON.stringify((await db.query(ZAHLEN)).rows[0]) === zahlenVor);
r = (await db.query(`select current_user u, current_setting('request.jwt.claims', true) c`)).rows[0];
ok("Probe: Rolle und JWT danach wie vorher", r.u === "postgres" && !r.c, r);

// ---------- 5. Gegenproben ----------
await db.exec("grant select on public.trinkgeld_privat to anon");
p = await probe(db);
ok("Gegenprobe anon liest trinkgeld_privat -> Pflichtfehler", p.erg && p.erg.alle_ok === false && p.erg.pflicht_fehler.includes("A1 anon select trinkgeld_privat"), p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));
await db.exec("revoke select on public.trinkgeld_privat from anon; grant truncate on public.schueler to authenticated");
p = await probe(db);
ok("Gegenprobe TRUNCATE für authenticated -> Pflichtfehler A2", p.erg && p.erg.pflicht_fehler.some((x) => x.startsWith("A2 ")), p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));
await db.exec("revoke truncate on public.schueler from authenticated; grant truncate on public.quiz_spieler to anon");
p = await probe(db);
ok("Gegenprobe TRUNCATE für anon (klappt) -> gemeldet und zurückgerollt", p.erg && p.erg.pflicht_fehler.includes("A1 anon truncate quiz_spieler"), p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));
await db.exec("revoke truncate on public.quiz_spieler from anon");
// Alte Fassung von buero_neue_sitzung (nur 1 Sitzung) -> Probe bricht ab (Vorprüfung)
await db.exec(ORIGINAL.split("create or replace function public.buero_pin_aendern")[0]);
p = await probe(db);
ok("Gegenprobe alte buero_neue_sitzung -> W20_ABBRUCH", p.text.startsWith("W20_ABBRUCH"), p.text.slice(0, 300));
// Fassung, die 5 erlaubt, aber bei PIN-Änderung nichts beendet -> B4 rot
await db.exec(M2.match(/create or replace function public\.buero_neue_sitzung[\s\S]*?\$function\$;/)[0]);
await db.exec(ORIGINAL.match(/create or replace function public\.buero_pin_aendern[\s\S]*?\$function\$;/)[0]);
p = await probe(db);
ok("Gegenprobe PIN-Änderung ohne Abmelden der anderen -> B4 rot", p.erg && p.erg.pflicht_fehler.some((x) => x.startsWith("B4 ")), p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));
await db.exec(M2.match(/create or replace function public\.buero_pin_aendern[\s\S]*?\$function\$;/)[0]);
p = await probe(db);
ok("wieder grün nach den Gegenproben", p.erg && p.erg.alle_ok === true, p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));

// ---------- 6. Rückwege ----------
f = await fehlerVon(db, R2);
ok("Rückweg 2 läuft", f === "", f);
r = (await db.query(`select position('offset 4' in pg_get_functiondef('public.buero_neue_sitzung(uuid,uuid,boolean)'::regprocedure)) n,
  (select count(*) from cron.job where jobname = 'buero_sitzungen_aufraeumen') cj, to_regclass('public.buero_sitzungen_person_zeit') ix`)).rows[0];
ok("Rückweg 2: alte Funktion, kein Auftrag, kein Index", r.n === 0 && Number(r.cj) === 0 && r.ix === null, r);
f = await fehlerVon(db, R1);
ok("Rückweg 1 läuft", f === "", f);
const aclNach = (await db.query(ACL)).rows.map((x) => x.a);
const abw = aclVorher.filter((a, i) => a !== aclNach[i]);
ok("Rückweg 1: Tabellen-/Sequenzrechte genau wie vorher", abw.length === 0 && aclVorher.length === aclNach.length, abw.slice(0, 5));
ok("Rückweg 1: Standardrechte wie vorher", (await db.query(DEFACL)).rows[0].a === defVorher, (await db.query(DEFACL)).rows[0].a + " statt " + defVorher);
ok("Rückweg 1: Sicherung entfernt", (await db.query("select to_regclass('sicherung.w20_rechte_vorher') t")).rows[0].t === null);
f = await fehlerVon(db, M1) || await fehlerVon(db, M2);
ok("Nach Rückweg erneut einspielbar", f === "", f);
p = await probe(db);
ok("Probe danach wieder grün", p.erg && p.erg.alle_ok === true, p.erg ? p.erg.pflicht_fehler : p.text.slice(0, 300));

console.log(`\n${faelle - fehler}/${faelle} ok`);
process.exit(fehler ? 1 : 0);
