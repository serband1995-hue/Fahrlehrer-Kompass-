-- W15 Schritt 1 „Reaktivierung entfällt = keine Sperre“ (🗣 Serband 24.11.2026, Entscheidungen 1a und 2a der Hauptsitzung).
-- Bisher sperrte der Server (K8, schueler_reakt_gesperrt) nach 12 Monaten ohne bezahlte Reaktivierung, auch wenn die
-- Preisliste „entfällt“ sagte. Neu, gleiche Regel wie KR.reaktInfo in kompass-rechnen.js:
--   Die Reaktivierung ist für einen Schüler „frei“ (keine Fälligkeit, keine Sperre), wenn sie in der Preisliste
--   HEUTE entfällt oder 0 € kostet, ODER wenn sie am VERTRAGSTAG des Schülers entfiel oder 0 € kostete.
--   „entfällt“ = Zeile der Art reaktivierung mit betrag_cent null. Ohne Preislisten-Eintrag gilt die alte Regel (kostet).
--   Am selben „gültig ab“-Tag gilt die zuletzt angelegte Zeile (wie preisAm im Büro).
-- Die Monate bis zur Fälligkeit kommen aus reakt_monate(fahrschule). Heute fest 12; Schritt 3 liest sie aus den
-- Einstellungen (fahrschule_einstellungen, Werkstatt 11) und ersetzt nur diese eine Funktion.
-- reakt_regel(fahrschule): die Regel für App und Büro, OHNE Preise (Fahrlehrer verlieren ab 28.11. das Leserecht auf
--   die Preisliste): { "monate": 12, "frei": [ { "ab": "2026-11-24", "bis": null }, … ] } – nur die Zeiträume, in denen
--   die Reaktivierung frei ist. Nur für Mitglieder der Fahrschule und den Super-Admin, sonst null.
-- Voraussetzung: 20261123_k8_01 (Sperre) und 20261123_k9_01 (Preisliste), beide live. Idempotent.
-- Rückweg: supabase/rueckweg/20261126_w15_01_rueckweg.sql

-- Monate bis zur Fälligkeit (Schritt 3: aus den Einstellungen)
create or replace function public.reakt_monate(p_fs uuid)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select 12
$function$;

-- Ist die Reaktivierung dieser Fahrschule an diesem Tag frei (entfällt oder 0 €)? Kein Eintrag oder kein Tag = nein.
create or replace function public.reakt_frei_am(p_fs uuid, p_tag date)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce((
    select p.betrag_cent is null or p.betrag_cent = 0
      from public.fahrschule_preise p
     where p.fahrschule_id = p_fs and p.art = 'reaktivierung' and p.klasse is null and p.gueltig_ab <= p_tag
     order by p.gueltig_ab desc, p.angelegt_am desc, p.id desc
     limit 1), false)
$function$;

-- (a) aus K8: Reaktivierung gesperrt. Neu: Monate aus reakt_monate, frei heute oder am Vertragstag = nie gesperrt.
--     security definer, damit die Hilfsfunktionen oben nicht für jeden aufrufbar sein müssen.
create or replace function public.schueler_reakt_gesperrt(s public.schueler)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(j->>'reakt_status', '') <> 'befreit'
     and coalesce(j->>'reakt_status', '') <> 'pruefen'
     and coalesce(nullif(j->>'reakt_bezahlt_bis', '')::date,
                  (nullif(j->>'vertrag_am', '')::date
                   + make_interval(months => coalesce(public.reakt_monate(nullif(j->>'fahrschule_id', '')::uuid), 12)))::date) < x.heute
     and not public.reakt_frei_am(nullif(j->>'fahrschule_id', '')::uuid, x.heute)
     and not public.reakt_frei_am(nullif(j->>'fahrschule_id', '')::uuid, nullif(j->>'vertrag_am', '')::date)
  from (select to_jsonb(s) as j, (now() at time zone 'Europe/Berlin')::date as heute) x;
$function$;

-- Regel für App und Büro: Monate und die Zeiträume, in denen die Reaktivierung frei ist (keine Beträge)
create or replace function public.reakt_regel(p_fs uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  frei jsonb;
begin
  if auth.uid() is null or p_fs is null then return null; end if;
  if not (p_fs is not distinct from public.k5_meine_fahrschule() or coalesce(public.is_super_admin(auth.uid()), false)) then
    return null;
  end if;
  with tage as (
    -- je „gültig ab“-Tag die zuletzt angelegte Zeile
    select distinct on (p.gueltig_ab) p.gueltig_ab, (p.betrag_cent is null or p.betrag_cent = 0) as ist_frei
      from public.fahrschule_preise p
     where p.fahrschule_id = p_fs and p.art = 'reaktivierung' and p.klasse is null
     order by p.gueltig_ab, p.angelegt_am desc, p.id desc
  ), zeit as (
    select t.gueltig_ab as ab, (lead(t.gueltig_ab) over (order by t.gueltig_ab) - 1) as bis, t.ist_frei from tage t
  )
  select coalesce(jsonb_agg(jsonb_build_object('ab', z.ab, 'bis', z.bis) order by z.ab) filter (where z.ist_frei), '[]'::jsonb)
    into frei from zeit z;
  return jsonb_build_object('monate', coalesce(public.reakt_monate(p_fs), 12), 'frei', frei);
end $function$;

-- schueler_reakt_gesperrt läuft jetzt als security definer: nur noch aus den Sperr-Funktionen (selbst security definer)
-- aufrufbar, nicht direkt (sonst ließe sich mit einer selbst gebauten Zeile die Preisliste einer fremden Fahrschule abfragen)
revoke all on function public.schueler_reakt_gesperrt(public.schueler) from public, anon, authenticated;
revoke all on function public.reakt_monate(uuid) from public, anon, authenticated;
revoke all on function public.reakt_frei_am(uuid, date) from public, anon, authenticated;
revoke all on function public.reakt_regel(uuid) from public, anon;
grant execute on function public.reakt_regel(uuid) to authenticated;

-- Ergebnis-Abfrage: erwartet funktionen = 4, gesperrt_neu = 1, regel_fuer_angemeldete = true, gesperrt_direkt = false
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
          and proname in ('reakt_monate', 'reakt_frei_am', 'schueler_reakt_gesperrt', 'reakt_regel')) as funktionen,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'schueler_reakt_gesperrt'
          and prosrc like '%reakt_frei_am%') as gesperrt_neu,
       has_function_privilege('authenticated', 'public.reakt_regel(uuid)', 'execute') as regel_fuer_angemeldete,
       has_function_privilege('authenticated', 'public.schueler_reakt_gesperrt(public.schueler)', 'execute') as gesperrt_direkt;
