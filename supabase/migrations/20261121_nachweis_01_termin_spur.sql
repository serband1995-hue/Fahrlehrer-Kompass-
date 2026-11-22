-- Ausbildungsnachweis (Wunsch Serband 21.11.2026): Spur für jede Änderung an Terminen + Unterschrift wird bei Änderung ungültig.
-- 1. aenderungsprotokoll bekommt ein Feld „grund“ (optional, vom Büro eingetragen).
-- 2. Vor jedem Update eines Termins: Ist die Fahrstunde unterschrieben und ändern sich Datum, Uhrzeit, Art oder Schüler,
--    wird die Unterschrift ungültig (signed=false). Der alte Abdruck bleibt als Beweis in payload.signaturUngueltig.
--    Kein stilles Umschreiben unterschriebener Daten.
-- 3. Eine veraltete App (lädt ihren alten Stand mit signed=true hoch) darf eine ungültig gemachte Unterschrift nicht
--    wieder gültig machen. Erkennung ohne Uhr: Ein Gerät, das die Ungültigkeit abgeholt hat, schickt dasselbe
--    signaturUngueltig.am zurück (dann zählt die neue Unterschrift, auch aus App-Version 82); ein veraltetes kennt es nicht.
-- 4. Jede Änderung der Nachweis-Felder kommt ins aenderungsprotokoll (wer, wann, alt, neu, Grund).
--    Neu angelegte Termine nur, wenn Büro oder Leitung sie im Büro anlegen (erstellt_von gesetzt; die App setzt es nicht).
-- Den Grund schickt das Büro als payload.korrekturGrund mit; der Trigger nimmt ihn heraus (bleibt nicht im Termin stehen).
-- Hinweis: Beim Einfügen mehrerer Zeilen in einem Befehl und beim Upsert-Update geht der Grund verloren (kein Büro-Weg nutzt das).
-- Idempotent (mehrfach ausführbar). Rückweg: supabase/rueckweg/20261121_nachweis_rueckweg.sql

alter table public.aenderungsprotokoll add column if not exists grund text;

create or replace function public.termin_nachweis_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g text;
  r record;
  wer text;
  u jsonb;
begin
  g := nullif(left(coalesce(new.payload->>'korrekturGrund', ''), 300), '');
  if new.payload ? 'korrekturGrund' then new.payload := new.payload - 'korrekturGrund'; end if;

  if tg_op = 'INSERT' then
    -- Für das Protokoll nach dem Einfügen merken (nur diese Transaktion)
    perform set_config('kompass.nachweis_grund', coalesce(g, ''), true);
    return new;
  end if;

  -- Unterschrift ungültig machen, wenn sich der Inhalt der unterschriebenen Stunde ändert
  if coalesce(old.payload->>'signed', '') = 'true'
     and (new.datum is distinct from old.datum or new.von is distinct from old.von or new.bis is distinct from old.bis
          or coalesce(new.art, 'fahrstunde') is distinct from coalesce(old.art, 'fahrstunde') or new.schueler_id is distinct from old.schueler_id) then
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
      'signed', false,
      'signatureSnap', null,
      'signaturUngueltig', jsonb_build_object(
        'am', now(),
        'alt', jsonb_build_object('datum', old.datum, 'von', old.von, 'bis', old.bis, 'art', old.art),
        'signedAt', old.payload->'signedAt',
        'snap', old.payload->'signatureSnap'));
  -- Veralteter Stand: ungültig gemachte Unterschrift kommt ohne neue Unterschrift zurück → bleibt ungültig
  elsif jsonb_typeof(old.payload->'signaturUngueltig') = 'object'
     and coalesce(old.payload->'signaturUngueltig'->>'erledigt', '') <> 'true'
     and coalesce(old.payload->>'signed', '') <> 'true'
     and coalesce(new.payload->>'signed', '') = 'true'
     and (new.payload->'signaturUngueltig'->>'am') is distinct from (old.payload->'signaturUngueltig'->>'am') then
    u := old.payload->'signaturUngueltig';
    new.payload := new.payload || jsonb_build_object('signed', false, 'signatureSnap', null, 'signaturUngueltig', u);
  end if;

  for r in
    select * from (values
      ('datum', old.datum::text, new.datum::text),
      ('von', old.von, new.von),
      ('bis', old.bis, new.bis),
      ('art', old.art, new.art),
      ('schueler_id', old.schueler_id, new.schueler_id),
      ('fahrlehrer_id', old.fahrlehrer_id::text, new.fahrlehrer_id::text),
      ('geloescht', coalesce(old.geloescht, false)::text, coalesce(new.geloescht, false)::text),
      ('status', old.status, new.status),
      ('sonderArt', old.payload->>'sonderArt', new.payload->>'sonderArt'),
      ('signed', coalesce(old.payload->>'signed', 'false'), coalesce(new.payload->>'signed', 'false'))
    ) as v(feld, alt, neu)
    where v.alt is distinct from v.neu
  loop
    if wer is null then wer := coalesce(public.buero_bearbeiter(), ''); end if;
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
    values (new.fahrschule_id, 'kalender_termine', new.id, r.feld, r.alt, r.neu, auth.uid(), nullif(wer, ''), g);
  end loop;
  return new;
end $function$;

create or replace function public.termin_nachweis_angelegt()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare g text;
begin
  if new.erstellt_von is not null and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    g := nullif(current_setting('kompass.nachweis_grund', true), '');
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
    values (new.fahrschule_id, 'kalender_termine', new.id, 'angelegt', null,
            coalesce(new.datum::text, '') || ' ' || coalesce(new.von, '') || '–' || coalesce(new.bis, ''), auth.uid(), public.buero_bearbeiter(), g);
  end if;
  perform set_config('kompass.nachweis_grund', '', true);
  return null;
end $function$;

-- „zz“: läuft nach den Schutz-Triggern (Reihenfolge nach Namen)
drop trigger if exists trg_termin_zz_nachweis_spur on public.kalender_termine;
create trigger trg_termin_zz_nachweis_spur before insert or update on public.kalender_termine
  for each row execute function public.termin_nachweis_spur();
drop trigger if exists trg_termin_zz_nachweis_angelegt on public.kalender_termine;
create trigger trg_termin_zz_nachweis_angelegt after insert on public.kalender_termine
  for each row execute function public.termin_nachweis_angelegt();

-- Ergebnis-Abfrage: erwartet grund_spalte = 1, trigger = 2, funktionen = 2
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'aenderungsprotokoll' and column_name = 'grund') as grund_spalte,
       (select count(*) from pg_trigger where tgrelid = 'public.kalender_termine'::regclass and tgname in ('trg_termin_zz_nachweis_spur', 'trg_termin_zz_nachweis_angelegt')) as trigger,
       (select count(*) from pg_proc where proname in ('termin_nachweis_spur', 'termin_nachweis_angelegt') and pronamespace = 'public'::regnamespace) as funktionen;
