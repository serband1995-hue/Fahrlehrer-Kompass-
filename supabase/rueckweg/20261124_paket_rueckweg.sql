-- Rückweg zu 20261124_paket_01_baukasten.sql.
-- Achtung: löscht die Tabelle schueler_pakete (verkaufte Pakete) und die Posten/Klasse der Vorlagen.
-- Vorher sichern, falls schon verkauft wurde:  select * from public.schueler_pakete;  select id, klasse, posten from public.fahrschule_pakete;
-- Preise der Arten 'lernapp'/'simulator' werden gelöscht, damit der alte Check wieder passt.
drop function if exists public.schueler_paket_verkaufen(text, uuid, text, text, jsonb);
drop function if exists public.schueler_paket_aktivieren(text, uuid);
drop table if exists public.schueler_pakete;
drop function if exists public.schueler_pakete_schutz();
drop function if exists public.schueler_pakete_spur();

drop policy if exists "Buero legt Pakete an" on public.fahrschule_pakete;
drop policy if exists "Fahrschule-Admin verwaltet eigene Pakete" on public.fahrschule_pakete;
create policy "Fahrschule-Admin verwaltet eigene Pakete" on public.fahrschule_pakete as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
drop policy if exists "Buero aendert Pakete" on public.fahrschule_pakete;
drop trigger if exists fahrschule_pakete_stempel on public.fahrschule_pakete;
drop function if exists public.fahrschule_pakete_stempel();
alter table public.fahrschule_pakete drop constraint if exists fahrschule_pakete_posten_ok;
alter table public.fahrschule_pakete drop constraint if exists fahrschule_pakete_klasse_ok;
alter table public.fahrschule_pakete drop column if exists posten;
alter table public.fahrschule_pakete drop column if exists klasse;
alter table public.fahrschule_pakete drop column if exists aktualisiert_am;
alter table public.fahrschule_pakete drop column if exists bearbeiter;
drop function if exists public.paket_posten_ok(jsonb, boolean);

delete from public.fahrschule_preise where art in ('lernapp', 'simulator');
alter table public.fahrschule_preise drop constraint if exists fahrschule_preise_art_check;
alter table public.fahrschule_preise add constraint fahrschule_preise_art_check check (art in
  ('grundbetrag','fahrstunde','sonderfahrt','pruefung_praxis','pruefung_theorie','reaktivierung','paket','sonstiges'));

-- Ergebnis-Abfrage: erwartet tabelle = 0, spalten = 0
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'schueler_pakete') as tabelle,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'fahrschule_pakete'
          and column_name in ('klasse', 'posten', 'aktualisiert_am', 'bearbeiter')) as spalten;
