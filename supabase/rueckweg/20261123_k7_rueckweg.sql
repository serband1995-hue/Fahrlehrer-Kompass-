-- Rückweg zu supabase/migrations/20261123_k7_01_papierkorb.sql (K7 Löschen / Papierkorb).
-- Nimmt Zeitplan, Funktionen, Trigger, Index und Spalte wieder heraus. Die Storno-Vermerke (payload.storno) bleiben
-- in den Stunden stehen (schaden nicht, App und Büro kommen mit und ohne aus). Endgültig geleerte Stunden kommen
-- nicht zurück; ihre Spur steht im aenderungsprotokoll (feld = 'endgueltig_geloescht').
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('kompass-papierkorb-leeren');
    exception when others then null;
    end;
  end if;
end $$;

drop trigger if exists trg_termin_zy_papierkorb on public.kalender_termine;
drop function if exists public.papierkorb_leeren();
drop function if exists public.termin_papierkorb();
drop function if exists public.termin_ist_nachweis(public.kalender_termine);
drop index if exists public.kalender_termine_papierkorb_idx;
alter table public.kalender_termine drop column if exists geloescht_am;

-- Ergebnis-Abfrage: erwartet alles 0
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'kalender_termine' and column_name = 'geloescht_am') as spalte,
       (select count(*) from pg_trigger where tgrelid = 'public.kalender_termine'::regclass and tgname = 'trg_termin_zy_papierkorb') as trigger,
       (select count(*) from pg_proc where proname in ('termin_ist_nachweis', 'termin_papierkorb', 'papierkorb_leeren') and pronamespace = 'public'::regnamespace) as funktionen;
