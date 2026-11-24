-- Rückweg zu supabase/migrations/20261124_k18_01_konflikt_gesehen.sql. Löscht die Vermerke (nur „gesehen“-Markierungen, keine Termine).
drop table if exists public.fahrzeug_konflikt_gesehen;
drop function if exists public.konflikt_gesehen_setzen();
drop function if exists public.konflikt_gesehen_spur();
-- Ergebnis-Abfrage: erwartet 0
select count(*) as tabelle from information_schema.tables where table_schema = 'public' and table_name = 'fahrzeug_konflikt_gesehen';
