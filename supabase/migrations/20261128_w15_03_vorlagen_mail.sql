-- W15 Schritt 4 „Nachrichten-Vorlagen + Erinnerung schicken“ (🗣 Serband 24.11.2026: „auf Knopfdruck Erinnerungen …
-- vorgefertigte Nachrichten, diese kann man vorschreiben in den Einstellungen“).
-- Ersetzt NUR zahlungs_mail_vorbereiten() (Grundlage: W14-Stand 20261125_w14_02). Alles Bisherige bleibt: Rolle, Fahrschule,
-- Betrag, Zahlungsdaten, Limit (5 je Schüler und Modus, 100 je Fahrschule in 24 h), Empfänger bestimmt NUR der Server
-- (Test: nur die Test-Adresse; Echt: Schüler/Eltern/beide nach der Akte).
-- Neu:
--   1. Reaktivierung nur, wenn sie ansteht: nicht befreit, laut Preisliste nicht frei (heute oder am Vertragstag, wie die
--      Sperre), überfällig oder höchstens „Vorwarnung“ Tage vor der Fälligkeit (Einstellung fristen.reaktivierung.vorwarn_tage,
--      Standard 60, nie kürzer als bald_tage). Sonst Fehler reakt_befreit | reakt_entfaellt | reakt_ohne_datum | reakt_nicht_faellig.
--   2. Rückgabe zusätzlich: vorlage_art (reaktivierung_bald vor der Fälligkeit, sonst die Art), vorlage ({text, text_eltern}
--      aus den Einstellungen „vorlagen.<vorlage_art>“, nur Texte, gekürzt; null = Standard), faellig_am, tage (bis zur Fälligkeit).
--      Die Edge-Funktion zahlungs-mail füllt die Vorlage (kompass-vorlagen.js), der Betreff bleibt fest.
--   Ältere Edge-Funktion: ignoriert die neuen Felder (Mail wie vorher).
-- Voraussetzung: 20261125_w14_02, 20261126_w15_01 (reakt_frei_am, reakt_monate), 20261125_einst_01 (fahrschule_einstellung,
--   fahrschule_einstellung_zahl), am besten auch 20261127_w15_02. Idempotent. Rückweg: supabase/rueckweg/20261128_w15_03_rueckweg.sql

do $$ begin
  if to_regprocedure('public.fahrschule_einstellung(uuid,text)') is null or to_regprocedure('public.reakt_frei_am(uuid,date)') is null
     or to_regclass('public.schueler_eltern') is null then
    raise exception 'W15 S4: zuerst 20261125_einst_01, 20261126_w15_01 und 20261125_w14_02 einspielen';
  end if;
end $$;

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
  -- W15 S4: Fälligkeit der Reaktivierung und Vorlage
  heute date := (now() at time zone 'Europe/Berlin')::date;
  faellig date;
  bald_t int;
  vorwarn_t int;
  vart text;
  vw jsonb;
  vorlage jsonb := null;
begin
  if u is null then return jsonb_build_object('fehler', 'nicht_angemeldet'); end if;
  if not exists (select 1 from public.profiles p where p.id = u and coalesce(p.aktiv, true)) then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  select x.id::text as id, x.fahrschule_id, x.name, x.email, x.ausbildung, x.reakt_status, x.reakt_bezahlt_bis, x.vertrag_am into s
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

  -- W15 S4: Reaktivierung nur, wenn sie wirklich ansteht – gleiche Regel wie KR.reaktInfo (Büro/App) und die Sperre:
  -- befreit oder laut Preisliste frei (heute oder am Vertragstag) = nie; sonst überfällig oder innerhalb der Vorwarnzeit
  -- (Einstellung fristen.reaktivierung, Standard 60 Tage, nie kürzer als die Warnzeit). Vor der Fälligkeit: Vorlage „bald“.
  vart := p_art;
  if p_art = 'reaktivierung' then
    if s.reakt_status = 'befreit' then return jsonb_build_object('fehler', 'reakt_befreit'); end if;
    if public.reakt_frei_am(s.fahrschule_id, heute) or public.reakt_frei_am(s.fahrschule_id, s.vertrag_am) then
      return jsonb_build_object('fehler', 'reakt_entfaellt');
    end if;
    faellig := coalesce(s.reakt_bezahlt_bis, (s.vertrag_am + make_interval(months => public.reakt_monate(s.fahrschule_id)))::date);
    if faellig is null then return jsonb_build_object('fehler', 'reakt_ohne_datum'); end if;
    bald_t := public.fahrschule_einstellung_zahl(s.fahrschule_id, 'fristen.reaktivierung', 'bald_tage', 30, 1, 365);
    vorwarn_t := greatest(public.fahrschule_einstellung_zahl(s.fahrschule_id, 'fristen.reaktivierung', 'vorwarn_tage', 60, 1, 365), bald_t);
    if faellig - heute > vorwarn_t then return jsonb_build_object('fehler', 'reakt_nicht_faellig'); end if;
    if faellig >= heute then vart := 'reaktivierung_bald'; end if;
  end if;
  -- Vorlage der Fahrschule (Einstellungen „vorlagen.<art>“): nur Texte, gekürzt; füllen und säubern macht die Edge-Funktion
  vw := public.fahrschule_einstellung(s.fahrschule_id, 'vorlagen.' || vart);
  if vw is not null and jsonb_typeof(vw) = 'object' then
    vorlage := jsonb_strip_nulls(jsonb_build_object(
      'text', case when jsonb_typeof(vw->'text') = 'string' then left(vw->>'text', 2000) end,
      'text_eltern', case when jsonb_typeof(vw->'text_eltern') = 'string' then left(vw->>'text_eltern', 2000) end));
  end if;

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
    'paypal', z.paypal, 'impressum', z.impressum,
    'vorlage_art', vart, 'vorlage', vorlage, 'faellig_am', faellig, 'tage', case when faellig is not null then faellig - heute end);
end $function$;

revoke all on function public.zahlungs_mail_vorbereiten(text, text, integer, text) from public, anon;
grant execute on function public.zahlungs_mail_vorbereiten(text, text, integer, text) to authenticated;

-- Ergebnis-Abfrage: erwartet funktion_neu = true, fuer_angemeldete = true, fuer_anon = false
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
          and prosrc like '%reakt_nicht_faellig%' and prosrc like '%empfaenger_alle%') = 1 as funktion_neu,
       has_function_privilege('authenticated', 'public.zahlungs_mail_vorbereiten(text,text,integer,text)', 'execute') as fuer_angemeldete,
       has_function_privilege('anon', 'public.zahlungs_mail_vorbereiten(text,text,integer,text)', 'execute') as fuer_anon;
