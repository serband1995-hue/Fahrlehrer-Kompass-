-- Auftrag 4 „Zahlungsaufforderung per Mail“ (🗣 Serband 23.11.2026: Boost will das Geld per Überweisung oder PayPal;
-- im Büro ein Knopf „Zahlungsaufforderung verschicken“, danach ein Haken; Bankdaten und PayPal trägt Boost selbst ein;
-- bis zum Freischalten gehen Test-Mails nur an die Test-Adresse).
-- 1. fahrschule_zahlungsdaten: je Fahrschule Kontoinhaber, IBAN (Prüfziffer wird hier geprüft), BIC, PayPal.me-Name,
--    Impressum/Kontakt für den Mail-Fuß, Hauptschalter modus 'test' (Vorgabe) / 'echt', Test-Adresse.
--    Lesen und schreiben: Büro, Leitung (eigene Fahrschule), Super-Admin. Jede Änderung steht in aenderungsprotokoll.
-- 2. zahlungs_mails: Spur jedes Versands (wer, wann, Art, Betrag, test/echt, Empfänger gekürzt, Resend-ID).
--    Nur lesbar fürs Büro; schreiben nur über zahlungs_mail_vorbereiten() und den Server (Edge-Funktion zahlungs-mail).
-- 3. zahlungs_mail_vorbereiten(): prüft Rolle, Fahrschule, Betrag, Zahlungsdaten, höchstens 5 Mails je Schüler und Tag,
--    und bestimmt den EMPFÄNGER SELBST (Test: nur Test-Adresse, nie die Schüler-Adresse). Der Browser schickt nur
--    Schüler, Art, Betrag und „wofür“.
-- Voraussetzung: is_buero/is_fahrschule_admin/is_super_admin, k5_meine_fahrschule() (K5), buero_bearbeiter(),
--   aenderungsprotokoll (datensatz_id text). Idempotent. Rückweg: supabase/rueckweg/20261124_zm_rueckweg.sql

-- ---------- IBAN prüfen (ISO 13616, mod 97) ----------
create or replace function public.iban_gueltig(p text)
 returns boolean
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  s text := upper(regexp_replace(coalesce(p, ''), '\s', '', 'g'));
  r text;
  rest int := 0;
  c text;
  i int;
begin
  if s !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then return false; end if;
  if left(s, 2) = 'DE' and length(s) <> 22 then return false; end if;
  r := substr(s, 5) || left(s, 4);
  for i in 1..length(r) loop
    c := substr(r, i, 1);
    if c ~ '[0-9]' then
      rest := (rest * 10 + c::int) % 97;
    else
      rest := (rest * 100 + (ascii(c) - 55)) % 97;
    end if;
  end loop;
  return rest = 1;
end $function$;

-- ---------- 1. Zahlungsdaten ----------
create table if not exists public.fahrschule_zahlungsdaten (
  fahrschule_id uuid primary key references public.fahrschulen(id) on delete cascade,
  kontoinhaber text,
  iban text,
  bic text,
  paypal text,
  impressum text,
  modus text not null default 'test',
  test_email text,
  geaendert_von uuid,
  geaendert_am timestamptz not null default now(),
  bearbeiter text
);
do $$ begin
  alter table public.fahrschule_zahlungsdaten add constraint fzd_modus check (modus in ('test', 'echt'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fahrschule_zahlungsdaten add constraint fzd_laengen check (
    coalesce(length(kontoinhaber), 0) <= 70 and coalesce(length(bic), 0) <= 11 and coalesce(length(paypal), 0) <= 60
    and coalesce(length(impressum), 0) <= 1000 and coalesce(length(test_email), 0) <= 200);
exception when duplicate_object then null; end $$;

alter table public.fahrschule_zahlungsdaten enable row level security;

create or replace function public.zm_darf(fs uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(is_super_admin(auth.uid())
    or (fs is not null and fs = k5_meine_fahrschule() and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()))), false);
$function$;
revoke all on function public.zm_darf(uuid) from public, anon;
grant execute on function public.zm_darf(uuid) to authenticated;

drop policy if exists "Zahlungsdaten lesen Buero Leitung" on public.fahrschule_zahlungsdaten;
create policy "Zahlungsdaten lesen Buero Leitung" on public.fahrschule_zahlungsdaten for select to authenticated
  using (zm_darf(fahrschule_id));
drop policy if exists "Zahlungsdaten anlegen Buero Leitung" on public.fahrschule_zahlungsdaten;
create policy "Zahlungsdaten anlegen Buero Leitung" on public.fahrschule_zahlungsdaten for insert to authenticated
  with check (zm_darf(fahrschule_id));
drop policy if exists "Zahlungsdaten aendern Buero Leitung" on public.fahrschule_zahlungsdaten;
create policy "Zahlungsdaten aendern Buero Leitung" on public.fahrschule_zahlungsdaten for update to authenticated
  using (zm_darf(fahrschule_id)) with check (zm_darf(fahrschule_id));
-- kein Löschen (auch nicht Büro): leere Felder genügen

create or replace function public.fahrschule_zahlungsdaten_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then new.fahrschule_id := old.fahrschule_id; end if;
  new.geaendert_von := auth.uid();
  new.geaendert_am := now();
  new.bearbeiter := public.buero_bearbeiter();
  new.kontoinhaber := nullif(btrim(regexp_replace(coalesce(new.kontoinhaber, ''), '[\r\n\t]+', ' ', 'g')), '');
  new.iban := nullif(upper(regexp_replace(coalesce(new.iban, ''), '\s', '', 'g')), '');
  new.bic := nullif(upper(regexp_replace(coalesce(new.bic, ''), '\s', '', 'g')), '');
  -- PayPal: nur der Name (aus „https://www.paypal.me/name“ oder „paypal.me/name/10EUR“ wird „name“)
  new.paypal := nullif(regexp_replace(regexp_replace(btrim(coalesce(new.paypal, '')),
                  '^(https?://)?(www\.)?paypal\.me/', '', 'i'), '/.*$', ''), '');
  new.impressum := nullif(btrim(coalesce(new.impressum, '')), '');
  new.test_email := nullif(lower(btrim(coalesce(new.test_email, ''))), '');
  new.modus := coalesce(nullif(btrim(new.modus), ''), 'test');
  if new.iban is not null and not public.iban_gueltig(new.iban) then
    raise exception 'IBAN ungültig (Prüfziffer stimmt nicht)' using errcode = '22023';
  end if;
  if new.bic is not null and new.bic !~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$' then
    raise exception 'BIC ungültig' using errcode = '22023';
  end if;
  if new.paypal is not null and new.paypal !~ '^[A-Za-z0-9._-]{1,60}$' then
    raise exception 'PayPal.me-Name ungültig' using errcode = '22023';
  end if;
  if new.test_email is not null and new.test_email !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then
    raise exception 'Test-Adresse ungültig' using errcode = '22023';
  end if;
  if new.modus = 'echt' and (new.kontoinhaber is null or new.iban is null) then
    raise exception 'Für „Echt“ fehlen Kontoinhaber oder IBAN' using errcode = '22023';
  end if;
  return new;
end $function$;

drop trigger if exists fahrschule_zahlungsdaten_schutz on public.fahrschule_zahlungsdaten;
create trigger fahrschule_zahlungsdaten_schutz before insert or update on public.fahrschule_zahlungsdaten
  for each row execute function public.fahrschule_zahlungsdaten_schutz();

-- Spur: jede geänderte Angabe ein Eintrag
create or replace function public.fahrschule_zahlungsdaten_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  f text;
  a text;
  b text;
begin
  foreach f in array array['kontoinhaber', 'iban', 'bic', 'paypal', 'impressum', 'modus', 'test_email'] loop
    if tg_op = 'INSERT' then a := null; else execute format('select ($1).%I::text', f) into a using old; end if;
    execute format('select ($1).%I::text', f) into b using new;
    if a is distinct from b then
      insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
      values (new.fahrschule_id, 'fahrschule_zahlungsdaten', new.fahrschule_id::text, f, a, b, auth.uid(), new.bearbeiter);
    end if;
  end loop;
  return null;
end $function$;

drop trigger if exists fahrschule_zahlungsdaten_spur on public.fahrschule_zahlungsdaten;
create trigger fahrschule_zahlungsdaten_spur after insert or update on public.fahrschule_zahlungsdaten
  for each row execute function public.fahrschule_zahlungsdaten_spur();

revoke all on public.fahrschule_zahlungsdaten from anon;
revoke all on public.fahrschule_zahlungsdaten from authenticated;
grant select, insert, update on public.fahrschule_zahlungsdaten to authenticated;

-- ---------- 2. Spur der Mails ----------
create table if not exists public.zahlungs_mails (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  schueler_id text not null,
  art text not null,
  betrag_cent integer not null,
  wofuer text not null,
  modus text not null,
  empfaenger_kurz text,
  status text not null default 'vorbereitet',
  fehler text,
  resend_id text,
  gesendet_von uuid,
  bearbeiter text,
  angelegt_am timestamptz not null default now(),
  gesendet_am timestamptz
);
do $$ begin
  alter table public.zahlungs_mails add constraint zm_art check (art in ('pruefung', 'reaktivierung', 'zahlung_offen'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.zahlungs_mails add constraint zm_status check (status in ('vorbereitet', 'gesendet', 'fehler'));
exception when duplicate_object then null; end $$;
create index if not exists zahlungs_mails_schueler_idx on public.zahlungs_mails (fahrschule_id, schueler_id, angelegt_am desc);

alter table public.zahlungs_mails enable row level security;
drop policy if exists "Zahlungsmails lesen Buero Leitung" on public.zahlungs_mails;
create policy "Zahlungsmails lesen Buero Leitung" on public.zahlungs_mails for select to authenticated
  using (zm_darf(fahrschule_id));
-- keine Schreib-Regel: schreiben nur zahlungs_mail_vorbereiten() (security definer) und die Edge-Funktion (Server)

revoke all on public.zahlungs_mails from anon;
revoke all on public.zahlungs_mails from authenticated;
grant select on public.zahlungs_mails to authenticated;

-- ---------- 3. Versand vorbereiten (alle Prüfungen hier, nicht im Browser) ----------
create or replace function public.zahlungs_mail_vorbereiten(p_schueler text, p_art text, p_betrag_cent integer, p_wofuer text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  u uuid := auth.uid();
  s record;
  z public.fahrschule_zahlungsdaten;
  an text;
  wf text := btrim(regexp_replace(coalesce(p_wofuer, ''), '[\r\n\t]+', ' ', 'g'));
  zweck text;
  mid uuid;
  fsname text;
begin
  if u is null then return jsonb_build_object('fehler', 'nicht_angemeldet'); end if;
  if not exists (select 1 from profiles p where p.id = u and coalesce(p.aktiv, true)) then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  select x.id::text as id, x.fahrschule_id, x.name, x.email, x.ausbildung into s
    from public.schueler x where x.id::text = p_schueler;
  if not found then return jsonb_build_object('fehler', 'kein_schueler'); end if;
  if not zm_darf(s.fahrschule_id) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  if p_art is null or p_art not in ('pruefung', 'reaktivierung', 'zahlung_offen') then
    return jsonb_build_object('fehler', 'art_unbekannt');
  end if;
  if p_betrag_cent is null or p_betrag_cent < 100 or p_betrag_cent > 1000000 then
    return jsonb_build_object('fehler', 'betrag');
  end if;
  if length(wf) < 2 or length(wf) > 80 then return jsonb_build_object('fehler', 'wofuer'); end if;

  select * into z from public.fahrschule_zahlungsdaten where fahrschule_id = s.fahrschule_id;
  if not found or z.kontoinhaber is null or z.iban is null or not iban_gueltig(z.iban) then
    return jsonb_build_object('fehler', 'zahlungsdaten_fehlen');
  end if;

  if (select count(*) from public.zahlungs_mails m
       where m.schueler_id = s.id and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('fehler', 'zu_viele');
  end if;

  if z.modus = 'echt' then
    an := nullif(lower(btrim(coalesce(s.email, ''))), '');
    if an is null then an := nullif(lower(btrim(coalesce(s.ausbildung->>'email', ''))), ''); end if;
    if an is null then return jsonb_build_object('fehler', 'keine_email'); end if;
  else
    -- TEST: nie die Schüler-Adresse. Test-Adresse, sonst die Adresse eines Super-Admins.
    an := z.test_email;
    if an is null then
      select lower(btrim(p.email)) into an from profiles p
       where p.rolle = 'super_admin' and coalesce(p.aktiv, true) and nullif(btrim(p.email), '') is not null
       order by p.id limit 1;
    end if;
    if an is null then return jsonb_build_object('fehler', 'keine_testadresse'); end if;
  end if;
  if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;

  -- Verwendungszweck: Name + wofür (EPC: höchstens 140 Zeichen)
  zweck := left(btrim(coalesce(s.name, '')) || ', ' || wf, 140);
  select f.name into fsname from public.fahrschulen f where f.id = s.fahrschule_id;

  insert into public.zahlungs_mails (fahrschule_id, schueler_id, art, betrag_cent, wofuer, modus, empfaenger_kurz, gesendet_von, bearbeiter)
  values (s.fahrschule_id, s.id, p_art, p_betrag_cent, wf, z.modus,
          left(an, 1) || '***@' || split_part(an, '@', 2), u, public.buero_bearbeiter())
  returning id into mid;

  return jsonb_build_object('ok', true, 'id', mid, 'empfaenger', an, 'modus', z.modus, 'art', p_art,
    'betrag_cent', p_betrag_cent, 'wofuer', wf, 'verwendungszweck', zweck, 'schueler_name', s.name,
    'fahrschule', fsname, 'kontoinhaber', z.kontoinhaber, 'iban', z.iban, 'bic', z.bic,
    'paypal', z.paypal, 'impressum', z.impressum);
end $function$;

revoke all on function public.zahlungs_mail_vorbereiten(text, text, integer, text) from public, anon;
grant execute on function public.zahlungs_mail_vorbereiten(text, text, integer, text) to authenticated;
