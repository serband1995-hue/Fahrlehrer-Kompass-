-- W19 Teil 2 (26.11.2026): Zahlungsbelege (Quittungen) im Büro. 🗣 Serband 26.11.: „Bargeld: Boost nimmt hauptsächlich Bargeld,
-- selten Überweisung. Bau alles, damit es bereits steht.“ Idempotent. Rückweg: supabase/rueckweg/20261201_w19_02_rueckweg.sql
-- Voraussetzung: fahrschule_einstellungen + fahrschule_einstellung() (20261125_einst_01), zm_darf (20261124_zm_01),
--   k5_meine_fahrschule (K5), is_super_admin/is_buero/is_fahrschule_admin, buero_bearbeiter().
--
-- 1. Einstellungs-Schlüssel 'beleg.*' (und 'punkte.*' für W19 Teil 3) erlauben (Constraint fe_schluessel neu).
--    beleg.fahrschule {name, anschrift, steuernummer, ustid}      Kopf des Belegs, nichts erfunden (leer = leer)
--    beleg.steuer     {ausweisen, satz, hinweis}                  Standard: kein Steuerausweis
--    beleg.bargeld    {aktiv}                                     Standard AUS (Kassensicherungsverordnung, § 146a AO)
-- 2. Tabelle zahlungsbelege: fortlaufende Nummer je Fahrschule (lückenlos, Zähler in beleg_zaehler), nach dem Anlegen
--    nicht änderbar und nicht löschbar. Storno nur als Gegenbeleg (storno_von, Betrag negativ, eigene Nummer).
--    Der Server setzt Nummer, Wer/Wann, Name des Schülers und die Kopie der Fahrschul-Daten und Steuer-Einstellung.
--    Bargeld nur, wenn beleg.bargeld.aktiv = true (Prüfung im Server, nicht nur in der Oberfläche).
-- 3. Lesen und Anlegen: Büro, Leitung (eigene Fahrschule), Super-Admin. Rolle auch im WITH CHECK (Lehre W18).
--    Fahrlehrer sehen keine Belege.

-- ===== 1. Einstellungs-Schlüssel =====
alter table public.fahrschule_einstellungen drop constraint if exists fe_schluessel;
alter table public.fahrschule_einstellungen add constraint fe_schluessel check (
  schluessel ~ '^(fristen|vorlagen|fahrstunden|papierkorb|rueckgaengig|beleg|punkte)(\.[a-z][a-z0-9_]*)+$' and length(schluessel) <= 80);

-- ===== 2. Zähler je Fahrschule (nur für den Auslöser; kein Zugriff für Clients) =====
create table if not exists public.beleg_zaehler (
  fahrschule_id uuid primary key references public.fahrschulen(id) on delete cascade,
  letzte integer not null default 0 check (letzte >= 0)
);
alter table public.beleg_zaehler enable row level security;
revoke all on public.beleg_zaehler from anon, authenticated;

-- ===== 3. Belege =====
create table if not exists public.zahlungsbelege (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete restrict, -- Belege bleiben (Aufbewahrung)
  nummer integer not null,
  schueler_id text,                       -- bewusst ohne Fremdschlüssel: der Beleg bleibt, auch wenn der Schüler endgültig gelöscht wird
  schueler_name text not null,
  datum date not null,
  betrag numeric(12,2) not null,
  zweck text not null,
  zahlart text not null check (zahlart in ('bar','ec','ueberweisung')),
  fahrschule_daten jsonb not null default '{}'::jsonb,
  steuer jsonb,
  storno_von uuid references public.zahlungsbelege(id) on delete restrict,
  erstellt_am timestamptz not null default now(),
  erstellt_von uuid default auth.uid(),
  bearbeiter text,
  constraint zahlungsbelege_nummer_eindeutig unique (fahrschule_id, nummer),
  constraint zahlungsbelege_betrag check (betrag <> 0 and abs(betrag) <= 100000),
  constraint zahlungsbelege_zweck check (length(btrim(zweck)) between 1 and 200),
  constraint zahlungsbelege_name check (length(btrim(schueler_name)) between 1 and 160)
);
create unique index if not exists zahlungsbelege_ein_storno on public.zahlungsbelege (storno_von) where storno_von is not null;
create index if not exists zahlungsbelege_fs_schueler on public.zahlungsbelege (fahrschule_id, schueler_id);
alter table public.zahlungsbelege enable row level security;

drop policy if exists "Belege lesen Buero Leitung" on public.zahlungsbelege;
create policy "Belege lesen Buero Leitung" on public.zahlungsbelege for select to authenticated
  using (zm_darf(fahrschule_id));
drop policy if exists "Belege anlegen Buero Leitung" on public.zahlungsbelege;
create policy "Belege anlegen Buero Leitung" on public.zahlungsbelege for insert to authenticated
  with check (zm_darf(fahrschule_id));
-- keine UPDATE-/DELETE-Regel: ein Beleg ist nach dem Anlegen fest (zusätzlich Auslöser unten)

-- Anlegen: Server setzt alles, was auf dem Beleg „amtlich“ ist
create or replace function public.zahlungsbelege_anlegen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  o public.zahlungsbelege;
  sname text;
  fsname text;
  kopf jsonb;
  st jsonb;
  bar_an boolean;
begin
  if new.storno_von is not null then
    -- Gegenbeleg: alles vom Original, Betrag negativ. Nur einmal je Beleg (Index), nie ein Storno stornieren.
    select * into o from public.zahlungsbelege where id = new.storno_von for update;
    if not found or o.fahrschule_id is distinct from new.fahrschule_id then
      raise exception 'Beleg zum Stornieren nicht gefunden' using errcode = '22023';
    end if;
    if o.storno_von is not null then raise exception 'Ein Storno kann nicht storniert werden' using errcode = '22023'; end if;
    new.schueler_id := o.schueler_id; new.schueler_name := o.schueler_name; new.zahlart := o.zahlart;
    new.betrag := -o.betrag; new.fahrschule_daten := o.fahrschule_daten; new.steuer := o.steuer;
    new.zweck := 'Storno zu Beleg Nr. ' || o.nummer || coalesce(nullif(': ' || left(btrim(coalesce(new.zweck, '')), 150), ': '), '');
    new.datum := (now() at time zone 'Europe/Berlin')::date;   -- Gegenbeleg immer mit dem Tag des Stornos, deutsche Zeit (Prüfer Daten, Richter)
  else
    if new.betrag is null or new.betrag <= 0 then raise exception 'Betrag muss größer als 0 sein' using errcode = '22023'; end if;
    if new.schueler_id is not null then
      select s.name into sname from public.schueler s where s.id = new.schueler_id and s.fahrschule_id = new.fahrschule_id;
      if not found then raise exception 'Schüler gehört nicht zu dieser Fahrschule' using errcode = '22023'; end if;
      new.schueler_name := coalesce(nullif(btrim(sname), ''), new.schueler_name);
    end if;
    new.schueler_name := btrim(coalesce(new.schueler_name, ''));
    new.zweck := btrim(coalesce(new.zweck, ''));
    if new.zahlart = 'bar' then
      bar_an := coalesce((public.fahrschule_einstellung(new.fahrschule_id, 'beleg.bargeld') ->> 'aktiv') = 'true', false);
      if not bar_an then
        raise exception 'Bargeld-Belege sind in den Einstellungen ausgeschaltet' using errcode = '42501';
      end if;
    end if;
    if new.datum is null or new.datum > (now() at time zone 'Europe/Berlin')::date + 1 or new.datum < (now() at time zone 'Europe/Berlin')::date - 3650 then
      raise exception 'Datum der Zahlung ungültig' using errcode = '22023';
    end if;
    -- Kopie von Fahrschul-Kopf und Steuer-Einstellung: der Beleg bleibt so, auch wenn die Einstellung später geändert wird
    select f.name into fsname from public.fahrschulen f where f.id = new.fahrschule_id;
    kopf := coalesce(public.fahrschule_einstellung(new.fahrschule_id, 'beleg.fahrschule'), '{}'::jsonb);
    if coalesce(btrim(kopf ->> 'name'), '') = '' then kopf := kopf || jsonb_build_object('name', coalesce(fsname, '')); end if;
    new.fahrschule_daten := kopf;
    st := public.fahrschule_einstellung(new.fahrschule_id, 'beleg.steuer');
    new.steuer := case when st is not null and (st ->> 'ausweisen') = 'true' then st else null end;
  end if;
  -- fortlaufende Nummer je Fahrschule: Zähler-Zeile sperrt, zwei gleichzeitige Belege bekommen nacheinander die nächste Zahl.
  -- Scheitert das Anlegen danach, wird auch der Zähler zurückgerollt (keine Lücke).
  insert into public.beleg_zaehler (fahrschule_id, letzte) values (new.fahrschule_id, 0) on conflict (fahrschule_id) do nothing;
  update public.beleg_zaehler set letzte = letzte + 1 where fahrschule_id = new.fahrschule_id returning letzte into new.nummer;
  new.erstellt_am := now();
  new.erstellt_von := auth.uid();
  new.bearbeiter := nullif(coalesce(public.buero_bearbeiter(), ''), '');
  return new;
end;
$function$;
drop trigger if exists zahlungsbelege_anlegen on public.zahlungsbelege;
create trigger zahlungsbelege_anlegen before insert on public.zahlungsbelege
  for each row execute function public.zahlungsbelege_anlegen();

-- Fest: Ändern und Löschen sind für jeden gesperrt (auch mit Dienst-Schlüssel), Storno nur als Gegenbeleg
create or replace function public.zahlungsbelege_fest()
 returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  raise exception 'Ein Beleg kann nicht geändert oder gelöscht werden. Bitte stornieren (Gegenbeleg).' using errcode = '42501';
end;
$function$;
drop trigger if exists zahlungsbelege_fest on public.zahlungsbelege;
create trigger zahlungsbelege_fest before update or delete on public.zahlungsbelege
  for each row execute function public.zahlungsbelege_fest();

revoke all on function public.zahlungsbelege_anlegen() from public, anon, authenticated;
revoke all on function public.zahlungsbelege_fest() from public, anon, authenticated;
revoke all on public.zahlungsbelege from anon;
revoke all on public.zahlungsbelege from authenticated;
grant select, insert on public.zahlungsbelege to authenticated;

-- Ergebniszeile (erwartet: tabellen=2, rls_belege=true, rls_zaehler=true, policies=2, trigger=2, konstante_ok=true)
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('zahlungsbelege','beleg_zaehler')) as tabellen,
  (select relrowsecurity from pg_class where oid = 'public.zahlungsbelege'::regclass) as rls_belege,
  (select relrowsecurity from pg_class where oid = 'public.beleg_zaehler'::regclass) as rls_zaehler,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'zahlungsbelege') as policies,
  (select count(*) from pg_trigger where tgrelid = 'public.zahlungsbelege'::regclass and not tgisinternal) as trigger,
  (select pg_get_constraintdef(oid) like '%beleg|punkte%' from pg_constraint where conname = 'fe_schluessel') as konstante_ok;
