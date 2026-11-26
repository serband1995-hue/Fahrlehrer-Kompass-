-- W20 (26.11.2026) · Büro-Person an mehreren PCs gleichzeitig (🗣 Serband 26.11.: „Ja, bauen“).
--
-- Vorher (live, w20-1-lesen 1f): buero_neue_sitzung löschte bei jeder PIN-Anmeldung die bisherigen Sitzungen derselben
-- Person unter demselben Anmeldekonto (user_id = auth.uid() and person_id = p_person). Meldete sich Frau X am zweiten PC an,
-- flog sie am ersten PC hinaus.
-- Neu:
--   * buero_neue_sitzung: Bis zu 5 gleichzeitige Sitzungen je Person (über alle PCs/Konten der Fahrschule). Bei der 6.
--     Anmeldung endet die ÄLTESTE. Abgelaufene Sitzungen (alle Personen) werden wie bisher bei jeder Anmeldung gelöscht.
--     Die Sperrzeile der Person (buero_pin_anmelden: select ... for update) sorgt dafür, dass zwei gleichzeitige Anmeldungen
--     derselben Person nacheinander laufen.
--   * „Abmelden“ (buero_sitzung_beenden) beendet schon heute nur die eigene Sitzung (über den Schlüssel in x-buero-sitzung):
--     unverändert.
--   * buero_pin_aendern: beendet jetzt alle ANDEREN Sitzungen der Person (andere PCs). Die Sitzung, an der die PIN gerade
--     geändert wurde, bleibt offen (sonst stünde die Person direkt nach „PIN gespeichert ✓“ wieder vor dem PIN-Fenster).
--   * Sperre/Austritt (buero_person_speichern aktiv=false) löscht schon heute alle Sitzungen der Person; PIN freigeben
--     (buero_pin_zuruecksetzen) beendet schon heute alle; Büro-Konto löschen/Rolle ändern (Edge Function admin-create-account)
--     löscht alle des Kontos: unverändert.
--   * Bewusst NICHT: 5 falsche PINs (gesperrt_bis 15 Min.) beenden keine laufenden Sitzungen. Sonst könnte jeder am Büro-PC
--     durch Falsch-Tippen die Kollegin an allen anderen PCs hinauswerfen.
--   * Aufräumen (HS7, 1i: kein Auftrag vorhanden): täglicher pg_cron-Auftrag „buero_sitzungen_aufraeumen“ löscht Sitzungen,
--     die seit mehr als 1 Tag abgelaufen sind. Index (person_id, erstellt_am) für das Zählen je Person.
-- Keine RLS-Regel geändert. Die App-Seite (buero.js) braucht keine Änderung: Sie schickt je Browser-Tab ihren eigenen Schlüssel.
-- Schutz: Die Migration prüft, dass die Live-Funktionen noch genau dem gelesenen Stand entsprechen (Merkmal-Text), sonst
-- W20_ABBRUCH ohne Änderung.
-- Live-Probe: scripts/sql/w20-2-probe.sql (Teil B). Rückweg: supabase/rueckweg/20261201_w20_02_rueckweg.sql
do $w20b$
begin
  if position('(user_id = auth.uid() and person_id = p_person)' in pg_get_functiondef('public.buero_neue_sitzung(uuid, uuid, boolean)'::regprocedure)) = 0 then
    raise exception 'W20_ABBRUCH: buero_neue_sitzung weicht vom gelesenen Stand ab – bitte neu lesen.';
  end if;
  if position('update public.buero_sitzungen set nur_pin_aendern = false where token_hash = s.token_hash;' in pg_get_functiondef('public.buero_pin_aendern(text)'::regprocedure)) = 0 then
    raise exception 'W20_ABBRUCH: buero_pin_aendern weicht vom gelesenen Stand ab – bitte neu lesen.';
  end if;
end $w20b$;

create index if not exists buero_sitzungen_person_zeit on public.buero_sitzungen (person_id, erstellt_am desc);

create or replace function public.buero_neue_sitzung(p_person uuid, p_fs uuid, p_nur_pin boolean)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare tok text;
begin
  delete from public.buero_sitzungen where laeuft_ab < now();
  -- W20: höchstens 5 gleichzeitige Sitzungen je Person; vor der neuen bleiben die 4 jüngsten, die älteste endet
  delete from public.buero_sitzungen where token_hash in (
    select token_hash from public.buero_sitzungen where person_id = p_person
     order by erstellt_am desc, token_hash offset 4);
  tok := encode(gen_random_bytes(32), 'hex');
  -- erstellt_am streng steigend je Person (clock_timestamp, mindestens 1 µs nach der letzten): auch mehrere Anmeldungen in EINER
  -- Transaktion (Live-Probe) oder in derselben Millisekunde haben eine eindeutige Reihenfolge, damit sicher die älteste endet
  insert into public.buero_sitzungen (token_hash, person_id, fahrschule_id, user_id, nur_pin_aendern, laeuft_ab, erstellt_am)
  values (encode(digest(tok, 'sha256'), 'hex'), p_person, p_fs, auth.uid(), p_nur_pin, now() + interval '12 hours',
          greatest(clock_timestamp(), (select max(x.erstellt_am) + interval '1 microsecond' from public.buero_sitzungen x where x.person_id = p_person)));
  return tok;
end $function$;

create or replace function public.buero_pin_aendern(p_neu text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare s public.buero_sitzungen; p public.buero_personen;
begin
  s := public.buero_sitzung_zeile(true);
  if s.person_id is null then return jsonb_build_object('fehler', 'keine_sitzung'); end if;
  if coalesce(p_neu, '') !~ '^[0-9]{4}$' then return jsonb_build_object('fehler', 'format'); end if;
  if public.buero_pin_zu_einfach(p_neu) then return jsonb_build_object('fehler', 'zu_einfach'); end if;
  select * into p from public.buero_personen where id = s.person_id for update;
  if p.pin_hash is not null and crypt(p_neu, p.pin_hash) = p.pin_hash then return jsonb_build_object('fehler', 'gleich'); end if;
  update public.buero_personen set pin_hash = crypt(p_neu, gen_salt('bf', 8)), hat_pin = true, pin_neu_noetig = false,
    fehlversuche = 0, gesperrt_bis = null, aktualisiert_am = now() where id = p.id;
  update public.buero_sitzungen set nur_pin_aendern = false where token_hash = s.token_hash;
  -- W20: neue PIN beendet die Sitzungen der Person an allen ANDEREN PCs
  delete from public.buero_sitzungen where person_id = p.id and token_hash <> s.token_hash;
  perform public.buero_protokoll_person(p.fahrschule_id, p.id, 'pin', 'eigene PIN geändert von ' || p.name);
  return jsonb_build_object('ok', true);
end $function$;

-- Nur intern (aus buero_pin_anmelden, läuft als Eigentümer). Direkt aufrufen darf sie niemand: sonst könnte ein angemeldetes
-- Konto ohne PIN eine Sitzung für eine beliebige Person erzeugen. (anon hatte laut 1d schon kein Recht; ob authenticated eines
-- hatte, zeigt 1d nicht – der Entzug ist in jedem Fall richtig, der Rückweg gibt es bewusst nicht zurück.)
revoke all on function public.buero_neue_sitzung(uuid, uuid, boolean) from public, anon, authenticated;

-- Täglich aufräumen (03:17 UTC), nur wenn pg_cron da ist
do $w20c$
begin
  if to_regnamespace('cron') is not null then
    perform cron.schedule('buero_sitzungen_aufraeumen', '17 3 * * *',
      $job$delete from public.buero_sitzungen where laeuft_ab < now() - interval '1 day'$job$);
  else
    raise notice 'W20_02: pg_cron fehlt – kein Aufräum-Auftrag angelegt (Aufräumen läuft weiter bei jeder PIN-Anmeldung).';
  end if;
end $w20c$;
