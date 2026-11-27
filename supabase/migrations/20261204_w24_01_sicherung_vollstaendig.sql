-- =====================================================================================================================
-- W24 (27.11.2026) · P1.2 der Gesamtanalyse: vollständige Sicherung je Fahrschule + sichere Wiederherstellung + Nachtlauf.
-- Projekt: oectrvkjunntzsggyhxv (Kompass). NIE im Akademie-Projekt ausführen. Idempotent (create or replace / if not exists).
-- Rückweg: supabase/rueckweg/20261204_w24_01_rueckweg.sql   Probe: scripts/sql/w24-probe.sql
--
-- VORHER (k1_04): Sicherung = nur schueler (ohne gelöschte), kalender_termine/kalender_pruefungen (ohne Papierkorb),
--   fahrschule_fahrzeuge (nur aktive). Keine Wiederherstellung.
-- JETZT:
-- 1. Sicherung Format 2: ALLE Zeilen der Fahrschule (auch gelöschte Schüler, inaktive Fahrzeuge, Papierkorb) aus einer festen,
--    geordneten Tabellenliste (w24_tabellen_liste). Zusätzlich sichert sie von selbst jede weitere Tabelle in public mit Spalte
--    fahrschule_id oder schueler_id, die (noch) nicht in der Liste steht („entdeckt“, nur gesichert, nie zurückgeschrieben).
--    So geht auch eine künftig neue Tabelle nicht verloren. Im Backup: format, zaehlung je Tabelle, arten je Tabelle,
--    Größe (Bytes) und Prüfsumme (md5) – auch als eigene Spalten, damit die Liste ohne die großen Daten lädt.
--    Handy-Stände (snapshots, eine Zeile je Konto der Fahrschule) gehören HINEIN: Sie sind der Cloud-Speicher der App
--    (index.html lädt/speichert dort den ganzen Stand des Fahrlehrers); ohne sie wäre die Sicherung nicht vollständig.
--    Zurückgeschrieben werden sie nur auf ausdrücklichen Wunsch (Art „auf_wunsch“, nur Modus komplett und nur, wenn die
--    Tabelle ausdrücklich gewählt ist), weil ein Handy-Stand nur als Ganzes ersetzt werden kann.
-- 2. Rechte wie heute: Sichern = Super-Admin (jede Fahrschule), Leitung und Büro (nur eigene Fahrschule), aktives Konto.
--    Vorschau = dieselben. WIEDERHERSTELLEN = nur Leitung (eigene Fahrschule) und Super-Admin. Ohne Nutzer (Server,
--    Nachtlauf) wie bisher erlaubt. Client-INSERT auf fahrschule_backups wird entfernt (sonst könnte man ein gefälschtes
--    Backup einschleusen); geschrieben wird nur noch über die Funktionen (security definer).
-- 3. Wiederherstellen nie still:
--    a) fahrschule_backup_vorschau(id, modus, tabellen) zählt je Tabelle: im Backup, jetzt, wird eingefügt/geändert/gelöscht,
--       Konflikte und ungültige Zeilen, und gibt einen Bestätigungs-Code (6 Zeichen) zurück. Der Code hängt am Backup, am
--       Modus, an der Tabellenauswahl und am JETZIGEN Stand jeder Tabelle (Prüfsumme). Ändert sich etwas, passt er nicht mehr.
--    b) fahrschule_backup_wiederherstellen(id, modus, tabellen, code) – nur mit passendem Code. Sperrt die Tabellen gegen
--       gleichzeitiges Schreiben, rechnet die Vorschau neu, legt ZUERST eine Sicherung des jetzigen Stands an
--       (anlass „vor_wiederherstellung“), schreibt dann zurück und prüft am Ende nach (Vorschau danach = nichts mehr zu tun).
--       Jeder Fehler = alles zurück (eine Transaktion), es bleibt nie ein halber Stand.
--    Modus „ergaenzen“ (Vorgabe): nur fehlende Zeilen wieder einfügen, nichts ändern, nichts löschen (versehentlich Gelöschtes).
--    Modus „komplett“: Stand wie im Backup (einfügen, ändern, löschen) – ausgenommen Belege, Punkte, Mail- und
--    Änderungs-Protokolle (Art „anhaengen“: nur fehlende einfügen, nie ändern/löschen; aufbewahrungspflichtig) und der
--    Beleg-Zähler (Art „zaehler“: nie kleiner, sonst würden Belegnummern doppelt vergeben).
--    FEST (nie geändert/gelöscht, auch nicht „komplett“): Nachweis-Stunden (gelaufen/unterschrieben, termin_ist_nachweis) und
--    Termine mit Storno-Vermerk; fehlen sie, werden sie ergänzt; die Vorschau zählt sie als „bleibt_fest“.
--    Während des Zurückschreibens sind genau die AKTIVEN Nutzer-Auslöser der beschriebenen Tabellen einzeln aus (ALTER TABLE …
--    DISABLE TRIGGER <name>; von Hand ausgeschaltete bleiben aus). Grund: Auslöser würden zurückgeschriebene Zeilen verändern
--    (Bearbeiter, FC-Haken, Papierkorb-Zeit, Belegnummer) oder sperren (Belege fest, Zahlungssperre).
--    Warum das für andere Sitzungen sicher ist: (1) Die Tabellen sind vorher mit LOCK … SHARE ROW EXCLUSIVE gesperrt; App und
--    Büro WARTEN beim Schreiben (lesen geht weiter), lock_timeout 15 s, dann Abbruch der Rücksicherung ohne Änderung.
--    (2) Die Änderung an den Auslösern ist Teil derselben Transaktion: andere Sitzungen sehen sie nie (sie sehen den Katalog erst
--    nach COMMIT, und dann sind die Auslöser schon wieder an). (3) Jeder Fehler = ROLLBACK, auch der DDL – die Auslöser sind
--    danach im alten Zustand. Kein session_replication_role (für postgres nicht setzbar).
--    Fremdschlüssel bleiben aktiv; die zwischen beschriebenen Tabellen (nicht RESTRICT) werden nur in dieser Transaktion
--    aufgeschoben und am Ende geprüft (set constraints all immediate), danach wieder wie vorher.
-- 4. Nachtlauf: Es gab schon einen täglichen Auftrag (02:00 UTC, Name „woechentliches-fahrschule-backup“, behielt 30 automatische,
--    manuelle nie gelöscht). Er wird ehrlich ersetzt durch „kompass-sicherung-nacht“ (gleiche Zeit, vor papierkorb_leeren um
--    03:17 UTC): fahrschule_backups_nachtlauf() sichert jede aktive Fahrschule (Fehler einer Fahrschule stoppt die anderen
--    nicht) und räumt mit fahrschule_backups_aufraeumen() auf. Aufbewahrung je Fahrschule: die neuesten 30 Nacht-Sicherungen
--    (wie bisher; ~0,7 MB je Sicherung bei der größten Fahrschule inkl. Handy-Stände, also ~21 MB), von Hand nie löschen (wie
--    bisher), „vor_wiederherstellung“ mindestens 90 Tage und immer die neuesten 5. Nichts unter 2 Tagen wird gelöscht.
--    Die Plattform-Sicherung (Tarif pro, 7 Tage) setzt nur die GANZE Datenbank zurück; darum diese Sicherung je Fahrschule.
--    Alle Sicherungen liegen in derselben Datenbank: Kopie außerhalb = „Herunterladen“ im Büro.
-- 5. Inhalt bewusst: Bankdaten der Fahrschule (fahrschule_zahlungsdaten) gehören hinein (Geschäftsdaten, stehen auf Belegen).
--    Büro-Personen nur zum Nachschlagen und OHNE PIN-Hash (w24_ohne_spalten). Nie hinein: Büro-Sitzungen (Anmelde-Token),
--    alte Handy-Kopien (snapshot_backups), private Trinkgelder der Fahrlehrer (trinkgeld_privat), Push-Anmeldungen.
--    Online-Buchungen (public_bookings) und LeadConnector-Zuordnungen gehören über den Fahrlehrer zur Fahrschule: nur gesichert.
--    Tabellen ohne Fahrschul-Bezug (theorie_*, quiz_*, lc_eingang) gehören nicht in die Fahrschul-Sicherung.
-- NICHT IN DER SICHERUNG: Dateien im Speicher (Storage, z. B. Theorie-Folien/Bilder) – nur ihre Tabellenzeilen;
--   Anmeldekonten (auth.users). Profile werden nur gesichert (Namen/Rollen zum Nachschlagen), nie zurückgeschrieben.
-- =====================================================================================================================

-- ===== 1. Spalten an fahrschule_backups =====
alter table public.fahrschule_backups add column if not exists format integer not null default 1;
alter table public.fahrschule_backups add column if not exists anlass text;
alter table public.fahrschule_backups add column if not exists zaehlung jsonb;
alter table public.fahrschule_backups add column if not exists arten jsonb;
alter table public.fahrschule_backups add column if not exists groesse_bytes bigint;
alter table public.fahrschule_backups add column if not exists pruefsumme text;
alter table public.fahrschule_backups add column if not exists erstellt_von uuid;
alter table public.fahrschule_backups add column if not exists hinweis jsonb;
alter table public.fahrschule_backups drop constraint if exists fahrschule_backups_anlass;
alter table public.fahrschule_backups add constraint fahrschule_backups_anlass
  check (anlass is null or anlass in ('nacht', 'hand', 'vor_wiederherstellung'));
create index if not exists fahrschule_backups_fs_zeit on public.fahrschule_backups (fahrschule_id, erstellt_am desc);

-- Altbestand (Format 1) nachtragen: Anlass, Zählung, Größe. Die Daten selbst bleiben unverändert.
update public.fahrschule_backups b
   set anlass = case when b.automatisch then 'nacht' else 'hand' end,
       zaehlung = (select jsonb_object_agg(e.k, jsonb_array_length(e.v)) from jsonb_each(b.daten) e(k, v) where jsonb_typeof(e.v) = 'array'),
       groesse_bytes = octet_length(b.daten::text)
 where b.format = 1 and b.anlass is null;

-- Client-INSERT entfernen (Sicherungen entstehen nur noch über die Funktionen). Lesen bleibt wie bisher.
drop policy if exists "Fahrschule-Admin/Buero erstellt eigene Backups" on public.fahrschule_backups;

-- Geschützter Teil einer Sicherung: Tabellen, die Büro und Leitung direkt NICHT lesen dürfen (Handy-Stände der Fahrlehrer,
-- private Angaben der Schüler; rechte-abzug.sql: nur Besitzer/zugeordneter Fahrlehrer und Super-Admin). Sonst könnte man sie
-- über „Herunterladen“ lesen (Fehlersucher Daten W24, Muss 1). Lesen: nur Super-Admin; schreiben nur die Funktionen.
create table if not exists public.fahrschule_backups_privat (
  backup_id uuid primary key references public.fahrschule_backups(id) on delete cascade,
  daten jsonb not null
);
alter table public.fahrschule_backups_privat enable row level security;
revoke all on public.fahrschule_backups_privat from anon, authenticated;
grant select on public.fahrschule_backups_privat to authenticated;
drop policy if exists "Super Admin liest geschuetzte Backup-Teile" on public.fahrschule_backups_privat;
create policy "Super Admin liest geschuetzte Backup-Teile" on public.fahrschule_backups_privat for select to authenticated
  using (public.is_super_admin(auth.uid()));

-- ===== 2. Tabellenliste (Reihenfolge = Einfüge-Reihenfolge; gelöscht wird rückwärts) =====
-- bereich: fs = Spalte ist die Fahrschul-ID · id = Zeile IST die Fahrschule · schueler = Spalte ist eine Schüler-ID der
--          Fahrschule · profil = Spalte ist ein Konto (profiles.id) der Fahrschule
-- art:     voll · anhaengen · zaehler · nur_sichern · auf_wunsch (siehe Kopf)
-- Fehlt eine Tabelle in der Datenbank, wird sie übersprungen.
create or replace function public.w24_tabellen_liste()
 returns table(reihe integer, tabelle text, bereich text, spalte text, art text)
 language sql immutable set search_path to 'public'
as $function$
  values
    (10,  'fahrschulen',                 'id',       'id',            'nur_sichern'),
    (12,  'profiles',                    'fs',       'fahrschule_id', 'nur_sichern'),
    (20,  'fahrschule_einstellungen',    'fs',       'fahrschule_id', 'voll'),
    (22,  'fahrschule_zahlungsdaten',    'fs',       'fahrschule_id', 'voll'),
    (24,  'beleg_zaehler',               'fs',       'fahrschule_id', 'zaehler'),
    (26,  'fahrschule_fahrzeuge',        'fs',       'fahrschule_id', 'voll'),
    (28,  'fahrschule_pakete',           'fs',       'fahrschule_id', 'voll'),
    (30,  'fahrschule_preise',           'fs',       'fahrschule_id', 'voll'),
    (32,  'fahrschule_pruefer',          'fs',       'fahrschule_id', 'voll'),
    (34,  'fahrschule_pruefer_notizen',  'fs',       'fahrschule_id', 'voll'),
    (36,  'fahrschule_tafelbilder',      'fs',       'fahrschule_id', 'voll'),
    (40,  'fahrschule_urlaub',           'fs',       'fahrschule_id', 'voll'),
    (42,  'fahrschule_schichten',        'fs',       'fahrschule_id', 'voll'),
    (44,  'buero_personen',              'fs',       'fahrschule_id', 'nur_sichern'),
    (46,  'theorie_freigabe',            'fs',       'fahrschule_id', 'voll'),
    (50,  'schueler',                    'fs',       'fahrschule_id', 'voll'),
    (52,  'schueler_privat',             'schueler', 'schueler_id',   'voll'),
    (54,  'schueler_eltern',             'fs',       'fahrschule_id', 'voll'),
    (56,  'schueler_notizen',            'fs',       'fahrschule_id', 'voll'),
    (57,  'schueler_notiz_gelesen',      'notiz',    'notiz_id',      'voll'),
    (58,  'schueler_aufgaben',           'fs',       'fahrschule_id', 'voll'),
    (60,  'schueler_pakete',             'fs',       'fahrschule_id', 'voll'),
    (62,  'schueler_verschiebungen',     'fs',       'fahrschule_id', 'voll'),
    (64,  'schueler_punkte',             'fs',       'fahrschule_id', 'anhaengen'),
    (66,  'provisionen',                 'fs',       'fahrschule_id', 'voll'),
    (68,  'fahrschule_empfehlungen',     'fs',       'fahrschule_id', 'voll'),
    (69,  'theorie_teilnahme',           'fs',       'fahrschule_id', 'voll'),
    (70,  'pruefungstage',               'fs',       'fahrschule_id', 'voll'),
    (72,  'kalender_termine',            'fs',       'fahrschule_id', 'voll'),
    (74,  'pruefungstermine',            'fs',       'fahrschule_id', 'voll'),
    (76,  'kalender_pruefungen',         'fs',       'fahrschule_id', 'voll'),
    (78,  'fc_abgaben',                  'fs',       'fahrschule_id', 'voll'),
    (82,  'fahrzeug_konflikt_gesehen',   'fs',       'fahrschule_id', 'voll'),
    (84,  'zahlungsbelege',              'fs',       'fahrschule_id', 'anhaengen'),
    (86,  'zahlungs_mails',              'fs',       'fahrschule_id', 'anhaengen'),
    (88,  'erinnerungs_mails',           'fs',       'fahrschule_id', 'anhaengen'),
    (90,  'aenderungsprotokoll',         'fs',       'fahrschule_id', 'anhaengen'),
    (92,  'public_bookings',             'profil',   'fahrlehrer_id', 'nur_sichern'),
    (94,  'lc_zuordnung',                'profil',   'fahrlehrer_id', 'nur_sichern'),
    (98,  'snapshots',                   'profil',   'user_id',       'auf_wunsch')
$function$;

-- Tabellen, die NIE in eine Sicherung gehören (die Sicherungen selbst).
create or replace function public.w24_ausgenommen()
 returns text[] language sql immutable set search_path to 'public'
as $function$ select array['fahrschule_backups', 'buero_sitzungen', 'snapshot_backups', 'trinkgeld_privat', 'push_subscriptions']::text[] $function$;

-- Tabellen, die in den geschützten Teil (fahrschule_backups_privat) kommen.
create or replace function public.w24_privat_tabellen()
 returns text[] language sql immutable set search_path to 'public'
as $function$ select array['snapshots', 'schueler_privat']::text[] $function$;

-- Spalten, die NIE in eine Sicherung gehören (Anmeldedaten). Fehlen sie im Backup, bleiben sie beim Zurückschreiben unberührt.
create or replace function public.w24_ohne_spalten(p_tabelle text)
 returns text[] language sql immutable set search_path to 'public'
as $function$ select case p_tabelle when 'buero_personen' then array['pin_hash']::text[] else '{}'::text[] end $function$;

-- Wirksame Liste: feste Liste (nur vorhandene Tabellen MIT der erwarteten Spalte) + entdeckte Tabellen (nur sichern).
-- Fehlt einer Tabelle der Liste die Spalte (Schema geändert), scheitert die Sicherung nicht: die Tabelle wird dann „entdeckt“.
-- Entdeckt wird nur mit passendem Spaltentyp (fahrschule_id uuid, schueler_id text/uuid); scheitert eine Tabelle trotzdem,
-- steht sie im Backup als „fehler“ (w24_sichern), die übrigen werden gesichert.
create or replace function public.w24_tabellen()
 returns table(reihe integer, tabelle text, bereich text, spalte text, art text, entdeckt boolean)
 language sql stable set search_path to 'public'
as $function$
  with liste as (
    select l.* from public.w24_tabellen_liste() l
     where exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     join pg_attribute a on a.attrelid = c.oid and a.attname = l.spalte and a.attnum > 0 and not a.attisdropped
                    where n.nspname = 'public' and c.relname = l.tabelle and c.relkind in ('r', 'p')))
  select l.reihe, l.tabelle, l.bereich, l.spalte, l.art, false from liste l
  union all
  select (900 + row_number() over (order by d.relname))::integer, d.relname::text,
         case when d.hat_fs then 'fs' else 'schueler' end,
         case when d.hat_fs then 'fahrschule_id' else 'schueler_id' end,
         'nur_sichern', true
    from (select c.relname, bool_or(a.attname = 'fahrschule_id') as hat_fs
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
           where n.nspname = 'public' and c.relkind in ('r', 'p')
             and ((a.attname = 'fahrschule_id' and a.atttypid = 'uuid'::regtype)
               or (a.attname = 'schueler_id' and a.atttypid in ('text'::regtype, 'uuid'::regtype, 'varchar'::regtype)))
           group by c.relname) d
   where d.relname::text not in (select l2.tabelle from liste l2)
     and d.relname::text <> all (public.w24_ausgenommen())
$function$;

-- WHERE-Teil „Zeile gehört zur Fahrschule $1“ (Alias z). Nur aus festen Werten gebaut (keine Nutzereingabe).
-- notiz = Spalte ist eine Notiz (schueler_notizen.id) der Fahrschule.
create or replace function public.w24_bereich_sql(p_bereich text, p_spalte text, p_alias text default 'z')
 returns text language plpgsql immutable set search_path to 'public'
as $function$
begin
  return case p_bereich
    when 'fs'       then format('%I.%I = $1', p_alias, p_spalte)
    when 'id'       then format('%I.%I = $1', p_alias, p_spalte)
    when 'schueler' then format('%I.%I::text in (select s.id::text from public.schueler s where s.fahrschule_id = $1)', p_alias, p_spalte)
    when 'profil'   then format('%I.%I in (select p.id from public.profiles p where p.fahrschule_id = $1)', p_alias, p_spalte)
    when 'notiz'    then format('%I.%I in (select n.id from public.schueler_notizen n where n.fahrschule_id = $1)', p_alias, p_spalte)
  end;
end;
$function$;

-- Nur die genannten Spalten eines JSON-Objekts (für den Vergleich alt/neu).
create or replace function public.w24_teil(j jsonb, cols text[])
 returns jsonb language sql immutable set search_path to 'public'
as $function$ select coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(j) e where e.key = any(cols)), '{}'::jsonb) $function$;

-- WHERE-Teil „Zeile ist fest“ (Alias): eine Rücksicherung ändert oder löscht sie NIE, auch im Modus komplett (Kassen- und
-- Nachweis-Regeln dürfen nicht über die Rücksicherung umgangen werden). Fehlt sie, wird sie ergänzt; Abweichungen zeigt die
-- Vorschau als „fest“. Belege, Punkte, Mails, Protokoll sind ohnehin nur „anhaengen“.
-- kalender_termine: Storno-Vermerk oder Nachweis-Stunde (gelaufen/unterschrieben, termin_ist_nachweis aus k7_01).
create or replace function public.w24_fest_sql(p_tabelle text, p_alias text default 'z')
 returns text language plpgsql stable set search_path to 'public'
as $function$
begin
  if p_tabelle = 'kalender_termine' then
    if to_regprocedure('public.termin_ist_nachweis(public.kalender_termine)') is not null then
      return format('(coalesce(jsonb_typeof(%1$I.payload -> ''storno'') = ''object'', false) or coalesce(public.termin_ist_nachweis(%1$I), false))', p_alias);
    end if;
    return format('coalesce(jsonb_typeof(%1$I.payload -> ''storno'') = ''object'', false)', p_alias);
  end if;
  return 'false';
end;
$function$;

-- Alle Zeilen einer Tabelle für die Fahrschule als JSON-Liste.
create or replace function public.w24_zeilen(p_tabelle text, p_bereich text, p_spalte text, p_fs uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare r jsonb;
begin
  execute format('select coalesce(jsonb_agg(to_jsonb(z) - $2), ''[]''::jsonb) from public.%I z where %s',
                 p_tabelle, public.w24_bereich_sql(p_bereich, p_spalte))
    into r using p_fs, public.w24_ohne_spalten(p_tabelle);
  return r;
end;
$function$;

-- ===== 3. Sichern (intern, ohne Rechteprüfung – nur aus den Funktionen unten) =====
create or replace function public.w24_sichern(p_fs uuid, p_anlass text, p_von uuid default null, p_hinweis jsonb default null)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  t record;
  v_rows jsonb;
  v_tab jsonb := '{}'::jsonb;
  v_privat jsonb := '{}'::jsonb;
  v_zaehl jsonb := '{}'::jsonb;
  v_arten jsonb := '{}'::jsonb;
  v_fehler jsonb := '{}'::jsonb;
  v_payload jsonb;
  v_id uuid;
begin
  if p_anlass not in ('nacht', 'hand', 'vor_wiederherstellung') then raise exception 'W24: unbekannter Anlass %', p_anlass; end if;
  if not exists (select 1 from public.fahrschulen f where f.id = p_fs) then
    raise exception 'Fahrschule nicht gefunden' using errcode = 'P0002';
  end if;
  for t in select * from public.w24_tabellen() order by reihe loop
    begin
      v_rows := public.w24_zeilen(t.tabelle, t.bereich, t.spalte, p_fs);
    exception when others then
      -- eine kaputte Tabelle stoppt die Sicherung nicht; sie steht als „fehler“ drin (sichtbar in arten/hinweis)
      v_fehler := v_fehler || jsonb_build_object(t.tabelle, sqlerrm);
      v_arten := v_arten || jsonb_build_object(t.tabelle, 'fehler');
      continue;
    end;
    if t.tabelle = any(public.w24_privat_tabellen()) then
      v_privat := v_privat || jsonb_build_object(t.tabelle, v_rows);
    else
      v_tab := v_tab || jsonb_build_object(t.tabelle, v_rows);
    end if;
    v_zaehl := v_zaehl || jsonb_build_object(t.tabelle, jsonb_array_length(v_rows));
    v_arten := v_arten || jsonb_build_object(t.tabelle, case when t.entdeckt then 'entdeckt' else t.art end);
  end loop;
  v_payload := jsonb_build_object('format', 2, 'fahrschule_id', p_fs, 'erstellt_am', now(), 'anlass', p_anlass,
                                  'zaehlung', v_zaehl, 'arten', v_arten, 'tabellen', v_tab,
                                  'geschuetzt', to_jsonb(array(select jsonb_object_keys(v_privat))));
  if v_fehler <> '{}'::jsonb then v_payload := v_payload || jsonb_build_object('fehler', v_fehler); end if;
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten, format, anlass, zaehlung, arten, groesse_bytes, pruefsumme, erstellt_von, hinweis)
  values (p_fs, p_anlass = 'nacht', v_payload, 2, p_anlass, v_zaehl, v_arten, octet_length(v_payload::text) + octet_length(v_privat::text),
          md5(v_payload::text || '|' || v_privat::text), p_von,
          case when v_fehler <> '{}'::jsonb then coalesce(p_hinweis, '{}'::jsonb) || jsonb_build_object('fehler', v_fehler) else p_hinweis end)
  returning id into v_id;
  insert into public.fahrschule_backups_privat (backup_id, daten) values (v_id, v_privat);
  return v_id;
end;
$function$;

-- Alle Tabellen einer Sicherung (offener + geschützter Teil) und ob die Prüfsumme stimmt. Intern.
create or replace function public.w24_backup_inhalt(p_backup uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'tabellen', coalesce(b.daten -> 'tabellen', '{}'::jsonb) || coalesce(p.daten, '{}'::jsonb),
    'pruefsumme_ok', b.pruefsumme is not null
       and b.pruefsumme in (md5(b.daten::text || '|' || coalesce(p.daten, '{}'::jsonb)::text), case when p.backup_id is null then md5(b.daten::text) end))
  from public.fahrschule_backups b left join public.fahrschule_backups_privat p on p.backup_id = b.id
  where b.id = p_backup
$function$;

-- Rechte: 'sichern' (Super-Admin; Leitung/Büro eigene Fahrschule) oder 'wiederherstellen' (Super-Admin; Leitung eigene).
-- Ohne Nutzer (Server-Schlüssel, Nachtlauf, SQL-Konsole) = erlaubt, wie bisher in k1_04.
create or replace function public.w24_darf(p_fs uuid, p_stufe text)
 returns boolean language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_rolle text := coalesce(auth.role(), '');
begin
  if v_uid is null and v_rolle not in ('authenticated', 'anon') then return true; end if;
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.aktiv = true) then return false; end if;
  if public.is_super_admin(v_uid) then return true; end if;
  if p_fs is distinct from public.my_fahrschule_id() then return false; end if;
  if p_stufe = 'wiederherstellen' then return public.is_fahrschule_admin(v_uid); end if;
  return public.is_fahrschule_admin(v_uid) or public.is_buero(v_uid);
end;
$function$;

-- Öffentlich (gleicher Name und gleiche Parameter wie bisher; App und Büro rufen sie so auf).
create or replace function public.fahrschule_backup_erstellen(fs_id uuid, ist_automatisch boolean default true)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_mit_nutzer boolean := auth.uid() is not null or coalesce(auth.role(), '') in ('authenticated', 'anon');
begin
  if not public.w24_darf(fs_id, 'sichern') then
    raise exception 'Keine Berechtigung für diese Sicherung' using errcode = '42501';
  end if;
  -- Mit Nutzer zählt eine Sicherung immer als „von Hand“ (wie k1_04).
  return public.w24_sichern(fs_id, case when not v_mit_nutzer and coalesce(ist_automatisch, true) then 'nacht' else 'hand' end, v_uid);
end;
$function$;

-- ===== 4. Vergleich und Vorschau =====
-- Vergleicht die Backup-Zeilen einer Tabelle mit dem jetzigen Stand der Fahrschule.
-- fehlt = im Backup, in der Tabelle (überhaupt) nicht vorhanden · anders = vorhanden, aber andere Werte
-- zuviel = jetzt da, im Backup nicht · konflikt = Schlüssel gibt es, aber bei einer ANDEREN Fahrschule
-- ungueltig = Backup-Zeile gehört nicht zu dieser Fahrschule · stand = Prüfsumme des jetzigen Stands
create or replace function public.w24_vergleich(p_tabelle text, p_bereich text, p_spalte text, p_fs uuid, p_rows jsonb, p_schueler_ids text[])
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_rel regclass := format('public.%I', p_tabelle)::regclass;
  v_pk text[];
  v_cols text[];
  v_on text;
  v_scope_z text := public.w24_bereich_sql(p_bereich, p_spalte, 'z');
  v_scope_b text := public.w24_bereich_sql(p_bereich, p_spalte, 'b');
  v_gueltig text;
  v_fest text := public.w24_fest_sql(p_tabelle, 'z');
  r jsonb;
begin
  select array_agg(a.attname::text order by k.ord) into v_pk
    from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum, ord)
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
   where i.indrelid = v_rel and i.indisprimary;
  select array_agg(a.attname::text order by a.attnum) into v_cols
    from pg_attribute a
   where a.attrelid = v_rel and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
     and a.attname::text <> all (public.w24_ohne_spalten(p_tabelle))
     and (jsonb_array_length(coalesce(p_rows, '[]')) = 0 or (p_rows -> 0) ? a.attname::text);
  if v_pk is null then
    execute format('select jsonb_build_object(''im_backup'', jsonb_array_length($2), ''jetzt'', (select count(*) from public.%I z where %s), ''ohne_schluessel'', true)',
                   p_tabelle, v_scope_z) into r using p_fs, p_rows;
    return r;
  end if;
  select string_agg(format('z.%I = b.%I', c, c), ' and ') into v_on from unnest(v_pk) c;
  -- Gültig: Fahrschul-Spalte = diese Fahrschule; Schüler-Spalte = Schüler dieser Fahrschule (jetzt oder im Backup);
  -- Konto-Spalte = Konto dieser Fahrschule.
  v_gueltig := case p_bereich
    when 'schueler' then format('(''s:'' || b.%1$I::text = any($3) or %2$s)', p_spalte, v_scope_b)
    when 'notiz'    then format('(''n:'' || b.%1$I::text = any($3) or %2$s)', p_spalte, v_scope_b)
    else v_scope_b end;
  execute format($q$
    with b as (select * from jsonb_populate_recordset(null::public.%1$I, $2)),
         j as (select * from public.%1$I z where %2$s)
    select jsonb_build_object(
      'im_backup', (select count(*) from b),
      'jetzt',     (select count(*) from j),
      'fehlt',     (select count(*) from b where not exists (select 1 from public.%1$I z where %3$s)),
      'anders',    (select count(*) from b join j z on %3$s
                     where public.w24_teil(to_jsonb(z), $4) is distinct from public.w24_teil(to_jsonb(b), $4) and not %5$s),
      'zuviel',    (select count(*) from j z where not exists (select 1 from b where %3$s) and not %5$s),
      'fest',      (select count(*) from j z where %5$s and (not exists (select 1 from b where %3$s)
                     or exists (select 1 from b where %3$s and public.w24_teil(to_jsonb(z), $4) is distinct from public.w24_teil(to_jsonb(b), $4)))),
      'konflikt',  (select count(*) from b join public.%1$I z on %3$s where not (%2$s)),
      'ungueltig', (select count(*) from b where not coalesce(%4$s, false)),
      'stand',     (select md5(coalesce(string_agg(h, ',' order by h), '')) from (select md5(public.w24_teil(to_jsonb(z), $4)::text) h from j z) x)
    )$q$, p_tabelle, v_scope_z, v_on, v_gueltig, v_fest)
    into r using p_fs, p_rows, p_schueler_ids, v_cols;
  return r || jsonb_build_object('spalten', to_jsonb(v_cols), 'schluessel', to_jsonb(v_pk));
end;
$function$;

-- Vorschau ohne Rechteprüfung (intern). Ergebnis: ok, wiederherstellbar, grund, code, summen, tabellen[].
create or replace function public.w24_vorschau(p_backup uuid, p_modus text, p_tabellen text[])
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  b record;
  t record;
  v jsonb;
  v_liste jsonb := '[]'::jsonb;
  v_ein bigint := 0; v_aend bigint := 0; v_loe bigint := 0; v_konf bigint := 0; v_ung bigint := 0; v_fest bigint := 0;
  e bigint; a bigint; l bigint;
  v_rows jsonb;
  v_sids text[];
  v_codequelle text;
  v_gewaehlt boolean;
  v_inhalt jsonb;
  v_tabs jsonb;
  v_kaskade bigint;
begin
  if p_modus not in ('ergaenzen', 'komplett') then raise exception 'W24: Modus muss ergaenzen oder komplett sein'; end if;
  select x.id, x.fahrschule_id, x.format, x.daten, x.pruefsumme, x.erstellt_am into b from public.fahrschule_backups x where x.id = p_backup;
  if not found then raise exception 'Sicherung nicht gefunden' using errcode = 'P0002'; end if;
  if coalesce(b.format, 1) < 2 then
    return jsonb_build_object('ok', false, 'wiederherstellbar', false, 'grund', 'altes_format', 'fahrschule_id', b.fahrschule_id);
  end if;
  v_inhalt := public.w24_backup_inhalt(b.id);
  if not coalesce((v_inhalt ->> 'pruefsumme_ok')::boolean, false) then
    return jsonb_build_object('ok', false, 'wiederherstellbar', false, 'grund', 'pruefsumme', 'fahrschule_id', b.fahrschule_id);
  end if;
  if (b.daten ->> 'fahrschule_id')::uuid is distinct from b.fahrschule_id then
    return jsonb_build_object('ok', false, 'wiederherstellbar', false, 'grund', 'fremde_fahrschule', 'fahrschule_id', b.fahrschule_id);
  end if;
  v_tabs := v_inhalt -> 'tabellen';
  if p_tabellen is not null and exists (select 1 from unnest(p_tabellen) x where x not in (select tabelle from public.w24_tabellen())) then
    raise exception 'W24: unbekannte Tabelle in der Auswahl';
  end if;
  -- IDs, die im Backup selbst stehen (gehören zur Fahrschule, auch wenn sie jetzt fehlen): Schüler (s:) und Notizen (n:)
  select coalesce(array_agg('s:' || (s ->> 'id')), '{}') into v_sids from jsonb_array_elements(coalesce(v_tabs -> 'schueler', '[]')) s;
  v_sids := v_sids || coalesce((select array_agg('n:' || (n ->> 'id')) from jsonb_array_elements(coalesce(v_tabs -> 'schueler_notizen', '[]')) n), '{}');
  v_codequelle := b.id::text || '|' || p_modus || '|' || coalesce(array_to_string(array(select unnest(p_tabellen) order by 1), ','), '*');

  for t in select * from public.w24_tabellen() order by reihe loop
    if not v_tabs ? t.tabelle then
      v_liste := v_liste || jsonb_build_object('tabelle', t.tabelle, 'art', t.art, 'im_backup', null, 'hinweis', 'nicht_im_backup');
      continue;
    end if;
    v_rows := v_tabs -> t.tabelle;
    v_gewaehlt := (p_tabellen is null and t.art <> 'auf_wunsch') or (p_tabellen is not null and t.tabelle = any(p_tabellen));
    if t.art = 'nur_sichern' or t.entdeckt then
      v_liste := v_liste || jsonb_build_object('tabelle', t.tabelle, 'art', case when t.entdeckt then 'entdeckt' else t.art end,
                                               'im_backup', jsonb_array_length(v_rows), 'einfuegen', 0, 'aendern', 0, 'loeschen', 0);
      continue;
    end if;
    if not v_gewaehlt then
      v_liste := v_liste || jsonb_build_object('tabelle', t.tabelle, 'art', t.art, 'gewaehlt', false,
                                               'im_backup', jsonb_array_length(v_rows), 'einfuegen', 0, 'aendern', 0, 'loeschen', 0);
      continue;
    end if;
    v := public.w24_vergleich(t.tabelle, t.bereich, t.spalte, b.fahrschule_id, v_rows, v_sids);
    e := 0; a := 0; l := 0;
    if v_gewaehlt and not coalesce((v ->> 'ohne_schluessel')::boolean, false) then
      if t.art = 'voll' then
        e := (v ->> 'fehlt')::bigint;
        if p_modus = 'komplett' then a := (v ->> 'anders')::bigint; l := (v ->> 'zuviel')::bigint; v_fest := v_fest + coalesce((v ->> 'fest')::bigint, 0); end if;
      elsif t.art = 'anhaengen' then
        e := (v ->> 'fehlt')::bigint;
      elsif t.art = 'zaehler' then
        e := (v ->> 'fehlt')::bigint;
        execute format('select count(*) from jsonb_populate_recordset(null::public.%I, $1) b join public.%I z on z.fahrschule_id = b.fahrschule_id where b.letzte > z.letzte and z.fahrschule_id = $2',
                       t.tabelle, t.tabelle) into a using v_rows, b.fahrschule_id;
      elsif t.art = 'auf_wunsch' and p_modus = 'komplett' then
        e := (v ->> 'fehlt')::bigint; a := (v ->> 'anders')::bigint;
      end if;
      v_konf := v_konf + coalesce((v ->> 'konflikt')::bigint, 0);
      v_ung := v_ung + coalesce((v ->> 'ungueltig')::bigint, 0);
    end if;
    v_ein := v_ein + e; v_aend := v_aend + a; v_loe := v_loe + l;
    -- Code: nur gewählte Tabellen (sonst würde z. B. ein Handy, das gerade speichert, jede Bestätigung ungültig machen)
    if v_gewaehlt then
      v_codequelle := v_codequelle || '|' || t.tabelle || ':' || e || ':' || a || ':' || l || ':' || coalesce(v ->> 'stand', '');
    end if;
    v_liste := v_liste || (jsonb_build_object('tabelle', t.tabelle, 'art', t.art, 'gewaehlt', v_gewaehlt, 'einfuegen', e, 'aendern', a, 'loeschen', l)
                           || (v - 'stand'));
  end loop;

  -- Löschen in einer gewählten Tabelle darf nicht still per Kaskade in einer NICHT gewählten Tabelle mitlöschen
  select count(*) into v_kaskade
    from jsonb_array_elements(v_liste) x
    join pg_constraint c on c.confrelid = format('public.%I', x ->> 'tabelle')::regclass and c.contype = 'f' and c.confdeltype in ('c', 'n', 'd')
    join pg_class k on k.oid = c.conrelid
   where coalesce((x ->> 'loeschen')::bigint, 0) > 0
     and not exists (select 1 from jsonb_array_elements(v_liste) y where y ->> 'tabelle' = k.relname::text and coalesce((y ->> 'gewaehlt')::boolean, false));
  return jsonb_build_object(
    'ok', true,
    'wiederherstellbar', v_konf = 0 and v_ung = 0 and v_kaskade = 0,
    'grund', case when v_ung > 0 then 'ungueltige_zeilen' when v_konf > 0 then 'konflikt' when v_kaskade > 0 then 'folge_loeschung' end,
    'backup_id', b.id, 'fahrschule_id', b.fahrschule_id, 'backup_vom', b.erstellt_am, 'modus', p_modus, 'auswahl', to_jsonb(p_tabellen),
    'einfuegen', v_ein, 'aendern', v_aend, 'loeschen', v_loe, 'konflikte', v_konf, 'ungueltig', v_ung,
    'bleibt_fest', v_fest,
    'code', upper(left(md5(v_codequelle), 6)),
    'tabellen', v_liste);
end;
$function$;

-- Öffentlich: Vorschau (Super-Admin, Leitung, Büro der eigenen Fahrschule). Ändert nichts.
create or replace function public.fahrschule_backup_vorschau(backup_id uuid, modus text default 'ergaenzen', tabellen text[] default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_fs uuid;
begin
  select fahrschule_id into v_fs from public.fahrschule_backups where id = backup_id;
  if v_fs is null or not public.w24_darf(v_fs, 'sichern') then
    raise exception 'Keine Berechtigung für diese Sicherung' using errcode = '42501';
  end if;
  return public.w24_vorschau(backup_id, modus, tabellen)
      || jsonb_build_object('darf_wiederherstellen', public.w24_darf(v_fs, 'wiederherstellen'));
end;
$function$;

-- ===== 5. Wiederherstellen =====
create or replace function public.fahrschule_backup_wiederherstellen(backup_id uuid, modus text, tabellen text[], bestaetigung text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_fs uuid;
  v_daten jsonb;
  v_vor jsonb;
  v_nach jsonb;
  v_vorher_id uuid;
  t record;
  v_info jsonb;
  v_rows jsonb;
  v_pk text[]; v_cols text[]; v_set text[];
  v_on text; v_scope text;
  v_n bigint;
  v_ergebnis jsonb := '[]'::jsonb;
  v_schreib text[] := '{}';
  v_ein bigint; v_aend bigint; v_loe bigint;
  v_geloescht jsonb := '{}'::jsonb;
  v_trig jsonb;
  v_fk jsonb;
begin
  select fahrschule_id into v_fs from public.fahrschule_backups where id = backup_id;
  if v_fs is null or not public.w24_darf(v_fs, 'wiederherstellen') then
    raise exception 'Keine Berechtigung zum Wiederherstellen (nur Leitung der eigenen Fahrschule)' using errcode = '42501';
  end if;
  if coalesce(btrim(bestaetigung), '') = '' then raise exception 'W24: Bestätigung fehlt – erst die Vorschau ansehen'; end if;

  -- Nur eine Wiederherstellung je Fahrschule gleichzeitig; Tabellen gegen gleichzeitiges Schreiben sperren (Lesen geht weiter).
  perform pg_advisory_xact_lock(hashtext('w24-wiederherstellen'), hashtext(v_fs::text));
  set local lock_timeout = '15s';
  for t in select * from public.w24_tabellen() where art in ('voll', 'anhaengen', 'zaehler', 'auf_wunsch') and not entdeckt order by reihe loop
    execute format('lock table public.%I in share row exclusive mode', t.tabelle);
  end loop;

  v_vor := public.w24_vorschau(backup_id, modus, tabellen);
  if not coalesce((v_vor ->> 'wiederherstellbar')::boolean, false) then
    raise exception 'W24: Diese Sicherung kann nicht zurückgeschrieben werden (%).', coalesce(v_vor ->> 'grund', '?');
  end if;
  if upper(btrim(bestaetigung)) <> (v_vor ->> 'code') then
    raise exception 'W24: Der Stand hat sich seit der Vorschau geändert. Bitte die Vorschau neu öffnen.';
  end if;
  if (v_vor ->> 'einfuegen')::bigint + (v_vor ->> 'aendern')::bigint + (v_vor ->> 'loeschen')::bigint = 0 then
    return jsonb_build_object('ok', true, 'nichts_zu_tun', true, 'vorschau', v_vor);
  end if;

  v_daten := public.w24_backup_inhalt(backup_id);   -- {tabellen (offen + geschützt), pruefsumme_ok}
  -- Zuerst den jetzigen Stand sichern.
  v_vorher_id := public.w24_sichern(v_fs, 'vor_wiederherstellung', auth.uid(),
                   jsonb_build_object('fuer_backup', backup_id, 'modus', modus, 'auswahl', to_jsonb(tabellen)));

  begin
  for v_info in select x from jsonb_array_elements(v_vor -> 'tabellen') x loop
    if (v_info ->> 'einfuegen')::bigint + (v_info ->> 'aendern')::bigint + (v_info ->> 'loeschen')::bigint > 0 then
      v_schreib := v_schreib || (v_info ->> 'tabelle');
    end if;
  end loop;
  -- Betroffene Tabellen: nur die Auslöser aus, die gerade AN sind (Zustand merken; nur in dieser Transaktion).
  select coalesce(jsonb_agg(jsonb_build_array(c.relname, tg.tgname)), '[]') into v_trig
    from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any(v_schreib) and not tg.tgisinternal and tg.tgenabled = 'O';
  for v_info in select x from jsonb_array_elements(v_trig) x loop
    execute format('alter table public.%I disable trigger %I', v_info ->> 0, v_info ->> 1);
  end loop;
  -- Fremdschlüssel zwischen den beschriebenen Tabellen erst am Ende prüfen (Reihenfolge Löschen/Ändern egal, z. B. neues
  -- Paket löschen, bevor der Schüler wieder auf das alte zeigt). Nur „ohne Regel“/Kaskade, nie RESTRICT (nicht aufschiebbar).
  select coalesce(jsonb_agg(jsonb_build_array(k.relname, c.conname)), '[]') into v_fk
    from pg_constraint c join pg_class k on k.oid = c.conrelid join pg_class e on e.oid = c.confrelid join pg_namespace n on n.oid = k.relnamespace
   where c.contype = 'f' and not c.condeferrable and n.nspname = 'public' and c.confdeltype <> 'r' and c.confupdtype <> 'r'
     and k.relname = any(v_schreib) and e.relname = any(v_schreib);
  for v_info in select x from jsonb_array_elements(v_fk) x loop
    execute format('alter table public.%I alter constraint %I deferrable initially deferred', v_info ->> 0, v_info ->> 1);
  end loop;

  -- a) Löschen (nur komplett, Art voll), rückwärts.
  for t in select * from public.w24_tabellen() where tabelle = any(v_schreib) order by reihe desc loop
    select x into v_info from jsonb_array_elements(v_vor -> 'tabellen') x where x ->> 'tabelle' = t.tabelle;
    if t.art = 'voll' and (v_info ->> 'loeschen')::bigint > 0 then
      v_pk := array(select jsonb_array_elements_text(v_info -> 'schluessel'));
      select string_agg(format('z.%I = b.%I', c, c), ' and ') into v_on from unnest(v_pk) c;
      execute format('delete from public.%I z where %s and not %s and not exists (select 1 from jsonb_populate_recordset(null::public.%I, $2) b where %s)',
                     t.tabelle, public.w24_bereich_sql(t.bereich, t.spalte, 'z'), public.w24_fest_sql(t.tabelle, 'z'), t.tabelle, v_on)
        using v_fs, v_daten -> 'tabellen' -> t.tabelle;
      get diagnostics v_loe = row_count;
      v_geloescht := v_geloescht || jsonb_build_object(t.tabelle, v_loe);
    end if;
  end loop;

  -- b) Einfügen und Ändern, vorwärts.
  for t in select * from public.w24_tabellen() where tabelle = any(v_schreib) order by reihe loop
    select x into v_info from jsonb_array_elements(v_vor -> 'tabellen') x where x ->> 'tabelle' = t.tabelle;
    v_rows := v_daten -> 'tabellen' -> t.tabelle;
    v_pk := array(select jsonb_array_elements_text(v_info -> 'schluessel'));
    v_cols := array(select jsonb_array_elements_text(v_info -> 'spalten'));
    select string_agg(format('z.%I = b.%I', c, c), ' and ') into v_on from unnest(v_pk) c;
    v_scope := public.w24_bereich_sql(t.bereich, t.spalte, 'z');
    v_ein := 0; v_aend := 0;
    if (v_info ->> 'einfuegen')::bigint > 0 then
      execute format('insert into public.%1$I (%2$s) overriding system value select %3$s from jsonb_populate_recordset(null::public.%1$I, $2) b where not exists (select 1 from public.%1$I z where %4$s)',
                     t.tabelle,
                     (select string_agg(format('%I', c), ', ') from unnest(v_cols) c),
                     (select string_agg(format('b.%I', c), ', ') from unnest(v_cols) c),
                     v_on)
        using v_fs, v_rows;
      get diagnostics v_ein = row_count;
    end if;
    if (v_info ->> 'aendern')::bigint > 0 then
      if t.art = 'zaehler' then
        execute format('update public.%1$I z set letzte = b.letzte from jsonb_populate_recordset(null::public.%1$I, $2) b where %2$s and %3$s and b.letzte > z.letzte',
                       t.tabelle, v_on, v_scope) using v_fs, v_rows;
        get diagnostics v_aend = row_count;
      else
        v_set := array(select c from unnest(v_cols) c where c <> all (v_pk));
        if array_length(v_set, 1) > 0 then
          execute format('update public.%1$I z set (%2$s) = row(%3$s) from jsonb_populate_recordset(null::public.%1$I, $2) b where %4$s and %5$s and not %6$s and public.w24_teil(to_jsonb(z), $3) is distinct from public.w24_teil(to_jsonb(b), $3)',
                         t.tabelle,
                         (select string_agg(format('%I', c), ', ') from unnest(v_set) c),
                         (select string_agg(format('b.%I', c), ', ') from unnest(v_set) c),
                         v_on, v_scope, public.w24_fest_sql(t.tabelle, 'z'))
            using v_fs, v_rows, v_cols;
          get diagnostics v_aend = row_count;
        end if;
      end if;
    end if;
    v_ergebnis := v_ergebnis || jsonb_build_object('tabelle', t.tabelle, 'eingefuegt', v_ein, 'geaendert', v_aend,
                                                   'geloescht', coalesce((v_geloescht ->> t.tabelle)::bigint, 0));
  end loop;

  -- Beleg-Zähler nie unter die höchste vergebene Nummer.
  if to_regclass('public.beleg_zaehler') is not null and to_regclass('public.zahlungsbelege') is not null then
    update public.beleg_zaehler z set letzte = m.n
      from (select max(nummer) n from public.zahlungsbelege where fahrschule_id = v_fs) m
     where z.fahrschule_id = v_fs and m.n is not null and m.n > z.letzte;
  end if;
  -- Zurückgeschriebene Handy-Stände bekommen eine neue Server-Zeit (sonst merken die Geräte die Änderung nicht).
  if 'snapshots' = any(v_schreib) and exists (select 1 from pg_attribute where attrelid = 'public.snapshots'::regclass and attname = 'updated_at' and not attisdropped) then
    update public.snapshots z set updated_at = now() where z.user_id in (select p.id from public.profiles p where p.fahrschule_id = v_fs)
       and exists (select 1 from jsonb_array_elements(v_daten -> 'tabellen' -> 'snapshots') s where (s ->> 'user_id')::uuid = z.user_id);
  end if;

  -- Fremdschlüssel jetzt prüfen und wieder wie vorher; Auslöser wieder an (genau die vorher aktiven).
  set constraints all immediate;
  for v_info in select x from jsonb_array_elements(v_fk) x loop
    execute format('alter table public.%I alter constraint %I not deferrable', v_info ->> 0, v_info ->> 1);
  end loop;
  for v_info in select x from jsonb_array_elements(v_trig) x loop
    execute format('alter table public.%I enable trigger %I', v_info ->> 0, v_info ->> 1);
  end loop;

  -- Nachprüfung: danach darf es nichts mehr zu tun geben (sonst alles zurück).
  v_nach := public.w24_vorschau(backup_id, modus, tabellen);
  if (v_nach ->> 'einfuegen')::bigint + (v_nach ->> 'aendern')::bigint + (v_nach ->> 'loeschen')::bigint
     - coalesce((select sum((x ->> 'aendern')::bigint) from jsonb_array_elements(v_nach -> 'tabellen') x where x ->> 'art' = 'auf_wunsch'), 0) <> 0 then
    raise exception 'W24: Nachprüfung fehlgeschlagen, nichts geändert: %', v_nach;
  end if;

  exception
    when foreign_key_violation then
      -- z. B. ein Termin eines Fahrlehrers, dessen Zugang endgültig gelöscht ist: melden, nichts still überspringen
      raise exception 'W24: Zurückholen nicht möglich, ein Eintrag verweist auf etwas, das es nicht mehr gibt (%). Es wurde nichts geändert.', sqlerrm
        using errcode = '23503';
    when unique_violation then
      -- z. B. ein Handy-Stand wurde nach der Sicherung neu angelegt (gleiches Konto, neue ID)
      raise exception 'W24: Zurückholen nicht möglich, ein Eintrag gibt es schon in anderer Form (%). Es wurde nichts geändert.', sqlerrm
        using errcode = '23505';
  end;

  update public.fahrschule_backups set hinweis = coalesce(hinweis, '{}'::jsonb) || jsonb_build_object('ergebnis', v_ergebnis, 'fertig_am', now())
   where id = v_vorher_id;
  return jsonb_build_object('ok', true, 'vorher_backup_id', v_vorher_id, 'tabellen', v_ergebnis,
                            'einfuegen', v_vor -> 'einfuegen', 'aendern', v_vor -> 'aendern', 'loeschen', v_vor -> 'loeschen');
end;
$function$;

-- ===== 6. Aufräumen und Nachtlauf =====
create or replace function public.fahrschule_backups_aufraeumen(p_fs uuid default null)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_n integer;
begin
  with r as (
    select id, anlass, erstellt_am,
           row_number() over (partition by fahrschule_id, coalesce(anlass, case when automatisch then 'nacht' else 'hand' end) order by erstellt_am desc) nr,
           coalesce(anlass, case when automatisch then 'nacht' else 'hand' end) a
      from public.fahrschule_backups
     where p_fs is null or fahrschule_id = p_fs)
  delete from public.fahrschule_backups x using r
   where x.id = r.id and r.erstellt_am < now() - interval '2 days'
     and ((r.a = 'nacht' and r.nr > 30)
       or (r.a = 'vor_wiederherstellung' and r.nr > 5 and r.erstellt_am < now() - interval '90 days'));
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

create or replace function public.fahrschule_backups_nachtlauf()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  f record;
  v_ok integer := 0;
  v_fehler jsonb := '[]'::jsonb;
  v_weg integer;
begin
  for f in select id from public.fahrschulen where aktiv order by id loop
    begin
      perform public.w24_sichern(f.id, 'nacht');
      v_ok := v_ok + 1;
    exception when others then
      v_fehler := v_fehler || jsonb_build_object('fahrschule_id', f.id, 'fehler', sqlerrm);
    end;
  end loop;
  v_weg := public.fahrschule_backups_aufraeumen(null);
  -- pg_cron meldet den Lauf trotzdem als erfolgreich: Fehler sichtbar ins Protokoll (Fehlersucher Daten W24)
  if v_fehler <> '[]'::jsonb or exists (select 1 from public.fahrschule_backups where anlass = 'nacht' and erstellt_am > now() - interval '1 hour' and hinweis ? 'fehler') then
    raise warning 'W24 Nachtlauf mit Fehlern: % (Tabellen-Fehler siehe fahrschule_backups.hinweis)', v_fehler;
  end if;
  return jsonb_build_object('gesichert', v_ok, 'fehler', v_fehler, 'aufgeraeumt', v_weg, 'am', now());
end;
$function$;

-- ===== 7. Rechte =====
revoke all on function public.w24_tabellen_liste() from public, anon, authenticated;
revoke all on function public.w24_ausgenommen() from public, anon, authenticated;
revoke all on function public.w24_ohne_spalten(text) from public, anon, authenticated;
revoke all on function public.w24_privat_tabellen() from public, anon, authenticated;
revoke all on function public.w24_fest_sql(text, text) from public, anon, authenticated;
revoke all on function public.w24_backup_inhalt(uuid) from public, anon, authenticated;
revoke all on function public.w24_tabellen() from public, anon, authenticated;
revoke all on function public.w24_bereich_sql(text, text, text) from public, anon, authenticated;
revoke all on function public.w24_teil(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.w24_zeilen(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.w24_sichern(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.w24_darf(uuid, text) from public, anon, authenticated;
revoke all on function public.w24_vergleich(text, text, text, uuid, jsonb, text[]) from public, anon, authenticated;
revoke all on function public.w24_vorschau(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.fahrschule_backups_aufraeumen(uuid) from public, anon, authenticated;
revoke all on function public.fahrschule_backups_nachtlauf() from public, anon, authenticated;
revoke all on function public.fahrschule_backup_erstellen(uuid, boolean) from public, anon;
revoke all on function public.fahrschule_backup_vorschau(uuid, text, text[]) from public, anon;
revoke all on function public.fahrschule_backup_wiederherstellen(uuid, text, text[], text) from public, anon;
grant execute on function public.fahrschule_backup_erstellen(uuid, boolean) to authenticated, service_role;
grant execute on function public.fahrschule_backup_vorschau(uuid, text, text[]) to authenticated, service_role;
grant execute on function public.fahrschule_backup_wiederherstellen(uuid, text, text[], text) to authenticated, service_role;
grant execute on function public.fahrschule_backups_nachtlauf() to service_role;
grant execute on function public.fahrschule_backups_aufraeumen(uuid) to service_role;

-- ===== 8. Nachtlauf planen (nur wenn pg_cron da ist) =====
do $plan$
declare j record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Bisheriger Auftrag (Name sagt „wöchentlich“, lief aber täglich 02:00 UTC: alle_fahrschulen_woechentlich_sichern + backups_aufraeumen)
    for j in execute 'select jobid, jobname, schedule, command from cron.job where jobname in (''woechentliches-fahrschule-backup'', ''kompass-sicherung-nacht'') or command ilike ''%alle_fahrschulen_woechentlich_sichern%''' loop
      raise notice 'W24: ersetze Auftrag % (%): %', j.jobname, j.schedule, j.command;
      perform cron.unschedule(j.jobid);
    end loop;
    if to_regprocedure('public.alle_fahrschulen_woechentlich_sichern()') is null then
      raise notice 'W24: alle_fahrschulen_woechentlich_sichern() fehlt – der Rückweg kann den alten Auftrag nicht neu planen';
    end if;
    -- Gleiche Zeit wie bisher: 02:00 UTC, vor papierkorb_leeren (03:17 UTC) – was der Papierkorb endgültig löscht, ist vorher gesichert.
    perform cron.schedule('kompass-sicherung-nacht', '0 2 * * *', 'select public.fahrschule_backups_nachtlauf()');
  else
    raise notice 'W24: pg_cron fehlt – Nachtlauf nicht geplant';
  end if;
end;
$plan$;

-- Ergebniszeile (erwartet: spalten=8, insert_regel=0, funktionen=19, nachtlauf = 1 Auftrag 'kompass-sicherung-nacht', alter Auftrag weg)
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'fahrschule_backups'
     and column_name in ('format', 'anlass', 'zaehlung', 'arten', 'groesse_bytes', 'pruefsumme', 'erstellt_von', 'hinweis')) as spalten,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'fahrschule_backups' and cmd = 'INSERT') as insert_regel,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
     and p.proname in ('w24_tabellen_liste', 'w24_ausgenommen', 'w24_ohne_spalten', 'w24_privat_tabellen', 'w24_backup_inhalt', 'w24_fest_sql', 'w24_tabellen', 'w24_bereich_sql', 'w24_teil', 'w24_zeilen', 'w24_sichern',
                       'w24_darf', 'w24_vergleich', 'w24_vorschau', 'fahrschule_backup_erstellen', 'fahrschule_backup_vorschau',
                       'fahrschule_backup_wiederherstellen', 'fahrschule_backups_aufraeumen', 'fahrschule_backups_nachtlauf')) as funktionen,
  (select array_agg(tabelle order by reihe) from public.w24_tabellen() where entdeckt) as entdeckte_tabellen,
  (select array_agg(l.tabelle) from public.w24_tabellen_liste() l where l.tabelle not in (select tabelle from public.w24_tabellen() where not entdeckt)) as fehlende_tabellen;
