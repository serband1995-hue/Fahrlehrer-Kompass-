-- =====================================================================================================================
-- W24 (Fahrlehrer-Kompass) – LIVE-PROBE nach der Migration 20261204_w24_01 (vollständige Sicherung + Wiederherstellung).
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausfuehren.
-- =====================================================================================================================
-- WIE AUSFUEHREN
--   GENAU EIN DO-Block (ein Aufruf), NACH dem Einspielen der Migration. Der Block endet IMMER mit einer Fehlermeldung
--   (RAISE EXCEPTION). Damit macht Postgres ALLES rueckgaengig (Test-Fahrschulen, Konten, Schüler, Termine, Belege,
--   Sicherungen, Wiederherstellungen, ausgeschaltete Auslöser). Es bleibt nichts in der Datenbank.
--       W24_ERGEBNIS {json}  = durchgelaufen: alle_ok, pflicht_fehler, zusatz_auffaellig, zaehlung, pruefungen[]
--       W24_ABBRUCH ...      = Vorpruefung hat gestoppt, BEVOR etwas geschrieben wurde
--       W24_FEHLER ...       = unerwarteter Fehler (mit Schritt, SQLSTATE); auch dann ist alles zurueckgerollt
-- AUSLOESER NACH AUSSEN: Schüler anlegen/löschen stößt trg_akademie_sync an (pg_net). pg_net-Aufträge stehen in einer Tabelle
--   und gehen erst nach COMMIT raus; der Block committet nie.
-- SPERREN: Das Wiederherstellen sperrt die Tabellen der Liste kurz gegen Schreiben (SHARE ROW EXCLUSIVE) bis zum Ende des
--   Blocks. Darum zu einer ruhigen Zeit ausführen (der ganze Block dauert wenige Sekunden).
-- ABLAUF (Fahrschulen „W24 Probe A/B“, Konten L1 Leitung A, B1 Büro A, F1 Fahrlehrer A, LB Leitung B, @example.invalid):
--   Rechte (Fahrlehrer/fremde Leitung/anon dürfen nicht, Büro sichert, Client-INSERT gesperrt) → Sicherung prüfen (alle Zeilen,
--   gelöschter Schüler, inaktives Fahrzeug, Papierkorb, Beleg, Handy-Stand, nichts von B) → Vorschau = nichts zu tun →
--   Daten „verlieren“ und ändern → Vorschau zählt richtig → falscher Code/Büro/fremde Leitung abgewiesen → Ergänzen → Komplett
--   (Stand = Backup, neuer Beleg bleibt, Zähler nie kleiner, Auslöser wieder an, B unverändert) → Handy-Stand nur auf Wunsch →
--   Rückgängig über die Sicherung „vor_wiederherstellung“ → Prüfsumme/gefälschtes Backup/altes Format abgewiesen → Aufräumen (30 Nacht, von Hand nie).
-- NICHT GETESTET: echtes gleichzeitiges Schreiben aus zwei Verbindungen (ein DO-Block = eine Verbindung); der Nachtlauf über
--   ALLE Fahrschulen (würde jede echte Fahrschule sichern) – geprüft wird w24_sichern(…,'nacht') und das Aufräumen für A.
-- =====================================================================================================================

do $w24p$
declare
  v_start  text := current_user;
  v_lauf   text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_fsa    uuid := gen_random_uuid();
  v_fsb    uuid := gen_random_uuid();
  v_l1     uuid := gen_random_uuid();
  v_b1     uuid := gen_random_uuid();
  v_f1     uuid := gen_random_uuid();
  v_lb     uuid := gen_random_uuid();
  v_s      text;
  v_bk     uuid;
  v_bk2    uuid;
  v_vorher uuid;
  v_falsch uuid;
  v_daten  jsonb;
  v_v      jsonb;
  v_r      jsonb;
  v_h0     jsonb;     -- Stand A (Art voll) direkt nach der Sicherung
  v_h1     jsonb;     -- Stand A (Art voll) vor „komplett“
  v_hb     jsonb;     -- Stand B (alle Tabellen der Liste)
  v_hx     jsonb;
  v_dis0   bigint;
  v_schritt text := 'Start';
  v_pr     jsonb := '[]';
  v_t      text;
  v_n      bigint;
  v_n2     bigint;
  v_state  text;
  v_msg    text;
  v_zaehl  jsonb;
  v_ergebnis jsonb;
begin
  -- ===================================================================================================================
  -- SCHRITT 0: Vorpruefung (nur lesen)
  -- ===================================================================================================================
  v_schritt := '0 Vorpruefung';
  if to_regprocedure('public.fahrschule_backup_wiederherstellen(uuid, text, text[], text)') is null
     or to_regprocedure('public.w24_sichern(uuid, text, uuid, jsonb)') is null then
    raise exception 'W24_ABBRUCH: Migration 20261204_w24_01 fehlt.';
  end if;
  -- Gehören alle Tabellen der Liste dem Eigentümer der Funktion? (sonst kann ALTER TABLE … DISABLE TRIGGER scheitern)
  select count(*) into v_n from public.w24_tabellen() t join pg_class c on c.oid = format('public.%I', t.tabelle)::regclass
   where not t.entdeckt and c.relowner <> (select proowner from pg_proc where oid = 'public.w24_sichern(uuid, text, uuid, jsonb)'::regprocedure);
  v_pr := v_pr || jsonb_build_object('name', 'Tabellen gehören dem Funktions-Eigentümer', 'kat', 'zusatz', 'ok', v_n = 0, 'ist', v_n);
  select count(*) into v_dis0 from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not tg.tgisinternal and tg.tgenabled = 'D';

  -- ===================================================================================================================
  -- Aufbau (als Server, ohne JWT)
  -- ===================================================================================================================
  v_schritt := '1 Aufbau';
  insert into public.fahrschulen (id, name, slug) values (v_fsa, 'W24 Probe A', 'w24-probe-a-' || v_lauf), (v_fsb, 'W24 Probe B', 'w24-probe-b-' || v_lauf);
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'w24-' || n || '-' || v_lauf || '@example.invalid', '', now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    from (values (v_l1, 'l1'), (v_b1, 'b1'), (v_f1, 'f1'), (v_lb, 'lb')) x(u, n);
  delete from public.profiles where id in (v_l1, v_b1, v_f1, v_lb);
  insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv)
  values (v_l1, 'w24-l1-' || v_lauf || '@example.invalid', 'W24 Leitung A', 'fahrschule_admin', v_fsa, true),
         (v_b1, 'w24-b1-' || v_lauf || '@example.invalid', 'W24 Buero A', 'buero', v_fsa, true),
         (v_f1, 'w24-f1-' || v_lauf || '@example.invalid', 'W24 Fahrlehrer A', 'fahrlehrer', v_fsa, true),
         (v_lb, 'w24-lb-' || v_lauf || '@example.invalid', 'W24 Leitung B', 'fahrschule_admin', v_fsb, true);
  v_s := 'w24p' || v_lauf;
  insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name)
  select v_s || g, v_fsa, v_f1, 'W24 Probe ' || g from generate_series(1, 4) g;
  update public.schueler set status = 'geloescht' where id = v_s || '4';
  insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values (v_s || 'b1', v_fsb, v_lb, 'W24 Probe B1');
  insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art, status, geloescht, payload)
  values (v_s || 'k1', v_fsa, v_f1, v_s || '1', current_date + 5, '08:00', '09:30', 'fahrstunde', 'geplant', false, '{"w24":1}'),
         (v_s || 'k2', v_fsa, v_f1, v_s || '2', current_date + 6, '10:00', '11:30', 'fahrstunde', 'geplant', false, '{"w24":2}'),
         (v_s || 'k3', v_fsa, v_f1, v_s || '2', current_date + 7, '12:00', '13:30', 'fahrstunde', 'geplant', false, '{"w24":3}'),
         (v_s || 'kb', v_fsb, v_lb, v_s || 'b1', current_date + 5, '08:00', '09:30', 'fahrstunde', 'geplant', false, '{"w24":"b"}');
  update public.kalender_termine set geloescht = true where id = v_s || 'k3';          -- Papierkorb
  insert into public.fahrschule_fahrzeuge (fahrschule_id, name, typ, aktiv)
  values (v_fsa, 'W24 Auto 1 ' || v_lauf, 'pkw', true), (v_fsa, 'W24 Auto 2 ' || v_lauf, 'pkw', false), (v_fsb, 'W24 Auto B ' || v_lauf, 'pkw', true);
  insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values (v_fsa, 'fristen.w24_probe', '{"w24":true}');
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
  values (v_fsa, v_s || '1', 'W24', current_date, 10, 'W24 Probe Beleg 1', 'ueberweisung');
  insert into public.snapshots (user_id, data) values (v_f1, '{"w24":"stand-1"}');

  -- ===================================================================================================================
  -- Rechte
  -- ===================================================================================================================
  v_schritt := '2 Rechte';
  perform set_config('request.jwt.claims', json_build_object('sub', v_f1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_f1::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.fahrschule_backup_erstellen(v_fsa, false); v_t := 'angenommen'; exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Fahrlehrer darf nicht sichern', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);

  perform set_config('request.jwt.claims', json_build_object('sub', v_lb, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_lb::text, true);
  begin perform public.fahrschule_backup_erstellen(v_fsa, false); v_t := 'angenommen'; exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Fremde Leitung darf A nicht sichern', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);

  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b1::text, true);
  begin
    insert into public.fahrschule_backups (fahrschule_id, automatisch, daten) values (v_fsa, false, '{}'::jsonb);
    v_t := 'angenommen';
  exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Büro kann kein Backup direkt einschleusen (INSERT)', 'kat', 'pflicht', 'ok', v_t <> 'angenommen', 'ist', v_t);
  v_bk := public.fahrschule_backup_erstellen(v_fsa, true);
  v_pr := v_pr || jsonb_build_object('name', 'Büro sichert eigene Fahrschule', 'kat', 'pflicht', 'ok', v_bk is not null);
  perform set_config('role', v_start, true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  v_pr := v_pr || jsonb_build_object('name', 'anon: keine Sicherungs-Funktionen', 'kat', 'pflicht', 'ok',
    not has_function_privilege('anon', 'public.fahrschule_backup_erstellen(uuid, boolean)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.fahrschule_backup_vorschau(uuid, text, text[])', 'EXECUTE')
    and not has_function_privilege('anon', 'public.fahrschule_backup_wiederherstellen(uuid, text, text[], text)', 'EXECUTE'));
  v_pr := v_pr || jsonb_build_object('name', 'Angemeldete: kein Nachtlauf/Aufräumen/interne Funktionen', 'kat', 'pflicht', 'ok',
    not has_function_privilege('authenticated', 'public.fahrschule_backups_nachtlauf()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.fahrschule_backups_aufraeumen(uuid)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.w24_sichern(uuid, text, uuid, jsonb)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.w24_vorschau(uuid, text, text[])', 'EXECUTE'));

  -- ===================================================================================================================
  -- Inhalt der Sicherung
  -- ===================================================================================================================
  v_schritt := '3 Inhalt';
  select daten, zaehlung into v_daten, v_zaehl from public.fahrschule_backups where id = v_bk;
  select jsonb_build_object('format', format, 'anlass', anlass, 'automatisch', automatisch, 'pruefsumme_ok', pruefsumme = md5(daten::text),
                            'groesse_ok', groesse_bytes = octet_length(daten::text), 'von', erstellt_von = v_b1)
    into v_r from public.fahrschule_backups where id = v_bk;
  v_pr := v_pr || jsonb_build_object('name', 'Format 2, von Hand, Prüfsumme und Größe stimmen', 'kat', 'pflicht',
    'ok', v_r = '{"format":2,"anlass":"hand","automatisch":false,"pruefsumme_ok":true,"groesse_ok":true,"von":true}'::jsonb, 'ist', v_r);
  select count(*) into v_n from jsonb_each(v_daten -> 'tabellen') e where (v_zaehl ->> e.key)::int is distinct from jsonb_array_length(e.value);
  v_pr := v_pr || jsonb_build_object('name', 'Zählung je Tabelle = Zeilen im Backup', 'kat', 'pflicht', 'ok', v_n = 0 and v_daten -> 'zaehlung' = v_zaehl, 'ist', v_n);
  -- Zählung = Zeilen der Fahrschule in der Datenbank (jede Tabelle der Liste)
  select count(*) into v_n from public.w24_tabellen() t
   where (v_zaehl ->> t.tabelle)::int is distinct from jsonb_array_length(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsa));
  v_pr := v_pr || jsonb_build_object('name', 'Zählung = Zeilen in der Datenbank (alle Tabellen)', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  select count(*) into v_n from public.w24_tabellen() t where not (v_daten -> 'tabellen') ? t.tabelle;
  v_pr := v_pr || jsonb_build_object('name', 'Jede Tabelle der Liste steht im Backup', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  v_r := jsonb_build_object(
    'schueler_mit_geloeschtem', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'schueler') x where x ->> 'id' like v_s || '_'),
    'geloeschter', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'schueler') x where x ->> 'id' = v_s || '4' and x ->> 'status' = 'geloescht'),
    'papierkorb', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'kalender_termine') x where x ->> 'id' = v_s || 'k3' and (x ->> 'geloescht')::boolean),
    'inaktives_auto', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'fahrschule_fahrzeuge') x where x ->> 'name' = 'W24 Auto 2 ' || v_lauf and not (x ->> 'aktiv')::boolean),
    'beleg', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'zahlungsbelege') x where x ->> 'zweck' = 'W24 Probe Beleg 1'),
    'einstellung', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'fahrschule_einstellungen') x where x ->> 'schluessel' = 'fristen.w24_probe'),
    'handy_stand', (select count(*) from jsonb_array_elements(v_daten -> 'tabellen' -> 'snapshots') x where (x ->> 'user_id')::uuid = v_f1));
  v_pr := v_pr || jsonb_build_object('name', 'Gesichert: gelöschter Schüler, Papierkorb, inaktives Fahrzeug, Beleg, Einstellung, Handy-Stand', 'kat', 'pflicht',
    'ok', v_r = '{"schueler_mit_geloeschtem":4,"geloeschter":1,"papierkorb":1,"inaktives_auto":1,"beleg":1,"einstellung":1,"handy_stand":1}'::jsonb, 'ist', v_r);
  select count(*) into v_n from jsonb_each(v_daten -> 'tabellen') e, jsonb_array_elements(e.value) x
   where x ->> 'fahrschule_id' = v_fsb::text or x ->> 'id' = v_s || 'b1' or x ->> 'schueler_id' = v_s || 'b1' or x ->> 'user_id' = v_lb::text;
  v_pr := v_pr || jsonb_build_object('name', 'Nichts von Fahrschule B im Backup von A', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  v_pr := v_pr || jsonb_build_object('name', 'Entdeckte Tabellen (nur gesichert, bitte in die Liste aufnehmen)', 'kat', 'zusatz',
    'ok', not exists (select 1 from public.w24_tabellen() where entdeckt), 'ist', (select jsonb_agg(tabelle) from public.w24_tabellen() where entdeckt));
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsa)) e))
    into v_h0 from public.w24_tabellen() t where t.art = 'voll' and not t.entdeckt;
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsb)) e))
    into v_hb from public.w24_tabellen() t where not t.entdeckt;

  -- ===================================================================================================================
  -- Vorschau direkt danach (Büro): nichts zu tun, Büro darf nicht wiederherstellen
  -- ===================================================================================================================
  v_schritt := '4 Vorschau leer';
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b1::text, true);
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'komplett', null);
  v_pr := v_pr || jsonb_build_object('name', 'Vorschau direkt danach: 0/0/0, wiederherstellbar, Büro darf nicht', 'kat', 'pflicht',
    'ok', (v_v ->> 'einfuegen')::int = 0 and (v_v ->> 'aendern')::int = 0 and (v_v ->> 'loeschen')::int = 0
          and (v_v ->> 'wiederherstellbar')::boolean and not (v_v ->> 'darf_wiederherstellen')::boolean and length(v_v ->> 'code') = 6,
    'ist', v_v - 'tabellen');
  perform set_config('role', v_start, true);

  -- ===================================================================================================================
  -- Daten „verlieren“ und ändern (als Server)
  -- ===================================================================================================================
  v_schritt := '5 Verlust';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.kalender_termine where id = v_s || 'k1';                           -- weg
  update public.kalender_termine set von = '14:00', bis = '15:30' where id = v_s || 'k2';   -- geändert
  insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art, status, geloescht, payload)
  values (v_s || 'k4', v_fsa, v_f1, v_s || '1', current_date + 8, '08:00', '09:30', 'fahrstunde', 'geplant', false, '{"w24":4}');   -- neu
  delete from public.schueler where id = v_s || '3';                                     -- endgültig weg
  delete from public.fahrschule_einstellungen where fahrschule_id = v_fsa and schluessel = 'fristen.w24_probe';
  update public.fahrschule_fahrzeuge set aktiv = true where fahrschule_id = v_fsa and name = 'W24 Auto 2 ' || v_lauf;
  insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart)
  values (v_fsa, v_s || '2', 'W24', current_date, 20, 'W24 Probe Beleg 2', 'ueberweisung');          -- Beleg NACH der Sicherung
  update public.snapshots set data = '{"w24":"stand-2"}' where user_id = v_f1;

  -- ===================================================================================================================
  -- Vorschau mit Verlust (Leitung)
  -- ===================================================================================================================
  v_schritt := '6 Vorschau';
  perform set_config('request.jwt.claims', json_build_object('sub', v_l1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_l1::text, true);
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'ergaenzen', null);
  v_r := (select jsonb_object_agg(x ->> 'tabelle', jsonb_build_array((x ->> 'einfuegen')::int, (x ->> 'aendern')::int, (x ->> 'loeschen')::int))
            from jsonb_array_elements(v_v -> 'tabellen') x where x ->> 'tabelle' in ('kalender_termine', 'schueler', 'fahrschule_einstellungen', 'fahrschule_fahrzeuge', 'zahlungsbelege', 'snapshots'));
  v_pr := v_pr || jsonb_build_object('name', 'Vorschau ergänzen: nur Fehlendes (Termin, Schüler, Einstellung)', 'kat', 'pflicht',
    'ok', (v_v ->> 'darf_wiederherstellen')::boolean and (v_v ->> 'aendern')::int = 0 and (v_v ->> 'loeschen')::int = 0
          and v_r -> 'kalender_termine' = '[1,0,0]' and v_r -> 'schueler' = '[1,0,0]' and v_r -> 'fahrschule_einstellungen' = '[1,0,0]'
          and v_r -> 'fahrschule_fahrzeuge' = '[0,0,0]' and v_r -> 'zahlungsbelege' = '[0,0,0]' and v_r -> 'snapshots' = '[0,0,0]',
    'ist', v_r);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'komplett', null);
  v_r := (select jsonb_object_agg(x ->> 'tabelle', jsonb_build_array((x ->> 'einfuegen')::int, (x ->> 'aendern')::int, (x ->> 'loeschen')::int))
            from jsonb_array_elements(v_v -> 'tabellen') x where x ->> 'tabelle' in ('kalender_termine', 'schueler', 'fahrschule_einstellungen', 'fahrschule_fahrzeuge', 'zahlungsbelege', 'snapshots'));
  v_pr := v_pr || jsonb_build_object('name', 'Vorschau komplett: Termin 1/1/1, Auto geändert, Beleg nie löschen, Handy-Stand nicht gewählt', 'kat', 'pflicht',
    'ok', v_r -> 'kalender_termine' = '[1,1,1]' and v_r -> 'schueler' = '[1,0,0]' and v_r -> 'fahrschule_fahrzeuge' = '[0,1,0]'
          and v_r -> 'zahlungsbelege' = '[0,0,0]' and v_r -> 'snapshots' = '[0,0,0]', 'ist', v_r);

  -- ===================================================================================================================
  -- Abweisen: falscher Code, Büro, fremde Leitung
  -- ===================================================================================================================
  v_schritt := '7 Abweisen';
  begin perform public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', null, 'FALSCH'); v_t := 'angenommen'; exception when others then v_t := sqlerrm; end;
  v_pr := v_pr || jsonb_build_object('name', 'Falscher Code: abgewiesen', 'kat', 'pflicht', 'ok', v_t like 'W24: Der Stand hat sich%', 'ist', v_t);
  begin perform public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', null, ''); v_t := 'angenommen'; exception when others then v_t := sqlerrm; end;
  v_pr := v_pr || jsonb_build_object('name', 'Ohne Code: abgewiesen', 'kat', 'pflicht', 'ok', v_t like 'W24: Bestätigung fehlt%', 'ist', v_t);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b1::text, true);
  begin perform public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', null, v_v ->> 'code'); v_t := 'angenommen'; exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Büro darf nicht wiederherstellen', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);
  perform set_config('request.jwt.claims', json_build_object('sub', v_lb, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_lb::text, true);
  begin perform public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', null, v_v ->> 'code'); v_t := 'angenommen'; exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Fremde Leitung darf A nicht wiederherstellen', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);
  begin perform public.fahrschule_backup_vorschau(v_bk, 'komplett', null); v_t := 'angenommen'; exception when others then v_t := sqlstate; end;
  v_pr := v_pr || jsonb_build_object('name', 'Fremde Leitung sieht keine Vorschau von A', 'kat', 'pflicht', 'ok', v_t = '42501', 'ist', v_t);

  -- ===================================================================================================================
  -- Ergänzen (Leitung)
  -- ===================================================================================================================
  v_schritt := '8 Ergaenzen';
  perform set_config('request.jwt.claims', json_build_object('sub', v_l1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_l1::text, true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'ergaenzen', null);
  v_r := public.fahrschule_backup_wiederherstellen(v_bk, 'ergaenzen', null, lower(v_v ->> 'code'));
  perform set_config('role', v_start, true);
  v_t := (select string_agg(id, ',' order by id) from public.kalender_termine where id like v_s || 'k%' and fahrschule_id = v_fsa);
  select count(*) into v_n from public.kalender_termine where id = v_s || 'k2' and von = '14:00';
  v_pr := v_pr || jsonb_build_object('name', 'Ergänzen: k1 + Schüler 3 + Einstellung zurück, k4 bleibt, k2 bleibt geändert', 'kat', 'pflicht',
    'ok', (v_r ->> 'ok')::boolean and v_t = v_s || 'k1,' || v_s || 'k2,' || v_s || 'k3,' || v_s || 'k4' and v_n = 1
          and exists (select 1 from public.schueler where id = v_s || '3' and fahrschule_id = v_fsa)
          and exists (select 1 from public.fahrschule_einstellungen where fahrschule_id = v_fsa and schluessel = 'fristen.w24_probe'),
    'ist', jsonb_build_object('termine', v_t, 'r', v_r));
  select count(*) into v_n from public.fahrschule_backups where id = (v_r ->> 'vorher_backup_id')::uuid and anlass = 'vor_wiederherstellung' and fahrschule_id = v_fsa;
  v_pr := v_pr || jsonb_build_object('name', 'Vorher-Sicherung angelegt (vor_wiederherstellung)', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);
  select count(*) into v_n from public.kalender_termine where id = v_s || 'k1' and payload = '{"w24":1}'::jsonb and von = '08:00' and not geloescht;
  v_pr := v_pr || jsonb_build_object('name', 'Zurückgeschriebene Zeile unverändert (Auslöser haben nichts verbogen)', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);

  -- ===================================================================================================================
  -- Komplett (Leitung)
  -- ===================================================================================================================
  v_schritt := '9 Komplett';
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsa)) e))
    into v_h1 from public.w24_tabellen() t where t.art = 'voll' and not t.entdeckt;
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'komplett', null);
  v_r := public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', null, v_v ->> 'code');
  v_vorher := (v_r ->> 'vorher_backup_id')::uuid;
  perform set_config('role', v_start, true);
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsa)) e))
    into v_hx from public.w24_tabellen() t where t.art = 'voll' and not t.entdeckt;
  v_pr := v_pr || jsonb_build_object('name', 'Komplett: jede Tabelle (Art voll) wieder genau wie im Backup', 'kat', 'pflicht',
    'ok', (v_r ->> 'ok')::boolean and v_hx = v_h0,
    'ist', (select jsonb_agg(k) from jsonb_object_keys(v_h0) k where v_h0 ->> k is distinct from v_hx ->> k));
  select count(*) into v_n from public.zahlungsbelege where fahrschule_id = v_fsa;
  select letzte into v_n2 from public.beleg_zaehler where fahrschule_id = v_fsa;
  v_pr := v_pr || jsonb_build_object('name', 'Beleg nach der Sicherung bleibt, Zähler nie kleiner', 'kat', 'pflicht', 'ok', v_n = 2 and v_n2 >= 2, 'ist', jsonb_build_array(v_n, v_n2));
  select count(*) into v_n from public.snapshots where user_id = v_f1 and data = '{"w24":"stand-2"}'::jsonb;
  v_pr := v_pr || jsonb_build_object('name', 'Handy-Stand ohne Auswahl nicht überschrieben', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);
  select count(*) into v_n from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not tg.tgisinternal and tg.tgenabled = 'D';
  v_pr := v_pr || jsonb_build_object('name', 'Alle Auslöser wieder an', 'kat', 'pflicht', 'ok', v_n = v_dis0, 'ist', v_n);
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsb)) e))
    into v_hx from public.w24_tabellen() t where not t.entdeckt;
  v_pr := v_pr || jsonb_build_object('name', 'Fahrschule B unverändert', 'kat', 'pflicht', 'ok', v_hx = v_hb,
    'ist', (select jsonb_agg(k) from jsonb_object_keys(v_hb) k where v_hb ->> k is distinct from v_hx ->> k));
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'komplett', null);
  perform set_config('role', v_start, true);
  v_pr := v_pr || jsonb_build_object('name', 'Vorschau danach: nichts mehr zu tun', 'kat', 'pflicht',
    'ok', (v_v ->> 'einfuegen')::int + (v_v ->> 'aendern')::int + (v_v ->> 'loeschen')::int = 0, 'ist', v_v - 'tabellen');

  -- ===================================================================================================================
  -- Handy-Stand nur auf Wunsch
  -- ===================================================================================================================
  v_schritt := '10 Handy-Stand';
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'ergaenzen', array['snapshots']);
  v_n := (select (x ->> 'aendern')::int from jsonb_array_elements(v_v -> 'tabellen') x where x ->> 'tabelle' = 'snapshots');
  v_pr := v_pr || jsonb_build_object('name', 'Handy-Stand: im Modus ergänzen nie ersetzt', 'kat', 'pflicht', 'ok', v_n = 0, 'ist', v_n);
  v_v := public.fahrschule_backup_vorschau(v_bk, 'komplett', array['snapshots']);
  v_r := public.fahrschule_backup_wiederherstellen(v_bk, 'komplett', array['snapshots'], v_v ->> 'code');
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.snapshots where user_id = v_f1 and data = '{"w24":"stand-1"}'::jsonb;
  v_pr := v_pr || jsonb_build_object('name', 'Handy-Stand auf ausdrücklichen Wunsch zurück', 'kat', 'pflicht', 'ok', v_n = 1 and (v_r ->> 'ok')::boolean, 'ist', v_r);

  -- ===================================================================================================================
  -- Rückgängig: Stand vor „komplett“ wiederherstellen
  -- ===================================================================================================================
  v_schritt := '11 Rueckgaengig';
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_vorher, 'komplett', null);
  v_r := public.fahrschule_backup_wiederherstellen(v_vorher, 'komplett', null, v_v ->> 'code');
  perform set_config('role', v_start, true);
  select jsonb_object_agg(t.tabelle, (select md5(coalesce(string_agg(e::text, ',' order by e::text), '')) from jsonb_array_elements(public.w24_zeilen(t.tabelle, t.bereich, t.spalte, v_fsa)) e))
    into v_hx from public.w24_tabellen() t where t.art = 'voll' and not t.entdeckt;
  v_pr := v_pr || jsonb_build_object('name', 'Rückgängig: Stand wie vor „komplett“', 'kat', 'pflicht', 'ok', (v_r ->> 'ok')::boolean and v_hx = v_h1,
    'ist', (select jsonb_agg(k) from jsonb_object_keys(v_h1) k where v_h1 ->> k is distinct from v_hx ->> k));

  -- ===================================================================================================================
  -- Abweisen: Prüfsumme, gefälschtes Backup, Konflikt, altes Format (als Server angelegt)
  -- ===================================================================================================================
  v_schritt := '12 Faelschung';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    update public.fahrschule_backups set daten = jsonb_set(daten, '{zaehlung,schueler}', '99') where id = v_bk;
    v_v := public.w24_vorschau(v_bk, 'komplett', null);
    raise exception 'W24_ZURUECK';
  exception when others then
    if sqlerrm <> 'W24_ZURUECK' then raise; end if;
  end;
  v_pr := v_pr || jsonb_build_object('name', 'Veränderte Sicherung (Prüfsumme) abgewiesen', 'kat', 'pflicht',
    'ok', v_v ->> 'grund' = 'pruefsumme' and not (v_v ->> 'wiederherstellbar')::boolean, 'ist', v_v);
  -- fremde Zeile (Fahrschule B) im Backup von A
  select daten into v_daten from public.fahrschule_backups where id = v_bk;
  v_daten := jsonb_set(v_daten, '{tabellen,kalender_termine}', (v_daten -> 'tabellen' -> 'kalender_termine')
             || jsonb_build_array((select to_jsonb(k) || jsonb_build_object('id', v_s || 'kx') from public.kalender_termine k where k.id = v_s || 'kb')));
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, pruefsumme)
  values (v_fsa, false, v_daten, 2, 'hand', md5(v_daten::text)) returning id into v_falsch;
  perform set_config('request.jwt.claims', json_build_object('sub', v_l1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_l1::text, true);
  perform set_config('role', 'authenticated', true);
  v_v := public.fahrschule_backup_vorschau(v_falsch, 'ergaenzen', null);
  begin perform public.fahrschule_backup_wiederherstellen(v_falsch, 'ergaenzen', null, v_v ->> 'code'); v_t := 'angenommen'; exception when others then v_t := sqlerrm; end;
  perform set_config('role', v_start, true);
  select count(*) into v_n from public.kalender_termine where id = v_s || 'kx';
  v_pr := v_pr || jsonb_build_object('name', 'Zeile einer fremden Fahrschule im Backup: abgewiesen, nichts geschrieben', 'kat', 'pflicht',
    'ok', v_v ->> 'grund' = 'ungueltige_zeilen' and v_t like 'W24: Diese Sicherung kann nicht%' and v_n = 0, 'ist', jsonb_build_object('grund', v_v ->> 'grund', 'fehler', v_t, 'n', v_n));
  -- gleicher Schlüssel wie eine Zeile von B (als A ausgegeben)
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select daten into v_daten from public.fahrschule_backups where id = v_bk;
  v_daten := jsonb_set(v_daten, '{tabellen,kalender_termine}', (v_daten -> 'tabellen' -> 'kalender_termine')
             || jsonb_build_array((select to_jsonb(k) || jsonb_build_object('fahrschule_id', v_fsa) from public.kalender_termine k where k.id = v_s || 'kb')));
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, pruefsumme)
  values (v_fsa, false, v_daten, 2, 'hand', md5(v_daten::text)) returning id into v_falsch;
  v_v := public.w24_vorschau(v_falsch, 'komplett', null);
  v_pr := v_pr || jsonb_build_object('name', 'Schlüssel einer fremden Zeile im Backup: Konflikt, nicht wiederherstellbar', 'kat', 'pflicht',
    'ok', v_v ->> 'grund' = 'konflikt' and not (v_v ->> 'wiederherstellbar')::boolean, 'ist', v_v - 'tabellen');
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten) values (v_fsa, false, '{"schueler":[]}') returning id into v_falsch;
  v_v := public.w24_vorschau(v_falsch, 'ergaenzen', null);
  v_pr := v_pr || jsonb_build_object('name', 'Altes Format (1): nicht wiederherstellbar', 'kat', 'pflicht', 'ok', v_v ->> 'grund' = 'altes_format', 'ist', v_v);

  -- ===================================================================================================================
  -- Nacht-Sicherung und Aufräumen (nur Fahrschule A)
  -- ===================================================================================================================
  v_schritt := '13 Aufraeumen';
  v_bk2 := public.w24_sichern(v_fsa, 'nacht');
  select count(*) into v_n from public.fahrschule_backups where id = v_bk2 and automatisch and anlass = 'nacht' and format = 2;
  v_pr := v_pr || jsonb_build_object('name', 'Nacht-Sicherung: automatisch, Format 2', 'kat', 'pflicht', 'ok', v_n = 1, 'ist', v_n);
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, erstellt_am)
  select v_fsa, true, '{}'::jsonb, 2, 'nacht', now() - (g || ' days')::interval from generate_series(3, 35) g;
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, erstellt_am)
  select v_fsa, false, '{}'::jsonb, 2, 'hand', now() - (g || ' days')::interval from generate_series(3, 27) g;
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, erstellt_am)
  select v_fsb, true, '{}'::jsonb, 2, 'nacht', now() - (g || ' days')::interval from generate_series(3, 35) g;
  v_n := public.fahrschule_backups_aufraeumen(v_fsa);
  select count(*) into v_n2 from public.fahrschule_backups where fahrschule_id = v_fsa and anlass = 'nacht';
  v_t := (select count(*) from public.fahrschule_backups where fahrschule_id = v_fsa and anlass = 'vor_wiederherstellung')::text
      || '/' || (select count(*) from public.fahrschule_backups where fahrschule_id = v_fsa and coalesce(anlass, 'hand') = 'hand')::text
      || '/' || (select count(*) from public.fahrschule_backups where fahrschule_id = v_fsb)::text;
  v_pr := v_pr || jsonb_build_object('name', 'Aufräumen: 30 Nacht-Sicherungen bleiben, von Hand und vor_wiederherstellung bleiben, B unberührt', 'kat', 'pflicht',
    'ok', v_n = 4 and v_n2 = 30 and v_t = '4/29/33', 'ist', jsonb_build_array(v_n, v_n2, v_t));

  perform set_config('role', v_start, true);
  v_ergebnis := jsonb_build_object(
    'lauf', v_lauf,
    'alle_ok', not exists (select 1 from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'pflicht_fehler', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'zusatz_auffaellig', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' <> 'pflicht' and not (x->>'ok')::boolean),
    'pruefungen_ok', (select count(*) from jsonb_array_elements(v_pr) x where (x->>'ok')::boolean),
    'pruefungen_gesamt', jsonb_array_length(v_pr),
    'zaehlung_backup_a', v_zaehl,
    'pruefungen', v_pr);
  raise exception 'W24_ERGEBNIS %', v_ergebnis::text;      -- IMMER: macht alles rueckgaengig

exception
  when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_msg like 'W24_ERGEBNIS %' or v_msg like 'W24_ABBRUCH%' then
      raise exception '%', v_msg;
    end if;
    raise exception 'W24_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher %', v_schritt, v_state, v_msg, v_pr::text;
end
$w24p$;
