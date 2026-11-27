-- W26 Teil 1+2+3 (27.11.2026): Kundennummer, Anschrift der Schüler, Quittung mit Kundennummer/Anschrift/Aussteller.
-- 🗣 Serband (über HS8): „Wir haben Zeit bis Ende des Jahres, lets go“. Idempotent. Rückweg: supabase/rueckweg/20261205_w26_01_rueckweg.sql
-- Voraussetzung: zahlungsbelege (20261201_w19_02), fahrschule_einstellung(), buero_bearbeiter(), schueler_protokoll().
--
-- 1. schueler.kundennummer: je Fahrschule fortlaufend (Zähler-Tabelle kunden_zaehler, Zeile sperrt → sicher bei zwei Geräten
--    gleichzeitig), eindeutig (Unique fahrschule_id + kundennummer). Vergibt NUR der Server:
--    - beim Anlegen (Wert vom Client wird überschrieben). Gibt es die Zeile schon (Upsert der App-Brücke = INSERT … ON CONFLICT),
--      wird KEINE Nummer verbraucht (sonst Lücken bei jedem Abgleich).
--    - beim Ändern bleibt sie, wie sie ist (auch mit Dienst-Schlüssel). Ausnahme: Zeile ohne Nummer (z. B. aus einer alten
--      Sicherung zurückgeholt) bekommt beim nächsten Ändern die nächste Nummer; Wechsel der Fahrschule = neue Nummer dort.
--    - Bestand: einmalig in Anlage-Reihenfolge (erstellt_am, dann id), auch gelöschte (Papierkorb kann sie zurückholen).
--      In einem einzigen UPDATE (ein einziger Anstoß der Akademie-Brücke). Sonst ändert sich an den Schülern nichts.
-- 2. schueler.strasse (Straße und Hausnummer), plz (5 Ziffern), ort. Leer = null, nichts Pflicht. Fahrlehrer darf wie bei der
--    Bewerbernummer mitpflegen (keine neue Sperre). Änderungen kommen in den Änderungsverlauf (schueler_protokoll).
--    Die Fahr-Akademie bekommt sie NICHT (Export-Sichten nennen ihre Spalten einzeln).
-- 3. zahlungsbelege: kundennummer, schueler_adresse (jsonb), aussteller – vom Server beim Anlegen als feste Kopie gesetzt
--    (Storno übernimmt sie vom Original). Alte Belege bleiben, wie sie sind (Felder leer).

-- ===== 1. Spalten =====
alter table public.schueler add column if not exists kundennummer integer;
alter table public.schueler add column if not exists strasse text;
alter table public.schueler add column if not exists plz text;
alter table public.schueler add column if not exists ort text;
alter table public.schueler drop constraint if exists schueler_kundennummer_positiv;
alter table public.schueler add constraint schueler_kundennummer_positiv check (kundennummer is null or kundennummer > 0);
alter table public.schueler drop constraint if exists schueler_plz_format;
alter table public.schueler add constraint schueler_plz_format check (plz is null or plz ~ '^[0-9]{5}$');
alter table public.schueler drop constraint if exists schueler_adresse_laenge;
alter table public.schueler add constraint schueler_adresse_laenge check (coalesce(length(strasse), 0) <= 120 and coalesce(length(ort), 0) <= 80);
create unique index if not exists schueler_kundennummer_eindeutig on public.schueler (fahrschule_id, kundennummer) where kundennummer is not null;

-- ===== 2. Zähler je Fahrschule (nur für den Auslöser; kein Zugriff für Clients) =====
create table if not exists public.kunden_zaehler (
  fahrschule_id uuid primary key references public.fahrschulen(id) on delete cascade,
  letzte integer not null default 0 check (letzte >= 0)
);
alter table public.kunden_zaehler enable row level security;
revoke all on public.kunden_zaehler from anon, authenticated;

-- ===== 3. Auslöser: Nummer vergeben/festhalten, Anschrift säubern =====
create or replace function public.schueler_kunde_vor()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  neu boolean := false;
begin
  -- Anschrift: Leerzeichen am Rand weg, leer = null (der Check prüft danach PLZ und Länge)
  new.strasse := nullif(btrim(regexp_replace(coalesce(new.strasse, ''), '\s+', ' ', 'g')), '');
  new.plz     := nullif(btrim(coalesce(new.plz, '')), '');
  new.ort     := nullif(btrim(regexp_replace(coalesce(new.ort, ''), '\s+', ' ', 'g')), '');

  if tg_op = 'INSERT' then
    -- Upsert einer schon vorhandenen Zeile: der Konflikt führt gleich zum UPDATE-Zweig, dort bleibt die alte Nummer.
    if exists (select 1 from public.schueler s where s.id = new.id) then
      new.kundennummer := null;
      return new;
    end if;
    neu := true;
  else
    if new.fahrschule_id is distinct from old.fahrschule_id then
      neu := true;                                     -- andere Fahrschule: dort fortlaufend weiter
    elsif old.kundennummer is not null then
      new.kundennummer := old.kundennummer;            -- fest: niemand ändert sie
      return new;
    elsif new.kundennummer is not null and coalesce(current_setting('kompass.w26_bestand', true), '') = '1' then
      return new;                                      -- nur die einmalige Bestands-Vergabe dieser Migration
    else
      neu := true;                                     -- Zeile ohne Nummer (z. B. aus alter Sicherung): jetzt vergeben
    end if;
  end if;

  if neu then
    if new.fahrschule_id is null then new.kundennummer := null; return new; end if;
    insert into public.kunden_zaehler (fahrschule_id, letzte) values (new.fahrschule_id, 0) on conflict (fahrschule_id) do nothing;
    -- Zeile sperrt: gleichzeitige Anlagen bekommen nacheinander die nächste Zahl. Nie unter die höchste vergebene Nummer
    -- (Sicherheit, falls Zeilen mit Nummer ohne Zähler zurückgeschrieben wurden). Scheitert das Anlegen, rollt der Zähler mit zurück.
    update public.kunden_zaehler z
       set letzte = greatest(z.letzte, coalesce((select max(s.kundennummer) from public.schueler s where s.fahrschule_id = new.fahrschule_id), 0)) + 1
     where z.fahrschule_id = new.fahrschule_id
    returning z.letzte into new.kundennummer;
  end if;
  return new;
end;
$function$;
revoke all on function public.schueler_kunde_vor() from public, anon, authenticated;

drop trigger if exists trg_schueler_kunde_vor on public.schueler;
create trigger trg_schueler_kunde_vor before insert or update on public.schueler
  for each row execute function public.schueler_kunde_vor();

-- ===== 4. Bestand: einmalig, Anlage-Reihenfolge (ein UPDATE, nur Zeilen ohne Nummer) =====
-- Sitzungs-weit (nicht nur Transaktion): gilt auch, wenn der SQL-Editor jede Anweisung einzeln ausführt
select set_config('kompass.w26_bestand', '1', false);
with liste as (
  select s.id, s.fahrschule_id,
         coalesce((select max(x.kundennummer) from public.schueler x where x.fahrschule_id = s.fahrschule_id), 0)
         + row_number() over (partition by s.fahrschule_id order by s.erstellt_am nulls last, s.id) as nr
    from public.schueler s
   where s.kundennummer is null and s.fahrschule_id is not null
)
update public.schueler s set kundennummer = l.nr from liste l where s.id = l.id;
select set_config('kompass.w26_bestand', '', false);
insert into public.kunden_zaehler (fahrschule_id, letzte)
  select fahrschule_id, max(kundennummer) from public.schueler where kundennummer is not null group by fahrschule_id
  on conflict (fahrschule_id) do update set letzte = greatest(public.kunden_zaehler.letzte, excluded.letzte);

-- ===== 5. Änderungsverlauf: Anschrift mitschreiben (Rest wörtlich wie live am 27.11.2026) =====
create or replace function public.schueler_protokoll()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  f text; a text; n text;
begin
  foreach f in array array['vertrag_am','klasse','ausbildungsart','reakt_status','reakt_bezahlt_bis','reakt_notiz','reakt_betrag','theorie_abgeschlossen_am','theorie_bestanden_am','praxis_bestanden_am','b197_testfahrt_am','inaktiv_seit','antrag_am',
                           'bewerbernummer','theorie_frist_bis','sehhilfe','vorbesitz','auslands_fs','wohnsitz_de_seit','uebersetzung_vorhanden',
                           'strasse','plz','ort'] loop
    execute format('select ($1).%I::text, ($2).%I::text', f, f) into a, n using old, new;
    if a is distinct from n then
      -- Ausländischer Führerschein: Nummern nicht in den Verlauf schreiben, nur dass sich etwas geändert hat
      if f = 'auslands_fs' then a := case when a is null then null else '(Angaben)' end; n := case when n is null then null else '(Angaben geändert)' end; end if;
      insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
      values (new.fahrschule_id, 'schueler', new.id, f, a, n, auth.uid(), public.buero_bearbeiter());
    end if;
  end loop;
  return new;
end $function$;

-- ===== 6. Quittung: Kundennummer, Anschrift, Aussteller als feste Kopie =====
alter table public.zahlungsbelege add column if not exists kundennummer integer;
alter table public.zahlungsbelege add column if not exists schueler_adresse jsonb;
alter table public.zahlungsbelege add column if not exists aussteller text;

create or replace function public.zahlungsbelege_anlegen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  o public.zahlungsbelege;
  sname text;
  sk public.schueler;
  fsname text;
  kopf jsonb;
  st jsonb;
  bar_an boolean;
  adr jsonb;
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
    new.kundennummer := o.kundennummer; new.schueler_adresse := o.schueler_adresse;   -- W26: wie auf dem Original
    new.zweck := 'Storno zu Beleg Nr. ' || o.nummer || coalesce(nullif(': ' || left(btrim(coalesce(new.zweck, '')), 150), ': '), '');
    new.datum := (now() at time zone 'Europe/Berlin')::date;   -- Gegenbeleg immer mit dem Tag des Stornos, deutsche Zeit (Prüfer Daten, Richter)
  else
    if new.betrag is null or new.betrag <= 0 then raise exception 'Betrag muss größer als 0 sein' using errcode = '22023'; end if;
    -- W26: Kundennummer und Anschrift nur vom Server (nie vom Client)
    new.kundennummer := null; new.schueler_adresse := null;
    if new.schueler_id is not null then
      select s.* into sk from public.schueler s where s.id = new.schueler_id and s.fahrschule_id = new.fahrschule_id;
      if not found then raise exception 'Schüler gehört nicht zu dieser Fahrschule' using errcode = '22023'; end if;
      sname := sk.name;
      new.schueler_name := coalesce(nullif(btrim(sname), ''), new.schueler_name);
      new.kundennummer := sk.kundennummer;
      adr := jsonb_strip_nulls(jsonb_build_object('strasse', sk.strasse, 'plz', sk.plz, 'ort', sk.ort));
      new.schueler_adresse := case when adr = '{}'::jsonb then null else adr end;
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
  -- W26: Aussteller = wer im Büro bedient, sonst der Name aus dem eigenen Profil (nichts erfunden: leer bleibt leer)
  new.aussteller := coalesce(new.bearbeiter, (select nullif(btrim(p.name), '') from public.profiles p where p.id = auth.uid()));
  return new;
end;
$function$;
revoke all on function public.zahlungsbelege_anlegen() from public, anon, authenticated;

-- Ergebniszeile (erwartet: spalten=4, ohne_nummer=0, doppelt=0, zaehler_ok=true, trigger=1, beleg_spalten=3)
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'schueler'
     and column_name in ('kundennummer','strasse','plz','ort')) as spalten,
  (select count(*) from public.schueler where kundennummer is null and fahrschule_id is not null) as ohne_nummer,
  (select count(*) from (select fahrschule_id, kundennummer from public.schueler where kundennummer is not null
     group by 1, 2 having count(*) > 1) d) as doppelt,
  (select coalesce(bool_and(z.letzte >= (select coalesce(max(s.kundennummer), 0) from public.schueler s where s.fahrschule_id = z.fahrschule_id)), true)
     from public.kunden_zaehler z) as zaehler_ok,
  (select count(*) from pg_trigger where tgrelid = 'public.schueler'::regclass and tgname = 'trg_schueler_kunde_vor') as trigger,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'zahlungsbelege'
     and column_name in ('kundennummer','schueler_adresse','aussteller')) as beleg_spalten;
