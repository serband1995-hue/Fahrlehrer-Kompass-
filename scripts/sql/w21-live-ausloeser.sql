-- W21: Auslöser-Funktionen auf kalender_termine / kalender_pruefungen, WÖRTLICH aus dem Live-Lese-Ergebnis (w21-1-lesen, 27.11.2026 05:55 UTC,
-- von HS7 übermittelt; bei termin_nachweis_spur/_angelegt nur Leerraum gekürzt). NUR für den PGlite-Test (scripts/w21-sql-test.mjs), nie einspielen.
create or replace function public.termin_fc_haken_schutz() returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare u uuid := auth.uid(); begin
  if u is not null and not (public.is_buero(u) or public.is_fahrschule_admin(u) or public.is_super_admin(u)) then
    if tg_op = 'UPDATE' then
      new.buero_fc_status := old.buero_fc_status; new.buero_fc_anzahl := old.buero_fc_anzahl; new.buero_fc_nachgereicht_am := old.buero_fc_nachgereicht_am;
      if old.buero_fc_status = 'abgegeben' and ((new.payload ->> 'fc') is distinct from (old.payload ->> 'fc') or new.von is distinct from old.von or new.bis is distinct from old.bis or new.art is distinct from old.art or new.schueler_id is distinct from old.schueler_id) then
        new.buero_fc_status := 'offen'; new.buero_fc_nachgereicht_am := null; end if;
    else
      if new.buero_fc_status is not null and new.buero_fc_status <> 'offen' then new.buero_fc_status := 'offen'; end if;
      new.buero_fc_nachgereicht_am := null;
    end if;
  end if;
  if new.buero_fc_status is distinct from 'abgegeben' then new.buero_fc_anzahl := null; end if;
  return new; end; $f$;
create or replace function public.termin_verschiebung_schutz() returns trigger language plpgsql security definer set search_path to 'public' as $f$
begin
  if (new.fahrlehrer_id is distinct from old.fahrlehrer_id or new.fahrschule_id is distinct from old.fahrschule_id) then
    if not (is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid()))
       and not coalesce((coalesce(current_setting('kompass.weitergabe', true), '') = '1' and new.fahrschule_id is not distinct from old.fahrschule_id
                and old.fahrlehrer_id = auth.uid()
                and exists (select 1 from public.profiles z where z.id = new.fahrlehrer_id and z.fahrschule_id = old.fahrschule_id and coalesce(z.aktiv, true))), false) then
      raise exception 'Nur Fahrschule-Admin, Büro oder Super-Admin dürfen einen Termin einem anderen Fahrlehrer zuordnen.';
    end if;
  end if;
  return new; end; $f$;
create or replace function public.termin_zahlung_sperre() returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare g text; alt jsonb; begin
  if auth.uid() is null then return new; end if;
  if new.schueler_id is null or coalesce(new.geloescht, false) then return new; end if;
  if coalesce(new.art, 'fahrstunde') not in ('fahrstunde', 'sonder', 'nacht', 'schalt', 'pruefung') then return new; end if;
  if new.datum is null or new.datum < (now() at time zone 'Europe/Berlin')::date then return new; end if;
  if tg_op = 'UPDATE' then alt := to_jsonb(old); else select to_jsonb(k) into alt from public.kalender_termine k where k.id = new.id; end if;
  if alt is not null and new.schueler_id::text is not distinct from (alt->>'schueler_id') and new.datum is not distinct from nullif(alt->>'datum', '')::date then
    if not coalesce((alt->>'geloescht')::boolean, false) then return new; end if;
    if coalesce(nullif(alt->>'geloescht_am', '')::timestamptz > now() - interval '15 minutes', false) then return new; end if;
  end if;
  g := public.schueler_buchung_gesperrt(new.schueler_id);
  if g is not null then raise exception 'Zahlung ausstehend: %', g using errcode = 'P0001', hint = 'Bitte zuerst im Büro klären.'; end if;
  return new; end; $f$;
create or replace function public.termin_papierkorb() returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare war boolean := false; g text; begin
  if tg_op = 'UPDATE' then war := coalesce(old.geloescht, false); end if;
  if coalesce(new.geloescht, false) then
    if war then
      new.geloescht_am := coalesce(old.geloescht_am, now());
      if jsonb_typeof(old.payload->'storno') = 'object' and jsonb_typeof(new.payload->'storno') is distinct from 'object' then
        new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('storno', old.payload->'storno'); end if;
    else new.geloescht_am := now(); end if;
    if jsonb_typeof(new.payload->'storno') is distinct from 'object' and public.termin_ist_nachweis(new) then
      g := nullif(left(coalesce(new.payload->>'korrekturGrund', ''), 300), '');
      new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('storno', jsonb_build_object('am', now(), 'grund', coalesce(g, 'ohne Grund'), 'automatisch', true));
    end if;
  else
    new.geloescht_am := null;
    if war and new.payload ? 'storno' then new.payload := new.payload - 'storno'; end if;
  end if;
  return new; end; $f$;
create or replace function public.termin_nachweis_spur() returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare g text; r record; wer text; u jsonb; begin
  g := nullif(left(coalesce(new.payload->>'korrekturGrund', ''), 300), '');
  if new.payload ? 'korrekturGrund' then new.payload := new.payload - 'korrekturGrund'; end if;
  if tg_op = 'INSERT' then perform set_config('kompass.nachweis_grund', coalesce(g, ''), true); return new; end if;
  if coalesce(old.payload->>'signed', '') = 'true' and (new.datum is distinct from old.datum or new.von is distinct from old.von or new.bis is distinct from old.bis or coalesce(new.art, 'fahrstunde') is distinct from coalesce(old.art, 'fahrstunde') or new.schueler_id is distinct from old.schueler_id) then
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('signed', false, 'signatureSnap', null, 'signaturUngueltig', jsonb_build_object('am', now(), 'alt', jsonb_build_object('datum', old.datum, 'von', old.von, 'bis', old.bis, 'art', old.art), 'signedAt', old.payload->'signedAt', 'snap', old.payload->'signatureSnap'));
  elsif jsonb_typeof(old.payload->'signaturUngueltig') = 'object' and coalesce(old.payload->'signaturUngueltig'->>'erledigt', '') <> 'true' and coalesce(old.payload->>'signed', '') <> 'true' and coalesce(new.payload->>'signed', '') = 'true' and (new.payload->'signaturUngueltig'->>'am') is distinct from (old.payload->'signaturUngueltig'->>'am') then
    u := old.payload->'signaturUngueltig';
    new.payload := new.payload || jsonb_build_object('signed', false, 'signatureSnap', null, 'signaturUngueltig', u);
  end if;
  for r in select * from (values ('datum', old.datum::text, new.datum::text), ('von', old.von, new.von), ('bis', old.bis, new.bis), ('art', old.art, new.art), ('schueler_id', old.schueler_id, new.schueler_id), ('fahrlehrer_id', old.fahrlehrer_id::text, new.fahrlehrer_id::text), ('geloescht', coalesce(old.geloescht, false)::text, coalesce(new.geloescht, false)::text), ('status', old.status, new.status), ('sonderArt', old.payload->>'sonderArt', new.payload->>'sonderArt'), ('signed', coalesce(old.payload->>'signed', 'false'), coalesce(new.payload->>'signed', 'false'))) as v(feld, alt, neu)
      where v.alt is distinct from v.neu and new.fahrschule_id is not null
  loop
    if wer is null then wer := coalesce(public.buero_bearbeiter(), ''); end if;
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund) values (new.fahrschule_id, 'kalender_termine', new.id, r.feld, r.alt, r.neu, auth.uid(), nullif(wer, ''), g);
  end loop;
  return new; end $f$;
create or replace function public.termin_nachweis_angelegt() returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare g text; begin
  if new.erstellt_von is not null and new.fahrschule_id is not null and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    g := nullif(current_setting('kompass.nachweis_grund', true), '');
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund) values (new.fahrschule_id, 'kalender_termine', new.id, 'angelegt', null, coalesce(new.datum::text, '') || ' ' || coalesce(new.von, '') || '–' || coalesce(new.bis, ''), auth.uid(), public.buero_bearbeiter(), g);
  end if;
  perform set_config('kompass.nachweis_grund', '', true);
  return null; end $f$;
create or replace function public.termin_entfernt_schutz() returns trigger language plpgsql security definer set search_path to 'public' as $f$
begin if old.admin_entfernt_am is not null then raise exception 'Dieser Termin wurde von der Leitung entfernt.' using errcode = 'P0001'; end if; return new; end $f$;
create trigger trg_termin_c_fc_haken before insert or update on public.kalender_termine for each row execute function public.termin_fc_haken_schutz();
create trigger trg_termin_zx_zahlung before insert or update on public.kalender_termine for each row execute function public.termin_zahlung_sperre();
create trigger trg_termin_zy_papierkorb before insert or update on public.kalender_termine for each row execute function public.termin_papierkorb();
create trigger trg_termin_zz_nachweis_spur before insert or update on public.kalender_termine for each row execute function public.termin_nachweis_spur();
create trigger trg_termin_entfernt_schutz before update on public.kalender_termine for each row execute function public.termin_entfernt_schutz();
create trigger trg_termin_verschiebung_schutz before update on public.kalender_termine for each row execute function public.termin_verschiebung_schutz();
create trigger trg_termin_zz_nachweis_angelegt after insert on public.kalender_termine for each row execute function public.termin_nachweis_angelegt();
create trigger trg_pruefung_verschiebung_schutz before update on public.kalender_pruefungen for each row execute function public.termin_verschiebung_schutz();
