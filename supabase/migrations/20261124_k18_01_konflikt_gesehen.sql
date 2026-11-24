-- K18 Doppelbelegung „Gesehen“ (Werkstatt 12, 🗣 Serband 23.11.2026).
-- Das Büro kann eine Doppelbelegung eines Fahrzeugs (nächste 14 Tage) als gesehen markieren. Sie verschwindet aus der Warnung
-- und kommt wieder, sobald sich einer der beiden Termine ändert: Der Schlüssel enthält beide Termin-IDs samt Datum, Zeit und
-- Fahrzeug (Aufbau macht die Büro-Seite, buero.js). Lesen, markieren und zurücknehmen: Büro, Leitung, Super-Admin der eigenen
-- Fahrschule. Wer und wann setzt der Server. Spur: jede Markierung und Rücknahme ins aenderungsprotokoll.
-- Voraussetzung: 20261121_nachweis_01 (aenderungsprotokoll.grund), buero_bearbeiter(), my_fahrschule_id().
-- Idempotent. Rückweg: supabase/rueckweg/20261124_k18_rueckweg.sql

create table if not exists public.fahrzeug_konflikt_gesehen (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null,
  schluessel text not null check (length(schluessel) between 3 and 1000),
  gesehen_von uuid,
  bearbeiter text,
  gesehen_am timestamptz not null default now(),
  unique (fahrschule_id, schluessel)
);
alter table public.fahrzeug_konflikt_gesehen enable row level security;

drop policy if exists "Buero Leitung sehen Konflikt-Vermerke" on public.fahrzeug_konflikt_gesehen;
create policy "Buero Leitung sehen Konflikt-Vermerke" on public.fahrzeug_konflikt_gesehen for select to authenticated
  using (is_super_admin(auth.uid()) or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
drop policy if exists "Buero Leitung markieren Konflikte" on public.fahrzeug_konflikt_gesehen;
create policy "Buero Leitung markieren Konflikte" on public.fahrzeug_konflikt_gesehen for insert to authenticated
  with check (is_super_admin(auth.uid()) or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
drop policy if exists "Buero Leitung nehmen Konflikt-Vermerke zurueck" on public.fahrzeug_konflikt_gesehen;
create policy "Buero Leitung nehmen Konflikt-Vermerke zurueck" on public.fahrzeug_konflikt_gesehen for delete to authenticated
  using (is_super_admin(auth.uid()) or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
revoke all on public.fahrzeug_konflikt_gesehen from anon;
grant select, insert, delete on public.fahrzeug_konflikt_gesehen to authenticated;

-- Wer und wann setzt der Server
create or replace function public.konflikt_gesehen_setzen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  new.gesehen_von := auth.uid();
  new.bearbeiter := nullif(coalesce(public.buero_bearbeiter(), ''), '');
  new.gesehen_am := now();
  return new;
end $function$;
drop trigger if exists trg_konflikt_gesehen_setzen on public.fahrzeug_konflikt_gesehen;
create trigger trg_konflikt_gesehen_setzen before insert on public.fahrzeug_konflikt_gesehen
  for each row execute function public.konflikt_gesehen_setzen();

-- Spur
create or replace function public.konflikt_gesehen_spur()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare r public.fahrzeug_konflikt_gesehen := case when tg_op = 'DELETE' then old else new end;
begin
  insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
  values (r.fahrschule_id, 'fahrzeug_konflikt', left(r.schluessel, 200), 'gesehen',
          case when tg_op = 'DELETE' then 'gesehen' else 'offen' end,
          case when tg_op = 'DELETE' then 'offen' else 'gesehen' end,
          auth.uid(), nullif(coalesce(public.buero_bearbeiter(), ''), ''),
          case when tg_op = 'DELETE' then 'wieder angezeigt' else 'Doppelbelegung gesehen' end);
  return null;
end $function$;
drop trigger if exists trg_konflikt_gesehen_spur on public.fahrzeug_konflikt_gesehen;
create trigger trg_konflikt_gesehen_spur after insert or delete on public.fahrzeug_konflikt_gesehen
  for each row execute function public.konflikt_gesehen_spur();

-- Ergebnis-Abfrage: erwartet tabelle = 1, policies = 3, trigger = 2
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'fahrzeug_konflikt_gesehen') as tabelle,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'fahrzeug_konflikt_gesehen') as policies,
       (select count(*) from pg_trigger where tgrelid = to_regclass('public.fahrzeug_konflikt_gesehen') and not tgisinternal) as trigger;
