-- Rückweg zu 20261125_w13_01_fc_haken_schutz.sql (W13 Fahrcheck-Haken nur vom Büro).
-- Danach dürfen Fahrlehrer buero_fc_status an eigenen Terminen wieder über die Schnittstelle ändern (Stand vor W13).
-- Die App braucht dafür keine Änderung.
drop trigger if exists trg_termin_c_fc_haken on public.kalender_termine;
drop function if exists public.termin_fc_haken_schutz();
-- Ergebnis: erwartet funktion = 0, trigger = 0
select (select count(*) from pg_proc where proname = 'termin_fc_haken_schutz') as funktion,
       (select count(*) from pg_trigger where tgname = 'trg_termin_c_fc_haken' and not tgisinternal) as trigger;
