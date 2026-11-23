-- Rückweg zu supabase/migrations/20261123_k8_01_zahlung_sperre.sql (K8 Sperre bei offener Zahlung).
-- Nimmt Trigger und Funktionen heraus. Die Spalten zahlung_gesperrt_seit/_grund bleiben stehen (kein Datenverlust;
-- App und Büro kommen mit und ohne aus). Wer sie auch entfernen will: die beiden auskommentierten Zeilen unten.
do $$
begin
  if to_regclass('public.public_bookings') is not null then
    execute 'drop trigger if exists trg_buchung_zahlung_sperre on public.public_bookings';
  end if;
end $$;
drop trigger if exists trg_termin_zx_zahlung on public.kalender_termine;
drop trigger if exists trg_schueler_zahlung_schutz on public.schueler;
drop trigger if exists trg_schueler_zahlung_spur on public.schueler;
drop function if exists public.buchung_zahlung_sperre();
drop function if exists public.termin_zahlung_sperre();
drop function if exists public.schueler_zahlung_schutz();
drop function if exists public.schueler_zahlung_spur();
drop function if exists public.schueler_buchung_gesperrt(text);
drop function if exists public.schueler_reakt_gesperrt(public.schueler);
-- alter table public.schueler drop column if exists zahlung_gesperrt_grund;
-- alter table public.schueler drop column if exists zahlung_gesperrt_seit;

-- Ergebnis-Abfrage: erwartet 0 und 0
select (select count(*) from pg_trigger where tgname in ('trg_termin_zx_zahlung', 'trg_schueler_zahlung_schutz', 'trg_schueler_zahlung_spur', 'trg_buchung_zahlung_sperre')) as trigger,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('schueler_reakt_gesperrt', 'schueler_buchung_gesperrt', 'termin_zahlung_sperre', 'schueler_zahlung_schutz', 'schueler_zahlung_spur', 'buchung_zahlung_sperre')) as funktionen;
