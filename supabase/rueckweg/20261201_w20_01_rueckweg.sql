-- Rückweg zu supabase/migrations/20261201_w20_01_anon_rechte.sql
-- Gibt anon und authenticated GENAU die Tabellen-/Sequenzrechte zurück, die vor W20 galten (aus sicherung.w20_rechte_vorher),
-- und stellt die Standardrechte von postgres für künftige Tabellen/Sequenzen wieder her (Supabase-Standard).
-- Achtung: Danach hängt der Schutz wieder allein an RLS (anon darf u. a. wieder TRUNCATE).
-- Tabellen, die nach W20 neu angelegt wurden, bleiben, wie sie sind. Die Sicherungstabelle wird am Ende gelöscht.
do $w20ar$
declare r record; v_n int := 0;
begin
  if to_regclass('sicherung.w20_rechte_vorher') is null then
    raise exception 'W20_RUECKWEG_ABBRUCH: sicherung.w20_rechte_vorher fehlt – ohne Sicherung kein genauer Rückweg.';
  end if;
  for r in
    select s.objekt, s.art, s.rolle, s.rechte from sicherung.w20_rechte_vorher s
      join pg_class c on c.relname = s.objekt and c.relkind = s.art
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  loop
    execute format('grant %s on %s public.%I to %s', array_to_string(r.rechte, ', '),
                   case when r.art = 'S' then 'sequence' else 'table' end, r.objekt,
                   case when r.rolle = 'PUBLIC' then 'public' else quote_ident(r.rolle) end);
    v_n := v_n + 1;
  end loop;
  alter default privileges for role postgres in schema public grant all on tables to anon;
  alter default privileges for role postgres in schema public grant truncate, references, trigger on tables to authenticated;
  alter default privileges for role postgres in schema public grant all on sequences to anon;
  drop table sicherung.w20_rechte_vorher;
  raise notice 'W20_01 Rückweg: % Rechte-Zeilen zurückgegeben', v_n;
end $w20ar$;
