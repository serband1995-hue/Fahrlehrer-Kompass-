-- Rückweg zu supabase/migrations/20261127_w15_02_fristen_einstellungen.sql (W15 Schritt 3).
-- Die Reaktivierung ist wieder fest 12 Monate nach Vertrag fällig (Stand 20261126_w15_01). Gespeicherte Einstellungen
-- bleiben in fahrschule_einstellungen liegen, der Server beachtet sie nur nicht mehr. App und Büro lesen die Monate aus
-- reakt_regel und zeigen danach wieder 12.
create or replace function public.reakt_monate(p_fs uuid)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select 12
$function$;

revoke all on function public.reakt_monate(uuid) from public, anon, authenticated;

-- Ergebnis-Abfrage: erwartet monate_fest = true, monate_direkt = false
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reakt_monate'
          and prosrc not like '%fahrschule_einstellung%') = 1 as monate_fest,
       has_function_privilege('authenticated', 'public.reakt_monate(uuid)', 'execute') as monate_direkt;
