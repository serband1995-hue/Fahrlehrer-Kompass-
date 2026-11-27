-- Rückweg zu 20261203_w21_01_pruefungstage.sql
-- Folgen: Prüfungen in Fenstern werden wieder „freie Uhrzeit“ (datum und von bleiben stehen, nichts verrutscht).
-- Der Kalender-Spiegel wird wieder nur vom Büro-Browser geschrieben (abgleichKalender alter Stand). Prüfungstage gehen verloren
-- (Datum, Startzeit, Prüfer) – vorher bei Bedarf sichern: select * from public.pruefungstage;
-- App-Stände ab W21 brauchen pruefungstage: vor dem Rückweg die App auf den Stand davor zurücksetzen.
begin;
drop trigger if exists trg_pt_ergebnis_spiegel on public.pruefungstermine;
drop trigger if exists trg_pt_schutz on public.pruefungstermine;
drop trigger if exists trg_kp_ergebnis_spiegel on public.kalender_pruefungen;
drop trigger if exists trg_termin_a_pruefung_spiegel on public.kalender_termine;
drop trigger if exists trg_termin_b_pruefung_fahrlehrer on public.kalender_termine;
drop function if exists public.pt_ergebnis_spiegel();
drop function if exists public.kp_ergebnis_spiegel();
drop function if exists public.kt_pruefung_spiegel();
drop function if exists public.kt_pruefung_fahrlehrer();
drop function if exists public.pt_schutz();
drop function if exists public.pt_kalender_spiegel(public.pruefungstermine, boolean);
drop function if exists public.pruefung_tauschen(uuid, uuid);
drop function if exists public.pruefungstage_belegung(date, date, uuid);
drop policy if exists "Pruefungstermine Fahrlehrer anlegen" on public.pruefungstermine;
drop policy if exists "Pruefungstermine Fahrlehrer eigene aendern" on public.pruefungstermine;
drop index if exists public.pruefungstermine_fenster_frei;
drop index if exists public.pruefungstermine_tag;
drop index if exists public.pruefungstermine_schueler_datum;
alter table public.pruefungstermine
  drop column if exists pruefungstag_id,
  drop column if exists fenster,
  drop column if exists fenster_anzahl,
  drop column if exists quelle,
  drop column if exists ergebnis_uebernommen,
  drop column if exists kalender_fehler;
drop table if exists public.pruefungstage;
drop function if exists public.pruefungstag_schutz();
drop function if exists public.pruefungstag_nachziehen();
commit;
