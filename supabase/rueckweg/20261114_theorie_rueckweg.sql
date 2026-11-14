-- Rückweg Theorie-Modus (14.11.2026): entfernt alles aus theorie_01 und theorie_02.
-- Bestehende Tabellen und Funktionen des Kompass sind davon nicht betroffen.
-- Achtung: löscht auch eigene Unterrichte/Dateien der Fahrlehrer. Vorher sichern, falls schon genutzt.
-- Die Dateien im Bucket "theorie" vorher über das Dashboard (Storage > theorie > alles auswählen > Löschen)
-- oder per Storage-API entfernen; ein Bucket mit Dateien lässt sich nicht löschen.
-- Edge Function "theorie-import" im Dashboard löschen (Edge Functions > theorie-import > Delete).

drop policy if exists theorie_bib_lesen on storage.objects;
drop policy if exists theorie_eigene_lesen on storage.objects;
drop policy if exists theorie_eigene_hochladen on storage.objects;
drop policy if exists theorie_eigene_loeschen on storage.objects;
delete from storage.buckets where id = 'theorie';   -- erst nach dem Leeren des Buckets

drop table if exists public.theorie_unterrichte;
drop table if exists public.theorie_dateien;
drop table if exists public.theorie_folien;
drop table if exists public.theorie_lektionen;
drop table if exists public.theorie_klassen;
drop table if exists public.theorie_freigabe;
drop table if exists public.theorie_import_schluessel;
drop function if exists public.theorie_darf_bibliothek();
drop function if exists public.theorie_aktiv();
