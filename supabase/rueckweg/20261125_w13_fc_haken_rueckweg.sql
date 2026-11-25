-- Rückweg zu 20261125_w13_01_fc_haken_schutz.sql (W13: Zahl der Fahrchecks vom Büro, Haken nur vom Büro).
-- Danach dürfen Fahrlehrer buero_fc_status an eigenen Terminen wieder über die Schnittstelle ändern (Stand vor W13).
-- Die von Kristina gewählten Zahlen gehen verloren: Im Paket zählt dann wieder der Vermerk des Fahrlehrers.
-- App und Büro erkennen die fehlende Spalte selbst (Knöpfe „2 / 1 abgegeben“ verschwinden, „Abgegeben“ bleibt).
drop trigger if exists trg_termin_c_fc_haken on public.kalender_termine;
drop function if exists public.termin_fc_haken_schutz();
alter table public.kalender_termine drop constraint if exists kalender_termine_buero_fc_anzahl_check;
alter table public.kalender_termine drop column if exists buero_fc_anzahl;
-- Ergebnis: erwartet spalte = 0, funktion = 0, trigger = 0
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'kalender_termine'
          and column_name = 'buero_fc_anzahl') as spalte,
       (select count(*) from pg_proc where proname = 'termin_fc_haken_schutz') as funktion,
       (select count(*) from pg_trigger where tgname = 'trg_termin_c_fc_haken' and not tgisinternal) as trigger;
