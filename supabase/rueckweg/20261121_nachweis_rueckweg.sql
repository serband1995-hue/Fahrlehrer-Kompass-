-- Rückweg zu 20261121_nachweis_01_termin_spur.sql: Spur und Unterschrift-Schutz für Termine entfernen.
-- Bereits geschriebene Protokollzeilen (tabelle = 'kalender_termine') bleiben stehen; die Spalte „grund“ bleibt
-- (Entfernen würde die Gründe löschen). Wer sie wirklich weg haben will: alter table public.aenderungsprotokoll drop column grund;
drop trigger if exists trg_termin_zz_nachweis_spur on public.kalender_termine;
drop trigger if exists trg_termin_zz_nachweis_angelegt on public.kalender_termine;
drop function if exists public.termin_nachweis_spur();
drop function if exists public.termin_nachweis_angelegt();
-- Ergebnis-Abfrage: erwartet trigger = 0
select count(*) as trigger from pg_trigger where tgrelid = 'public.kalender_termine'::regclass and tgname like 'trg_termin_zz_nachweis%';
