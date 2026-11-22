-- Rückweg zu 20261122_k6_01_schueler_ueberblick.sql (K6 Schüler-Überblick und Weitergeben).
-- Entfernt nur die Funktionen; Daten ändern sich nicht. Schon weitergegebene Schüler bleiben beim neuen Fahrlehrer
-- (zurückgeben wie bisher im Büro). Die App zeigt danach den Überblick nicht mehr (sie prüft das selbst).
drop function if exists public.schueler_weitergeben(text, uuid);
drop function if exists public.fs_kollegen();
drop function if exists public.fs_schueler_ueberblick();
drop function if exists public.k6_darf_verwalten();
drop function if exists public.k6_meine_fahrschule();
