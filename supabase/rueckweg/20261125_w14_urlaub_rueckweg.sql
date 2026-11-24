-- Rückweg zu 20261125_w14_01_urlaub_fahrlehrer_id.sql (W14 Urlaub über die Fahrlehrer-ID).
-- Danach gleicht die App den Urlaub beim Lesen wieder über den Namen ab (sie erkennt die fehlende Spalte selbst).
-- Neu eintragen geht mit der neuen App erst wieder, wenn die Migration erneut eingespielt ist („bitte später nochmal“).
drop trigger if exists trg_urlaub_fahrlehrer on public.fahrschule_urlaub;
drop function if exists public.urlaub_fahrlehrer_setzen();
drop index if exists public.fahrschule_urlaub_fahrlehrer_idx;
alter table public.fahrschule_urlaub drop column if exists fahrlehrer_id;
-- Ergebnis: erwartet spalte = 0, trigger = 0
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'fahrschule_urlaub'
          and column_name = 'fahrlehrer_id') as spalte,
       (select count(*) from pg_trigger where tgname = 'trg_urlaub_fahrlehrer') as trigger;
