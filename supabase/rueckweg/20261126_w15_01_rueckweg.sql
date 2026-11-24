-- Rückweg zu supabase/migrations/20261126_w15_01_reakt_entfaellt.sql (W15 Schritt 1: „entfällt“ = keine Sperre).
-- Stellt schueler_reakt_gesperrt wieder wie in K8 her (fest 12 Monate, Preisliste egal) und nimmt die drei neuen
-- Funktionen heraus. App und Büro kommen ohne reakt_regel aus (sie rechnen dann wieder wie vorher).
create or replace function public.schueler_reakt_gesperrt(s public.schueler)
 returns boolean
 language sql
 stable
 security invoker
 set search_path to 'public'
as $function$
  select coalesce(j->>'reakt_status', '') <> 'befreit'
     and coalesce(j->>'reakt_status', '') <> 'pruefen'
     and coalesce(nullif(j->>'reakt_bezahlt_bis', '')::date,
                  (nullif(j->>'vertrag_am', '')::date + interval '12 months')::date) < (now() at time zone 'Europe/Berlin')::date
  from (select to_jsonb(s) as j) x;
$function$;

drop function if exists public.reakt_regel(uuid);
drop function if exists public.reakt_frei_am(uuid, date);
drop function if exists public.reakt_monate(uuid);

-- Ergebnis-Abfrage: erwartet neue_funktionen = 0, gesperrt_alt = 1
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
          and proname in ('reakt_monate', 'reakt_frei_am', 'reakt_regel')) as neue_funktionen,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'schueler_reakt_gesperrt'
          and prosrc not like '%reakt_frei_am%') as gesperrt_alt;
