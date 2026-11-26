-- =====================================================================================================================
-- W19 Teil 2 (Fahrlehrer-Kompass) – LIVE-PROBE Zahlungsbelege. Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt.
-- Voraussetzung: Migration supabase/migrations/20261201_w19_02_zahlungsbelege.sql ist eingespielt.
-- Muster: scripts/sql/w18-2-probe.sql. GENAU EIN DO-Block. Er endet IMMER mit RAISE EXCEPTION, dadurch wird ALLES
-- zurueckgerollt (Fahrschulen, Konten, Profile, Schueler, Einstellungen, Belege, Belegzaehler). Es bleibt nichts stehen.
--   W19_ERGEBNIS {json} = durchgelaufen; alle_ok, fehler[], pruefungen[]
--   W19_FEHLER ...      = unerwarteter Fehler (Schritt, SQLSTATE, Meldung); ebenfalls alles zurueckgerollt
-- Aufbau wie W18: zwei Test-Fahrschulen (slug ist NOT NULL + UNIQUE: mit Laufnummer), Konten @example.invalid in auth.users,
-- Profile loeschen + neu einfuegen (wie admin-create-account), je Fahrschule ein Schueler. Danach als jedes Konto
-- (role authenticated + JWT-Claims wie PostgREST): Belege anlegen, lesen, aendern/loeschen versuchen, stornieren.
-- Jeder Angriff, der wider Erwarten klappt, wird in einem Unterblock sofort zurueckgerollt (verfaelscht keine Zahl).
-- Nach aussen: Belege und Einstellungen haben keine Ausloeser mit pg_net; das Anlegen der Schueler loest wie in W18 hoechstens
-- trg_akademie_sync aus (pg_net-Warteschlange, wird mit zurueckgerollt). Keine Mail, keine Edge Function.
-- =====================================================================================================================
do $w19$
declare
  v_lauf  text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  v_fs    uuid := gen_random_uuid();
  v_fs2   uuid := gen_random_uuid();
  v_bu    uuid := gen_random_uuid();   -- Buero A
  v_la    uuid := gen_random_uuid();   -- Leitung A
  v_fl    uuid := gen_random_uuid();   -- Fahrlehrer A
  v_bu2   uuid := gen_random_uuid();   -- Buero B (fremde Fahrschule)
  v_s1    text := 'w19probe-s1-' || v_lauf;
  v_s2    text := 'w19probe-s2-' || v_lauf;
  v_start text := current_user;
  v_schritt text := 'Start';
  v_obs   jsonb := '[]'::jsonb;
  v_fehler jsonb := '[]'::jsonb;
  v_n int; v_id uuid; v_id2 uuid; v_st uuid; v_r record; v_msg text; v_ok boolean;
  v_ergebnis jsonb;
  v_state text;
begin
  -- Pruefung festhalten: k = Name, erw/ist als Text
  -- (lokale Hilfe ueber eine temporaere Funktion ist in einem DO-Block nicht noetig; je Pruefung zwei Zeilen)

  v_schritt := '0 Vorpruefung';
  if to_regclass('public.zahlungsbelege') is null then raise exception 'W19_FEHLER Migration fehlt: public.zahlungsbelege'; end if;

  -- wie W18 (0c): kein Auslöser auf den Aufbau-Tabellen darf synchron nach aussen rufen, sonst Abbruch vor dem Schreiben
  v_schritt := '0b Ausloeser ohne synchronen Aufruf nach aussen';
  select string_agg(distinct t.tgrelid::regclass::text || ' -> ' || pn.nspname || '.' || p.proname, ', ') into v_msg
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
   where not t.tgisinternal
     and t.tgrelid in (to_regclass('public.schueler'), to_regclass('public.profiles'), to_regclass('public.fahrschulen'), to_regclass('auth.users'),
                       to_regclass('public.zahlungsbelege'), to_regclass('public.fahrschule_einstellungen'))
     and (regexp_replace(p.prosrc, 'net\.http_', 'NETHTTP_', 'gi') ~* '(dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|\mhttp\s*\()'
          or l.lanname in ('plpython3u', 'plpythonu', 'plperlu', 'pltclu'));
  if v_msg is not null then
    raise exception 'W19_FEHLER Abbruch vor dem Schreiben: Ein Ausloeser ruft synchron nach aussen: %', v_msg;
  end if;

  v_schritt := '1 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fs, 'W19 Probe Muster', 'w19-probe-muster-' || v_lauf), (v_fs2, 'W19 Probe Fremd', 'w19-probe-fremd-' || v_lauf);
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'w19probe-' || i || '-' || v_lauf || '@example.invalid', '', now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    from unnest(array[v_bu, v_la, v_fl, v_bu2]) with ordinality as x(u, i);
  delete from public.profiles where id in (v_bu, v_la, v_fl, v_bu2);
  insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
  values (v_bu,  'w19probe-1-' || v_lauf || '@example.invalid', 'Buero Muster',     'buero',            v_fs,  true),
         (v_la,  'w19probe-2-' || v_lauf || '@example.invalid', 'Leitung Muster',   'fahrschule_admin', v_fs,  true),
         (v_fl,  'w19probe-3-' || v_lauf || '@example.invalid', 'Fahrlehrer Muster','fahrlehrer',       v_fs,  true),
         (v_bu2, 'w19probe-4-' || v_lauf || '@example.invalid', 'Buero Fremd',      'buero',            v_fs2, true);
  execute format('insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
              || 'values (%L, %L, %L, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())', v_s1, v_fs, v_fl, 'Mia Probe', v_bu);
  execute format('insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
              || 'values (%L, %L, null, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())', v_s2, v_fs2, 'Max Fremd', v_bu2);

  -- ---------- als Buero A ----------
  v_schritt := '2 Buero A: Einstellungen und erster Beleg';
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_bu, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_bu::text, true);
  insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert)
    values (v_fs, 'beleg.fahrschule', '{"name":"","anschrift":"Probeweg 1","steuernummer":"00/000/00000","ustid":""}');
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
    values (v_fs, v_s1, 'Falsch', current_date, 45.50, ' Grundbetrag ', 'ec') returning id into v_id;
  select * into v_r from public.zahlungsbelege where id = v_id;
  v_obs := v_obs || jsonb_build_object('k', 'beleg1_nummer_name_kopf', 'erw', '1|Mia Probe|Grundbetrag|W19 Probe Muster|Probeweg 1|' || v_bu,
    'ist', v_r.nummer || '|' || v_r.schueler_name || '|' || v_r.zweck || '|' || coalesce(v_r.fahrschule_daten->>'name', '') || '|' || coalesce(v_r.fahrschule_daten->>'anschrift', '') || '|' || coalesce(v_r.erstellt_von::text, ''));

  v_schritt := '3 Buero A: Bargeld ohne Schalter';
  begin
    insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values (v_fs, v_s1, 'x', current_date, 10, 'x', 'bar');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'bargeld_ohne_schalter', 'erw', 'blockiert', 'ist', v_msg);

  v_schritt := '4 Buero A: Aendern/Loeschen';
  begin
    update public.zahlungsbelege set betrag = 1 where id = v_id;
    get diagnostics v_n = row_count; v_msg := case when v_n > 0 then 'erlaubt' else 'keine Zeile' end;
    if v_n > 0 then raise exception 'W19_ZURUECK'; end if;
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_aendert_beleg', 'erw_eines_von', '["blockiert","keine Zeile"]'::jsonb, 'ist', v_msg);
  begin
    delete from public.zahlungsbelege where id = v_id;
    get diagnostics v_n = row_count; v_msg := case when v_n > 0 then 'erlaubt' else 'keine Zeile' end;
    if v_n > 0 then raise exception 'W19_ZURUECK'; end if;
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_loescht_beleg', 'erw_eines_von', '["blockiert","keine Zeile"]'::jsonb, 'ist', v_msg);

  v_schritt := '5 Buero A: fremde Fahrschule';
  begin
    insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values (v_fs2, null, 'x', current_date, 10, 'x', 'ec');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_beleg_fuer_fahrschule_b', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values (v_fs, v_s2, 'x', current_date, 10, 'x', 'ec');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_beleg_mit_schueler_aus_b', 'erw', 'blockiert', 'ist', v_msg);

  v_schritt := '6 Buero A: Bargeld einschalten, Storno';
  insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values (v_fs, 'beleg.bargeld', '{"aktiv":true}');
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
    values (v_fs, v_s1, 'x', current_date, 30, 'Fahrstunden', 'bar') returning id into v_id2;
  insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart)
    values (v_fs, v_id, 'x', current_date, 999, 'Probe', 'bar') returning id into v_st;
  select * into v_r from public.zahlungsbelege where id = v_st;
  v_obs := v_obs || jsonb_build_object('k', 'storno_gegenbeleg', 'erw', '3|-45.50|ec|Mia Probe', 'ist', v_r.nummer || '|' || v_r.betrag || '|' || v_r.zahlart || '|' || v_r.schueler_name);
  begin
    insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values (v_fs, v_id, 'x', current_date, 1, 'x', 'ec');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'zweites_storno', 'erw', 'blockiert', 'ist', v_msg);
  select count(*) into v_n from public.zahlungsbelege;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_sieht', 'erw', '3', 'ist', v_n::text);
  begin
    select count(*) into v_n from public.beleg_zaehler; v_msg := 'lesbar';
  exception when others then v_msg := 'blockiert'; end;
  v_obs := v_obs || jsonb_build_object('k', 'zaehler_fuer_clients', 'erw', 'blockiert', 'ist', v_msg);

  -- ---------- als Leitung A ----------
  v_schritt := '7 Leitung A';
  perform set_config('request.jwt.claims', json_build_object('sub', v_la, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_la::text, true);
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
    values (v_fs, v_s1, 'x', current_date, 12, 'Lernapp', 'ueberweisung') returning nummer into v_n;
  v_obs := v_obs || jsonb_build_object('k', 'leitung_legt_an_nummer', 'erw', '4', 'ist', v_n::text);

  -- ---------- als Fahrlehrer A ----------
  v_schritt := '8 Fahrlehrer A';
  perform set_config('request.jwt.claims', json_build_object('sub', v_fl, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_fl::text, true);
  select count(*) into v_n from public.zahlungsbelege;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_sieht', 'erw', '0', 'ist', v_n::text);
  begin
    insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values (v_fs, v_s1, 'x', current_date, 10, 'x', 'ec');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_legt_an', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values (v_fs, 'beleg.steuer', '{"ausweisen":true,"satz":"19"}');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_aendert_beleg_einstellung', 'erw', 'blockiert', 'ist', v_msg);

  -- ---------- als Buero B ----------
  v_schritt := '9 Buero B';
  perform set_config('request.jwt.claims', json_build_object('sub', v_bu2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_bu2::text, true);
  select count(*) into v_n from public.zahlungsbelege where fahrschule_id = v_fs;
  v_obs := v_obs || jsonb_build_object('k', 'buero_b_sieht_a', 'erw', '0', 'ist', v_n::text);
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
    values (v_fs2, v_s2, 'x', current_date, 5, 'Grundbetrag', 'ec') returning nummer into v_n;
  v_obs := v_obs || jsonb_build_object('k', 'buero_b_eigene_nummer', 'erw', '1', 'ist', v_n::text);

  -- ---------- Eigentuemer (wie Dienst-Schluessel): auch er kann nicht aendern ----------
  v_schritt := '10 Eigentuemer';
  perform set_config('role', v_start, true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    update public.zahlungsbelege set betrag = 1 where id = v_id;
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'dienst_aendert_beleg', 'erw', 'blockiert', 'ist', v_msg);

  -- Auswertung
  for v_r in select t.e from jsonb_array_elements(v_obs) as t(e) loop
    v_ok := case when v_r.e ? 'erw_eines_von' then (v_r.e->'erw_eines_von') ? (v_r.e->>'ist') else (v_r.e->>'erw') = (v_r.e->>'ist') end;
    if not v_ok then v_fehler := v_fehler || v_r.e; end if;
  end loop;
  v_ergebnis := jsonb_build_object('alle_ok', jsonb_array_length(v_fehler) = 0, 'fehler', v_fehler, 'pruefungen', v_obs, 'lauf', v_lauf);
  raise exception 'W19_ERGEBNIS %', v_ergebnis::text;     -- IMMER: macht alles rueckgaengig
exception when others then
  get stacked diagnostics v_msg = message_text, v_state = returned_sqlstate;
  if v_msg like 'W19_ERGEBNIS %' or v_msg like 'W19_FEHLER%' then raise exception '%', v_msg; end if;
  raise exception 'W19_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher % Pruefungen', v_schritt, v_state, v_msg, jsonb_array_length(v_obs);
end
$w19$;
