-- W15 Schritt 3 „Fristen einstellbar“ (🗣 Serband 24.11.2026: „Alles ist einstellbar … unterteilt in Themen“).
-- Die Monate bis zur Reaktivierung kommen ab jetzt aus den Einstellungen der Fahrschule (Thema „Fristen“ im Büro,
-- Tabelle fahrschule_einstellungen von Werkstatt 11, Schlüssel 'fristen.reaktivierung', Feld 'monate').
-- Ersetzt NUR public.reakt_monate(fs) aus 20261126_w15_01. Ohne Eintrag (oder Wert außerhalb 1–60, keine ganze Zahl)
-- gilt wie bisher 12. Damit folgen die Sperre (schueler_reakt_gesperrt) und reakt_regel (für App und Büro) derselben Zahl.
-- Alle anderen Fristen (Theorie, Antrag, Fahrcheck-Zettel, Warnzeiten) rechnen nur App und Büro, der Server sperrt dort nicht.
-- Gesetzliche Fristen sind nicht einstellbar (Entscheidung 4a): Praxisprüfung 12 Monate nach der Theorieprüfung (§ 18 FeV),
-- Umschreiber 6 Monate (§ 29 FeV).
-- Voraussetzung: 20261125_einst_01 (fahrschule_einstellungen, fahrschule_einstellung_zahl) und 20261126_w15_01, beide live.
-- Idempotent. Rückweg: supabase/rueckweg/20261127_w15_02_rueckweg.sql (wieder fest 12). Achtung: W11s Rückweg
-- (20261125_einst_rueckweg.sql) erst nach diesem Rückweg ausführen, sonst fehlt reakt_monate die Funktion.

do $$ begin
  if to_regprocedure('public.fahrschule_einstellung_zahl(uuid,text,text,integer,integer,integer)') is null then
    raise exception 'W15 S3: zuerst 20261125_einst_01_fahrschule_einstellungen.sql (Werkstatt 11) einspielen';
  end if;
  if to_regprocedure('public.reakt_monate(uuid)') is null then
    raise exception 'W15 S3: zuerst 20261126_w15_01_reakt_entfaellt.sql einspielen';
  end if;
end $$;

-- Monate bis zur Fälligkeit (und Abstand nach einer Zahlung) aus den Einstellungen, Standard 12, erlaubt 1–60
create or replace function public.reakt_monate(p_fs uuid)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select public.fahrschule_einstellung_zahl(p_fs, 'fristen.reaktivierung', 'monate', 12, 1, 60)
$function$;

revoke all on function public.reakt_monate(uuid) from public, anon, authenticated;

-- Ergebnis-Abfrage: erwartet monate_aus_einstellungen = true, ohne_eintrag = 12, monate_direkt = false
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reakt_monate'
          and prosrc like '%fristen.reaktivierung%') = 1 as monate_aus_einstellungen,
       public.reakt_monate('00000000-0000-4000-8000-000000000000'::uuid) as ohne_eintrag,
       has_function_privilege('authenticated', 'public.reakt_monate(uuid)', 'execute') as monate_direkt;
