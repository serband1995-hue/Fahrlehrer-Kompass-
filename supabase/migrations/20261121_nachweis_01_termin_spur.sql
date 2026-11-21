-- Ausbildungsnachweis (Wunsch Serband 21.11.2026): Spur für jede Änderung an Terminen + Unterschrift wird bei Änderung ungültig.
-- 1. aenderungsprotokoll bekommt ein Feld „grund“ (optional, vom Büro eingetragen).
-- 2. Vor jedem Update eines Termins: Ist die Fahrstunde unterschrieben und ändern sich Datum, Uhrzeit, Art oder Schüler,
--    wird die Unterschrift ungültig (signed=false). Der alte Abdruck bleibt als Beweis in payload.signaturUngueltig.
--    Kein stilles Umschreiben unterschriebener Daten.
-- 3. Jede Änderung der Nachweis-Felder kommt ins aenderungsprotokoll (wer, wann, alt, neu, Grund).
--    Neu angelegte Termine nur, wenn Büro oder Leitung sie anlegen (die App legt ständig an; das wäre nur Rauschen).
-- Den Grund schickt das Büro als payload.korrekturGrund mit; der Trigger nimmt ihn heraus (bleibt nicht im Termin stehen).
-- Rückweg: supabase/rueckweg/20261121_nachweis_rueckweg.sql

alter table public.aenderungsprotokoll add column if not exists grund text;

create or replace function public.termin_nachweis_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g text;
  f text; a text; n text;
  wer text;
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
          or new.art is distinct from old.art or new.schueler_id is distinct from old.schueler_id) then
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
      'signed', false,
      'signatureSnap', null,
      'signaturUngueltig', jsonb_build_object(
        'am', now(),
        'alt', jsonb_build_object('datum', old.datum, 'von', old.von, 'bis', old.bis, 'art', old.art),
        'signedAt', old.payload->'signedAt',
        'snap', old.payload->'signatureSnap'));
  end if;

  foreach f in array array['datum','von','bis','art','schueler_id','fahrlehrer_id','geloescht','status','sonderArt','signed'] loop
    if f in ('sonderArt', 'signed') then
      a := old.payload->>f; n := new.payload->>f;
      if f = 'signed' then a := coalesce(a, 'false'); n := coalesce(n, 'false'); end if;
    else
      execute format('select ($1).%I::text, ($2).%I::text', f, f) into a, n using old, new;
    end if;
    if a is distinct from n then
      if wer is null then wer := coalesce(public.buero_bearbeiter(), ''); end if;
      insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
      values (new.fahrschule_id, 'kalender_termine', new.id, f, a, n, auth.uid(), nullif(wer, ''), g);
    end if;
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
  if is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid()) then
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
