-- Rückweg zu 20261125_einst_01_fahrschule_einstellungen.sql
-- Nur ausführen, wenn keine andere Funktion (z. B. von W15) mehr fahrschule_einstellung*() aufruft; sonst erst diese zurücknehmen.
-- Löscht alle gespeicherten Einstellungen (es gelten danach wieder die eingebauten Standardwerte).
drop function if exists public.fahrschule_einstellung_zahl(uuid, text, text, int, int, int);
drop function if exists public.fahrschule_einstellung(uuid, text);
drop table if exists public.fahrschule_einstellungen;   -- nimmt Trigger und Policies mit
drop function if exists public.fahrschule_einstellungen_spur();
drop function if exists public.fahrschule_einstellungen_stempel();
-- Ergebnis (erwartet: 0 | 0)
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'fahrschule_einstellungen') as tabelle,
       (select count(*) from pg_proc where proname like 'fahrschule_einstellung%') as funktionen;
