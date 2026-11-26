-- =====================================================================================================================
-- W18 (Fahrlehrer-Kompass) – Teil 2: LIVE-PROBE "10 Fahrlehrer einer Fahrschule arbeiten sauber getrennt"
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausfuehren.
-- =====================================================================================================================
-- WIE AUSFUEHREN
--   Diese Datei besteht aus GENAU EINEM DO-Block (eine Anweisung, ein Aufruf, z. B. Supabase "execute_sql"). Vorher
--   w18-1-lesen.sql auswerten (dort sieht man die Auslöser und Regeln im Klartext).
--   Der Block endet IMMER mit einer Fehlermeldung (RAISE EXCEPTION). Damit macht Postgres ALLES rueckgaengig:
--   Fahrschulen, Anmelde-Konten, Profile, Schueler, Termine. Es bleibt nichts in der Datenbank.
--   Das Ergebnis steht IN der Fehlermeldung:
--       W18_ERGEBNIS {json}   = Probe ist durchgelaufen. Im json: alle_ok, pflicht_fehler, zusatz_auffaellig, pruefungen[].
--       W18_ABBRUCH ...       = Vorpruefung hat gestoppt, BEVOR irgendetwas geschrieben wurde (z. B. unbekannte Pflichtspalte,
--                               synchroner Aufruf nach aussen in einem Auslöser, fehlende Rechte der Datenbank-Rolle).
--       W18_FEHLER ...        = unerwarteter Fehler mitten in der Probe (mit Schritt, SQLSTATE, bisherigen Ergebnissen).
--                               Auch hier ist alles zurueckgerollt.
--   Ein anderer Text (z. B. Zeitueberschreitung) bedeutet: Ergebnis unbekannt, trotzdem ist nichts festgeschrieben,
--   solange die Verbindung nicht vor dem Fehler committet hat (das tut ein einzelner DO-Block nicht).
--
-- WAS DIE PROBE MACHT (alles mit E-Mails @example.invalid, Fahrschulen "W18 Probe Muster" / "W18 Probe Fremd")
--   1. Vorpruefung (nur lesen): Rechte der Rolle, Spalten/Pflichtspalten der vier Tabellen, Auslöser ohne synchronen
--      Aufruf nach aussen.
--   2. Aufbau wie die Edge Function admin-create-account (create_account): Konto in auth.users anlegen -> der Auslöser
--      handle_new_user legt sofort ein Standard-Profil an -> Profil LOESCHEN und mit Rolle/Fahrschule neu EINFUEGEN
--      (genau wie supabase/functions/admin-create-account/index.ts, weil profil_schutz Aenderungen von Rolle/Fahrschule
--      fuer normale Nutzer verbietet; die Datenbank-Rolle der Probe hat wie der Dienst-Schluessel BYPASSRLS).
--      10 Fahrlehrer (F01..F10: gemischte Klassen {B}, {B,BE}, {C,CE}; zwei "ohne App"; zwei mit gleichem Vornamen;
--      einer mit langem Umlaut-Namen), 1 Leitung die selbst faehrt (L11, faehrt_selbst), 1 Buero (B12) und ein 13. Konto
--      K13 NUR ueber handle_new_user (so entsteht ein selbst registriertes Konto: Fahrlehrer ohne Fahrschule).
--   3. Je Konto F01..L11..B12: als dieses Konto (role authenticated + JWT-Claims, wie PostgREST) einen Schueler und
--      einen Termin anlegen, wie es die App tut (gleiche Spalten wie index.html: schueler-/kalender_termine-Zeile).
--   4. Als jedes der 13 Konten Sichtbarkeit zaehlen (Schueler, Termine, Profile, Fahrschulen), fremde Zeilen lesen,
--      fremde Zeilen aendern/loeschen, Schueler/Termine fuer Kollegen oder fremde Fahrschule anlegen, sich selbst zur
--      Leitung/anderen Fahrschule machen (profil_schutz). Jeder Versuch, der ausnahmsweise klappt, wird sofort
--      verworfen (eigener Unterblock mit Rueckrollen), damit er die spaeteren Zahlen nicht verfaelscht.
--   5. Tabellen-Scan: als K13 jede Tabelle/Sicht mit fahrschule_id/fahrlehrer_id zaehlen (erwartet 0 sichtbare Zeilen); als
--      F01/L11/B12 zaehlen, ob Zeilen EINER ANDEREN Fahrschule sichtbar sind (erwartet keine). Nur Tabellennamen + Zahlen.
--
-- KATEGORIEN im Ergebnis
--   pflicht = Soll-Verhalten der Mandantentrennung; ein Abweichler macht alle_ok = false.
--   zusatz  = Beobachtung/Zusatzfund (z. B. "Fahrlehrer verschiebt eigene Zeile in andere Fahrschule": die RLS-Regel prueft
--             nur fahrlehrer_id; ob der Auslöser *_verschiebung_schutz das stoppt, zeigt erst diese Probe). Zaehlt nicht in alle_ok,
--             steht aber in zusatz_auffaellig.
--
-- NICHT GETESTET: Super-Admin (Betreiber); Supabase-Einstellung "Selbst-Registrierung erlaubt" (Dashboard); Edge Functions;
--   Funktionen mit security definer (siehe w18-1-lesen.sql, Abfrage 1d-2).
--
-- BELEGE, DASS NICHTS NACH AUSSEN DRINGT (aus dem Repo; Live-Stand zeigt w18-1-lesen.sql 1b-2..1b-5 und die Vorpruefung hier)
--   (1) pg_net: Der einzige Auslöser im Repo, der nach aussen ruft, ist trg_akademie_sync (AFTER INSERT/UPDATE/DELETE auf
--       public.schueler, je Anweisung -> akademie_sync_anstossen(), siehe supabase/schema/rechte-abzug.sql). Sein Quelltext
--       steht nicht im Repo; er nutzt nach der Namensgebung pg_net. net.http_post/net.http_get schreiben NUR eine Zeile in die
--       Warteschlangen-Tabelle net.http_request_queue. Der Hintergrund-Worker von pg_net liest nur FESTGESCHRIEBENE Zeilen;
--       bei Rollback verschwindet die Zeile, es geht keine Anfrage raus. Datenbank-Webhooks (supabase_functions.http_request)
--       sind ebenfalls pg_net. Die Probe prueft das live: Sie liest vorab den Quelltext JEDER Auslöser-Funktion auf
--       auth.users, profiles, fahrschulen, schueler, kalender_termine und meldet die pg_net-Nutzer (Feld info.pg_net_ausloeser).
--       Am Ende zaehlt sie die Zeilen in net.http_request_queue dieser Transaktion (info.pg_net_warteschlange_in_transaktion);
--       nach dem Rollback sind sie weg (gezaehlt wird vorher und nachher, gemeldet wird die Differenz).
--   (2) E-Mails: Verschickt werden sie nur von den Edge Functions (admin-create-account -> Resend; erinnerungs-mail und
--       zahlungs-mail ueber pg_cron/pg_net). Keine davon wird im Block aufgerufen. Das Anlegen in auth.users geht an der
--       Anmelde-Software (GoTrue) vorbei; sie bekommt davon nichts mit. Die Adressen @example.invalid sind ausserdem unzustellbar.
--   (3) Synchron nach aussen (dblink, Erweiterung http: extensions.http_get/http_post, untrusted Sprachen plpython/plperl):
--       Repo-Suche  grep -rniE "dblink|extensions\.http|http_get|http_post|pg_net|net\.http" supabase  ->  KEIN Treffer in
--       Migrationen und Edge Functions (nur der Auslöser-Name trg_akademie_sync in schema/rechte-abzug.sql und Kommentar zu pg_cron
--       in der Papierkorb-Migration). Live-Absicherung: Die Vorpruefung bricht mit W18_ABBRUCH ab, bevor etwas geschrieben
--       wird, wenn ein Auslöser auf den fuenf Tabellen so etwas im Quelltext hat. (Grenze: nur die Auslöser-Funktion selbst
--       wird durchsucht, nicht Funktionen, die sie weiter aufruft; w18-1-lesen.sql 1b-4 listet alle solchen Funktionen.)
--   (4) Weitere Wirkungen: NOTIFY wird erst beim Commit zugestellt; Realtime/logische Replikation sehen nur festgeschriebene
--       Transaktionen. Nur Sequenzen (nextval) werden nicht zurueckgedreht (unerheblich).
--
-- GRENZEN DER PROBE (ehrlich)
--   * Die Rechte der Datenbank-Rolle: Sie muss auth.users beschreiben, RLS umgehen (wie service_role) und "authenticated"
--     annehmen duerfen. Sonst W18_ABBRUCH mit Klartext.
--   * Spalten, die ich nur vermute (id-Typ text, telefon, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung,
--     erstellt_von, aktualisiert_am, art, von, bis, payload, schueler_id; profiles.klassen/ohne_app/faehrt_selbst): Die
--     Vorpruefung stellt Fehlendes und weitere Pflichtspalten ohne Vorgabewert fest und bricht mit W18_ABBRUCH + Spaltenliste ab.
--   * Das Einfuegen laeuft als einfacher INSERT (die App nutzt upsert/on conflict; dasselbe Einfuegen, nur ohne Konfliktzweig).
--   * Unbekannte Auslöser (z. B. termin_zahlung_sperre) koennen das Einfuegen verhindern: dann W18_FEHLER mit Meldung und Schritt.
-- =====================================================================================================================

do $w18$
declare
  -- ---- Ausgangslage -----------------------------------------------------------------------------------------------
  v_start    text := current_user;                                             -- urspruengliche Rolle, dahin geht es nach jedem Konto zurueck
  v_lauf     text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);  -- Kennung dieses Laufs (macht E-Mails eindeutig)
  v_fs       uuid := gen_random_uuid();                                        -- Test-Fahrschule "W18 Probe Muster"
  v_fs2      uuid := gen_random_uuid();                                        -- zweite Test-Fahrschule "W18 Probe Fremd" (Gegenstelle)
  v_ids      uuid[] := array(select gen_random_uuid() from generate_series(1, 13));
  v_kz       text[] := array['F01','F02','F03','F04','F05','F06','F07','F08','F09','F10','L11','B12','K13'];
  v_name     text[] := array['Anna Muster','Anna Beispiel','Jürgen-Österreicher Müllerßöhn Muster','Boris Probe','Clara Probe',
                             'Dieter Probe','Erika Probe','Franz Probe','Greta Probe','Hans Probe','Leitung Probe','Buero Probe','Ohne Fahrschule Probe'];
  v_klassen  text[] := array['B','B,BE','B,BE','C,CE','C,CE','B','B,BE','B','C,CE','B,BE'];   -- F01..F10
  v_ohne     boolean[] := array[false,false,false,false,true,true,false,false,false,false];     -- F05 und F06 "ohne App"
  v_mail     text[];
  v_sid      text[];                       -- Schueler-IDs (je Konto)
  v_tid      text[];                       -- Termin-IDs (je Konto)
  -- ---- Spalten, die die Probe benutzt (werden vorab gegen die Live-Tabellen geprueft) ---------------------------------
  c_fs  text[] := array['id','name','slug'];  -- slug: live NOT NULL + UNIQUE ohne Vorgabe (HS7, Live-Lauf 26.11.)
  c_au  text[] := array['instance_id','id','aud','role','email','encrypted_password','email_confirmed_at','raw_app_meta_data','raw_user_meta_data','created_at','updated_at'];
  c_pr  text[] := array['id','email','name','rolle','fahrschule_id','aktiv','ohne_app','klassen','faehrt_selbst'];
  c_sp  text[] := array['id','fahrschule_id','fahrlehrer_id','name','telefon','status','paket_id','hat_simulator','hat_theorie_app','bogen_ausgefuellt','ausbildung','erstellt_von','aktualisiert_am'];
  c_tm  text[] := array['id','fahrschule_id','fahrlehrer_id','schueler_id','art','datum','von','bis','status','geloescht','payload','erstellt_von','aktualisiert_am'];
  -- Vorlagen fuer die Einfuegungen (wie die App: fahrlehrer_id, fahrschule_id, Status, erstellt_von ...); %L setzt Werte sicher ein
  v_ins_s    text := 'insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, telefon, status, paket_id, hat_simulator, hat_theorie_app, bogen_ausgefuellt, ausbildung, erstellt_von, aktualisiert_am) '
                  || 'values (%L, %L, %L, %L, null, ''aktiv'', null, false, false, false, ''{}''::jsonb, %L, now())';
  v_ins_t    text := 'insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, art, datum, von, bis, status, geloescht, payload, erstellt_von, aktualisiert_am) '
                  || 'values (%L, %L, %L, %L, ''fahrstunde'', %L, ''09:00'', ''10:00'', ''geplant'', false, ''{}''::jsonb, %L, now())';
  -- ---- Arbeitsvariablen ------------------------------------------------------------------------------------------------
  v_schritt  text := 'Start';
  v_obs      jsonb[] := '{}';              -- Einzelbeobachtungen (je Konto und Pruefung)
  v_pr       jsonb := '[]';                -- zusammengefasste Pruefungen
  v_info     jsonb := '{}';                -- Zusatzinformationen
  v_scan     jsonb := '[]';                -- Tabellen-Scan (Treffer)
  v_fehlt    text;
  v_n        bigint;
  v_i        int;
  v_nb       int;                          -- "Nachbar" (Kollege), auf den Angriffe zielen
  v_wer      text;                         -- F = Fahrlehrer, L = Leitung, B = Buero, K = Konto ohne Fahrschule
  v_r        text;                         -- Ergebnis eines Versuchs
  v_state    text;
  v_msg      text;
  v_bfl_s    uuid;                         -- fahrlehrer_id fuer Schueler des Buero (leer, wenn die Spalte NULL erlaubt)
  v_bfl_t    uuid;                         -- dito fuer Termin
  v_b        boolean;
  v_j        jsonb;
  v_k13p     int;                          -- hat K13 ein Profil (durch handle_new_user)?
  v_tab_fs   text[];                       -- Tabellen/Sichten mit fahrschule_id
  v_tab_all  text[];                       -- Tabellen/Sichten mit fahrschule_id oder fahrlehrer_id
  v_t        text;
  v_ownS     text;
  v_ownT     text;
  v_nbS      text;
  v_nbT      text;
  rec        record;
  v_q        bigint;
  v_q0       bigint;                       -- pg_net-Warteschlange VOR dem Aufbau (Bestand anderer Vorgaenge)
  v_ergebnis jsonb;
begin
  -- Jeder unerwartete Fehler wird ganz unten (exception-Teil) zu W18_FEHLER mit Schritt; alles bleibt zurueckgerollt.

  -- ===================================================================================================================
  -- SCHRITT 0: Vorpruefung (nur lesen, schreibt nichts)
  -- ===================================================================================================================
  v_schritt := '0a Rechte der Datenbank-Rolle';
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)) then
    raise exception 'W18_ABBRUCH Die Datenbank-Rolle % umgeht RLS nicht (weder superuser noch BYPASSRLS). Das Neuanlegen der Profile (loeschen + einfuegen) wuerde stumm 0 Zeilen treffen. Probe nicht moeglich mit dieser Rolle.', current_user;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception 'W18_ABBRUCH Die Rolle authenticated gibt es nicht.';
  end if;
  if not (pg_has_role(current_user, 'authenticated', 'member') or exists (select 1 from pg_roles where rolname = current_user and rolsuper)) then
    raise exception 'W18_ABBRUCH Die Rolle % darf die Rolle authenticated nicht annehmen (set role).', current_user;
  end if;

  v_schritt := '0b Tabellen, Spalten, Pflichtspalten';
  for rec in
    select * from (values ('public.fahrschulen', c_fs), ('auth.users', c_au), ('public.profiles', c_pr),
                          ('public.schueler', c_sp), ('public.kalender_termine', c_tm)) as t(tab, cols)
  loop
    if to_regclass(rec.tab) is null then
      raise exception 'W18_ABBRUCH Tabelle % gibt es nicht.', rec.tab;
    end if;
    select string_agg(c, ', ') into v_fehlt
      from unnest(rec.cols) c
     where not exists (select 1 from pg_attribute pa where pa.attrelid = to_regclass(rec.tab) and pa.attname = c and pa.attnum > 0 and not pa.attisdropped);
    if v_fehlt is not null then
      raise exception 'W18_ABBRUCH In % fehlen die Spalten: %. Die Probe muss angepasst werden (nichts wurde geschrieben).', rec.tab, v_fehlt;
    end if;
    select string_agg(pa.attname, ', ') into v_fehlt
      from pg_attribute pa
     where pa.attrelid = to_regclass(rec.tab) and pa.attnum > 0 and not pa.attisdropped
       and pa.attnotnull and not pa.atthasdef and pa.attidentity = '' and pa.attgenerated = ''
       and pa.attname <> all (rec.cols);
    if v_fehlt is not null then
      raise exception 'W18_ABBRUCH In % gibt es Pflichtspalten ohne Vorgabewert, die die Probe nicht setzt: %. Die Probe muss angepasst werden (nichts wurde geschrieben).', rec.tab, v_fehlt;
    end if;
  end loop;
  -- Darf fahrlehrer_id leer sein? Das Buero legt Schueler/Termine ohne Fahrlehrer an ("noch nicht zugeordnet", wie die App).
  -- Falls die Spalte NOT NULL ist, bekommt das Buero-Beispiel stattdessen die Leitung als Fahrlehrer (Summen bleiben gleich).
  select not pa.attnotnull into strict v_b from pg_attribute pa where pa.attrelid = 'public.schueler'::regclass and pa.attname = 'fahrlehrer_id';
  v_bfl_s := case when v_b then null else v_ids[11] end;
  select not pa.attnotnull into strict v_b from pg_attribute pa where pa.attrelid = 'public.kalender_termine'::regclass and pa.attname = 'fahrlehrer_id';
  v_bfl_t := case when v_b then null else v_ids[11] end;
  v_info := v_info || jsonb_build_object('buero_beispiel_ohne_fahrlehrer', (v_bfl_s is null and v_bfl_t is null));

  v_schritt := '0c Auslöser ohne synchronen Aufruf nach aussen';
  select string_agg(distinct t.tgrelid::regclass::text || ' -> ' || pn.nspname || '.' || p.proname, ', ') into v_fehlt
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
   where not t.tgisinternal
     and t.tgrelid in (to_regclass('public.schueler'), to_regclass('public.kalender_termine'), to_regclass('public.profiles'),
                       to_regclass('public.fahrschulen'), to_regclass('auth.users'))
     and (regexp_replace(p.prosrc, 'net\.http_', 'NETHTTP_', 'gi') ~* '(dblink|extensions\.http|\mhttp_(get|post|put|patch|delete|head|request|header)\M|\mhttp\s*\()'
          or l.lanname in ('plpython3u', 'plpythonu', 'plperlu', 'pltclu'));
  if v_fehlt is not null then
    raise exception 'W18_ABBRUCH Ein Ausloeser ruft synchron nach aussen (dblink/http/untrusted Sprache) und wuerde bei der Probe wirklich senden: %. Nichts wurde geschrieben. Bitte melden.', v_fehlt;
  end if;
  select coalesce(jsonb_agg(distinct t.tgrelid::regclass::text || ' -> ' || pn.nspname || '.' || p.proname), '[]') into v_j
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
   where not t.tgisinternal
     and t.tgrelid in (to_regclass('public.schueler'), to_regclass('public.kalender_termine'), to_regclass('public.profiles'),
                       to_regclass('public.fahrschulen'), to_regclass('auth.users'))
     and (p.prosrc ~* 'net\.http_' or pn.nspname = 'supabase_functions');
  v_info := v_info || jsonb_build_object('pg_net_ausloeser', v_j,
                                         'rolle_start', v_start,
                                         'erweiterungen', (select coalesce(jsonb_agg(extname order by extname), '[]') from pg_extension where extname in ('pg_net', 'http', 'dblink', 'pg_cron')));

  begin
    if to_regclass('net.http_request_queue') is not null then execute 'select count(*) from net.http_request_queue' into v_q0; end if;
  exception when others then v_q0 := null;
  end;

  -- Hilfswerte
  v_mail := array(select case when i between 5 and 6
                               then 'ohne-app-' || v_lauf || '-' || lpad(i::text, 2, '0') || '@example.invalid'
                               else 'w18-' || v_lauf || '-' || lpad(i::text, 2, '0') || '@example.invalid' end
                  from generate_series(1, 13) i);
  v_sid := array(select 'w18-s-' || v_lauf || '-' || lpad(i::text, 2, '0') from generate_series(1, 13) i);
  v_tid := array(select 'w18-t-' || v_lauf || '-' || lpad(i::text, 2, '0') from generate_series(1, 13) i);
  select array_agg(c.relname::text order by c.relname) into v_tab_fs
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
     and exists (select 1 from pg_attribute pa where pa.attrelid = c.oid and pa.attname = 'fahrschule_id' and pa.attnum > 0 and not pa.attisdropped);
  -- K13 zaehlt ALLE Tabellen/Sichten in public (auch ohne fahrschule_id/fahrlehrer_id, z. B. snapshots, schueler_privat)
  select array_agg(c.relname::text order by c.relname) into v_tab_all
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm');

  -- ===================================================================================================================
  -- SCHRITT 1: Aufbau wie die Edge Function create_account (als Eigentuemer-Rolle, schreibt NUR eigene Test-Zeilen)
  -- ===================================================================================================================
  v_schritt := '1a Test-Fahrschulen';
  insert into public.fahrschulen (id, name, slug) values (v_fs, 'W18 Probe Muster', 'w18-probe-muster-' || v_lauf), (v_fs2, 'W18 Probe Fremd', 'w18-probe-fremd-' || v_lauf);

  for v_i in 1..13 loop
    v_schritt := '1b Konto ' || v_kz[v_i] || ' in auth.users';
    -- wie auth.admin.createUser({ email, password, email_confirm: true }); Passwort leer = Anmeldung unmoeglich
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_ids[v_i], 'authenticated', 'authenticated', v_mail[v_i], '', now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
  end loop;

  v_schritt := '1c Profile (loeschen + neu einfuegen wie create_account)';
  select count(*) into v_n from public.profiles where id = any (v_ids);
  v_info := v_info || jsonb_build_object('profile_durch_handle_new_user', v_n);   -- erwartet 13
  for v_i in 1..12 loop
    delete from public.profiles where id = v_ids[v_i];     -- wie  supa.from("profiles").delete().eq("id", ...)
    insert into public.profiles (id, email, name, rolle, fahrschule_id, aktiv, ohne_app, klassen, faehrt_selbst)
    values (v_ids[v_i], v_mail[v_i], v_name[v_i],
            case when v_i <= 10 then 'fahrlehrer' when v_i = 11 then 'fahrschule_admin' else 'buero' end,
            v_fs, true,
            case when v_i <= 10 then v_ohne[v_i] else false end,
            case when v_i <= 10 then string_to_array(v_klassen[v_i], ',') else case when v_i = 11 then array['B'] else '{}'::text[] end end,
            (v_i = 11));            -- faehrt_selbst nur bei der Leitung L11 (INSERT loest profil_schutz nicht aus; der Dienst setzt es genauso)
  end loop;
  -- K13 bleibt unberuehrt: nur das Profil, das handle_new_user angelegt hat
  select count(*) into v_k13p from public.profiles where id = v_ids[13];
  v_obs := v_obs || jsonb_build_object('k', 'k13_profil_durch_handle_new_user', 'wer', 'K', 'kat', 'zusatz', 'konto', 'K13', 'erw', '1', 'ist', v_k13p::text);
  select coalesce(rolle, '(leer)') || ' / Fahrschule ' || case when fahrschule_id is null then 'leer' else 'gesetzt' end into v_r
    from public.profiles where id = v_ids[13];
  v_obs := v_obs || jsonb_build_object('k', 'k13_profil_rolle_und_fahrschule', 'wer', 'K', 'kat', 'zusatz', 'konto', 'K13',
                                       'erw', 'fahrlehrer / Fahrschule leer', 'ist', coalesce(v_r, '(kein Profil)'));

  -- ===================================================================================================================
  -- SCHRITT 2: Je Konto Schueler + Termin anlegen, wie es die App tut (als dieses Konto: role authenticated + JWT)
  -- ===================================================================================================================
  for v_i in 1..12 loop
    v_schritt := '2 Anlegen als ' || v_kz[v_i];
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[v_i], 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ids[v_i]::text, true);
    execute format(v_ins_s, v_sid[v_i], v_fs, case when v_i <= 11 then v_ids[v_i] else v_bfl_s end, 'Schüler ' || v_i || ' Muster', v_ids[v_i]);
    execute format(v_ins_t, v_tid[v_i], v_fs, case when v_i <= 11 then v_ids[v_i] else v_bfl_t end, v_sid[v_i], current_date + 30 + v_i, v_ids[v_i]);
    perform set_config('role', v_start, true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
  end loop;

  -- ===================================================================================================================
  -- SCHRITT 3 + 4: Als jedes der 13 Konten lesen (Zaehlungen) und Angriffe versuchen
  -- ===================================================================================================================
  for v_i in 1..13 loop
    v_wer := case when v_i <= 10 then 'F' when v_i = 11 then 'L' when v_i = 12 then 'B' else 'K' end;
    v_nb  := case when v_i <= 10 then (v_i % 10) + 1 else 1 end;          -- Kollege: F01->F02 ... F10->F01; Leitung/Buero/K13 zielen auf F01
    v_ownS := v_sid[v_i]; v_ownT := v_tid[v_i]; v_nbS := v_sid[v_nb]; v_nbT := v_tid[v_nb];

    v_schritt := '3 Lesen als ' || v_kz[v_i];
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[v_i], 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ids[v_i]::text, true);

    -- 3a) Zaehlungen. Spalten e_f/e_l/e_b/e_k = Erwartung fuer Fahrlehrer / Leitung / Buero / Konto ohne Fahrschule.
    --     Test-Fahrschule hat 12 Schueler und 12 Termine (10 Fahrlehrer + Leitung + Buero). Die Zahlen "gesamt" gelten
    --     OHNE Filter: sie decken also auch Zeilen fremder Fahrschulen ab.
    for rec in
      select * from (values
        ('schueler_sichtbar_gesamt',        'pflicht', 'select count(*) from public.schueler',                                      '1',  '12', '12', '0'),
        ('schueler_eigene',                 'pflicht', format('select count(*) from public.schueler where fahrlehrer_id = %L', v_ids[v_i]), '1', case when v_bfl_s is null then '1' else '2' end, '0', '0'),
        ('termine_sichtbar_gesamt',         'pflicht', 'select count(*) from public.kalender_termine',                              '1',  '12', '12', '0'),
        ('termine_eigene',                  'pflicht', format('select count(*) from public.kalender_termine where fahrlehrer_id = %L', v_ids[v_i]), '1', case when v_bfl_t is null then '1' else '2' end, '0', '0'),
        ('profile_sichtbar_gesamt',         'pflicht', 'select count(*) from public.profiles',                                      '1',  '12', '12', v_k13p::text),
        ('fahrschulen_sichtbar_gesamt',     'pflicht', 'select count(*) from public.fahrschulen',                                   '1',  '1',  '1',  '0'),
        ('fremden_schueler_lesen',          'pflicht', format('select count(*) from public.schueler where id = %L', v_nbS),         '0',  '1',  '1',  '0'),
        ('fremden_termin_lesen',            'pflicht', format('select count(*) from public.kalender_termine where id = %L', v_nbT), '0',  '1',  '1',  '0'),
        ('fremdes_profil_lesen',            'pflicht', format('select count(*) from public.profiles where id = %L', v_ids[v_nb]),   '0',  '1',  '1',  '0'),
        ('fremde_profile_anderer_fahrschulen','pflicht', 'select count(*) from public.profiles where fahrschule_id is distinct from ' || quote_literal(v_fs::text) || '::uuid and id <> ' || quote_literal(v_ids[v_i]::text) || '::uuid', '0', '0', '0', '0'))
        as t(k, kat, stmt, e_f, e_l, e_b, e_k)
    loop
      execute rec.stmt into v_n;
      v_obs := v_obs || jsonb_build_object('k', rec.k, 'wer', v_wer, 'kat', rec.kat, 'konto', v_kz[v_i],
                 'erw', case v_wer when 'F' then rec.e_f when 'L' then rec.e_l when 'B' then rec.e_b else rec.e_k end, 'ist', v_n::text);
    end loop;

    -- 3b) Versuche. erw: 'blockiert' = Fehler durch RLS/profil_schutz; 'keine Wirkung' = 0 Zeilen oder Zugriff verweigert;
    --     'erlaubt' = hat geklappt (nur fuer Kontrollen). Ein gelungener Versuch wird sofort verworfen (Unterblock).
    v_schritt := '4 Versuche als ' || v_kz[v_i];
    for rec in
      select * from (values
        -- ---------- Fahrlehrer F01..F10 ----------
        ('F','pflicht','F legt Schueler fuer Kollegen an','blockiert',        format(v_ins_s, gen_random_uuid()::text, v_fs,  v_ids[v_nb], 'Versuch Muster', v_ids[v_i])),
        ('F','pflicht','F legt Schueler in fremder Fahrschule an','blockiert', format(v_ins_s, gen_random_uuid()::text, v_fs2, v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('F','pflicht','F legt Schueler ohne Fahrschule an','blockiert',       format(v_ins_s, gen_random_uuid()::text, null,   v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('F','pflicht','F legt Termin fuer Kollegen an','blockiert',           format(v_ins_t, gen_random_uuid()::text, v_fs,  v_ids[v_nb], v_ownS, current_date + 90, v_ids[v_i])),
        ('F','pflicht','F legt Termin in fremder Fahrschule an','blockiert',   format(v_ins_t, gen_random_uuid()::text, v_fs2, v_ids[v_i], v_ownS, current_date + 90, v_ids[v_i])),
        ('F','pflicht','F aendert Termin des Kollegen','keine Wirkung',        format('update public.kalender_termine set aktualisiert_am = now() where id = %L', v_nbT)),
        ('F','pflicht','F aendert Schueler des Kollegen','keine Wirkung',      format('update public.schueler set aktualisiert_am = now() where id = %L', v_nbS)),
        ('F','pflicht','F loescht Termin des Kollegen','keine Wirkung',        format('delete from public.kalender_termine where id = %L', v_nbT)),
        ('F','pflicht','F loescht Schueler des Kollegen','keine Wirkung',      format('delete from public.schueler where id = %L', v_nbS)),
        ('F','pflicht','F gibt eigenen Schueler an Kollegen ab','blockiert',   format('update public.schueler set fahrlehrer_id = %L where id = %L', v_ids[v_nb], v_ownS)),
        ('F','pflicht','F gibt eigenen Termin an Kollegen ab','blockiert',     format('update public.kalender_termine set fahrlehrer_id = %L where id = %L', v_ids[v_nb], v_ownT)),
        ('F','pflicht','F nimmt eigenem Schueler den Fahrlehrer','blockiert',  format('update public.schueler set fahrlehrer_id = null where id = %L', v_ownS)),
        ('F','pflicht','F aendert Profil des Kollegen','keine Wirkung',        format('update public.profiles set name = name where id = %L', v_ids[v_nb])),
        ('F','pflicht','F aendert eigenen Namen (Kontrolle)','erlaubt',        format('update public.profiles set name = name where id = %L', v_ids[v_i])),
        ('F','pflicht','F macht sich zur Leitung (rolle)','blockiert',         format('update public.profiles set rolle = ''fahrschule_admin'' where id = %L', v_ids[v_i])),
        ('F','pflicht','F macht sich zum Super-Admin (rolle)','blockiert',      format('update public.profiles set rolle = ''super_admin'' where id = %L', v_ids[v_i])),
        ('F','pflicht','F wechselt die Fahrschule (fahrschule_id)','blockiert', format('update public.profiles set fahrschule_id = %L where id = %L', v_fs2, v_ids[v_i])),
        ('F','pflicht','F setzt faehrt_selbst','blockiert',                    format('update public.profiles set faehrt_selbst = true where id = %L', v_ids[v_i])),
        ('F','pflicht','F aendert eigene Klassen','blockiert',                 format('update public.profiles set klassen = ''{D}''::text[] where id = %L', v_ids[v_i])),
        ('F','pflicht','F aendert eigene E-Mail','blockiert',                  format('update public.profiles set email = ''x@example.invalid'' where id = %L', v_ids[v_i])),
        ('F','pflicht','F aendert eigenes aktiv','blockiert',                  format('update public.profiles set aktiv = not aktiv where id = %L', v_ids[v_i])),
        ('F','pflicht','F aendert ohne_app','blockiert',                       format('update public.profiles set ohne_app = not ohne_app where id = %L', v_ids[v_i])),
        ('F','pflicht','F benennt die Fahrschule um','keine Wirkung',          format('update public.fahrschulen set name = name where id = %L', v_fs)),
        ('F','zusatz', 'F verschiebt eigenen Schueler in andere Fahrschule','blockiert', format('update public.schueler set fahrschule_id = %L where id = %L', v_fs2, v_ownS)),
        ('F','zusatz', 'F verschiebt eigenen Termin in andere Fahrschule','blockiert',   format('update public.kalender_termine set fahrschule_id = %L where id = %L', v_fs2, v_ownT)),
        -- ---------- Leitung L11 (faehrt selbst) ----------
        ('L','pflicht','L legt Schueler in fremder Fahrschule an','blockiert', format(v_ins_s, gen_random_uuid()::text, v_fs2, v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('L','pflicht','L verschiebt Schueler eines Fahrlehrers in fremde Fahrschule','blockiert', format('update public.schueler set fahrschule_id = %L where id = %L', v_fs2, v_nbS)),
        ('L','pflicht','L verschiebt Termin eines Fahrlehrers in fremde Fahrschule','blockiert',   format('update public.kalender_termine set fahrschule_id = %L where id = %L', v_fs2, v_nbT)),
        ('L','pflicht','L aendert Rolle eines Fahrlehrers','blockiert',        format('update public.profiles set rolle = ''fahrschule_admin'' where id = %L', v_ids[v_nb])),
        ('L','pflicht','L schiebt Fahrlehrer in fremde Fahrschule','blockiert', format('update public.profiles set fahrschule_id = %L where id = %L', v_fs2, v_ids[v_nb])),
        ('L','pflicht','L macht sich zum Super-Admin','blockiert',             format('update public.profiles set rolle = ''super_admin'' where id = %L', v_ids[v_i])),
        ('L','pflicht','L benennt die Fahrschule um','keine Wirkung',          format('update public.fahrschulen set name = name where id = %L', v_fs)),
        -- ---------- Buero B12 ----------
        ('B','pflicht','B legt Schueler in fremder Fahrschule an','blockiert', format(v_ins_s, gen_random_uuid()::text, v_fs2, null, 'Versuch Muster', v_ids[v_i])),
        ('B','pflicht','B verschiebt Schueler in fremde Fahrschule','blockiert', format('update public.schueler set fahrschule_id = %L where id = %L', v_fs2, v_nbS)),
        ('B','pflicht','B verschiebt Termin in fremde Fahrschule','blockiert', format('update public.kalender_termine set fahrschule_id = %L where id = %L', v_fs2, v_nbT)),
        ('B','pflicht','B loescht Schueler endgueltig','keine Wirkung',        format('delete from public.schueler where id = %L', v_nbS)),
        ('B','pflicht','B loescht Termin endgueltig','keine Wirkung',          format('delete from public.kalender_termine where id = %L', v_nbT)),
        ('B','pflicht','B macht sich zur Leitung','blockiert',                 format('update public.profiles set rolle = ''fahrschule_admin'' where id = %L', v_ids[v_i])),
        ('B','zusatz', 'B aendert Profil eines Fahrlehrers','keine Wirkung',   format('update public.profiles set name = name where id = %L', v_ids[v_nb])),
        ('B','pflicht','B benennt die Fahrschule um','keine Wirkung',          format('update public.fahrschulen set name = name where id = %L', v_fs)),
        -- ---------- Konto ohne Fahrschule K13 ----------
        ('K','pflicht','K legt Schueler in der Test-Fahrschule an','blockiert', format(v_ins_s, gen_random_uuid()::text, v_fs,  v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('K','pflicht','K legt Schueler mit fremder Fahrschule an','blockiert', format(v_ins_s, gen_random_uuid()::text, v_fs2, v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('K','pflicht','K legt Schueler ohne Fahrschule an','blockiert',        format(v_ins_s, gen_random_uuid()::text, null,   v_ids[v_i], 'Versuch Muster', v_ids[v_i])),
        ('K','pflicht','K legt Termin in der Test-Fahrschule an','blockiert',   format(v_ins_t, gen_random_uuid()::text, v_fs,  v_ids[v_i], null, current_date + 90, v_ids[v_i])),
        ('K','pflicht','K legt Termin ohne Fahrschule an','blockiert',          format(v_ins_t, gen_random_uuid()::text, null,   v_ids[v_i], null, current_date + 90, v_ids[v_i])),
        ('K','pflicht','K aendert Schueler der Fahrschule','keine Wirkung',     format('update public.schueler set aktualisiert_am = now() where id = %L', v_nbS)),
        ('K','pflicht','K aendert Termin der Fahrschule','keine Wirkung',       format('update public.kalender_termine set aktualisiert_am = now() where id = %L', v_nbT)),
        ('K','pflicht','K setzt sich in die Test-Fahrschule (fahrschule_id)','blockiert', format('update public.profiles set fahrschule_id = %L where id = %L', v_fs, v_ids[v_i])),
        ('K','pflicht','K macht sich zur Leitung','blockiert',                  format('update public.profiles set rolle = ''fahrschule_admin'' where id = %L', v_ids[v_i])),
        ('K','pflicht','K macht sich zum Super-Admin','blockiert',              format('update public.profiles set rolle = ''super_admin'' where id = %L', v_ids[v_i])),
        ('K','pflicht','K benennt die Fahrschule um','keine Wirkung',           format('update public.fahrschulen set name = name where id = %L', v_fs))
      ) as t(wer, kat, k, erw, stmt)
      where t.wer = v_wer
    loop
      v_r := null; v_n := 0; v_state := null; v_msg := null;
      begin
        execute rec.stmt;
        get diagnostics v_n = row_count;
        v_r := case when v_n > 0 then 'erlaubt' else 'keine Wirkung' end;
        raise exception 'W18_ZURUECK';       -- jede gelungene Aenderung sofort verwerfen (Unterblock wird zurueckgerollt)
      exception when others then
        get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
        if v_msg = 'W18_ZURUECK' then
          null;                              -- v_r bleibt 'erlaubt' oder 'keine Wirkung'
        elsif v_state = '42501'
              or (v_state = 'P0001' and (v_msg like '%nur vom Super-Admin%' or v_msg like '%nur das Büro mit Verwalten-Recht%'
                                 -- Auslöser schueler_/termin_verschiebung_schutz (Migration 20261122_k6_01), bewusst nur diese Texte, nicht jedes P0001:
                                 or v_msg like '%dürfen Schüler verschieben%' or v_msg like '%einem anderen Fahrlehrer zuordnen%')) then
          v_r := 'blockiert';
        else
          v_r := 'Fehler ' || v_state;       -- nicht erwartete Art (z. B. fehlende Spalte): zaehlt als Abweichung
        end if;
      end;
      -- "keine Wirkung" ist auch erfuellt, wenn der Zugriff ganz verweigert wird (permission denied / RLS)
      if rec.erw = 'keine Wirkung' and v_r = 'blockiert' then v_r := 'keine Wirkung'; end if;
      v_obs := v_obs || jsonb_build_object('k', rec.k, 'wer', v_wer, 'kat', rec.kat, 'konto', v_kz[v_i], 'erw', rec.erw, 'ist', v_r);
    end loop;

    perform set_config('role', v_start, true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
  end loop;

  -- ===================================================================================================================
  -- SCHRITT 5: Tabellen-Scan (nur Namen + Zahlen). K13: jede Tabelle/Sicht mit fahrschule_id/fahrlehrer_id, sichtbare Zeilen
  --            (erwartet 0). F01/L11/B12: Zeilen einer ANDEREN Fahrschule (fahrschule_id nicht leer und <> Test-Fahrschule).
  --            Beobachtung (zusatz): Treffer koennen gewollt sein (gemeinsame Inhalte); die Namen stehen im Ergebnis.
  -- ===================================================================================================================
  foreach v_i in array array[13, 1, 11, 12] loop
    v_schritt := '5 Tabellen-Scan als ' || v_kz[v_i];
    v_wer := case when v_i = 13 then 'K' when v_i = 11 then 'L' when v_i = 12 then 'B' else 'F' end;
    v_n := 0;
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[v_i], 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_ids[v_i]::text, true);
    foreach v_t in array coalesce(case when v_i = 13 then v_tab_all else v_tab_fs end, '{}'::text[]) loop
      v_q := null;
      begin
        if v_i = 13 and v_t = 'profiles' then
          execute format('select count(*) from public.%I where id <> %L', v_t, v_ids[13]) into v_q;   -- das eigene Profil von K13 zaehlt nicht
        elsif v_i = 13 then
          execute format('select count(*) from public.%I', v_t) into v_q;
        else
          execute format('select count(*) from public.%I where fahrschule_id is not null and fahrschule_id::text <> %L', v_t, v_fs::text) into v_q;
        end if;
      exception when others then
        v_q := null;                         -- kein Zugriff / nicht lesbar = nichts sichtbar
      end;
      if coalesce(v_q, 0) > 0 then
        v_n := v_n + 1;
        v_scan := v_scan || jsonb_build_object('konto', v_kz[v_i], 'tabelle', v_t, 'sichtbare_zeilen', v_q);
      end if;
    end loop;
    perform set_config('role', v_start, true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    v_obs := v_obs || jsonb_build_object('k', case when v_i = 13 then 'scan_sichtbare_tabellen_ohne_fahrschule' else 'scan_tabellen_mit_fremden_fahrschulen' end,
                                         'wer', v_wer, 'kat', 'zusatz', 'konto', v_kz[v_i], 'erw', '0', 'ist', v_n::text);
  end loop;

  -- ===================================================================================================================
  -- SCHRITT 6: pg_net-Warteschlange dieser Transaktion (nur Information; nach dem Rollback ist sie weg)
  -- ===================================================================================================================
  v_schritt := '6 pg_net-Warteschlange';
  begin
    if to_regclass('net.http_request_queue') is not null then
      execute 'select count(*) from net.http_request_queue' into v_q;
      -- Differenz nachher - vorher = von dieser Probe neu eingestellte Anfragen (verschwinden mit dem Rollback)
      v_info := v_info || jsonb_build_object('pg_net_warteschlange_vorher', v_q0, 'pg_net_warteschlange_nachher', v_q,
                                             'pg_net_warteschlange_in_transaktion', v_q - coalesce(v_q0, 0));
    else
      v_info := v_info || jsonb_build_object('pg_net_warteschlange_in_transaktion', 'Tabelle net.http_request_queue nicht vorhanden');
    end if;
  exception when others then
    v_info := v_info || jsonb_build_object('pg_net_warteschlange_in_transaktion', 'nicht lesbar');
  end;

  -- ===================================================================================================================
  -- SCHRITT 7: Zusammenfassen (je Pruefung + Rolle eine Zeile; bei Abweichung steht in "ist" die Liste Konto: Wert)
  -- ===================================================================================================================
  v_schritt := '7 Zusammenfassung';
  select coalesce(jsonb_agg(q.x order by q.x->>'name'), '[]') into v_pr
  from (
    select jsonb_build_object(
             'name', o.k || ' [' || o.wer || ']',
             'kat', o.kat,
             'konten', count(*),
             'erwartet', min(o.erw),
             'ist', case when count(*) filter (where o.ist is distinct from o.erw) = 0 then to_jsonb(min(o.erw))
                         else jsonb_agg(o.konto || ': ' || o.ist) filter (where o.ist is distinct from o.erw) end,
             'ok', (count(*) filter (where o.ist is distinct from o.erw) = 0)) as x
    from (select e->>'k' as k, e->>'wer' as wer, e->>'kat' as kat, e->>'konto' as konto, e->>'erw' as erw, e->>'ist' as ist from unnest(v_obs) e) o
    group by o.k, o.wer, o.kat
  ) q;

  v_ergebnis := jsonb_build_object(
    'lauf', v_lauf,
    'konten', 13,
    'alle_ok', not exists (select 1 from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'pflicht_anzahl', (select count(*) from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht'),
    'pflicht_fehler', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' = 'pflicht' and not (x->>'ok')::boolean),
    'zusatz_auffaellig', (select coalesce(jsonb_agg(x->>'name'), '[]') from jsonb_array_elements(v_pr) x where x->>'kat' <> 'pflicht' and not (x->>'ok')::boolean),
    'info', v_info,
    'tabellen_scan_treffer', v_scan);
  -- Ergebnis klein halten: volle Liste nur, wenn sie hoechstens ca. 6 KB gross ist, sonst nur die abweichenden Pruefungen
  if length((v_ergebnis || jsonb_build_object('pruefungen', v_pr))::text) <= 6000 then
    v_ergebnis := v_ergebnis || jsonb_build_object('pruefungen', v_pr, 'pruefungen_gekuerzt', false);
  else
    v_ergebnis := v_ergebnis || jsonb_build_object('pruefungen_gekuerzt', true, 'pruefungen_ok_anzahl', (select count(*) from jsonb_array_elements(v_pr) x where (x->>'ok')::boolean),
                    'pruefungen', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements(v_pr) x where not (x->>'ok')::boolean));
  end if;
  raise exception 'W18_ERGEBNIS %', v_ergebnis::text;      -- IMMER: macht alles rueckgaengig, das Ergebnis steht in der Meldung

exception
  when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_msg like 'W18_ERGEBNIS %' or v_msg like 'W18_ABBRUCH%' then
      raise exception '%', v_msg;                           -- eigene Meldungen unveraendert weiterreichen
    end if;
    raise exception 'W18_FEHLER Schritt "%" SQLSTATE % Meldung: % | bisher % Beobachtungen', v_schritt, v_state, v_msg, coalesce(array_length(v_obs, 1), 0);
end
$w18$;
