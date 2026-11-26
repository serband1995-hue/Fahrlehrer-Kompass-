// W19 Teil 3: Live-Probe scripts/sql/w19-3-probe.sql in PGlite (Attrappe von auth/profiles/schueler) – läuft durch, alle Prüfungen ok, Rollback lässt nichts stehen.
// Aufruf: NODE_PATH=/tmp/w15-pg/node_modules node scripts/w19-3-probe-sql-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PGlite } = require("@electric-sql/pglite");
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const R = join(fileURLToPath(new URL(".", import.meta.url)), "..") + "/";
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to public;
  create table public.fahrschulen (id uuid primary key, name text, slug text not null unique);
  create table public.profiles (id uuid primary key, email text, name text, fahrschule_id uuid, rolle text, aktiv boolean default true);
  create table public.schueler (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, name text, telefon text, status text, paket_id text, hat_simulator boolean, hat_theorie_app boolean, bogen_ausgefuellt boolean, ausbildung jsonb, erstellt_von uuid, aktualisiert_am timestamptz);
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select null::text $$;
  create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
  create or replace function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
    select coalesce(exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true)) and (is_super_admin(auth.uid())
      or (fs is not null and fs = k5_meine_fahrschule() and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())))), false);
  $function$;
  grant usage on schema public to authenticated;
  grant select on public.schueler, public.profiles to authenticated;
`);
await db.exec(readFileSync(R + "supabase/migrations/20261125_einst_01_fahrschule_einstellungen.sql", "utf8"));
await db.exec(readFileSync(R + "supabase/migrations/20261201_w19_02_zahlungsbelege.sql", "utf8"));
await db.exec(readFileSync(R + "supabase/migrations/20261202_w19_03_punkte.sql", "utf8"));
let bad = 0;
try { await db.exec(readFileSync(R + "scripts/sql/w19-3-probe.sql", "utf8")); bad++; console.log("FEHLER: Probe endet nicht mit RAISE"); }
catch (e) { const m = String(e.message); if (m.startsWith("W19_ERGEBNIS")) { const j = JSON.parse(m.slice(13)); if (!j.alle_ok) { bad++; console.log("FEHLER", JSON.stringify(j.fehler)); } else console.log(`ok  Probe: ${j.pruefungen.length} Prüfungen, alle wie erwartet`); } else { bad++; console.log("FEHLER", m); } }
const rest = (await db.query("select (select count(*) from public.schueler_punkte)::int b, (select count(*) from public.fahrschulen)::int f, (select count(*) from auth.users)::int u, (select count(*) from public.fahrschule_einstellungen)::int e")).rows[0];
if (rest.b + rest.f + rest.u + rest.e) { bad++; console.log("FEHLER nach Rollback blieb etwas stehen", JSON.stringify(rest)); } else console.log("ok  nach Rollback ist nichts stehen geblieben");
process.exit(bad ? 1 : 0);
