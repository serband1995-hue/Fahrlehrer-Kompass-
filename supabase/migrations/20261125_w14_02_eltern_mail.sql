-- W14 Eltern-Mail (Auftrag Hauptsitzung 24.11.2026, Vorschlag freigegeben; Einwilligungen liegen laut Serband vor):
-- In der Schüler-Akte (Büro) eine optionale E-Mail der Eltern bzw. Erziehungsberechtigten und je Schüler die Wahl,
-- an wen die Zahlungs-Mail geht: Schüler, Eltern oder beide (Vorgabe beide). Den Empfänger bestimmt weiter NUR der Server.
-- 1. Tabelle schueler_eltern (eine Zeile je Schüler). Lesen/Schreiben nur Büro, Leitung (eigene Fahrschule), Super-Admin
--    (zm_darf wie bei den Zahlungsdaten). Fahrlehrer sehen nichts. Fahrschule kommt immer vom Schüler (Trigger).
--    Jede Änderung steht im aenderungsprotokoll (Adresse gekürzt).
-- 2. zahlungs_mail_vorbereiten(): Empfänger nach der Wahl; liefert zusätzlich empfaenger_alle (Liste) und an (wer
--    angeschrieben wird, für die Anrede). TEST-Modus unverändert: nur die Test-Adresse.
--    Abwärtsverträglich: empfaenger bleibt die erste Adresse (alte Edge-Funktion schickt nur an diese).
-- Voraussetzung: 20261124_zm_01 (zm_darf, zahlungs_mails, buero_bearbeiter, aenderungsprotokoll). Idempotent.
-- Rückweg: supabase/rueckweg/20261125_w14_eltern_rueckweg.sql

-- ---------- 1. Tabelle ----------
create table if not exists public.schueler_eltern (
  schueler_id text primary key references public.schueler(id) on delete cascade,
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  email text,
  mail_an text not null default 'beide',
  geaendert_von uuid,
  geaendert_am timestamptz not null default now(),
  bearbeiter text
);
do $$ begin
  alter table public.schueler_eltern add constraint se_mail_an check (mail_an in ('schueler', 'eltern', 'beide'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.schueler_eltern add constraint se_laenge check (coalesce(length(email), 0) <= 200);
exception when duplicate_object then null; end $$;
create index if not exists schueler_eltern_fs_idx on public.schueler_eltern (fahrschule_id);

alter table public.schueler_eltern enable row level security;
drop policy if exists "Eltern lesen Buero Leitung" on public.schueler_eltern;
create policy "Eltern lesen Buero Leitung" on public.schueler_eltern for select to authenticated
  using (zm_darf(fahrschule_id));
drop policy if exists "Eltern anlegen Buero Leitung" on public.schueler_eltern;
create policy "Eltern anlegen Buero Leitung" on public.schueler_eltern for insert to authenticated
  with check (zm_darf(fahrschule_id));
drop policy if exists "Eltern aendern Buero Leitung" on public.schueler_eltern;
create policy "Eltern aendern Buero Leitung" on public.schueler_eltern for update to authenticated
  using (zm_darf(fahrschule_id)) with check (zm_darf(fahrschule_id));
-- kein Löschen: leere Adresse genügt (Schüler endgültig gelöscht: Zeile geht mit)

create or replace function public.schueler_eltern_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  fs uuid;
begin
  if tg_op = 'UPDATE' then new.schueler_id := old.schueler_id; end if;
  select x.fahrschule_id into fs from public.schueler x where x.id = new.schueler_id;
  if fs is null then raise exception 'Schüler nicht gefunden' using errcode = '22023'; end if;
  new.fahrschule_id := fs; -- immer die Fahrschule des Schülers (keine fremde Fahrschule unterschieben)
  new.email := nullif(lower(btrim(regexp_replace(coalesce(new.email, ''), '[[:cntrl:]\u0085  ]+', '', 'g'))), '');
  if new.email is not null and new.email !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then
    raise exception 'E-Mail der Eltern ungültig' using errcode = '22023';
  end if;
  new.mail_an := coalesce(nullif(btrim(new.mail_an), ''), 'beide');
  new.geaendert_von := auth.uid();
  new.geaendert_am := now();
  new.bearbeiter := public.buero_bearbeiter();
  return new;
end $function$;

drop trigger if exists schueler_eltern_schutz on public.schueler_eltern;
create trigger schueler_eltern_schutz before insert or update on public.schueler_eltern
  for each row execute function public.schueler_eltern_schutz();

-- Spur: jede geänderte Angabe ein Eintrag; die Adresse nur gekürzt (m***@beispiel.de)
create or replace function public.schueler_eltern_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  kurz_alt text;
  kurz_neu text;
begin
  kurz_alt := case when tg_op = 'UPDATE' and old.email is not null then left(old.email, 1) || '***@' || split_part(old.email, '@', 2) end;
  kurz_neu := case when new.email is not null then left(new.email, 1) || '***@' || split_part(new.email, '@', 2) end;
  if (tg_op = 'INSERT' and new.email is not null) or (tg_op = 'UPDATE' and old.email is distinct from new.email) then
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
    values (new.fahrschule_id, 'schueler_eltern', new.schueler_id, 'email', kurz_alt, kurz_neu, auth.uid(), new.bearbeiter);
  end if;
  if (tg_op = 'INSERT') or (old.mail_an is distinct from new.mail_an) then
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
    values (new.fahrschule_id, 'schueler_eltern', new.schueler_id, 'mail_an', case when tg_op = 'UPDATE' then old.mail_an end, new.mail_an, auth.uid(), new.bearbeiter);
  end if;
  return null;
end $function$;

drop trigger if exists schueler_eltern_spur on public.schueler_eltern;
create trigger schueler_eltern_spur after insert or update on public.schueler_eltern
  for each row execute function public.schueler_eltern_spur();

revoke all on public.schueler_eltern from anon;
revoke all on public.schueler_eltern from authenticated;
grant select, insert, update on public.schueler_eltern to authenticated;
revoke all on function public.schueler_eltern_schutz() from public, anon, authenticated;
revoke all on function public.schueler_eltern_spur() from public, anon, authenticated;

-- ---------- 2. Versand vorbereiten: Empfänger nach der Wahl ----------
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
  wf text := btrim(regexp_replace(coalesce(p_wofuer, ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g'));
  sname text;
  zweck text;
  mid uuid;
  fsname text;
  e_an text;
  an_s text;
  an_e text;
  wahl text;
  art_an text;
  alle text[] := array[]::text[];
  kurz text;
begin
  if u is null then return jsonb_build_object('fehler', 'nicht_angemeldet'); end if;
  if not exists (select 1 from public.profiles p where p.id = u and coalesce(p.aktiv, true)) then
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

  -- Limit (gleichzeitige Aufrufe nacheinander): 5 je Schüler und Modus, 100 je Fahrschule in 24 h
  perform pg_advisory_xact_lock(hashtext('zm:' || s.fahrschule_id::text));
  if (select count(*) from public.zahlungs_mails m
       where m.fahrschule_id = s.fahrschule_id and m.schueler_id = s.id and m.modus = z.modus
         and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('fehler', 'zu_viele');
  end if;
  if (select count(*) from public.zahlungs_mails m
       where m.fahrschule_id = s.fahrschule_id and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours') >= 100 then
    return jsonb_build_object('fehler', 'zu_viele_schule');
  end if;

  -- W14: Empfänger nach der Wahl in der Akte (schueler_eltern): Schüler, Eltern oder beide. Ohne Eltern-Adresse: Schüler.
  an_s := nullif(lower(btrim(coalesce(s.email, ''))), '');
  if an_s is null then an_s := nullif(lower(btrim(coalesce(s.ausbildung->>'email', ''))), ''); end if;
  select e.email, e.mail_an into an_e, e_an from public.schueler_eltern e where e.schueler_id = s.id and e.fahrschule_id = s.fahrschule_id;
  an_e := nullif(lower(btrim(coalesce(an_e, ''))), '');
  wahl := case when an_e is null then 'schueler' when e_an in ('schueler', 'eltern', 'beide') then e_an else 'beide' end;
  if wahl in ('schueler', 'beide') and an_s is not null then alle := alle || an_s; end if;
  if wahl in ('eltern', 'beide') and an_e is not null and not (an_e = any(alle)) then alle := alle || an_e; end if;
  art_an := case when wahl = 'beide' and an_s is null then 'eltern' else wahl end; -- wer angeschrieben wird (Anrede der Mail)
  if z.modus = 'echt' then
    if coalesce(array_length(alle, 1), 0) = 0 then return jsonb_build_object('fehler', 'keine_email'); end if;
    foreach an in array alle loop
      if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;
    end loop;
    an := alle[1];
  else
    -- TEST: nie die Schüler-Adresse. Test-Adresse, sonst die Adresse eines Super-Admins.
    an := z.test_email;
    if an is null then
      select lower(btrim(p.email)) into an from public.profiles p
       where p.rolle = 'super_admin' and coalesce(p.aktiv, true) and nullif(btrim(p.email), '') is not null
       order by p.id limit 1;
    end if;
    if an is null then return jsonb_build_object('fehler', 'keine_testadresse'); end if;
    alle := array[an]; -- TEST: nur die Test-Adresse, egal was gewählt ist
  end if;
  if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;

  -- Verwendungszweck: Name + wofür (EPC: höchstens 140 Zeichen; Name ohne Steuerzeichen, höchstens 57)
  sname := left(btrim(regexp_replace(coalesce(s.name, ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g')), 57);
  zweck := left(sname || ', ' || wf, 140);
  select f.name into fsname from public.fahrschulen f where f.id = s.fahrschule_id;

  select string_agg(left(x, 1) || '***@' || split_part(x, '@', 2), ', ') into kurz from unnest(alle) x;
  insert into public.zahlungs_mails (fahrschule_id, schueler_id, art, betrag_cent, wofuer, modus, empfaenger_kurz, gesendet_von, bearbeiter)
  values (s.fahrschule_id, s.id, p_art, p_betrag_cent, wf, z.modus, kurz, u, public.buero_bearbeiter())
  returning id into mid;

  return jsonb_build_object('ok', true, 'id', mid, 'empfaenger', an, 'empfaenger_alle', to_jsonb(alle), 'an', art_an, 'modus', z.modus, 'art', p_art,
    'betrag_cent', p_betrag_cent, 'wofuer', wf, 'verwendungszweck', zweck, 'schueler_name', sname,
    'fahrschule', fsname, 'kontoinhaber', z.kontoinhaber, 'iban', z.iban, 'bic', z.bic,
    'paypal', z.paypal, 'impressum', z.impressum);
end $function$;

revoke all on function public.zahlungs_mail_vorbereiten(text, text, integer, text) from public, anon;
grant execute on function public.zahlungs_mail_vorbereiten(text, text, integer, text) to authenticated;

-- Ergebnis-Abfrage: erwartet tabelle = 1, regeln = 3, trigger = 2, funktion_neu = 1
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'schueler_eltern') as tabelle,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'schueler_eltern') as regeln,
       (select count(*) from pg_trigger where tgname in ('schueler_eltern_schutz', 'schueler_eltern_spur')) as trigger,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
          and prosrc like '%empfaenger_alle%') as funktion_neu;
