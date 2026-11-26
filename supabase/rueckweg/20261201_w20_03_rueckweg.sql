-- Rückweg zu supabase/migrations/20261201_w20_03_buero_verschiebungen_lesen.sql
-- Danach sieht die Büro-Seite den Verschiebungs-Verlauf wieder leer.
drop policy if exists "Buero sieht Verschiebungen der Fahrschule" on public.schueler_verschiebungen;
