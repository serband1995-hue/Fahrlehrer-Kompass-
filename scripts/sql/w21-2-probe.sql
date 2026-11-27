-- =====================================================================================================================
-- W21 (Fahrlehrer-Kompass) – LIVE-PROBE nach der Migration 20261203_w21_01 (Prüfungstage mit 55-Minuten-Fenstern).
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausfuehren.
-- =====================================================================================================================
-- WIE AUSFUEHREN
--   GENAU EIN DO-Block (ein Aufruf), NACH dem Einspielen der Migration. Der Block endet IMMER mit einer Fehlermeldung
--   (RAISE EXCEPTION). Damit macht Postgres ALLES rueckgaengig (Test-Fahrschule, Konten, Schüler, Tage, Prüfungen,
--   Kalender-Zeilen, Ergebnisse). Es bleibt nichts in der Datenbank.
--       W21_ERGEBNIS {json}  = durchgelaufen: alle_ok, pflicht_fehler, zusatz_auffaellig, pruefungen[]
--       W21_ABBRUCH ...      = Vorpruefung hat gestoppt, BEVOR etwas geschrieben wurde
--       W21_FEHLER ...       = unerwarteter Fehler (mit Schritt, SQLSTATE); auch dann ist alles zurueckgerollt
-- AUSLOESER NACH AUSSEN: Schüler anlegen stößt trg_akademie_sync an (pg_net). pg_net-Aufträge stehen in einer Tabelle und
--   gehen erst nach COMMIT raus; der Block committet nie. Vorpruefung: Es darf kein Auslöser auf pruefungstermine,
--   pruefungstage, kalender_termine, kalender_pruefungen existieren, der net.http_* oder dblink aufruft (sonst ABBRUCH).
-- ABLAUF (Fahrschule „W21 Probe“, Konten B1 Büro, F1/F2 Fahrlehrer, E-Mails @example.invalid, Passwort leer):
--   Tag T (08:00) mit 9 Prüfungen → Zeiten + 9 Kalender-Zeilen; Doppelbelegung (Büro und F2) verweigert; Schüler doppelt
--   (zweiter Tag T2 am selben Datum) verweigert; verschieben; tauschen (RPC); Fahrlehrer ändern → Kalender-Zeile wandert;
--   Büro „bestanden“ → kalender_pruefungen; App (F1) „nicht bestanden“ → Tafel; Startzeit 09:00 → alles rückt; F1 legt
--   eigenen Tag + Prüfung an (Haken bleiben aus); Belegung zeigt F1 fremde Fenster ohne Schüler; altes App-Ziehen der
--   Spiegel-Zeile wird zurückgesetzt; anon hat keine Rechte.
-- NICHT GETESTET: echtes gleichzeitiges Schreiben aus zwei Verbindungen (ein DO-Block = eine Verbindung).
-- =====================================================================================================================

do $w21p$
declare
  v_start  text := current_user;
  v_lauf   text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_fs     uuid := gen_random_uuid();
  v_b1     uuid := gen_random_uuid();
  v_f1     uuid := gen_random_uuid();
  v_f2     uuid := gen_random_uuid();
  v_tag    uuid;
  v_tag2   uuid;
  v_tag3   uuid;
  v_id     uuid;
  v_id2    uuid;
  v_kt     text;
  v_schritt text := 'Start';
  v_pr     jsonb := '[]';
  v_j      jsonb;
  v_t      text;
  v_n      bigint;
  v_state  text;
  v_msg    text;
  v_ergebnis jsonb;
begin
  -- ===================================================================================================================
  -- SCHRITT 0: Vorpruefung (nur lesen)
  -- ===================================================================================================================
  v_schritt := '0 Vorpruefung';
  if to_regclass('public.pruefungstage') is null then raise exception 'W21_ABBRUCH: Migration 20261203_w21_01 fehlt.'; end if;
  if exists (select 1 from pg_trigger tg join pg_proc p on p.oid = tg.tgfoid
              where not tg.tgisinternal
                and tg.tgrelid in ('public.pruefungstermine'::regclass, 'public.pruefungstage'::regclass, 'public.kalender_termine'::regclass, 'public.kalender_pruefungen'::regclass)
                and (p.prosrc ilike '%net.http%' or p.prosrc ilike '%dblink%')) then
    raise exception 'W21_ABBRUCH: Auslöser nach außen auf den Prüfungs-/Kalendertabellen gefunden.';
  end if;

  -- ===================================================================================================================
  -- Aufbau (als Server, ohne JWT)
  -- ===================================================================================================================
  v_schritt := '1 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fs, 'W21 Probe', 'w21-probe-' || v_lauf);
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'w21-' || n || '-' || v_lauf || '@example.invalid', '', now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    from (values (v_b1, 'b1'), (v_f1, 'f1'), (v_f2, 'f2')) x(u, n);
  delete from public.profiles where id in (v_b1, v_f1, v_f2);
  insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
  values (v_b1, 'w21-b1-' || v_lauf || '@example.invalid', 'W21 Buero Probe', 'buero', v_fs, true),
         (v_f1, 'w21-f1-' || v_lauf || '@example.invalid', 'W21 Fahrlehrer 1', 'fahrlehrer', v_fs, true),
         (v_f2, 'w21-f2-' || v_lauf || '@example.invalid', 'W21 Fahrlehrer 2', 'fahrlehrer', v_fs, true);
  insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name)
  select 'w21probe' || v_lauf || g, v_fs, case when g <= 6 then v_f1 else v_f2 end, 'W21 Probe ' || g from generate_series(1, 12) g;

  -- ===================================================================================================================
  -- Als Büro B1
  -- ===================================================================================================================
  v_schritt := '2 Büro: Tag + 9 Prüfungen';
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b1::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.pruefungstage (fahrschule_id, datum, pruefer) values (v_fs, current_date + 30, 'PR') returning id into v_tag;
  insert into public.pruefungstermine (fahrschule_id, schueler_id, art, klasse, pruefungstag_id, fenster, fahrlehrer_id)
  select v_fs, 'w21probe' || v_lauf || (g + 1), 'praxis', 'B', v_tag, g, case when g < 6 then v_f1 else v_f2 end from generate_series(0, 8) g;
  select string_agg(to_char(von, 'HH24:MI'), ',' order by fenster) into v_t from public.pruefungstermine where pruefungstag_id = v_tag;
  v_pr := v_pr || jsonb_build_object('name', 'Fall 1: 9 Prüfungen, Zeiten 08:00..15:20', 'kat', 'pflicht',
    'ok', v_t = '08:00,08:55,09:50,10:45,11:40,12:35,13:30,14:25,15:20', 'ist', v_t);
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.kalender_termine k join public.pruefungstermine p on p.kalender_termin_id = k.id
   where p.pruefungstag_id = v_tag and not coalesce(k.geloescht, false) and k.art = 'pruefung' and k.datum = p.datum and k.von = p.von;
  v_pr := v_pr || jsonb_build_object('name', 'Server-Spiegel: 9 Kalender-Zeilen passend', 'kat', 'pflicht', 'ok', v_n = 9, 'ist', v_n);
  select count(*) into v_n from public.pruefungstermine where pruefungstag_id = v_tag and kalender_fehler is not null;
  v_pr := v_pr || jsonb_build_object('name', 'Kein kalender_fehler', 'kat', 'pflicht', 'ok', v_n = 0, 'ist',
    (select jsonb_agg(kalender_fehler) from public.pruefungstermine where pruefungstag_id = v_tag and kalender_fehler is not null));
  perform set_config('role', 'authenticated', true);

  v_schritt := '3 Doppelbelegung';
  begin
    insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id)
    values (v_fs, 'w21probe' || v_lauf || '10', 'praxis', v_tag, 3, v_f2);
    v_t := 'angenommen';
  exception when others then v_t := sqlerrm; end;
  v_pr := v_pr || jsonb_build_object('name', 'Doppelbelegung (Büro) verweigert', 'kat', 'pflicht', 'ok', v_t like 'W21:fenster_belegt%', 'ist', v_t);
  insert into public.pruefungstage (fahrschule_id, datum, pruefer, start) values (v_fs, current_date + 30, 'P2', '09:00') returning id into v_tag2;
  begin
    insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id)
    values (v_fs, 'w21probe' || v_lauf || '1', 'praxis', v_tag2, 0, v_f1);
    v_t := 'angenommen';
  exception when others then v_t := sqlerrm; end;
  v_pr := v_pr || jsonb_build_object('name', 'Schüler zweimal am selben Tag verweigert', 'kat', 'pflicht', 'ok', v_t like 'W21:schueler_doppelt%', 'ist', v_t);

  v_schritt := '4 Verschieben/Tauschen';
  select id into v_id from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '9';
  update public.pruefungstermine set pruefungstag_id = v_tag2, fenster = 2 where id = v_id;
  select to_char(von, 'HH24:MI') into v_t from public.pruefungstermine where id = v_id;
  v_pr := v_pr || jsonb_build_object('name', 'Fall 3: verschoben auf T2 Fenster 3 = 10:50', 'kat', 'pflicht', 'ok', v_t = '10:50', 'ist', v_t);
  select id into v_id from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '1';
  select id into v_id2 from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '2';
  perform public.pruefung_tauschen(v_id, v_id2);
  select string_agg(fenster::text, ',' order by schueler_id) into v_t from public.pruefungstermine where id in (v_id, v_id2);
  v_pr := v_pr || jsonb_build_object('name', 'Fall 4: getauscht (Fenster 1,0)', 'kat', 'pflicht', 'ok', v_t = '1,0', 'ist', v_t);

  v_schritt := '5 Fahrlehrer ändern';
  select id, kalender_termin_id into v_id, v_kt from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '3';
  update public.pruefungstermine set fahrlehrer_id = v_f2 where id = v_id;
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.kalender_termine where id = v_kt and fahrlehrer_id = v_f2 and not coalesce(geloescht, false);
  v_pr := v_pr || jsonb_build_object('name', 'Fall 5: Fahrlehrer geändert, Kalender wandert mit', 'kat', 'pflicht', 'ok', v_n = 1,
    'ist', (select kalender_fehler from public.pruefungstermine where id = v_id));
  perform set_config('role', 'authenticated', true);

  v_schritt := '6 Ergebnis Büro → App';
  select id into v_id from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '5';
  update public.pruefungstermine set status = 'bestanden' where id = v_id;
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.kalender_pruefungen where id = 'pt-' || v_id and result = 'pass' and fahrlehrer_id = v_f1 and not coalesce(geloescht, false);
  v_pr := v_pr || jsonb_build_object('name', 'Fall 6: Büro bestanden → kalender_pruefungen pass', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);

  v_schritt := '7 Startzeit';
  perform set_config('role', 'authenticated', true);
  update public.pruefungstage set start = '09:00' where id = v_tag;
  select to_char(von, 'HH24:MI') into v_t from public.pruefungstermine where pruefungstag_id = v_tag and fenster = 0;
  v_pr := v_pr || jsonb_build_object('name', 'Startzeit 09:00: Fenster 1 = 09:00', 'kat', 'pflicht', 'ok', v_t = '09:00', 'ist', v_t);

  -- ===================================================================================================================
  -- Als Fahrlehrer F1 (App)
  -- ===================================================================================================================
  v_schritt := '8 App: Ergebnis';
  perform set_config('request.jwt.claims', json_build_object('sub', v_f1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_f1::text, true);
  select datum into v_t from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '6';
  insert into public.kalender_pruefungen (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, result, geloescht, payload)
  values ('w21probe-ex-' || v_lauf, v_fs, v_f1, 'w21probe' || v_lauf || '6', v_t::date, 'fail', false, '{"faults":[]}'::jsonb);
  select status into v_t from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '6';
  v_pr := v_pr || jsonb_build_object('name', 'Fall 6: App nicht bestanden → Tafel', 'kat', 'pflicht', 'ok', v_t = 'nicht_bestanden', 'ist', v_t);

  v_schritt := '9 App: eigener Tag';
  insert into public.pruefungstage (fahrschule_id, datum, erstellt_von) values (v_fs, current_date + 31, v_f1) returning id into v_tag3;
  insert into public.pruefungstermine (fahrschule_id, schueler_id, art, klasse, pruefungstag_id, fenster, fahrlehrer_id, entgelt_bezahlt, quelle)
  values (v_fs, 'w21probe' || v_lauf || '4', 'praxis', 'B', v_tag3, 0, v_f1, true, 'app') returning id into v_id;
  select case when not entgelt_bezahlt and quelle = 'app' and kalender_termin_id is not null then 'ok' else 'falsch' end into v_t from public.pruefungstermine where id = v_id;
  v_pr := v_pr || jsonb_build_object('name', 'App legt Prüfung an (Haken aus, quelle app, Kalender)', 'kat', 'pflicht', 'ok', v_t = 'ok', 'ist', v_t);
  begin
    insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id)
    values (v_fs, 'w21probe' || v_lauf || '11', 'praxis', v_tag3, 1, v_f2);
    v_t := 'angenommen';
  exception when others then v_t := sqlerrm; end;
  v_pr := v_pr || jsonb_build_object('name', 'App kann nicht für Kollegen anlegen', 'kat', 'pflicht', 'ok', v_t <> 'angenommen', 'ist', v_t);
  v_j := public.pruefungstage_belegung(current_date + 29, current_date + 31);
  select count(*) into v_n from jsonb_array_elements(v_j) t, jsonb_array_elements(t->'belegt') b
   where (t->>'id')::uuid = v_tag and not (b->>'eigen')::boolean and b->>'schueler_id' is null;
  v_pr := v_pr || jsonb_build_object('name', 'Belegung: fremde Fenster ohne Schüler', 'kat', 'pflicht', 'ok', v_n >= 3, 'ist', v_n);
  select count(*) into v_n from jsonb_array_elements(v_j) t, jsonb_array_elements(t->'belegt') b where b->>'schueler_id' is not null and not (b->>'eigen')::boolean;
  v_pr := v_pr || jsonb_build_object('name', 'Belegung: nie fremde Schüler-ID', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);

  v_schritt := '10 Altes App-Ziehen';
  select kalender_termin_id into v_kt from public.pruefungstermine where schueler_id = 'w21probe' || v_lauf || '1';
  update public.kalender_termine set datum = datum + 1 where id = v_kt;
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.kalender_termine k join public.pruefungstermine p on p.kalender_termin_id = k.id where k.id = v_kt and k.datum = p.datum;
  v_pr := v_pr || jsonb_build_object('name', 'Altes App-Ziehen verschiebt Spiegel-Zeile nicht', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);

  v_schritt := '11 anon';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
  begin
    perform 1 from public.pruefungstage limit 0;
    v_t := 'lesen erlaubt';
  exception when others then v_t := sqlstate; end;
  perform set_config('role', v_start, true);
  v_pr := v_pr || jsonb_build_object('name', 'anon: keine Rechte an pruefungstage', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);
  v_pr := v_pr || jsonb_build_object('name', 'anon: RPCs nicht ausführbar', 'kat', 'pflicht',
    'ok', not has_function_privilege('anon', 'public.pruefung_tauschen(uuid, uuid)', 'EXECUTE') and not has_function_privilege('anon', 'public.pruefungstage_belegung(date, date)', 'EXECUTE'));

  perform set_config('role', v_start, true);
  v_ergebnis := jsonb_build_object(
    'lauf', v_lauf,
    'alle_ok', not exists (select 1 from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'pflicht_fehler', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'zusatz_auffaellig', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' <> 'pflicht' and not (x->>'ok')::boolean),
    'pruefungen', v_pr);
  raise exception 'W21_ERGEBNIS %', v_ergebnis::text;      -- IMMER: macht alles rueckgaengig

exception
  when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_msg like 'W21_ERGEBNIS %' or v_msg like 'W21_ABBRUCH%' then
      raise exception '%', v_msg;
    end if;
    raise exception 'W21_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher %', v_schritt, v_state, v_msg, v_pr::text;
end
$w21p$;
