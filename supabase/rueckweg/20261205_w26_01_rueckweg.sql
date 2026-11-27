-- Rückweg zu supabase/migrations/20261205_w26_01_kunden_adresse.sql (W26: Kundennummer, Anschrift, Quittung).
-- ACHTUNG: Entfernt Kundennummern und Anschriften der Schüler. Sind schon Anschriften eingetragen oder Belege mit
-- Kundennummer erstellt, bricht der Rückweg ab (nichts geändert). Erst sichern, dann bewusst p_trotzdem = true setzen.
-- Belege selbst bleiben (aufbewahrungspflichtig); nur die drei neuen Spalten der Belege fallen weg.
do $$
declare
  p_trotzdem boolean := false;   -- nur nach Sicherung auf true setzen
  n_adr int := 0; n_bel int := 0;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'schueler' and column_name = 'strasse') then
    execute 'select count(*) from public.schueler where strasse is not null or plz is not null or ort is not null' into n_adr;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zahlungsbelege' and column_name = 'kundennummer') then
    execute 'select count(*) from public.zahlungsbelege where kundennummer is not null or schueler_adresse is not null or aussteller is not null' into n_bel;
  end if;
  if (n_adr > 0 or n_bel > 0) and not p_trotzdem then
    raise exception 'Es gibt % Schüler mit Anschrift und % Beleg(e) mit neuen Angaben. Erst sichern, dann p_trotzdem = true setzen.', n_adr, n_bel;
  end if;
end $$;

drop trigger if exists trg_schueler_kunde_vor on public.schueler;
drop function if exists public.schueler_kunde_vor();
drop index if exists public.schueler_kundennummer_eindeutig;
alter table public.schueler drop constraint if exists schueler_kundennummer_positiv;
alter table public.schueler drop constraint if exists schueler_plz_format;
alter table public.schueler drop constraint if exists schueler_adresse_laenge;
alter table public.schueler drop column if exists kundennummer;
alter table public.schueler drop column if exists strasse;
alter table public.schueler drop column if exists plz;
alter table public.schueler drop column if exists ort;
drop table if exists public.kunden_zaehler;

-- Änderungsverlauf wieder ohne Anschrift (wörtlich wie vor W26)
create or replace function public.schueler_protokoll()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  f text; a text; n text;
begin
  foreach f in array array['vertrag_am','klasse','ausbildungsart','reakt_status','reakt_bezahlt_bis','reakt_notiz','reakt_betrag','theorie_abgeschlossen_am','theorie_bestanden_am','praxis_bestanden_am','b197_testfahrt_am','inaktiv_seit','antrag_am',
                           'bewerbernummer','theorie_frist_bis','sehhilfe','vorbesitz','auslands_fs','wohnsitz_de_seit','uebersetzung_vorhanden'] loop
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

-- Beleg-Auslöser wieder wie W19 (wörtlich), danach die drei Spalten weg (Auslöser „fest“ betrifft nur Zeilen, nicht Spalten)
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
revoke all on function public.zahlungsbelege_anlegen() from public, anon, authenticated;
alter table public.zahlungsbelege drop column if exists kundennummer;
alter table public.zahlungsbelege drop column if exists schueler_adresse;
alter table public.zahlungsbelege drop column if exists aussteller;

-- Ergebniszeile (erwartet: spalten=0, zaehler=false, trigger=0, beleg_spalten=0)
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'schueler'
     and column_name in ('kundennummer','strasse','plz','ort')) as spalten,
  (to_regclass('public.kunden_zaehler') is not null) as zaehler,
  (select count(*) from pg_trigger where tgrelid = 'public.schueler'::regclass and tgname = 'trg_schueler_kunde_vor') as trigger,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'zahlungsbelege'
     and column_name in ('kundennummer','schueler_adresse','aussteller')) as beleg_spalten;
