-- =====================================================================================================================
-- W20 (Fahrlehrer-Kompass) – LIVE-PROBE nach den Migrationen 20261201_w20_01 (anon-Rechte) und 20261201_w20_02 (Büro an
-- mehreren PCs). Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausfuehren.
-- =====================================================================================================================
-- WIE AUSFUEHREN
--   GENAU EIN DO-Block (ein Aufruf, z. B. Supabase "execute_sql"), NACH dem Einspielen beider Migrationen.
--   Der Block endet IMMER mit einer Fehlermeldung (RAISE EXCEPTION). Damit macht Postgres ALLES rueckgaengig
--   (Test-Fahrschule, Test-Konten, Profile, Büro-Person, Sitzungen, Protokollzeilen). Es bleibt nichts in der Datenbank.
--       W20_ERGEBNIS {json}  = durchgelaufen: alle_ok, pflicht_fehler, zusatz_auffaellig, pruefungen[]
--       W20_ABBRUCH ...      = Vorpruefung hat gestoppt, BEVOR etwas geschrieben wurde
--       W20_FEHLER ...       = unerwarteter Fehler (mit Schritt, SQLSTATE); auch dann ist alles zurueckgerollt
--
-- TEIL A – anon-Rechte (schreibt nichts; Lese-Versuche mit "limit 0" lesen keine einzige Zeile)
--   Fuer JEDE Tabelle/Sicht in public als Rolle anon: SELECT (limit 0), INSERT (insert ... select ... limit 0),
--   UPDATE/DELETE (where false), TRUNCATE. Erwartet: ueberall "permission denied" (42501); nur quiz_raeume/quiz_spieler
--   duerfen gelesen werden (Quiz ohne Konto, Realtime). Sollte ein Schreibversuch wider Erwarten klappen, wird er sofort
--   in einem eigenen Unterblock zurueckgerollt und als Fehler gemeldet.
--   Dazu: authenticated hat kein TRUNCATE/TRIGGER/REFERENCES mehr und alle Rechte SELECT/INSERT/UPDATE/DELETE von vorher
--   (Vergleich mit sicherung.w20_rechte_vorher); anon darf die quiz_* RPCs weiter aufrufen; service_role (Edge Function
--   public-booking = Buchungsseite) hat weiter seine Rechte auf profiles, snapshots, push_subscriptions, public_bookings und
--   umgeht RLS; Standardrechte fuer kuenftige Tabellen von postgres enthalten anon nicht mehr; anon hat keine Sequenz-Rechte.
-- TEIL B – Büro-Person an mehreren PCs (wie W18 mit E-Mails @example.invalid, Fahrschule "W20 Probe")
--   Aufbau: Fahrschule (slug ist live NOT NULL + UNIQUE: eindeutiger Wert je Lauf), Konto Büro B1 und Leitung L1 in
--   auth.users (Passwort leer = Anmeldung unmoeglich), Profile wie admin-create-account (loeschen + neu einfuegen),
--   Büro-Person P mit PIN.
--   Ablauf als B1 (Rolle authenticated + JWT wie PostgREST, Schluessel in request.headers x-buero-sitzung wie buero.js):
--   6x buero_pin_anmelden -> 5 Sitzungen, die erste ist weg, 2..6 gelten GLEICHZEITIG; buero_sitzung_beenden mit T6 ->
--   nur T6 weg; buero_pin_aendern an T2 -> T2 bleibt, T3..T5 weg; neue Anmeldung T7; als L1 buero_pin_zuruecksetzen(P) ->
--   alle weg. Dazu: buero_neue_sitzung ist fuer authenticated/anon nicht direkt aufrufbar; Aufraeum-Auftrag in pg_cron.
-- NICHT GETESTET: Realtime-Kanal des Quiz (nur das SELECT-Recht dahinter); die Edge Function public-booking selbst.
-- =====================================================================================================================

do $w20$
declare
  v_start  text := current_user;
  v_lauf   text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_fs     uuid := gen_random_uuid();
  v_b1     uuid := gen_random_uuid();
  v_l1     uuid := gen_random_uuid();
  v_p      uuid;
  v_quiz   constant text[] := array['quiz_raeume', 'quiz_spieler'];
  v_tok    text[] := '{}';
  v_schritt text := 'Start';
  v_pr     jsonb := '[]';
  v_info   jsonb := '{}';
  v_j      jsonb;
  v_r      text;
  v_ok     boolean;
  v_n      bigint;
  v_i      int;
  v_col    text;
  v_state  text;
  v_msg    text;
  v_abw    jsonb;
  rec      record;
  v_ergebnis jsonb;
begin
  -- ===================================================================================================================
  -- SCHRITT 0: Vorpruefung (nur lesen)
  -- ===================================================================================================================
  v_schritt := '0 Vorpruefung';
  if to_regclass('sicherung.w20_rechte_vorher') is null then
    raise exception 'W20_ABBRUCH: sicherung.w20_rechte_vorher fehlt – Migration 20261201_w20_01 ist nicht eingespielt.';
  end if;
  if position('offset 4' in pg_get_functiondef('public.buero_neue_sitzung(uuid, uuid, boolean)'::regprocedure)) = 0 then
    raise exception 'W20_ABBRUCH: buero_neue_sitzung ist nicht die W20-Fassung – Migration 20261201_w20_02 ist nicht eingespielt.';
  end if;
  if not exists (select 1 from pg_roles where rolname = v_start and (rolsuper or rolbypassrls)) then
    raise exception 'W20_ABBRUCH: Rolle % umgeht RLS nicht (fuer den Aufbau von Teil B noetig).', v_start;
  end if;

  -- ===================================================================================================================
  -- TEIL A: anon-Rechte
  -- ===================================================================================================================
  for rec in
    select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f') order by c.relname
  loop
    v_schritt := 'A1 anon ' || rec.relname;
    select a.attname into v_col from pg_attribute a where a.attrelid = ('public.' || quote_ident(rec.relname))::regclass
       and a.attnum > 0 and not a.attisdropped order by a.attnum limit 1;
    foreach v_r in array array['select', 'insert', 'update', 'delete', 'truncate'] loop
      if v_r = 'truncate' and rec.relkind not in ('r', 'p') then continue; end if;
      begin
        perform set_config('role', 'anon', true);
        execute case v_r
          when 'select'   then format('select 1 from public.%I limit 0', rec.relname)
          when 'insert'   then format('insert into public.%I select * from public.%I limit 0', rec.relname, rec.relname)
          when 'update'   then format('update public.%I set %I = %I where false', rec.relname, v_col, v_col)
          when 'delete'   then format('delete from public.%I where false', rec.relname)
          else                 format('truncate public.%I', rec.relname) end;
        raise exception using errcode = 'P0001', message = 'W20_ERLAUBT';      -- geklappt: sofort zurueckrollen
      exception
        when insufficient_privilege then v_ok := true;  v_state := '42501';
        when others then
          get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
          v_ok := false;
          if v_msg = 'W20_ERLAUBT' then v_state := 'erlaubt'; end if;
      end;
      perform set_config('role', v_start, true);
      -- Quiz: Lesen MUSS klappen (Rest muss verboten sein)
      if rec.relname = any (v_quiz) and v_r = 'select' then v_ok := (v_state = 'erlaubt'); end if;
      if not v_ok then
        v_pr := v_pr || jsonb_build_object('name', 'A1 anon ' || v_r || ' ' || rec.relname, 'kat', 'pflicht', 'ok', false,
                  'erw', case when rec.relname = any (v_quiz) and v_r = 'select' then 'erlaubt' else '42501' end, 'ist', v_state);
      end if;
    end loop;
  end loop;
  v_pr := v_pr || jsonb_build_object('name', 'A1 anon: alle Tabellen/Sichten durchprobiert', 'kat', 'pflicht', 'ok', true,
            'ist', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p','v','m','f')));

  v_schritt := 'A2 authenticated';
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and (has_table_privilege('authenticated', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'TRIGGER')
          or has_table_privilege('authenticated', c.oid, 'REFERENCES')
          or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('anon', c.oid, 'TRIGGER')
          or has_table_privilege('anon', c.oid, 'REFERENCES'));
  v_pr := v_pr || jsonb_build_object('name', 'A2 niemand (anon/authenticated) hat TRUNCATE/TRIGGER/REFERENCES', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);

  select coalesce(jsonb_agg(x), '[]') into v_abw from (
    select s.objekt || ':' || p as x
      from sicherung.w20_rechte_vorher s cross join unnest(s.rechte) p
      join pg_class c on c.relname = s.objekt and c.relkind = s.art
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where s.rolle = 'authenticated' and p in ('SELECT', 'INSERT', 'UPDATE', 'DELETE') and s.art <> 'S'
       and not has_table_privilege('authenticated', c.oid, p)) q;
  v_pr := v_pr || jsonb_build_object('name', 'A3 authenticated behaelt SELECT/INSERT/UPDATE/DELETE von vorher', 'kat', 'pflicht',
            'ok', jsonb_array_length(v_abw) = 0, 'ist', v_abw);

  v_schritt := 'A4 Quiz-RPCs';
  select coalesce(jsonb_agg(p.proname), '[]') into v_abw from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('quiz_beitreten', 'quiz_antworten_senden', 'quiz_ich', 'quiz_erstellen', 'quiz_steuern', 'quiz_entfernen', 'quiz_verlauf', 'quiz_zeit')
     and not has_function_privilege('anon', p.oid, 'EXECUTE');
  v_pr := v_pr || jsonb_build_object('name', 'A4 anon darf die Quiz-RPCs weiter aufrufen', 'kat', 'pflicht', 'ok', jsonb_array_length(v_abw) = 0, 'ist', v_abw);
  v_ok := has_table_privilege('anon', 'public.quiz_raeume', 'SELECT') and has_table_privilege('anon', 'public.quiz_spieler', 'SELECT');
  v_pr := v_pr || jsonb_build_object('name', 'A4 anon liest quiz_raeume/quiz_spieler (Realtime)', 'kat', 'pflicht', 'ok', v_ok);

  v_schritt := 'A5 service_role (Buchungsseite)';
  v_ok := has_table_privilege('service_role', 'public.public_bookings', 'SELECT,INSERT,UPDATE')
      and has_table_privilege('service_role', 'public.profiles', 'SELECT')
      and has_table_privilege('service_role', 'public.snapshots', 'SELECT')
      and has_table_privilege('service_role', 'public.push_subscriptions', 'SELECT,INSERT,UPDATE,DELETE')
      and exists (select 1 from pg_roles where rolname = 'service_role' and rolbypassrls);
  v_pr := v_pr || jsonb_build_object('name', 'A5 service_role (public-booking) unveraendert: Rechte + umgeht RLS', 'kat', 'pflicht', 'ok', v_ok);

  v_schritt := 'A6 Standardrechte/Sequenzen';
  select count(*) into v_n from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where pg_get_userbyid(d.defaclrole) = 'postgres' and n.nspname = 'public' and d.defaclobjtype in ('r', 'S')
     and exists (select 1 from aclexplode(d.defaclacl) a where pg_get_userbyid(a.grantee) = 'anon');
  v_pr := v_pr || jsonb_build_object('name', 'A6 kuenftige Tabellen/Sequenzen von postgres: nichts fuer anon', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'S' and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'UPDATE'));
  v_pr := v_pr || jsonb_build_object('name', 'A6 anon: keine Sequenz-Rechte', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  -- Beobachtung: Funktionen, die anon weiter aufrufen darf (bewusst nicht angefasst)
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'EXECUTE');
  v_info := v_info || jsonb_build_object('anon_funktionen_ausfuehrbar', v_n);

  -- ===================================================================================================================
  -- TEIL B: Büro-Person an mehreren PCs
  -- ===================================================================================================================
  v_schritt := 'B0 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fs, 'W20 Probe', 'w20-probe-' || v_lauf);
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_b1, 'authenticated', 'authenticated', 'w20-b1-' || v_lauf || '@example.invalid', '', now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
         ('00000000-0000-0000-0000-000000000000', v_l1, 'authenticated', 'authenticated', 'w20-l1-' || v_lauf || '@example.invalid', '', now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
  delete from public.profiles where id in (v_b1, v_l1);
  insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
  values (v_b1, 'w20-b1-' || v_lauf || '@example.invalid', 'W20 Buero Probe', 'buero', v_fs, true),
         (v_l1, 'w20-l1-' || v_lauf || '@example.invalid', 'W20 Leitung Probe', 'fahrschule_admin', v_fs, true);
  insert into public.buero_personen (fahrschule_id, name, pin_hash, hat_pin)
  values (v_fs, 'W20 Person', extensions.crypt('4826', extensions.gen_salt('bf', 8)), true) returning id into v_p;

  -- B1: sechs Anmeldungen derselben Person (sechs PCs) als Büro-Konto B1
  for v_i in 1..6 loop
    v_schritt := 'B1 Anmeldung ' || v_i;
    perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_b1::text, true);
    perform set_config('role', 'authenticated', true);
    v_j := public.buero_pin_anmelden(v_p, '4826', false);
    perform set_config('role', v_start, true);
    if v_j ? 'fehler' or coalesce(v_j->>'token', '') = '' then
      raise exception 'W20_FEHLER_ANMELDUNG %', v_j::text;
    end if;
    v_tok := v_tok || (v_j->>'token');
  end loop;

  select count(*) into v_n from public.buero_sitzungen where person_id = v_p;
  v_pr := v_pr || jsonb_build_object('name', 'B1 nach 6 Anmeldungen hoechstens 5 Sitzungen', 'kat', 'pflicht', 'ok', v_n = 5, 'ist', v_n);

  -- Hilfe: gilt Schluessel i gerade? (wie buero_sitzung_pruefen: Kopfzeile x-buero-sitzung + JWT des Kontos)
  v_schritt := 'B2 gleichzeitig gueltig';
  v_r := '';
  for v_i in 1..6 loop
    perform set_config('request.headers', json_build_object('x-buero-sitzung', v_tok[v_i])::text, true);
    v_r := v_r || case when (public.buero_sitzung_zeile(true)).token_hash is not null then '1' else '0' end;
  end loop;
  v_pr := v_pr || jsonb_build_object('name', 'B2 PC 2–6 gleichzeitig angemeldet, PC 1 (aelteste) beendet', 'kat', 'pflicht', 'ok', v_r = '011111', 'ist', v_r);

  v_schritt := 'B3 Abmelden an PC 6';
  perform set_config('request.headers', json_build_object('x-buero-sitzung', v_tok[6])::text, true);
  perform set_config('role', 'authenticated', true);
  v_j := public.buero_sitzung_beenden();
  perform set_config('role', v_start, true);
  v_r := '';
  for v_i in 1..6 loop
    perform set_config('request.headers', json_build_object('x-buero-sitzung', v_tok[v_i])::text, true);
    v_r := v_r || case when (public.buero_sitzung_zeile(true)).token_hash is not null then '1' else '0' end;
  end loop;
  v_pr := v_pr || jsonb_build_object('name', 'B3 Abmelden beendet nur diese Sitzung', 'kat', 'pflicht', 'ok', v_r = '011110', 'ist', v_r);

  v_schritt := 'B4 PIN aendern an PC 2';
  perform set_config('request.headers', json_build_object('x-buero-sitzung', v_tok[2])::text, true);
  perform set_config('role', 'authenticated', true);
  v_j := public.buero_pin_aendern('7391');
  perform set_config('role', v_start, true);
  v_r := '';
  for v_i in 1..6 loop
    perform set_config('request.headers', json_build_object('x-buero-sitzung', v_tok[v_i])::text, true);
    v_r := v_r || case when (public.buero_sitzung_zeile(true)).token_hash is not null then '1' else '0' end;
  end loop;
  v_pr := v_pr || jsonb_build_object('name', 'B4 PIN-Aenderung: diese Sitzung bleibt, alle anderen enden', 'kat', 'pflicht',
            'ok', coalesce(v_j->>'ok', '') = 'true' and v_r = '010000', 'ist', v_r, 'antwort', v_j);

  v_schritt := 'B5 neue Anmeldung + PIN freigeben durch Leitung';
  perform set_config('request.headers', '', true);
  perform set_config('role', 'authenticated', true);
  v_j := public.buero_pin_anmelden(v_p, '7391', false);
  perform set_config('role', v_start, true);
  v_tok := v_tok || coalesce(v_j->>'token', '');
  perform set_config('request.jwt.claims', json_build_object('sub', v_l1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_l1::text, true);
  perform set_config('role', 'authenticated', true);
  v_j := public.buero_pin_zuruecksetzen(v_p);
  perform set_config('role', v_start, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b1::text, true);
  v_r := '';
  foreach v_msg in array array[v_tok[2], v_tok[7]] loop
    perform set_config('request.headers', json_build_object('x-buero-sitzung', v_msg)::text, true);
    v_r := v_r || case when (public.buero_sitzung_zeile(true)).token_hash is not null then '1' else '0' end;
  end loop;
  v_pr := v_pr || jsonb_build_object('name', 'B5 PIN freigeben (Leitung) beendet alle Sitzungen der Person', 'kat', 'pflicht',
            'ok', coalesce(v_j->>'ok', '') = 'true' and v_r = '00', 'ist', v_r, 'antwort', v_j);

  v_schritt := 'B6 Rechte + Aufraeumen';
  v_ok := not has_function_privilege('authenticated', 'public.buero_neue_sitzung(uuid, uuid, boolean)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.buero_neue_sitzung(uuid, uuid, boolean)', 'EXECUTE');
  v_pr := v_pr || jsonb_build_object('name', 'B6 buero_neue_sitzung nicht direkt aufrufbar (anon/authenticated)', 'kat', 'pflicht', 'ok', v_ok);
  v_ok := has_function_privilege('authenticated', 'public.buero_pin_anmelden(uuid, text, boolean)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.buero_sitzung_beenden()', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.buero_pin_aendern(text)', 'EXECUTE');
  v_pr := v_pr || jsonb_build_object('name', 'B6 Büro-Seite darf anmelden/abmelden/PIN aendern', 'kat', 'pflicht', 'ok', v_ok);
  begin
    execute 'select count(*) from cron.job where jobname = ''buero_sitzungen_aufraeumen''' into v_n;
  exception when others then v_n := -1;
  end;
  v_pr := v_pr || jsonb_build_object('name', 'B7 Aufraeum-Auftrag buero_sitzungen_aufraeumen in pg_cron', 'kat', 'zusatz', 'ok', v_n = 1, 'ist', v_n);

  perform set_config('role', v_start, true);
  perform set_config('request.headers', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  v_ergebnis := jsonb_build_object(
    'lauf', v_lauf,
    'alle_ok', not exists (select 1 from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'pflicht_fehler', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'zusatz_auffaellig', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' <> 'pflicht' and not (x->>'ok')::boolean),
    'info', v_info,
    'pruefungen', v_pr);
  raise exception 'W20_ERGEBNIS %', v_ergebnis::text;      -- IMMER: macht alles rueckgaengig

exception
  when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_msg like 'W20_ERGEBNIS %' or v_msg like 'W20_ABBRUCH%' then
      raise exception '%', v_msg;
    end if;
    raise exception 'W20_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher %', v_schritt, v_state, v_msg, v_pr::text;
end
$w20$;
