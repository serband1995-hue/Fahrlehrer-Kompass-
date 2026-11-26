-- =====================================================================================================================
-- W20 (Fahrlehrer-Kompass) – Teil 1: NUR LESEN. Projekt oectrvkjunntzsggyhxv. NIE im Akademie-Projekt ausfuehren.
-- Jede Abfrage einzeln ausfuehren (1a, 1b, ...). Nur Katalog/Quelltext, keine Schuelerdaten.
-- Zweck: (A) anon-Rechte entziehen (zweite Schutzschicht), (B) Buero-Person an mehreren PCs.
-- =====================================================================================================================

-- 1a  Rechte von anon und authenticated auf Tabellen/Sichten in public (je Tabelle eine Zeile, Rechte als Liste)
select c.relname as tabelle, c.relkind as art, g.grantee,
       string_agg(g.privilege_type, ',' order by g.privilege_type) as rechte
from information_schema.role_table_grants g
join pg_class c on c.relname = g.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = g.table_schema
where g.table_schema = 'public' and g.grantee in ('anon','authenticated','PUBLIC')
group by 1,2,3 order by 1,3;

-- 1b  Tabellen/Sichten mit fahrschule_id oder fahrlehrer_id: RLS an? erzwungen? Sicht mit security_invoker?
select c.relname, c.relkind, c.relrowsecurity as rls, c.relforcerowsecurity as rls_erzwungen,
       coalesce((select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), '-') as security_invoker,
       string_agg(a.attname, ',' order by a.attname) as mandanten_spalten
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where n.nspname = 'public' and c.relkind in ('r','p','v','m') and a.attname in ('fahrschule_id','fahrlehrer_id')
group by c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reloptions order by 1;

-- 1c  Alle RLS-Regeln, die fuer anon oder public gelten (wer ohne Anmeldung etwas darf)
select tablename, policyname, cmd, roles::text, left(qual, 300) as using_ausdruck, left(with_check, 300) as with_check
from pg_policies where schemaname = 'public' and (roles::text like '%anon%' or roles::text like '%public%') order by 1,2;

-- 1d  Funktionen in public, die anon ausfuehren darf (Name, Argumente, security definer ja/nein)
select p.proname, pg_get_function_identity_arguments(p.oid) as argumente, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE') and p.prokind = 'f' order by 1;

-- 1e  Standard-Rechte fuer kuenftige Tabellen/Funktionen (Supabase vergibt sie meist an anon)
select pg_get_userbyid(d.defaclrole) as besitzer, n.nspname as schema, d.defaclobjtype as objektart, d.defaclacl::text as rechte
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace order by 1,2,3;

-- 1f  Quelltext aller Funktionen, die buero_sitzungen benutzen (buero_neue_sitzung, buero_pin_anmelden, buero_sitzung_pruefen,
--     buero_sitzung_beenden, buero_pin_aendern, Sperre/Freigabe einer Person, Hilfsfunktionen fuer x-buero-sitzung ...)
select p.proname, pg_get_function_identity_arguments(p.oid) as argumente, pg_get_functiondef(p.oid) as quelltext
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f' and (p.prosrc ilike '%buero_sitzungen%' or p.proname like 'buero\_%') order by 1;

-- 1g  Aufbau von buero_sitzungen und buero_personen: Spalten, Schluessel/Eindeutigkeit, Indizes, Regeln, Ausloeser, Rechte
select 'spalte' as was, table_name as tabelle, column_name || ' ' || data_type || coalesce(' default ' || column_default, '') || case when is_nullable = 'NO' then ' not null' else '' end as inhalt
from information_schema.columns where table_schema = 'public' and table_name in ('buero_sitzungen','buero_personen')
union all
select 'constraint', conrelid::regclass::text, conname || ': ' || pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.buero_sitzungen'::regclass, 'public.buero_personen'::regclass)
union all
select 'index', tablename, indexdef from pg_indexes where schemaname = 'public' and tablename in ('buero_sitzungen','buero_personen')
union all
select 'regel', tablename, policyname || ' ' || cmd || ' ' || roles::text || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') from pg_policies where schemaname = 'public' and tablename in ('buero_sitzungen','buero_personen')
union all
select 'ausloeser', tgrelid::regclass::text, pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid in ('public.buero_sitzungen'::regclass, 'public.buero_personen'::regclass)
order by 1,2,3;

-- 1h  Wie viele Sitzungen gibt es gerade (nur Zahlen, keine Namen): gesamt, noch gueltig, groesste Zahl je Person
select count(*) as gesamt, count(*) filter (where laeuft_ab > now()) as gueltig,
       (select max(n) from (select count(*) n from public.buero_sitzungen group by person_id) x) as max_je_person
from public.buero_sitzungen;

-- 1i  pg_cron-Auftraege (Namen + Zeitplan + Befehl), um zu sehen, ob abgelaufene Sitzungen schon aufgeraeumt werden
select jobname, schedule, left(command, 200) as befehl from cron.job order by 1;
