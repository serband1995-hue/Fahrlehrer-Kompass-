-- Rückweg zu 20261206_w28_01_nur_buero_termine.sql: Regeln und Funktionen weg. Keine Zeile wird geändert.
-- Danach sehen Fahrlehrer Termine der Arten vortest/simulator/beratung/mpu wieder (die App blendet sie trotzdem aus).
begin;
drop policy if exists "W28 Buero-Termine lesen nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine anlegen nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine aendern nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine loeschen nur Buero und Leitung" on public.kalender_termine;
drop function if exists public.darf_buero_termine();
drop function if exists public.termin_art_nur_buero(text);
commit;
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'kalender_termine' and policyname like 'W28 %') as regeln_uebrig;
