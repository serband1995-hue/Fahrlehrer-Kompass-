-- Rückweg zu supabase/migrations/20261201_w19_02_zahlungsbelege.sql (W19 Teil 2, Zahlungsbelege).
-- ACHTUNG: Ausgestellte Belege sind aufbewahrungspflichtig. Gibt es schon Belege, bricht der Rückweg ab (nichts geändert).
-- Erst die Belege sichern (z. B. als CSV exportieren) und dann bewusst mit p_trotzdem = true unten ausführen.
-- Die Einstellungen 'beleg.*' und 'punkte.*' werden gelöscht, damit der alte Constraint wieder passt.
do $$
declare
  p_trotzdem boolean := false;   -- nur nach Sicherung der Belege auf true setzen
  n int := 0;
begin
  if to_regclass('public.zahlungsbelege') is not null then
    execute 'select count(*) from public.zahlungsbelege' into n;
  end if;
  if n > 0 and not p_trotzdem then
    raise exception 'Es gibt % Beleg(e). Erst sichern, dann p_trotzdem = true setzen.', n;
  end if;
  if to_regclass('public.zahlungsbelege') is not null then
    execute 'drop trigger if exists zahlungsbelege_fest on public.zahlungsbelege';  -- sonst blockiert der Schutz das Löschen
    execute 'drop table public.zahlungsbelege';
  end if;
  drop table if exists public.beleg_zaehler;
  drop function if exists public.zahlungsbelege_anlegen();
  drop function if exists public.zahlungsbelege_fest();
  delete from public.fahrschule_einstellungen where schluessel ~ '^(beleg|punkte)\.';
  alter table public.fahrschule_einstellungen drop constraint if exists fe_schluessel;
  alter table public.fahrschule_einstellungen add constraint fe_schluessel check (
    schluessel ~ '^(fristen|vorlagen|fahrstunden|papierkorb|rueckgaengig)(\.[a-z][a-z0-9_]*)+$' and length(schluessel) <= 80);
end $$;
-- Ergebnis (erwartet: 0 | 0)
select (select count(*) from pg_tables where schemaname = 'public' and tablename in ('zahlungsbelege','beleg_zaehler')) as tabellen,
       (select count(*) from pg_proc where proname like 'zahlungsbelege_%') as funktionen;
