-- Paket-Baukasten, Schritt 1 (Werkstatt 13, Plan von der Hauptsitzung freigegeben am 24.11.2026)
-- 🗣 Serband: „Paket hinzufügen und dann gibt es frei wählbare Posten … Gesamtpreis … als Vorlage speichern …
--   Wenn ein Schüler sich anmeldet, soll er entweder normale Anmeldung bekommen oder Pakete verkauft bekommen.“
--
-- 1. fahrschule_pakete (Vorlagen) bekommt Klasse und Posten. Ein Posten = {art, bezeichnung, anzahl, preis_cent_fest}.
--    preis_cent_fest null = der Preis kommt aus der Preisliste (fahrschule_preise) und folgt ihr automatisch.
--    Büro darf neu Vorlagen anlegen und ändern (Leitung und Super-Admin durften das schon). Löschen darf das Büro nicht:
--    Archivieren heißt aktiv = false (Schüler zeigen auf Vorlagen). Bearbeiter und Zeit setzt der Server.
-- 2. fahrschule_preise: neue Preis-Arten 'lernapp' (Fahr-Akademie Lernapp) und 'simulator'.
-- 3. schueler_pakete: verkaufte Pakete als feste Kopie (Posten mit festen Preisen in Cent, Gesamtpreis rechnet der Server).
--    Ein aktives Paket je Schüler. Nie löschen, nur stornieren. Spur im aenderungsprotokoll (tabelle 'schueler',
--    datensatz_id = Schüler, feld 'paket'): erscheint im Verlauf der Büro-Akte.
--    Schreiben: Büro, Leitung, Super-Admin (eigene Fahrschule). Lesen zusätzlich: der zuständige Fahrlehrer.
--    Verkaufen und Wechseln geht in einem Schritt über schueler_paket_verkaufen (altes stornieren, neues anlegen,
--    schueler.paket_id auf die Vorlage). Rückgängig und „Normale Anmeldung“ über schueler_paket_aktivieren.
--    Beide Funktionen laufen mit den Rechten des Aufrufers (security invoker): die Zugriffsregeln gelten.
-- Idempotent. Rückweg: supabase/rueckweg/20261124_paket_rueckweg.sql

-- ===== Prüfung der Posten (eine Funktion für Vorlage und Verkauf) =====
-- fest = false: Vorlage (preis_cent_fest darf fehlen). fest = true: Verkauf (preis_cent muss gesetzt sein).
create or replace function public.paket_posten_ok(p jsonb, fest boolean)
 returns boolean language plpgsql immutable set search_path to 'public'
as $function$
declare e jsonb; preis jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 30 then return false; end if;
  for e in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    if coalesce(e->>'art', '') not in ('grundbetrag','lernapp','fahrstunde','sonderfahrt','simulator','pruefung_praxis','sonstiges') then return false; end if;
    if jsonb_typeof(e->'bezeichnung') is distinct from 'string' or length(btrim(e->>'bezeichnung')) not between 1 and 120 then return false; end if;
    if jsonb_typeof(e->'anzahl') is distinct from 'number' or (e->>'anzahl')::numeric <> trunc((e->>'anzahl')::numeric)
       or (e->>'anzahl')::numeric not between 1 and 999 then return false; end if;
    preis := case when fest then e->'preis_cent' else e->'preis_cent_fest' end;
    if preis is null or jsonb_typeof(preis) = 'null' then
      if fest then return false; end if;
    elsif jsonb_typeof(preis) <> 'number' or preis::text::numeric <> trunc(preis::text::numeric)
          or preis::text::numeric not between 0 and 10000000 then return false;
    end if;
  end loop;
  return true;
end $function$;

-- ===== 1. Vorlagen =====
alter table public.fahrschule_pakete add column if not exists klasse text;
alter table public.fahrschule_pakete add column if not exists posten jsonb not null default '[]'::jsonb;
alter table public.fahrschule_pakete add column if not exists aktualisiert_am timestamptz;
alter table public.fahrschule_pakete add column if not exists bearbeiter text;
alter table public.fahrschule_pakete drop constraint if exists fahrschule_pakete_posten_ok;
alter table public.fahrschule_pakete add constraint fahrschule_pakete_posten_ok check (public.paket_posten_ok(posten, false));
alter table public.fahrschule_pakete drop constraint if exists fahrschule_pakete_klasse_ok;
alter table public.fahrschule_pakete add constraint fahrschule_pakete_klasse_ok check (klasse is null or length(btrim(klasse)) between 1 and 12);

create or replace function public.fahrschule_pakete_stempel()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  new.name := btrim(new.name);
  if new.name = '' then raise exception 'Bitte einen Namen für das Paket eintragen.' using errcode = '22023'; end if;
  new.klasse := nullif(btrim(coalesce(new.klasse, '')), '');
  new.aktualisiert_am := now();
  new.bearbeiter := public.buero_bearbeiter();
  return new;
end $function$;
drop trigger if exists fahrschule_pakete_stempel on public.fahrschule_pakete;
create trigger fahrschule_pakete_stempel before insert or update on public.fahrschule_pakete
  for each row execute function public.fahrschule_pakete_stempel();

-- Büro: anlegen und ändern (nicht löschen). Leitung („verwaltet eigene Pakete“) und Super-Admin bleiben wie bisher.
drop policy if exists "Buero legt Pakete an" on public.fahrschule_pakete;
create policy "Buero legt Pakete an" on public.fahrschule_pakete as PERMISSIVE for INSERT to authenticated
  with check (is_buero(auth.uid()) and fahrschule_id = my_fahrschule_id());
drop policy if exists "Buero aendert Pakete" on public.fahrschule_pakete;
create policy "Buero aendert Pakete" on public.fahrschule_pakete as PERMISSIVE for UPDATE to authenticated
  using (is_buero(auth.uid()) and fahrschule_id = my_fahrschule_id())
  with check (is_buero(auth.uid()) and fahrschule_id = my_fahrschule_id());

-- ===== 2. Preis-Arten Lernapp und Simulator =====
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.fahrschule_preise'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%grundbetrag%' loop
    execute format('alter table public.fahrschule_preise drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.fahrschule_preise add constraint fahrschule_preise_art_check check (art in
  ('grundbetrag','fahrstunde','sonderfahrt','pruefung_praxis','pruefung_theorie','reaktivierung','paket','sonstiges','lernapp','simulator'));

-- ===== 3. Verkaufte Pakete =====
create table if not exists public.schueler_pakete (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  schueler_id text not null references public.schueler(id) on delete cascade,
  vorlage_id uuid references public.fahrschule_pakete(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 120),
  klasse text check (klasse is null or length(btrim(klasse)) between 1 and 12),
  posten jsonb not null check (public.paket_posten_ok(posten, true)),
  gesamt_cent integer not null default 0,
  verkauft_am timestamptz not null default now(),
  verkauft_von uuid default auth.uid(),
  bearbeiter text,
  storniert_am timestamptz,
  storniert_von uuid
);
create unique index if not exists schueler_pakete_ein_aktives on public.schueler_pakete (schueler_id) where storniert_am is null;
create index if not exists schueler_pakete_fs on public.schueler_pakete (fahrschule_id, schueler_id);
alter table public.schueler_pakete enable row level security;

drop policy if exists "Pakete Schueler lesen Buero Leitung" on public.schueler_pakete;
create policy "Pakete Schueler lesen Buero Leitung" on public.schueler_pakete for select to authenticated
  using (is_super_admin(auth.uid())
         or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
drop policy if exists "Pakete Schueler lesen Fahrlehrer" on public.schueler_pakete;
create policy "Pakete Schueler lesen Fahrlehrer" on public.schueler_pakete for select to authenticated
  using (exists (select 1 from public.schueler s where s.id = schueler_pakete.schueler_id and s.fahrlehrer_id = auth.uid()));
drop policy if exists "Pakete Schueler verkaufen" on public.schueler_pakete;
create policy "Pakete Schueler verkaufen" on public.schueler_pakete for insert to authenticated
  with check (is_super_admin(auth.uid())
              or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
drop policy if exists "Pakete Schueler stornieren" on public.schueler_pakete;
create policy "Pakete Schueler stornieren" on public.schueler_pakete for update to authenticated
  using (is_super_admin(auth.uid())
         or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()))
  with check (is_super_admin(auth.uid())
              or ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id()));
-- keine delete-Regel: verkaufte Pakete bleiben (Verträge)

-- Schutz: feste Kopie. Beim Anlegen rechnet der Server den Gesamtpreis und setzt Verfasser/Zeit.
-- Danach ändert sich nur noch „storniert“ (stornieren oder Rückgängig), alles andere bleibt.
create or replace function public.schueler_pakete_schutz()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare summe bigint;
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.schueler s where s.id = new.schueler_id and s.fahrschule_id = new.fahrschule_id) then
      raise exception 'Schüler gehört nicht zu dieser Fahrschule' using errcode = '22023';
    end if;
    if new.vorlage_id is not null and not exists (
         select 1 from public.fahrschule_pakete p where p.id = new.vorlage_id and p.fahrschule_id = new.fahrschule_id) then
      raise exception 'Paket gehört nicht zu dieser Fahrschule' using errcode = '22023';
    end if;
    select coalesce(sum((e->>'anzahl')::bigint * (e->>'preis_cent')::bigint), 0) into summe
      from jsonb_array_elements(new.posten) e;
    if summe > 100000000 then raise exception 'Gesamtpreis zu hoch' using errcode = '22023'; end if;
    new.gesamt_cent := summe;
    new.name := btrim(new.name);
    new.klasse := nullif(btrim(coalesce(new.klasse, '')), '');
    new.verkauft_am := now();
    new.verkauft_von := auth.uid();
    new.bearbeiter := public.buero_bearbeiter();
    new.storniert_am := null;
    new.storniert_von := null;
    return new;
  end if;
  -- UPDATE
  new.id := old.id; new.fahrschule_id := old.fahrschule_id; new.schueler_id := old.schueler_id;
  new.vorlage_id := old.vorlage_id; new.name := old.name; new.klasse := old.klasse; new.posten := old.posten;
  new.gesamt_cent := old.gesamt_cent; new.verkauft_am := old.verkauft_am; new.verkauft_von := old.verkauft_von;
  new.bearbeiter := old.bearbeiter;
  if new.storniert_am is null then
    new.storniert_von := null;
  elsif old.storniert_am is null then
    new.storniert_am := now(); new.storniert_von := auth.uid();
  else
    new.storniert_am := old.storniert_am; new.storniert_von := old.storniert_von;
  end if;
  return new;
end $function$;
drop trigger if exists schueler_pakete_schutz on public.schueler_pakete;
create trigger schueler_pakete_schutz before insert or update on public.schueler_pakete
  for each row execute function public.schueler_pakete_schutz();

create or replace function public.schueler_pakete_spur()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  text_neu text := new.name || ' · ' || replace(to_char(new.gesamt_cent / 100.0, 'FM9999990.00'), '.', ',') || ' €';
  a text; n text;
begin
  if tg_op = 'INSERT' then a := null; n := text_neu;
  elsif old.storniert_am is null and new.storniert_am is not null then a := text_neu; n := 'storniert';
  elsif old.storniert_am is not null and new.storniert_am is null then a := 'storniert'; n := text_neu;
  else return null;
  end if;
  insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
  values (new.fahrschule_id, 'schueler', new.schueler_id, 'paket', a, n, auth.uid(), nullif(coalesce(public.buero_bearbeiter(), ''), ''));
  return null;
end $function$;
drop trigger if exists schueler_pakete_spur on public.schueler_pakete;
create trigger schueler_pakete_spur after insert or update on public.schueler_pakete
  for each row execute function public.schueler_pakete_spur();

-- Verkaufen (auch Wechseln): altes aktives Paket stornieren, neues anlegen, schueler.paket_id = Vorlage. Ein Schritt.
create or replace function public.schueler_paket_verkaufen(p_schueler text, p_vorlage uuid, p_name text, p_klasse text, p_posten jsonb)
 returns public.schueler_pakete language plpgsql security invoker set search_path to 'public'
as $function$
declare fs uuid; zeile public.schueler_pakete;
begin
  select s.fahrschule_id into fs from public.schueler s where s.id = p_schueler;
  if fs is null then raise exception 'Schüler nicht gefunden' using errcode = '22023'; end if;
  update public.schueler_pakete set storniert_am = now() where schueler_id = p_schueler and storniert_am is null;
  insert into public.schueler_pakete (fahrschule_id, schueler_id, vorlage_id, name, klasse, posten)
  values (fs, p_schueler, p_vorlage, p_name, p_klasse, p_posten) returning * into zeile;
  update public.schueler set paket_id = p_vorlage where id = p_schueler and paket_id is distinct from p_vorlage;
  return zeile;
end $function$;

-- Aktives Paket festlegen: p_paket = ein verkauftes Paket dieses Schülers (wird wieder aktiv) oder null („Normale Anmeldung“).
-- Alle anderen aktiven werden storniert. Für Rückgängig nach Verkauf, Wechsel oder Storno.
create or replace function public.schueler_paket_aktivieren(p_schueler text, p_paket uuid)
 returns void language plpgsql security invoker set search_path to 'public'
as $function$
declare v uuid;
begin
  if p_paket is not null then
    select vorlage_id into v from public.schueler_pakete where id = p_paket and schueler_id = p_schueler;
    if not found then raise exception 'Paket nicht gefunden' using errcode = '22023'; end if;
  end if;
  update public.schueler_pakete set storniert_am = now()
   where schueler_id = p_schueler and storniert_am is null and id is distinct from p_paket;
  if p_paket is not null then
    update public.schueler_pakete set storniert_am = null where id = p_paket and storniert_am is not null;
  end if;
  update public.schueler set paket_id = v where id = p_schueler and paket_id is distinct from v;
end $function$;

-- Supabase gibt neuen Tabellen von sich aus alle Rechte (auch TRUNCATE): erst wegnehmen, dann gezielt geben
revoke all on public.schueler_pakete from anon;
revoke all on public.schueler_pakete from authenticated;
grant select, insert, update on public.schueler_pakete to authenticated;
revoke all on function public.schueler_paket_verkaufen(text, uuid, text, text, jsonb) from public, anon;
revoke all on function public.schueler_paket_aktivieren(text, uuid) from public, anon;
grant execute on function public.schueler_paket_verkaufen(text, uuid, text, text, jsonb) to authenticated;
grant execute on function public.schueler_paket_aktivieren(text, uuid) to authenticated;

-- Ergebnis-Abfrage: erwartet spalten = 4, art_neu = true, tabelle = 1, regeln_vorlage = 2, regeln_verkauf = 4, funktionen = 2
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'fahrschule_pakete'
     and column_name in ('klasse', 'posten', 'aktualisiert_am', 'bearbeiter')) as spalten,
  (select bool_or(pg_get_constraintdef(oid) like '%simulator%') from pg_constraint
     where conrelid = 'public.fahrschule_preise'::regclass and contype = 'c') as art_neu,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'schueler_pakete') as tabelle,
  (select count(*) from pg_policies where tablename = 'fahrschule_pakete' and policyname like 'Buero %') as regeln_vorlage,
  (select count(*) from pg_policies where tablename = 'schueler_pakete') as regeln_verkauf,
  (select count(*) from pg_proc where proname in ('schueler_paket_verkaufen', 'schueler_paket_aktivieren')) as funktionen;
