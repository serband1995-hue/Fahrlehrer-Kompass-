-- Rückweg zu 20261122_k5_01_pruefer_gemeinsam.sql (K5 Prüfer-Wissen gemeinsam).
-- ACHTUNG: löscht die gemeinsamen Prüfer und alle Prüfer-Notizen der Fahrschulen endgültig.
-- Vorher sichern, z. B.: select * from public.fahrschule_pruefer; select * from public.fahrschule_pruefer_notizen;
-- Die App läuft danach wie vor K5 (Prüfer-Akte je Gerät); was nur gemeinsam gespeichert war, fehlt dann.
-- Umbenennungen von Prüfern in kalender_pruefungen bleiben (sie werden nicht zurückgedreht).
drop function if exists public.fs_pruefer_umbenennen(text, text);
drop function if exists public.fs_pruefer_ergebnisse();
drop table if exists public.fahrschule_pruefer_notizen;
drop table if exists public.fahrschule_pruefer;
drop function if exists public.fahrschule_pruefer_notiz_verfasser();
drop function if exists public.fahrschule_pruefer_schutz();
drop function if exists public.k5_darf_verwalten();
drop function if exists public.k5_meine_fahrschule();
