-- Test zu 20261125_w13_01_fc_haken_schutz.sql, NUR an einer lokalen Kopie (nie an der echten Datenbank).
-- Ablauf: createdb -T kt <name>; psql -d <name> -f supabase/tests/20261125_w13_fc_haken_schema.sql;
--   psql -d <name> -f supabase/migrations/20261125_w13_01_fc_haken_schutz.sql; psql -d <name> -f supabase/tests/20261125_w13_fc_haken_test.sql
-- Erwartet: 17 Zeilen F1–F17, jede endet auf „true“. kt = lokaler Stub (Rollen, Profile, is_buero …), Daten ausgedacht.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
-- Fahrlehrer A (…03), Büro (…01), Leitung (…02), Super-Admin (c…01); Fahrschule A 1111…
set role authenticated;
select set_config('t.uid','a0000000-0000-0000-0000-000000000003',false);
insert into kalender_termine (id,fahrschule_id,fahrlehrer_id,schueler_id,art,datum,von,bis,status,buero_fc_status,buero_fc_nachgereicht_am)
  values ('t1','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','s1','fahrstunde','2026-11-20','10:00','11:30','geplant','abgegeben','2026-11-21');
insert into kalender_termine (id,fahrschule_id,fahrlehrer_id,schueler_id,art,datum,von,bis,status,buero_fc_status)
  values ('t2','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','s1','fahrstunde','2026-11-20','12:00','13:30','geplant',null);
select 'F1 insert FL abgegeben->offen, Datum leer: ' || (buero_fc_status='offen' and buero_fc_nachgereicht_am is null) from kalender_termine where id='t1';
select 'F2 insert FL leer bleibt leer: ' || (buero_fc_status is null) from kalender_termine where id='t2';
update kalender_termine set buero_fc_status='abgegeben', buero_fc_nachgereicht_am='2026-11-22', status='gefahren' where id='t1';
select 'F3 update FL: Haken bleibt, Status gespeichert: ' || (buero_fc_status='offen' and buero_fc_nachgereicht_am is null and status='gefahren') from kalender_termine where id='t1';
select set_config('t.uid','a0000000-0000-0000-0000-000000000001',false);
update kalender_termine set buero_fc_status='abgegeben' where id in ('t1','t2');
select 'F4 Büro hakt ab: ' || (count(*)=2) from kalender_termine where buero_fc_status='abgegeben';
select set_config('t.uid','a0000000-0000-0000-0000-000000000003',false);
update kalender_termine set payload = payload || '{"notiz":"x"}' where id='t1';
select 'F5 FL ändert Notiz: Haken bleibt: ' || (buero_fc_status='abgegeben') from kalender_termine where id='t1';
update kalender_termine set payload = payload || '{"fc":"nachgereicht"}' where id='t1';
select 'F6 FL ändert Vermerk nach Haken: zurück auf offen: ' || (buero_fc_status='offen') from kalender_termine where id='t1';
update kalender_termine set bis='14:15' where id='t2';
select 'F7 FL ändert Uhrzeit nach Haken: zurück auf offen: ' || (buero_fc_status='offen') from kalender_termine where id='t2';
-- Upsert wie die App (nur Spalten der Nutzlast), mit und ohne Haken-Spalte
select set_config('t.uid','a0000000-0000-0000-0000-000000000001',false);
update kalender_termine set buero_fc_status='abgegeben' where id='t2';
select set_config('t.uid','a0000000-0000-0000-0000-000000000003',false);
insert into kalender_termine (id,fahrschule_id,fahrlehrer_id,schueler_id,art,datum,von,bis,status,geloescht,payload)
  values ('t2','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','s1','fahrstunde','2026-11-20','12:00','14:15','gefahren',false,'{"notiz":"y"}')
  on conflict (id) do update set von=excluded.von, bis=excluded.bis, status=excluded.status, geloescht=excluded.geloescht, payload=excluded.payload;
select 'F8 Upsert der App ohne Änderung an Zeit/Vermerk: Haken bleibt: ' || (buero_fc_status='abgegeben' and status='gefahren') from kalender_termine where id='t2';
insert into kalender_termine (id,fahrschule_id,fahrlehrer_id,schueler_id,art,datum,von,bis,status,buero_fc_status)
  values ('t1','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','s1','fahrstunde','2026-11-20','10:00','11:30','gefahren','abgegeben')
  on conflict (id) do update set buero_fc_status=excluded.buero_fc_status;
select 'F9 Upsert FL mit Haken-Spalte: bleibt offen: ' || (buero_fc_status='offen') from kalender_termine where id='t1';
select set_config('t.uid','a0000000-0000-0000-0000-000000000002',false);
update kalender_termine set buero_fc_status='fehlt' where id='t1';
select 'F10 Leitung setzt fehlt: ' || (buero_fc_status='fehlt') from kalender_termine where id='t1';
select set_config('t.uid','c0000000-0000-0000-0000-000000000001',false);
update kalender_termine set buero_fc_status='abgegeben', buero_fc_nachgereicht_am='2026-11-23' where id='t1';
select 'F11 Super-Admin setzt abgegeben: ' || (buero_fc_status='abgegeben' and buero_fc_nachgereicht_am='2026-11-23') from kalender_termine where id='t1';
select set_config('t.uid','a0000000-0000-0000-0000-000000000001',false);
update kalender_termine set payload = payload || '{"fc":"v1"}', bis='12:15' where id='t1';
select 'F12 Büro ändert Vermerk und Zeit: Haken bleibt: ' || (buero_fc_status='abgegeben') from kalender_termine where id='t1';
reset role;
select set_config('t.uid','',false);
update kalender_termine set buero_fc_status='fehlt' where id='t2';
select 'F13 Server (ohne Anmeldung) darf: ' || (buero_fc_status='fehlt') from kalender_termine where id='t2';
-- Zahl der Fahrchecks (buero_fc_anzahl)
select set_config('t.uid','a0000000-0000-0000-0000-000000000001',false);
set role authenticated;
update kalender_termine set buero_fc_status='abgegeben', buero_fc_anzahl=1 where id='t2';
select 'F14 Büro wählt „1 abgegeben“: ' || (buero_fc_status='abgegeben' and buero_fc_anzahl=1) from kalender_termine where id='t2';
select set_config('t.uid','a0000000-0000-0000-0000-000000000003',false);
update kalender_termine set buero_fc_anzahl=2, payload = payload || '{"notiz":"z"}' where id='t2';
select 'F15 Fahrlehrer ändert die Zahl: bleibt 1, Notiz gespeichert: ' || (buero_fc_anzahl=1 and payload->>'notiz'='z') from kalender_termine where id='t2';
update kalender_termine set payload = payload || '{"fc":"v1"}' where id='t2';
select 'F16 Fahrlehrer ändert Vermerk: Haken offen, Zahl leer: ' || (buero_fc_status='offen' and buero_fc_anzahl is null) from kalender_termine where id='t2';
insert into kalender_termine (id,fahrschule_id,fahrlehrer_id,schueler_id,art,datum,von,bis,status,buero_fc_status,buero_fc_anzahl)
  values ('t3','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','s1','fahrstunde','2026-11-20','15:00','16:30','geplant','abgegeben',2);
select 'F17 neuer Termin des Fahrlehrers mit Zahl: offen, Zahl leer: ' || (buero_fc_status='offen' and buero_fc_anzahl is null) from kalender_termine where id='t3';
reset role;
