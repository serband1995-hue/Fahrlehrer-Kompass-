-- =====================================================================================================================
-- W20 (Fahrlehrer-Kompass) – LIVE-PROBE nach Migration 20261201_w20_03 (Büro darf schueler_verschiebungen LESEN).
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausfuehren.
-- =====================================================================================================================
-- WIE AUSFUEHREN: GENAU EIN DO-Block (ein Aufruf), NACH dem Einspielen der Migration. Endet IMMER mit RAISE EXCEPTION:
--   W20V_ERGEBNIS {json} = durchgelaufen (alle_ok, pflicht_fehler, pruefungen[]); W20V_ABBRUCH = Vorpruefung hat gestoppt,
--   bevor etwas geschrieben wurde; W20V_FEHLER = unerwarteter Fehler. In jedem Fall ist ALLES zurueckgerollt.
-- AUFBAU (wie W18/W20-2, E-Mails @example.invalid): Fahrschulen „W20V Probe A“ und „… B“ (slug eindeutig je Lauf), Konten
--   BA (Buero, A), LA (Leitung, A), F1/F2 (Fahrlehrer, A), F3 (Fahrlehrer, A, unbeteiligt), FB (Fahrlehrer, B); je ein Schueler
--   in A und B; zwei Verschiebungs-Zeilen: vA (A: F1 → F2, verschoben von BA) und vB (B: FB → Pool).
-- PRUEFUNGEN (Rolle authenticated + JWT wie PostgREST; Lesen nur ueber die eigenen Test-IDs):
--   P1 Regel da: genau „Buero sieht Verschiebungen der Fahrschule“, nur SELECT, nur authenticated.
--   P2 Buero BA sieht vA, aber NICHT vB (fremde Fahrschule).
--   P3 Buero BA kann vA weder aendern noch loeschen (0 Zeilen).
--   P4 Unbeteiligter Fahrlehrer F3 sieht vA nicht; F2 (Empfaenger) sieht vA weiter; Leitung LA sieht vA weiter.
--   P5 anon: Lesen verweigert (42501, Migration W20_01).
-- =====================================================================================================================
do $w20v$
declare
  v_start text := current_user;
  v_lauf  text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_fsA uuid := gen_random_uuid();
  v_fsB uuid := gen_random_uuid();
  v_ids uuid[] := array(select gen_random_uuid() from generate_series(1, 6));   -- BA, LA, F1, F2, F3, FB
  v_kz  text[] := array['BA', 'LA', 'F1', 'F2', 'F3', 'FB'];
  v_sA text := 'w20v' || v_lauf || 'a';
  v_sB text := 'w20v' || v_lauf || 'b';
  v_vA text; v_vB text;
  v_idtyp text;
  v_fehlt text;
  v_schritt text := 'Start';
  v_pr jsonb := '[]';
  v_n bigint; v_m bigint;
  v_r text;
  v_state text; v_msg text;
  v_i int;
begin
  -- ---------- 0. Vorpruefung (nur lesen) ----------
  v_schritt := '0 Vorpruefung';
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'schueler_verschiebungen'
                   and policyname = 'Buero sieht Verschiebungen der Fahrschule') then
    raise exception 'W20V_ABBRUCH: Regel „Buero sieht Verschiebungen der Fahrschule“ fehlt – Migration 20261201_w20_03 nicht eingespielt.';
  end if;
  if not exists (select 1 from pg_roles where rolname = v_start and (rolsuper or rolbypassrls)) then
    raise exception 'W20V_ABBRUCH: Rolle % umgeht RLS nicht.', v_start;
  end if;
  -- Pflichtspalten ohne Vorgabe, die die Probe nicht setzt -> abbrechen, bevor etwas geschrieben ist
  select string_agg(table_name || '.' || column_name, ', ') into v_fehlt from information_schema.columns
   where table_schema = 'public' and is_nullable = 'NO' and column_default is null
     and ((table_name = 'schueler' and column_name not in ('id', 'fahrschule_id', 'fahrlehrer_id', 'name'))
       or (table_name = 'schueler_verschiebungen' and column_name not in ('id', 'schueler_id', 'fahrschule_id', 'von_fahrlehrer_id', 'zu_fahrlehrer_id', 'verschoben_von')));
  if v_fehlt is not null then raise exception 'W20V_ABBRUCH: Pflichtspalten ohne Vorgabe, die die Probe nicht kennt: %', v_fehlt; end if;
  select data_type into v_idtyp from information_schema.columns where table_schema = 'public' and table_name = 'schueler_verschiebungen' and column_name = 'id';
  perform set_config('lock_timeout', '3s', true);

  -- ---------- 1. Aufbau ----------
  v_schritt := '1 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fsA, 'W20V Probe A', 'w20v-probe-a-' || v_lauf), (v_fsB, 'W20V Probe B', 'w20v-probe-b-' || v_lauf);
  for v_i in 1..6 loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_ids[v_i], 'authenticated', 'authenticated', 'w20v-' || lower(v_kz[v_i]) || '-' || v_lauf || '@example.invalid', '', now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
  end loop;
  delete from public.profiles where id = any (v_ids);
  for v_i in 1..6 loop
    insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
    values (v_ids[v_i], 'w20v-' || lower(v_kz[v_i]) || '-' || v_lauf || '@example.invalid', 'W20V ' || v_kz[v_i],
            case v_kz[v_i] when 'BA' then 'buero' when 'LA' then 'fahrschule_admin' else 'fahrlehrer' end,
            case when v_kz[v_i] = 'FB' then v_fsB else v_fsA end, true);
  end loop;
  insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values (v_sA, v_fsA, v_ids[4], 'W20V Schueler A'), (v_sB, v_fsB, null, 'W20V Schueler B');
  if v_idtyp in ('uuid') then
    insert into public.schueler_verschiebungen (schueler_id, fahrschule_id, von_fahrlehrer_id, zu_fahrlehrer_id, verschoben_von)
    values (v_sA, v_fsA, v_ids[3], v_ids[4], v_ids[1]) returning id::text into v_vA;
    insert into public.schueler_verschiebungen (schueler_id, fahrschule_id, von_fahrlehrer_id, zu_fahrlehrer_id, verschoben_von)
    values (v_sB, v_fsB, v_ids[6], null, v_ids[6]) returning id::text into v_vB;
  else
    execute format('insert into public.schueler_verschiebungen (schueler_id, fahrschule_id, von_fahrlehrer_id, zu_fahrlehrer_id, verschoben_von) values (%L, %L, %L, %L, %L) returning id::text', v_sA, v_fsA, v_ids[3], v_ids[4], v_ids[1]) into v_vA;
    execute format('insert into public.schueler_verschiebungen (schueler_id, fahrschule_id, von_fahrlehrer_id, zu_fahrlehrer_id, verschoben_von) values (%L, %L, %L, null, %L) returning id::text', v_sB, v_fsB, v_ids[6], v_ids[6]) into v_vB;
  end if;

  -- ---------- P1 Regel ----------
  v_schritt := 'P1';
  select count(*) into v_n from pg_policies where schemaname = 'public' and tablename = 'schueler_verschiebungen'
     and policyname = 'Buero sieht Verschiebungen der Fahrschule' and cmd = 'SELECT' and roles::text = '{authenticated}';
  v_pr := v_pr || jsonb_build_object('name', 'P1 Regel nur SELECT, nur authenticated', 'kat', 'pflicht', 'ok', v_n = 1);

  -- Lesen/Schreiben als Konto i: zaehlt sichtbare vA/vB bzw. geaenderte Zeilen
  -- ---------- P2/P3 Buero ----------
  v_schritt := 'P2 Buero liest';
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[1], 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_ids[1]::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) filter (where id::text = v_vA), count(*) filter (where id::text = v_vB) into v_n, v_m
    from public.schueler_verschiebungen where id::text in (v_vA, v_vB);
  perform set_config('role', v_start, true);
  v_pr := v_pr || jsonb_build_object('name', 'P2 Buero sieht eigene Fahrschule, nicht die fremde', 'kat', 'pflicht', 'ok', v_n = 1 and v_m = 0, 'ist', v_n || '/' || v_m);

  v_schritt := 'P3 Buero schreibt';
  begin
    perform set_config('role', 'authenticated', true);
    update public.schueler_verschiebungen set verschoben_von = verschoben_von where id::text = v_vA;
    get diagnostics v_n = row_count;
    delete from public.schueler_verschiebungen where id::text = v_vA;
    get diagnostics v_m = row_count;
    perform set_config('role', v_start, true);
    raise exception using errcode = 'P0001', message = 'W20V_ZURUECK';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    perform set_config('role', v_start, true);
    if v_msg <> 'W20V_ZURUECK' then v_n := -1; v_m := -1; v_r := v_state || ' ' || v_msg; end if;
  end;
  -- Ein Fehler 42501 beim Aendern waere auch dicht; gezaehlt wird, dass KEINE Zeile geaendert/geloescht wurde
  v_pr := v_pr || jsonb_build_object('name', 'P3 Buero aendert/loescht keine Verschiebung', 'kat', 'pflicht',
            'ok', (v_n = 0 and v_m = 0) or v_r like '42501%', 'ist', coalesce(v_r, v_n || '/' || v_m));

  -- ---------- P4 andere Konten ----------
  for v_i in 2..5 loop
    if v_i = 3 then continue; end if;   -- F1 (Absender) nicht noetig
    v_schritt := 'P4 ' || v_kz[v_i];
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[v_i], 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ids[v_i]::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n from public.schueler_verschiebungen where id::text = v_vA;
    perform set_config('role', v_start, true);
    v_pr := v_pr || jsonb_build_object('name', 'P4 ' || v_kz[v_i] || case v_kz[v_i] when 'F3' then ' (unbeteiligt) sieht vA nicht' else ' sieht vA' end,
              'kat', 'pflicht', 'ok', case when v_kz[v_i] = 'F3' then v_n = 0 else v_n = 1 end, 'ist', v_n);
  end loop;

  -- ---------- P5 anon ----------
  v_schritt := 'P5 anon';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform set_config('role', 'anon', true);
    perform 1 from public.schueler_verschiebungen limit 0;
    v_state := 'erlaubt';
  exception when insufficient_privilege then v_state := '42501';
  end;
  perform set_config('role', v_start, true);
  v_pr := v_pr || jsonb_build_object('name', 'P5 anon liest nicht (42501)', 'kat', 'pflicht', 'ok', v_state = '42501', 'ist', v_state);

  raise exception 'W20V_ERGEBNIS %', jsonb_build_object('lauf', v_lauf,
    'alle_ok', not exists (select 1 from jsonb_array_elements(v_pr) x where not (x->>'ok')::boolean),
    'pflicht_fehler', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where not (x->>'ok')::boolean),
    'pruefungen', v_pr)::text;
exception
  when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_msg like 'W20V_ERGEBNIS %' or v_msg like 'W20V_ABBRUCH%' then raise exception '%', v_msg; end if;
    raise exception 'W20V_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher %', v_schritt, v_state, v_msg, v_pr::text;
end
$w20v$;
