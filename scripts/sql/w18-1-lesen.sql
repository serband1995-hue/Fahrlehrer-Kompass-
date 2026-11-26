-- W18 (Fahrlehrer-Kompass): NUR LESEN. Teil 1 der Live-Prüfung "10 Fahrlehrer einer Fahrschule arbeiten sauber getrennt".
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE gegen das Akademie-Projekt laufen lassen.
--
-- Was diese Datei ist:
--   Eine Sammlung EINZELNER SELECT-Abfragen. Jede für sich ausführen (eine nach der anderen, z. B. mit dem
--   Supabase-Werkzeug "execute_sql"); die Kommentare darüber sagen, was sie zeigen. Sie ändert nichts:
--   kein insert/update/delete, kein DDL, keine Funktion mit Nebenwirkung (nur pg_get_*def und has_function_privilege,
--   beide rein lesend).
-- Datenschutz: Es werden nur Strukturen und Zahlen ausgegeben. Keine Namen, keine E-Mails, keine Telefonnummern.
--   Ausnahme: Quelltexte von Funktionen (Abfrage 1b/1c). Lange, geheimnisartige Zeichenfolgen darin werden geschwärzt
--   (<GEKUERZT>); trotzdem die Ausgabe nicht weitergeben, sondern nur für die Prüfung nutzen.
-- Reihenfolge: ZUERST diese Datei auswerten, DANN erst w18-2-probe.sql laufen lassen
--   (die Probe bricht selbst ab, wenn ein Auslöser synchron nach außen telefonieren würde; hier sieht man es vorher).
--
-- Was der Richter hier suchen soll (Fund = melden):
--   * Tabelle mit fahrschule_id/fahrlehrer_id und RLS AUS (Abfrage 1a-1)            -> alle Zeilen für jeden sichtbar
--   * Sicht (View) ohne security_invoker                                              -> umgeht RLS des Aufrufers
--   * Regel mit "true" oder ohne Einschränkung auf auth.uid()/my_fahrschule_id()       (Abfrage 1d-1)
--   * security-definer-Funktionen, die anon/authenticated ausführen dürfen, ohne festen search_path (Abfrage 1d-2)
--   * ein Auslöser auf schueler/kalender_termine/profiles/auth.users, der synchron (dblink/http) nach außen ruft (1b-3, 1b-4)

-- =====================================================================================================================
-- 1a-1  Alle Tabellen/Sichten in public, die fahrlehrer_id ODER fahrschule_id haben (plus profiles und fahrschulen):
--       Ist RLS an (relrowsecurity), wird sie auch für den Tabelleneigentümer erzwungen (relforcerowsecurity)?
--       Spalte "bewertung": FUND bei RLS AUS; PRUEFEN bei Sicht ohne security_invoker.
-- =====================================================================================================================
select c.relname                                   as tabelle,
       case c.relkind when 'r' then 'Tabelle' when 'p' then 'Tabelle (partitioniert)' when 'v' then 'Sicht'
                      when 'm' then 'Sicht (gespeichert)' else c.relkind::text end as art,
       exists (select 1 from information_schema.columns ic where ic.table_schema = 'public' and ic.table_name = c.relname and ic.column_name = 'fahrschule_id') as hat_fahrschule_id,
       exists (select 1 from information_schema.columns ic where ic.table_schema = 'public' and ic.table_name = c.relname and ic.column_name = 'fahrlehrer_id') as hat_fahrlehrer_id,
       c.relrowsecurity                            as rls_an,
       c.relforcerowsecurity                       as rls_erzwungen_auch_fuer_eigentuemer,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as anzahl_regeln,
       c.relowner::regrole::text                   as eigentuemer,
       coalesce(c.reloptions::text, '')            as optionen,
       case when c.relkind in ('r', 'p') and not c.relrowsecurity then 'FUND: RLS AUS'
            when c.relkind in ('r', 'p') and c.relrowsecurity and (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) = 0 then 'PRUEFEN: RLS an, aber keine Regel (niemand ausser Eigentuemer sieht etwas)'
            when c.relkind in ('v', 'm') and coalesce(c.reloptions::text, '') not like '%security_invoker=true%' and coalesce(c.reloptions::text, '') not like '%security_invoker=on%' then 'PRUEFEN: Sicht ohne security_invoker (laeuft mit Rechten des Eigentuemers, umgeht RLS)'
            else 'ok' end                          as bewertung
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
  and (c.relname in ('profiles', 'fahrschulen')
       or exists (select 1 from information_schema.columns ic
                  where ic.table_schema = 'public' and ic.table_name = c.relname
                    and ic.column_name in ('fahrlehrer_id', 'fahrschule_id')))
order by (case when c.relkind in ('r', 'p') and not c.relrowsecurity then 0 else 1 end), c.relname;

-- =====================================================================================================================
-- 1a-2  Alle RLS-Regeln (pg_policies) dieser Tabellen. "permissive" = PERMISSIVE (ODER-verknuepft) oder RESTRICTIVE (UND).
--       qual = Bedingung zum Sehen/Aendern/Loeschen, with_check = Bedingung fuer neue/geaenderte Zeilen.
-- =====================================================================================================================
select p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
from pg_policies p
where p.schemaname = 'public'
  and (p.tablename in ('profiles', 'fahrschulen')
       or exists (select 1 from information_schema.columns ic
                  where ic.table_schema = 'public' and ic.table_name = p.tablename
                    and ic.column_name in ('fahrlehrer_id', 'fahrschule_id')))
order by p.tablename, p.cmd, p.policyname;

-- =====================================================================================================================
-- 1b-1  Quelltext der Auslöser-Funktionen handle_new_user und profil_schutz (und aller gleichnamigen Ueberladungen).
--       Lange geheimnisartige Zeichenfolgen sind geschwaerzt.
-- =====================================================================================================================
select n.nspname as schema, p.proname as funktion, p.prosecdef as security_definer, coalesce(p.proconfig::text, '') as einstellungen,
       regexp_replace(pg_get_functiondef(p.oid), '[A-Za-z0-9_.+/=-]{40,}', '<GEKUERZT>', 'g') as quelltext
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('handle_new_user', 'profil_schutz')
order by n.nspname, p.proname;

-- =====================================================================================================================
-- 1b-2  Alle Auslöser (Trigger) auf auth.users und public.profiles, als Definition (pg_get_triggerdef) + ob aktiv
--       (tgenabled: O = an, D = aus, R = nur Replica, A = immer).
-- =====================================================================================================================
select t.tgrelid::regclass::text as tabelle, t.tgname as ausloeser, t.tgenabled as aktiv_kennung,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where not t.tgisinternal
  and t.tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
order by t.tgrelid::regclass::text, t.tgname;

-- =====================================================================================================================
-- 1b-3  Alle Auslöser auf schueler, kalender_termine, fahrschulen (die Tabellen, die die Probe beschreibt) mit der
--       Funktion, die sie rufen, und ob deren Quelltext "net.http" (pg_net, asynchron), "dblink" oder ein synchrones
--       http (extensions.http / http_get / http_post ...) enthaelt. Spalte "synchron_nach_aussen" muss ueberall false sein.
-- =====================================================================================================================
select t.tgrelid::regclass::text as tabelle, t.tgname as ausloeser, t.tgenabled as aktiv_kennung,
       pn.nspname || '.' || p.proname as funktion, p.prosecdef as security_definer, l.lanname as sprache,
       (p.prosrc ~* 'net\.http_') as nutzt_pg_net_asynchron,
       (regexp_replace(p.prosrc, 'net\.http_', 'NETHTTP_', 'gi') ~* '(dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|\mhttp\s*\()'
        or l.lanname in ('plpython3u', 'plpythonu', 'plperlu', 'pltclu')) as synchron_nach_aussen
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where not t.tgisinternal
  and t.tgrelid in (to_regclass('public.schueler'), to_regclass('public.kalender_termine'), to_regclass('public.fahrschulen'),
                    to_regclass('public.profiles'), to_regclass('auth.users'))
order by t.tgrelid::regclass::text, t.tgname;

-- =====================================================================================================================
-- 1b-4  Quelltext der Funktion akademie_sync_anstossen (Auslöser trg_akademie_sync auf schueler: Statement-Trigger,
--       vermutlich pg_net -> Akademie-Funktion). Dazu alle Funktionen in public/extensions/supabase_functions, deren Quelltext
--       "net.http", "dblink", "http_get/http_post" oder "supabase_functions" erwaehnt (nur Namen). Geheimnisse geschwaerzt.
-- =====================================================================================================================
select n.nspname as schema, p.proname as funktion, pg_get_function_identity_arguments(p.oid) as argumente,
       regexp_replace(pg_get_functiondef(p.oid), '[A-Za-z0-9_.+/=-]{40,}', '<GEKUERZT>', 'g') as quelltext
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'akademie_sync_anstossen';

select n.nspname as schema, p.proname as funktion, pg_get_function_identity_arguments(p.oid) as argumente,
       (p.prosrc ~* 'net\.http_') as pg_net,
       (regexp_replace(p.prosrc, 'net\.http_', 'NETHTTP_', 'gi') ~* '(dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|\mhttp\s*\()') as synchron_http_oder_dblink,
       (p.prosrc ~* 'supabase_functions') as webhook
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'extensions', 'supabase_functions')
  and p.prolang in (select oid from pg_language where lanname in ('plpgsql', 'sql', 'plpython3u', 'plpythonu', 'plperlu', 'pltclu'))
  and (p.prosrc ~* '(net\.http_|dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|supabase_functions)')
order by n.nspname, p.proname;

-- =====================================================================================================================
-- 1b-5  Installierte Erweiterungen (pg_net, http, dblink, pg_cron ...) und Zeitplaene von pg_cron (nur Name, Takt, aktiv,
--       ob der Befehl net.http enthaelt; der Befehl selbst wird NICHT ausgegeben, weil er Schluessel enthalten koennte).
--       Falls es das Schema cron nicht gibt, schlaegt nur die zweite Abfrage fehl: dann gibt es keinen Zeitplan.
-- =====================================================================================================================
select extname as erweiterung, extversion as version, extnamespace::regnamespace::text as schema
from pg_extension
order by extname;

select jobname, schedule, active, (command ~* 'net\.http_') as befehl_nutzt_pg_net
from cron.job
order by jobname;

-- =====================================================================================================================
-- 1c    Quelltext der vier Rechte-Hilfsfunktionen (alle Ueberladungen).
-- =====================================================================================================================
select n.nspname as schema, p.proname as funktion, pg_get_function_identity_arguments(p.oid) as argumente,
       p.prosecdef as security_definer, coalesce(p.proconfig::text, '') as einstellungen,
       regexp_replace(pg_get_functiondef(p.oid), '[A-Za-z0-9_.+/=-]{40,}', '<GEKUERZT>', 'g') as quelltext
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('my_fahrschule_id', 'is_buero', 'is_fahrschule_admin', 'is_super_admin')
order by n.nspname, p.proname, argumente;

-- =====================================================================================================================
-- 1d    "Selbst registriertes Konto ohne Fahrschule": Supabase-Anmeldung ist an, handle_new_user macht daraus
--       rolle fahrlehrer, fahrschule_id leer. Was darf so ein Konto? (Ob Selbst-Registrierung an ist, steht NICHT in der
--       Datenbank, sondern im Supabase-Dashboard unter Authentication -> Sign In / Providers -> "Allow new users to sign up".)
-- =====================================================================================================================

-- 1d-1  Regeln in public/storage fuer Rolle authenticated/anon/public, deren Bedingung NICHT erkennbar auf den Nutzer oder
--       die eigene Fahrschule eingeschraenkt ist. "weit_lesen/aendern" = Bedingung ohne auth.uid()/auth.jwt()/my_fahrschule_id()/
--       is_*()/..._meine_fahrschule()/..._darf...(); "weit_neu" = with_check ebenso (bei SELECT/DELETE nicht relevant).
--       Jede Zeile ist ein Kandidat zum Nachsehen (auch gewollt oeffentliche, z. B. Quiz-Raeume), kein automatischer Fund.
with r as (
  select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check,
         '(auth\.uid\(\)|auth\.jwt\(\)|my_fahrschule_id\(\)|is_[a-z_]+\(|[a-z0-9_]*meine_fahrschule\(\)|[a-z0-9_]*_darf[a-z_]*\(|current_user|session_user)' as muster
  from pg_policies p
  where p.schemaname in ('public', 'storage')
    and p.roles && array['public', 'authenticated', 'anon']::name[]
), b as (
  select r.*,
         (r.qual is null or r.qual !~* r.muster) as qual_weit,
         (r.with_check is null or r.with_check !~* r.muster) as check_weit
  from r
)
select b.schemaname, b.tablename, b.policyname, b.permissive, b.roles, b.cmd, b.qual, b.with_check,
       case when b.cmd in ('SELECT', 'DELETE') then b.qual_weit
            when b.cmd = 'INSERT' then b.check_weit
            else (b.qual_weit or coalesce((b.with_check is not null and b.check_weit), false)) end as weit_offen,
       case when b.permissive = 'RESTRICTIVE' then 'Einschraenkung (RESTRICTIVE), kein Offen-Risiko' else 'PERMISSIVE' end as hinweis
from b
where case when b.cmd in ('SELECT', 'DELETE') then b.qual_weit
           when b.cmd = 'INSERT' then b.check_weit
           else (b.qual_weit or coalesce((b.with_check is not null and b.check_weit), false)) end
order by (b.permissive = 'RESTRICTIVE'), b.schemaname, b.tablename, b.cmd, b.policyname;

-- 1d-2  security-definer-Funktionen in public (laufen mit den Rechten ihres Eigentuemers, umgehen RLS), die anon und/oder
--       authenticated ausfuehren duerfen. Nur Name + Argumente + Rechte-Kennzeichen. Spalte "fester_search_path": false ist
--       ein Risiko (Funktionen sollten search_path fest setzen). Jede dieser Funktionen muss selbst auth.uid()/Rolle pruefen.
select p.proname as funktion, pg_get_function_identity_arguments(p.oid) as argumente,
       has_function_privilege('anon', p.oid, 'execute') as anon_darf,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_darf,
       (p.proconfig is not null and exists (select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%')) as fester_search_path,
       p.prorettype::regtype::text as rueckgabe
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
order by anon_darf desc, p.proname;

-- 1d-3  Direkte Tabellenrechte der Rolle anon auf Tabellen mit fahrschule_id/fahrlehrer_id (nur Struktur). Sollte leer
--       oder sehr klein sein; RLS entscheidet dann, aber jedes Recht fuer anon ist ein zusaetzliches Risiko.
select g.table_name as tabelle, string_agg(g.privilege_type, ', ' order by g.privilege_type) as anon_rechte
from information_schema.role_table_grants g
where g.grantee = 'anon' and g.table_schema = 'public'
  and exists (select 1 from information_schema.columns ic
              where ic.table_schema = 'public' and ic.table_name = g.table_name and ic.column_name in ('fahrlehrer_id', 'fahrschule_id'))
group by g.table_name
order by g.table_name;

-- 1d-4  Anzahl Profile OHNE Fahrschule je Rolle (nur Zahlen). Erwartung: super_admin (Betreiber) und gesperrte/entfernte;
--       jeder andere Eintrag ist ein selbst registriertes oder unfertiges Konto.
select p.rolle, count(*) as anzahl, count(*) filter (where p.aktiv) as davon_aktiv
from public.profiles p
where p.fahrschule_id is null
group by p.rolle
order by p.rolle;
