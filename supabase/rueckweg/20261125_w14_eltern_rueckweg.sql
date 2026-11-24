-- Rückweg zu 20261125_w14_02_eltern_mail.sql (W14 Eltern-Mail).
-- 1. zahlungs_mail_vorbereiten auf den Stand aus 20261124_zm_01 zurück (Zahlungs-Mail nur an den Schüler):
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

  if z.modus = 'echt' then
    an := nullif(lower(btrim(coalesce(s.email, ''))), '');
    if an is null then an := nullif(lower(btrim(coalesce(s.ausbildung->>'email', ''))), ''); end if;
    if an is null then return jsonb_build_object('fehler', 'keine_email'); end if;
  else
    -- TEST: nie die Schüler-Adresse. Test-Adresse, sonst die Adresse eines Super-Admins.
    an := z.test_email;
    if an is null then
      select lower(btrim(p.email)) into an from public.profiles p
       where p.rolle = 'super_admin' and coalesce(p.aktiv, true) and nullif(btrim(p.email), '') is not null
       order by p.id limit 1;
    end if;
    if an is null then return jsonb_build_object('fehler', 'keine_testadresse'); end if;
  end if;
  if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;

  -- Verwendungszweck: Name + wofür (EPC: höchstens 140 Zeichen; Name ohne Steuerzeichen, höchstens 57)
  sname := left(btrim(regexp_replace(coalesce(s.name, ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g')), 57);
  zweck := left(sname || ', ' || wf, 140);
  select f.name into fsname from public.fahrschulen f where f.id = s.fahrschule_id;

  insert into public.zahlungs_mails (fahrschule_id, schueler_id, art, betrag_cent, wofuer, modus, empfaenger_kurz, gesendet_von, bearbeiter)
  values (s.fahrschule_id, s.id, p_art, p_betrag_cent, wf, z.modus,
          left(an, 1) || '***@' || split_part(an, '@', 2), u, public.buero_bearbeiter())
  returning id into mid;

  return jsonb_build_object('ok', true, 'id', mid, 'empfaenger', an, 'modus', z.modus, 'art', p_art,
    'betrag_cent', p_betrag_cent, 'wofuer', wf, 'verwendungszweck', zweck, 'schueler_name', sname,
    'fahrschule', fsname, 'kontoinhaber', z.kontoinhaber, 'iban', z.iban, 'bic', z.bic,
    'paypal', z.paypal, 'impressum', z.impressum);
end $function$;

revoke all on function public.zahlungs_mail_vorbereiten(text, text, integer, text) from public, anon;
grant execute on function public.zahlungs_mail_vorbereiten(text, text, integer, text) to authenticated;
-- 2. Tabelle entfernen (die eingetragenen Eltern-Adressen gehen dabei verloren; vorher sichern, falls nötig):
drop trigger if exists schueler_eltern_spur on public.schueler_eltern;
drop trigger if exists schueler_eltern_schutz on public.schueler_eltern;
drop function if exists public.schueler_eltern_spur();
drop function if exists public.schueler_eltern_schutz();
drop table if exists public.schueler_eltern;
-- Ergebnis: erwartet tabelle = 0, funktion_alt = 1
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'schueler_eltern') as tabelle,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
          and prosrc not like '%empfaenger_alle%') as funktion_alt;
