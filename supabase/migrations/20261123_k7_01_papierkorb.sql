-- K7 Löschen (🗣 Serband 22.11.2026: „Ich will keinen unnötigen Ballast.“) – Werkstatt 12.
-- 1. kalender_termine.geloescht_am: wann eine Stunde in den Papierkorb kam. Setzt nur der Server (Trigger), nicht die App.
-- 2. Trigger trg_termin_zy_papierkorb (vor trg_termin_zz_nachweis_spur, Reihenfolge nach Namen):
--    a) Kommt eine Stunde in den Papierkorb: geloescht_am = jetzt. Zurückgeholt: geloescht_am leer, Storno-Vermerk weg.
--    b) Ist es eine Nachweis-Stunde (Übungs-/Sonderfahrt, Schaltkompetenz), die schon gelaufen oder je unterschrieben
--       war, wird sie automatisch „storniert“ (payload.storno = {am, grund, automatisch}). So eine Stunde wird nie
--       endgültig gelöscht – auch wenn eine ältere App oder das Büro sie löscht. Die App schickt den Grund selbst mit
--       (payload.storno + payload.korrekturGrund); den Grund nimmt trg_termin_zz_nachweis_spur in die Spur.
--    c) geloescht_am und ein vorhandener Storno-Vermerk lassen sich im Papierkorb nicht überschreiben.
-- 3. Funktion papierkorb_leeren(): löscht endgültig nur Stunden, die seit mehr als 30 Tagen im Papierkorb liegen,
--    ohne Storno-Vermerk und nie unterschrieben. Je gelöschter Stunde bleibt ein Eintrag im aenderungsprotokoll (Spur).
--    Aufruf: täglich per pg_cron (falls vorhanden) und beim Laden der Büro-Seite (nur die eigene Fahrschule).
-- 4. Alter Papierkorb: geloescht_am = Zeitpunkt des Einspielens (30 Tage Schonfrist). Schon gelöschte gelaufene oder
--    unterschriebene Nachweis-Stunden bekommen vorsichtshalber den Storno-Vermerk (bleiben aufbewahrt).
-- ❓ Aufbewahrung der Ausbildungsaufzeichnung (§ 31 FahrlG) – rechtlich nicht geprüft, darum: im Zweifel aufbewahren.
-- Idempotent (mehrfach ausführbar). Rückweg: supabase/rueckweg/20261123_k7_rueckweg.sql

alter table public.kalender_termine add column if not exists geloescht_am timestamptz;
create index if not exists kalender_termine_papierkorb_idx on public.kalender_termine (geloescht_am) where geloescht;

-- Nachweis-Stunde, die schon gelaufen ist oder je unterschrieben war (dann nie endgültig löschen)
create or replace function public.termin_ist_nachweis(t public.kalender_termine)
 returns boolean
 language sql
 stable
 set search_path to 'public'
as $function$
  select coalesce(t.art, 'fahrstunde') in ('fahrstunde', 'sonder', 'nacht', 'schalt')
     and (coalesce(t.payload->>'signed', '') = 'true'
          or jsonb_typeof(t.payload->'signaturUngueltig') = 'object'
          or (coalesce(t.status, '') not in ('abgebrochen', 'nicht erschienen')
              and coalesce(t.payload->>'status', '') not in ('abgebrochen', 'nicht erschienen')
              and t.datum is not null
              and (t.datum < (now() at time zone 'Europe/Berlin')::date
                   or (t.datum = (now() at time zone 'Europe/Berlin')::date
                       and coalesce(t.bis, '') ~ '^\d{1,2}:\d{2}'
                       and t.bis::time <= (now() at time zone 'Europe/Berlin')::time))));
$function$;

create or replace function public.termin_papierkorb()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  war boolean := false;
  g text;
begin
  if tg_op = 'UPDATE' then war := coalesce(old.geloescht, false); end if;

  if coalesce(new.geloescht, false) then
    if war then
      -- schon im Papierkorb: Zeitpunkt und Storno-Vermerk bleiben
      new.geloescht_am := coalesce(old.geloescht_am, now());
      if jsonb_typeof(old.payload->'storno') = 'object' and jsonb_typeof(new.payload->'storno') is distinct from 'object' then
        new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('storno', old.payload->'storno');
      end if;
    else
      new.geloescht_am := now();
    end if;
    if jsonb_typeof(new.payload->'storno') is distinct from 'object' and public.termin_ist_nachweis(new) then
      g := nullif(left(coalesce(new.payload->>'korrekturGrund', ''), 300), '');
      new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('storno',
        jsonb_build_object('am', now(), 'grund', coalesce(g, 'ohne Grund'), 'automatisch', true));
    end if;
  else
    new.geloescht_am := null;
    if war and new.payload ? 'storno' then new.payload := new.payload - 'storno'; end if;
  end if;
  return new;
end $function$;

drop trigger if exists trg_termin_zy_papierkorb on public.kalender_termine;
create trigger trg_termin_zy_papierkorb before insert or update on public.kalender_termine
  for each row execute function public.termin_papierkorb();

-- Endgültig leeren: nur > 30 Tage im Papierkorb, ohne Storno, nie unterschrieben. Spur bleibt.
create or replace function public.papierkorb_leeren()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  fs uuid;
  n integer := 0;
  r record;
begin
  if auth.uid() is not null then
    -- Aufruf aus der Büro-Seite: nur die eigene Fahrschule, nur Büro/Leitung/Super-Admin
    if not (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then return 0; end if;
    fs := my_fahrschule_id();
    if fs is null and not is_super_admin(auth.uid()) then return 0; end if;
  end if;
  -- Je Stunde einzeln: hängt noch etwas an einer Stunde (Fremdschlüssel), bleibt sie liegen, der Rest wird trotzdem leer
  for r in
    select t.id, t.fahrschule_id, t.datum, t.von, t.bis from public.kalender_termine t
     where t.geloescht
       and t.geloescht_am is not null
       and t.geloescht_am < now() - interval '30 days'
       and jsonb_typeof(t.payload->'storno') is distinct from 'object'
       and coalesce(t.payload->>'signed', '') <> 'true'
       and jsonb_typeof(t.payload->'signaturUngueltig') is distinct from 'object'
       and (fs is null or t.fahrschule_id = fs)
     limit 5000
  loop
    begin
      delete from public.kalender_termine where id = r.id;
      if r.fahrschule_id is not null then
        insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
        values (r.fahrschule_id, 'kalender_termine', r.id, 'endgueltig_geloescht',
                coalesce(r.datum::text, '') || ' ' || coalesce(r.von, '') || '–' || coalesce(r.bis, ''), null, auth.uid(), null,
                'Papierkorb nach 30 Tagen geleert');
      end if;
      n := n + 1;
    exception when foreign_key_violation then null;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.papierkorb_leeren() from public, anon;
grant execute on function public.papierkorb_leeren() to authenticated;

-- Alter Papierkorb: Schonfrist ab heute; gelaufene/unterschriebene Nachweis-Stunden vorsichtshalber aufbewahren
update public.kalender_termine t
   set geloescht_am = now(),
       payload = case when jsonb_typeof(t.payload->'storno') is distinct from 'object' and public.termin_ist_nachweis(t)
                      then coalesce(t.payload, '{}'::jsonb) || jsonb_build_object('storno',
                           jsonb_build_object('am', now(), 'grund', 'vor dem Update gelöscht', 'automatisch', true))
                      else t.payload end
 where t.geloescht and t.geloescht_am is null;

-- Täglich um 03:17 leeren, wenn pg_cron da ist (sonst nur beim Laden der Büro-Seite)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('kompass-papierkorb-leeren');
    exception when others then null;
    end;
    perform cron.schedule('kompass-papierkorb-leeren', '17 3 * * *', 'select public.papierkorb_leeren()');
  end if;
end $$;

-- Ergebnis-Abfrage: erwartet spalte = 1, trigger = 1, funktionen = 3, ohne_zeit = 0
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'kalender_termine' and column_name = 'geloescht_am') as spalte,
       (select count(*) from pg_trigger where tgrelid = 'public.kalender_termine'::regclass and tgname = 'trg_termin_zy_papierkorb') as trigger,
       (select count(*) from pg_proc where proname in ('termin_ist_nachweis', 'termin_papierkorb', 'papierkorb_leeren') and pronamespace = 'public'::regnamespace) as funktionen,
       (select count(*) from public.kalender_termine where geloescht and geloescht_am is null) as ohne_zeit,
       (select count(*) from public.kalender_termine where geloescht and jsonb_typeof(payload->'storno') = 'object') as aufbewahrt;
