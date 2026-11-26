-- Rückweg zu supabase/migrations/20261202_w19_03_punkte.sql (W19 Teil 3, Punktesystem).
-- ACHTUNG: Gibt es schon Buchungen, bricht der Rückweg ab (nichts geändert). Erst die Buchungen sichern (z. B. als CSV exportieren),
-- dann bewusst mit p_trotzdem = true unten ausführen. Die Einstellungen 'punkte.*' werden gelöscht (Standard: aus, Listen leer).
-- Der Schlüssel-Constraint (fe_schluessel) gehört zu Teil 2 und bleibt; ihn setzt der Rückweg von Teil 2 zurück.
do $$
declare
  p_trotzdem boolean := false;   -- nur nach Sicherung der Buchungen auf true setzen
  n int := 0;
begin
  if to_regclass('public.schueler_punkte') is not null then
    execute 'select count(*) from public.schueler_punkte' into n;
  end if;
  if n > 0 and not p_trotzdem then
    raise exception 'Es gibt % Punkte-Buchung(en). Erst sichern, dann p_trotzdem = true setzen.', n;
  end if;
  if to_regclass('public.schueler_punkte') is not null then
    execute 'drop trigger if exists schueler_punkte_fest on public.schueler_punkte';  -- sonst blockiert der Schutz das Löschen
    execute 'drop table public.schueler_punkte';
  end if;
  drop function if exists public.punkte_verschenken(uuid, text, text, integer, text);
  drop function if exists public.punkte_kontostand(uuid, text);
  drop function if exists public.schueler_punkte_anlegen();
  drop function if exists public.schueler_punkte_fest();
  drop function if exists public.punkte_eigener_fl(uuid, text);
  if to_regclass('public.fahrschule_einstellungen') is not null then
    execute $q$delete from public.fahrschule_einstellungen where schluessel ~ '^punkte\.'$q$;
  end if;
end $$;
-- Ergebnis (erwartet: 0 | 0)
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'schueler_punkte') as tabelle,
       (select count(*) from pg_proc where proname like 'punkte\_%' or proname like 'schueler\_punkte\_%') as funktionen;
