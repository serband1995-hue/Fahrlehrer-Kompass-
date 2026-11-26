-- Rückweg zu supabase/migrations/20261128_w15_03_vorlagen_mail.sql (W15 Schritt 4).
-- zahlungs_mail_vorbereiten() wieder genau wie W14 (20261125_w14_02): keine Prüfung der Fälligkeit, keine Vorlagen.
-- Die Edge-Funktion zahlungs-mail kommt damit klar (ohne Vorlage = Standard-Sätze). Gespeicherte Vorlagen bleiben in
-- fahrschule_einstellungen liegen, werden aber nicht mehr benutzt.
-- Reihenfolge (Prüf-Team Daten): ist w15_04 eingespielt (gemeinsames Limit mail_limit), zuerst dessen Rückweg ausführen.
-- Sonst stünde hier die W14-Fassung, während erinnerungs_mail_vorbereiten weiter läuft – Limit nicht mehr gemeinsam.
do $$
begin
  if to_regprocedure('public.mail_limit(uuid,text,text)') is not null then
    raise exception 'Zuerst den Rückweg zu w15_04 (supabase/rueckweg/20261129_w15_04_rueckweg.sql) ausführen, dann diesen.';
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

-- Ergebnis-Abfrage: erwartet funktion_w14 = true, fuer_anon = false
select (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
          and prosrc not like '%reakt_nicht_faellig%' and prosrc like '%empfaenger_alle%') = 1 as funktion_w14,
       has_function_privilege('anon', 'public.zahlungs_mail_vorbereiten(text,text,integer,text)', 'execute') as fuer_anon;
