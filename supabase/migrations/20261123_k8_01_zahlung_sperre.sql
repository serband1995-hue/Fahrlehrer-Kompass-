-- K8 Sperre bei offener Zahlung (Werkstatt 12, Nachtplan 23.11.2026).
-- Gesperrte Schüler bekommen keine neuen Termine mehr – weder über die App, das Büro noch die Online-Buchung.
-- Gesperrt ist ein Schüler, wenn
--   (a) die Reaktivierung „gesperrt“ ist – gleiche Regel wie KR.reaktInfo in kompass-rechnen.js:
--       nicht befreit, fällig (reakt_bezahlt_bis, sonst Vertrag + 12 Monate) liegt vor heute und das Büro hat nicht
--       „noch nicht geprüft“ (reakt_status = 'pruefen') stehen. „Noch nicht geprüft“ ist nur eine Erinnerung.
--   (b) oder das Büro „Zahlung ausstehend“ gedrückt hat: schueler.zahlung_gesperrt_seit (+ Grund).
--       „Bezahlt“ leert die Felder. Setzen und aufheben dürfen nur Büro, Leitung, Super-Admin (sonst bleibt der alte Wert).
--       🗣 Keine automatische Sperre (z. B. nach vergessenen Fahrchecks): das Büro entscheidet per Knopf.
-- Gesperrt heißt: kein NEUER künftiger Termin (Fahrstunde, Sonderfahrt, Nacht, Schalt, Prüfung) für diesen Schüler –
--   angelegt, auf ihn umgelegt, auf ein anderes Datum verschoben oder aus dem Papierkorb geholt. Bestehende Termine
--   bleiben (das Büro entscheidet). Theorie und Blocker sind nicht betroffen. Fehler: P0001 „Zahlung ausstehend …“
--   (die App überspringt so eine Zeile einzeln, die anderen werden weiter gespeichert).
-- Online-Buchung (public_bookings): passt Telefon oder E-Mail zu einem gesperrten Schüler derselben Fahrschule,
--   wird die Buchung abgelehnt – mit einer neutralen Meldung, die nichts über Zahlungen verrät.
-- Spur: jede Sperre und Aufhebung kommt ins aenderungsprotokoll (wer, wann, Grund).
-- Voraussetzung: 20261121_nachweis_01 (aenderungsprotokoll.grund), buero_bearbeiter().
-- Idempotent. Rückweg: supabase/rueckweg/20261123_k8_rueckweg.sql

alter table public.schueler add column if not exists zahlung_gesperrt_seit timestamptz;
alter table public.schueler add column if not exists zahlung_gesperrt_grund text;

-- (a) Reaktivierung gesperrt (wie KR.reaktInfo). to_jsonb: läuft auch, wenn eine Spalte fehlt
create or replace function public.schueler_reakt_gesperrt(s public.schueler)
 returns boolean
 language sql
 stable
 set search_path to 'public'
as $function$
  select coalesce(j->>'reakt_status', '') <> 'befreit'
     and coalesce(j->>'reakt_status', '') <> 'pruefen'
     and coalesce(nullif(j->>'reakt_bezahlt_bis', '')::date,
                  (nullif(j->>'vertrag_am', '')::date + interval '12 months')::date) < (now() at time zone 'Europe/Berlin')::date
  from (select to_jsonb(s) as j) x;
$function$;

-- Grund der Sperre (null = frei). Archiv und gelöschte Schüler: frei (dort wird nichts gebucht)
create or replace function public.schueler_buchung_gesperrt(sid text)
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select case
           when s.zahlung_gesperrt_seit is not null then coalesce(nullif(btrim(s.zahlung_gesperrt_grund), ''), 'Zahlung ausstehend')
           when public.schueler_reakt_gesperrt(s) then 'Reaktivierung nicht bezahlt'
         end
    from public.schueler s
   where s.id::text = sid
     and coalesce(s.status, '') <> 'geloescht'
     and (to_jsonb(s)->>'inaktiv_seit') is null
   limit 1;
$function$;
revoke all on function public.schueler_buchung_gesperrt(text) from public, anon;
grant execute on function public.schueler_buchung_gesperrt(text) to authenticated;

-- Termine: kein neuer künftiger Termin für gesperrte Schüler
create or replace function public.termin_zahlung_sperre()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare g text;
begin
  if auth.uid() is null then return new; end if; -- Server, Nachtläufe, Migrationen
  if new.schueler_id is null or coalesce(new.geloescht, false) then return new; end if;
  if coalesce(new.art, 'fahrstunde') not in ('fahrstunde', 'sonder', 'nacht', 'schalt', 'pruefung') then return new; end if;
  if new.datum is null or new.datum < (now() at time zone 'Europe/Berlin')::date then return new; end if;
  if tg_op = 'UPDATE'
     and new.schueler_id is not distinct from old.schueler_id
     and new.datum is not distinct from old.datum
     and not coalesce(old.geloescht, false) then
    return new; -- nichts Neues (Notiz, Unterschrift, Fahrcheck … an einem bestehenden Termin)
  end if;
  g := public.schueler_buchung_gesperrt(new.schueler_id);
  if g is not null then
    raise exception 'Zahlung ausstehend: %', g using errcode = 'P0001', hint = 'Bitte zuerst im Büro klären.';
  end if;
  return new;
end $function$;

drop trigger if exists trg_termin_zx_zahlung on public.kalender_termine;
create trigger trg_termin_zx_zahlung before insert or update on public.kalender_termine
  for each row execute function public.termin_zahlung_sperre();

-- Sperre setzen/aufheben: nur Büro, Leitung, Super-Admin; Spur
create or replace function public.schueler_zahlung_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE'
     and (new.zahlung_gesperrt_seit is distinct from old.zahlung_gesperrt_seit or new.zahlung_gesperrt_grund is distinct from old.zahlung_gesperrt_grund)
     and auth.uid() is not null
     and not (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    new.zahlung_gesperrt_seit := old.zahlung_gesperrt_seit;
    new.zahlung_gesperrt_grund := old.zahlung_gesperrt_grund;
  end if;
  if tg_op = 'INSERT' and new.zahlung_gesperrt_seit is not null and auth.uid() is not null
     and not (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    new.zahlung_gesperrt_seit := null; new.zahlung_gesperrt_grund := null;
  end if;
  if new.zahlung_gesperrt_seit is not null then new.zahlung_gesperrt_grund := nullif(left(btrim(coalesce(new.zahlung_gesperrt_grund, '')), 200), ''); end if;
  if new.zahlung_gesperrt_seit is null then new.zahlung_gesperrt_grund := null; end if;
  return new;
end $function$;

drop trigger if exists trg_schueler_zahlung_schutz on public.schueler;
create trigger trg_schueler_zahlung_schutz before insert or update on public.schueler
  for each row execute function public.schueler_zahlung_schutz();

create or replace function public.schueler_zahlung_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (new.zahlung_gesperrt_seit is null) is distinct from (old.zahlung_gesperrt_seit is null) and new.fahrschule_id is not null then
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
    values (new.fahrschule_id, 'schueler', new.id::text, 'zahlung_gesperrt',
            case when old.zahlung_gesperrt_seit is null then 'frei' else 'gesperrt' end,
            case when new.zahlung_gesperrt_seit is null then 'frei' else 'gesperrt' end,
            auth.uid(), nullif(coalesce(public.buero_bearbeiter(), ''), ''),
            case when new.zahlung_gesperrt_seit is null then 'bezahlt' else coalesce(new.zahlung_gesperrt_grund, 'Zahlung ausstehend') end);
  end if;
  return null;
end $function$;

drop trigger if exists trg_schueler_zahlung_spur on public.schueler;
create trigger trg_schueler_zahlung_spur after update on public.schueler
  for each row execute function public.schueler_zahlung_spur();

-- Online-Buchung: gesperrte Schüler (Telefon oder E-Mail passt) werden neutral abgewiesen
create or replace function public.buchung_zahlung_sperre()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  j jsonb := to_jsonb(new);
  fs uuid;
  tel text := right(regexp_replace(coalesce(j->>'schueler_telefon', ''), '\D', '', 'g'), 9);
  mail text := lower(btrim(coalesce(j->>'schueler_email', '')));
begin
  if length(tel) < 7 then tel := ''; end if;
  if position('@' in mail) = 0 then mail := ''; end if;
  if tel = '' and mail = '' then return new; end if;
  fs := nullif(j->>'fahrschule_id', '')::uuid;
  if fs is null and nullif(j->>'fahrlehrer_id', '') is not null then
    select p.fahrschule_id into fs from public.profiles p where p.id::text = j->>'fahrlehrer_id';
  end if;
  if fs is null then return new; end if;
  if exists (
    select 1 from public.schueler s
     where s.fahrschule_id = fs
       and ((tel <> '' and right(regexp_replace(coalesce(s.telefon, ''), '\D', '', 'g'), 9) = tel)
            or (mail <> '' and lower(btrim(coalesce(to_jsonb(s)->>'email', s.ausbildung->>'email', ''))) = mail))
       and public.schueler_buchung_gesperrt(s.id::text) is not null) then
    raise exception 'Online-Buchung gerade nicht möglich. Bitte melde dich kurz im Büro.' using errcode = 'P0001';
  end if;
  return new;
end $function$;

do $$
begin
  if to_regclass('public.public_bookings') is not null then
    execute 'drop trigger if exists trg_buchung_zahlung_sperre on public.public_bookings';
    execute 'create trigger trg_buchung_zahlung_sperre before insert on public.public_bookings for each row execute function public.buchung_zahlung_sperre()';
  end if;
end $$;

-- Ergebnis-Abfrage: erwartet spalten = 2, trigger_termine = 1, trigger_schueler = 2, trigger_buchung = 1 (0, falls es public_bookings nicht gibt), funktionen = 6
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'schueler' and column_name in ('zahlung_gesperrt_seit', 'zahlung_gesperrt_grund')) as spalten,
       (select count(*) from pg_trigger where tgrelid = 'public.kalender_termine'::regclass and tgname = 'trg_termin_zx_zahlung') as trigger_termine,
       (select count(*) from pg_trigger where tgrelid = 'public.schueler'::regclass and tgname in ('trg_schueler_zahlung_schutz', 'trg_schueler_zahlung_spur')) as trigger_schueler,
       (select count(*) from pg_trigger where tgname = 'trg_buchung_zahlung_sperre') as trigger_buchung,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('schueler_reakt_gesperrt', 'schueler_buchung_gesperrt', 'termin_zahlung_sperre', 'schueler_zahlung_schutz', 'schueler_zahlung_spur', 'buchung_zahlung_sperre')) as funktionen;
