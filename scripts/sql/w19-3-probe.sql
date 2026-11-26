-- =====================================================================================================================
-- W19 Teil 3 (Fahrlehrer-Kompass) – LIVE-PROBE Punktesystem. Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt.
-- Voraussetzung: Migrationen 20261201_w19_02_zahlungsbelege.sql und 20261202_w19_03_punkte.sql sind eingespielt.
-- Muster: scripts/sql/w19-2-probe.sql. GENAU EIN DO-Block. Er endet IMMER mit RAISE EXCEPTION, dadurch wird ALLES
-- zurueckgerollt (Fahrschulen, Konten, Profile, Schueler, Einstellungen, Buchungen). Es bleibt nichts stehen.
--   W19_ERGEBNIS {json} = durchgelaufen; alle_ok, fehler[], pruefungen[]
--   W19_FEHLER ...      = unerwarteter Fehler (Schritt, SQLSTATE, Meldung); ebenfalls alles zurueckgerollt
-- Aufbau: zwei Test-Fahrschulen (slug NOT NULL + UNIQUE: mit Laufnummer), Konten @example.invalid in auth.users, Profile
-- loeschen + neu einfuegen (wie admin-create-account), Schueler: s1 gehoert Fahrlehrer A, s3 gehoert Kollege, s2 Fahrschule B.
-- Danach als jedes Konto (role authenticated + JWT-Claims wie PostgREST): vergeben, einloesen (Kontostand), aendern/loeschen
-- versuchen, Schalter aus, verschenken. Jeder Angriff, der wider Erwarten klappt, wird in einem Unterblock sofort zurueckgerollt.
-- Nach aussen: keine Mail, keine Edge Function. Das Anlegen der Schueler loest wie in W18 hoechstens trg_akademie_sync aus
-- (pg_net-Warteschlange, wird mit zurueckgerollt).
-- =====================================================================================================================
do $w19$
declare
  v_lauf  text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  v_fs    uuid := gen_random_uuid();
  v_fs2   uuid := gen_random_uuid();
  v_bu    uuid := gen_random_uuid();   -- Buero A
  v_la    uuid := gen_random_uuid();   -- Leitung A
  v_fl    uuid := gen_random_uuid();   -- Fahrlehrer A (eigener Schueler s1)
  v_fl2   uuid := gen_random_uuid();   -- Kollege A (Schueler s3)
  v_bu2   uuid := gen_random_uuid();   -- Buero B (fremde Fahrschule)
  v_s1    text := 'w19p3-s1-' || v_lauf;
  v_s2    text := 'w19p3-s2-' || v_lauf;
  v_s3    text := 'w19p3-s3-' || v_lauf;
  v_start text := current_user;
  v_schritt text := 'Start';
  v_obs   jsonb := '[]'::jsonb;
  v_fehler jsonb := '[]'::jsonb;
  v_n int; v_id uuid; v_r record; v_msg text; v_ok boolean;
  v_ergebnis jsonb;
  v_state text;
begin
  v_schritt := '0 Vorpruefung';
  if to_regclass('public.schueler_punkte') is null then raise exception 'W19_FEHLER Migration fehlt: public.schueler_punkte'; end if;
  if to_regprocedure('public.punkte_verschenken(uuid,text,text,integer,text)') is null then raise exception 'W19_FEHLER Migration fehlt: punkte_verschenken'; end if;

  -- wie W18 (0c) / w19-2-probe (0b): kein Auslöser auf den Tabellen der Probe darf synchron nach aussen rufen, sonst Abbruch vor dem Schreiben
  v_schritt := '0b Ausloeser ohne synchronen Aufruf nach aussen';
  select string_agg(distinct t.tgrelid::regclass::text || ' -> ' || pn.nspname || '.' || p.proname, ', ') into v_msg
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
   where not t.tgisinternal
     and t.tgrelid in (to_regclass('public.schueler'), to_regclass('public.profiles'), to_regclass('public.fahrschulen'), to_regclass('auth.users'),
                       to_regclass('public.schueler_punkte'), to_regclass('public.fahrschule_einstellungen'), to_regclass('public.aenderungsprotokoll'))
     and (regexp_replace(p.prosrc, 'net\.http_', 'NETHTTP_', 'gi') ~* '(dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|\mhttp\s*\()'
          or l.lanname in ('plpython3u', 'plpythonu', 'plperlu', 'pltclu'));
  if v_msg is not null then
    raise exception 'W19_FEHLER Abbruch vor dem Schreiben: Ein Ausloeser ruft synchron nach aussen: %', v_msg;
  end if;

  v_schritt := '1 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fs, 'W19 Probe Muster', 'w19p3-muster-' || v_lauf), (v_fs2, 'W19 Probe Fremd', 'w19p3-fremd-' || v_lauf);
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'w19p3-' || i || '-' || v_lauf || '@example.invalid', '', now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    from unnest(array[v_bu, v_la, v_fl, v_fl2, v_bu2]) with ordinality as x(u, i);
  delete from public.profiles where id in (v_bu, v_la, v_fl, v_fl2, v_bu2);
  insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
  values (v_bu,  'w19p3-1-' || v_lauf || '@example.invalid', 'Buero Muster',      'buero',            v_fs,  true),
         (v_la,  'w19p3-2-' || v_lauf || '@example.invalid', 'Leitung Muster',    'fahrschule_admin', v_fs,  true),
         (v_fl,  'w19p3-3-' || v_lauf || '@example.invalid', 'Fahrlehrer Muster', 'fahrlehrer',       v_fs,  true),
         (v_fl2, 'w19p3-4-' || v_lauf || '@example.invalid', 'Kollege Muster',    'fahrlehrer',       v_fs,  true),
         (v_bu2, 'w19p3-5-' || v_lauf || '@example.invalid', 'Buero Fremd',       'buero',            v_fs2, true);
  execute format('insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
              || 'values (%L, %L, %L, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())', v_s1, v_fs, v_fl, 'Mia Probe', v_bu);
  execute format('insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
              || 'values (%L, %L, %L, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())', v_s3, v_fs, v_fl2, 'Nils Probe', v_bu);
  execute format('insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
              || 'values (%L, %L, null, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())', v_s2, v_fs2, 'Max Fremd', v_bu2);

  -- ---------- als Buero A ----------
  v_schritt := '2 Buero A: Standard aus';
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_bu, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_bu::text, true);
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'vergeben', 5, 'Test');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'standard_aus_buero_bucht', 'erw', 'blockiert', 'ist', v_msg);

  v_schritt := '3 Buero A: einschalten, Listen';
  insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values
    (v_fs, 'punkte.system', '{"aktiv":true,"verschenken":false,"bedingungen":"Probe"}'),
    (v_fs, 'punkte.regeln', '{"liste":[{"id":"r1","name":"Probe-Regel","punkte":10}]}'),
    (v_fs, 'punkte.praemien', '{"liste":[{"id":"p1","name":"Probe-Praemie","punkte":5}]}');
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'vergeben', -30, ' Start ') returning id into v_id;
  select * into v_r from public.schueler_punkte where id = v_id;
  v_obs := v_obs || jsonb_build_object('k', 'buero_vergibt_vorzeichen_wer', 'erw', '30|Start|' || v_bu, 'ist', v_r.punkte || '|' || v_r.grund || '|' || coalesce(v_r.erstellt_von::text, ''));
  v_obs := v_obs || jsonb_build_object('k', 'kontostand_30', 'erw', '30', 'ist', public.punkte_kontostand(v_fs, v_s1)::text);

  v_schritt := '4 Buero A: Einloesen ueber Kontostand';
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'einloesen', 31, 'zu viel');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'einloesen_ueber_kontostand', 'erw', 'blockiert', 'ist', v_msg);
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'einloesen', 10, 'Probe-Praemie');
  v_obs := v_obs || jsonb_build_object('k', 'kontostand_20', 'erw', '20', 'ist', public.punkte_kontostand(v_fs, v_s1)::text);

  v_schritt := '5 Buero A: Aendern/Loeschen';
  begin
    update public.schueler_punkte set punkte = 1 where id = v_id;
    get diagnostics v_n = row_count; v_msg := case when v_n > 0 then 'erlaubt' else 'keine Zeile' end;
    if v_n > 0 then raise exception 'W19_ZURUECK'; end if;
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_aendert_buchung', 'erw_eines_von', '["blockiert","keine Zeile"]'::jsonb, 'ist', v_msg);
  begin
    delete from public.schueler_punkte where id = v_id;
    get diagnostics v_n = row_count; v_msg := case when v_n > 0 then 'erlaubt' else 'keine Zeile' end;
    if v_n > 0 then raise exception 'W19_ZURUECK'; end if;
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_loescht_buchung', 'erw_eines_von', '["blockiert","keine Zeile"]'::jsonb, 'ist', v_msg);

  v_schritt := '6 Buero A: fremde Fahrschule';
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs2, v_s2, 'vergeben', 5, 'x');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_bucht_fuer_fahrschule_b', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s2, 'vergeben', 5, 'x');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_bucht_schueler_aus_b', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id) values (v_fs, v_s1, 'verschenkt_an', 5, 'x', v_s3);
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'direkt_verschenkt_an', 'erw', 'blockiert', 'ist', v_msg);

  v_schritt := '7 Buero A: Verschenken';
  begin
    perform public.punkte_verschenken(v_fs, v_s1, v_s3, 5, 'Geschenk');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'verschenken_ohne_schalter', 'erw', 'blockiert', 'ist', v_msg);
  update public.fahrschule_einstellungen set wert = '{"aktiv":true,"verschenken":true,"bedingungen":"Probe"}' where fahrschule_id = v_fs and schluessel = 'punkte.system';
  perform public.punkte_verschenken(v_fs, v_s1, v_s3, 5, 'Geschenk');
  v_obs := v_obs || jsonb_build_object('k', 'verschenken_staende', 'erw', '15|5', 'ist', public.punkte_kontostand(v_fs, v_s1) || '|' || public.punkte_kontostand(v_fs, v_s3));
  begin
    perform public.punkte_verschenken(v_fs, v_s1, v_s3, 500, 'Geschenk');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'verschenken_ueber_kontostand', 'erw', 'blockiert', 'ist', v_msg);
  select count(*) into v_n from public.schueler_punkte;
  v_obs := v_obs || jsonb_build_object('k', 'buero_a_sieht', 'erw', '4', 'ist', v_n::text);

  -- ---------- als Leitung A ----------
  v_schritt := '8 Leitung A';
  perform set_config('request.jwt.claims', json_build_object('sub', v_la, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_la::text, true);
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s3, 'vergeben', 7, 'Leitung') returning punkte into v_n;
  v_obs := v_obs || jsonb_build_object('k', 'leitung_vergibt', 'erw', '7', 'ist', v_n::text);

  -- ---------- als Fahrlehrer A (eigener Schueler s1) ----------
  v_schritt := '9 Fahrlehrer A';
  perform set_config('request.jwt.claims', json_build_object('sub', v_fl, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_fl::text, true);
  select count(*) into v_n from public.schueler_punkte;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_sieht_nur_eigene', 'erw', '3', 'ist', v_n::text);   -- nur s1: vergeben, einloesen, verschenkt_ab
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'vergeben', 10, 'Probe-Regel') returning punkte into v_n;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_vergibt_aus_liste', 'erw', '10', 'ist', v_n::text);
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'vergeben', 99, 'Probe-Regel');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_eigene_zahl', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s3, 'vergeben', 10, 'Probe-Regel');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_bucht_fuer_kollegen', 'erw', 'blockiert', 'ist', v_msg);
  begin
    insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values (v_fs, 'punkte.regeln', '{"liste":[{"id":"x","name":"Eigene","punkte":999}]}')
      on conflict (fahrschule_id, schluessel) do update set wert = excluded.wert;
    get diagnostics v_n = row_count; v_msg := case when v_n > 0 then 'erlaubt' else 'keine Zeile' end;
    if v_n > 0 then raise exception 'W19_ZURUECK'; end if;
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_aendert_liste', 'erw', 'blockiert', 'ist', v_msg);
  begin
    perform public.punkte_verschenken(v_fs, v_s3, v_s1, 1, 'Geschenk');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'fahrlehrer_verschenkt_von_kollege', 'erw', 'blockiert', 'ist', v_msg);

  -- ---------- als Kollege A ----------
  v_schritt := '10 Kollege A';
  perform set_config('request.jwt.claims', json_build_object('sub', v_fl2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_fl2::text, true);
  select count(*) into v_n from public.schueler_punkte where schueler_id = v_s1;
  v_obs := v_obs || jsonb_build_object('k', 'kollege_sieht_s1', 'erw', '0', 'ist', v_n::text);
  begin
    perform public.punkte_kontostand(v_fs, v_s1);
    v_msg := 'erlaubt';
  exception when others then v_msg := 'blockiert'; end;
  v_obs := v_obs || jsonb_build_object('k', 'kollege_kontostand_s1', 'erw', 'blockiert', 'ist', v_msg);

  -- ---------- als Buero B ----------
  v_schritt := '11 Buero B';
  perform set_config('request.jwt.claims', json_build_object('sub', v_bu2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_bu2::text, true);
  select count(*) into v_n from public.schueler_punkte where fahrschule_id = v_fs;
  v_obs := v_obs || jsonb_build_object('k', 'buero_b_sieht_a', 'erw', '0', 'ist', v_n::text);

  -- ---------- Schalter aus (Buero A) ----------
  v_schritt := '12 Schalter aus';
  perform set_config('request.jwt.claims', json_build_object('sub', v_bu, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_bu::text, true);
  update public.fahrschule_einstellungen set wert = '{"aktiv":false,"verschenken":true,"bedingungen":""}' where fahrschule_id = v_fs and schluessel = 'punkte.system';
  begin
    insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values (v_fs, v_s1, 'vergeben', 1, 'x');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'schalter_aus_vergeben', 'erw', 'blockiert', 'ist', v_msg);
  begin
    perform public.punkte_verschenken(v_fs, v_s1, v_s3, 1, 'Geschenk');
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'schalter_aus_verschenken', 'erw', 'blockiert', 'ist', v_msg);
  v_obs := v_obs || jsonb_build_object('k', 'schalter_aus_kontostand_lesbar', 'erw', '25', 'ist', public.punkte_kontostand(v_fs, v_s1)::text);

  -- ---------- Eigentuemer (wie Dienst-Schluessel): auch er kann nicht aendern ----------
  v_schritt := '13 Eigentuemer';
  perform set_config('role', v_start, true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    update public.schueler_punkte set punkte = 1 where id = v_id;
    v_msg := 'erlaubt'; raise exception 'W19_ZURUECK';
  exception when others then if sqlerrm <> 'W19_ZURUECK' then v_msg := 'blockiert'; end if; end;
  v_obs := v_obs || jsonb_build_object('k', 'dienst_aendert_buchung', 'erw', 'blockiert', 'ist', v_msg);

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
