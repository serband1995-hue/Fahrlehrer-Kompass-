-- Leitung, die selbst fährt (🗣 Serband 21.11.2026: „Jelena soll genau die Ansicht bekommen, die ich habe:
-- als Fahrlehrer, oben die Admin-Rechte.“)
-- 1) Neues Kennzeichen profiles.faehrt_selbst (nur sinnvoll bei rolle = 'fahrschule_admin'). Eine Leitung mit Kennzeichen
--    startet in der eigenen Fahrlehrer-Ansicht (eigene Schüler, Termine) und schaltet über das Menü in die Gesamtübersicht.
--    Reine Leitung (Kennzeichen aus) bleibt unverändert. Gesetzt wird es über die Server-Funktion admin-create-account.
-- 2) Drei Funktionen, die als Ziel nur Fahrlehrer annahmen, nehmen auch diese Leitung an:
--    buero_fahrlehrer_akte, buero_fahrlehrer_klassen (Büro pflegt Klassen/Akte), fahrstunden_uebertragen (Übergabe an sie).
--    Sonst ist jede Zeile wie vorher.
-- 3) profil_schutz: faehrt_selbst darf wie Rolle/Aktiv nur der Super-Admin oder die Server-Funktion ändern
--    (Prüf-Team 21.11.: sonst könnte eine Leitung sich das Kennzeichen über die REST-Schnittstelle selbst setzen).
-- Rückweg: supabase/rueckweg/20261121_zugang_rueckweg.sql, Abschnitt 2.
alter table public.profiles add column if not exists faehrt_selbst boolean not null default false;

create or replace function public.profil_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (new.rolle is distinct from old.rolle
      or new.fahrschule_id is distinct from old.fahrschule_id
      or new.email is distinct from old.email
      or new.aktiv is distinct from old.aktiv
      or new.faehrt_selbst is distinct from old.faehrt_selbst) then
    if not is_super_admin(auth.uid())
       and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      raise exception 'Rolle, Fahrschule-Zuordnung, E-Mail, Aktiv-Status und „fährt selbst“ dürfen nur vom Super-Admin geändert werden.';
    end if;
  end if;
  -- „ohne App“, Klassen und Fahrlehrer-Akte: nur Super-Admin, Server (Edge-Funktion) oder die Büro-Funktionen mit Verwalten-Recht (Protokoll)
  if (new.ohne_app is distinct from old.ohne_app or new.klassen is distinct from old.klassen
      or new.fahrlehrerlaubnis is distinct from old.fahrlehrerlaubnis or new.fuehrerschein_klassen is distinct from old.fuehrerschein_klassen
      or new.fuehrerschein_c_bis is distinct from old.fuehrerschein_c_bis or new.fuehrerschein_d_bis is distinct from old.fuehrerschein_d_bis
      or new.sz95_bis is distinct from old.sz95_bis or new.fortbildung_bis is distinct from old.fortbildung_bis
      or new.fahrlehrer_zusatz is distinct from old.fahrlehrer_zusatz)
     and auth.uid() is not null and not is_super_admin(auth.uid())
     and not (new.ohne_app is not distinct from old.ohne_app and coalesce(current_setting('kompass.klassen_ok', true), '') = '1') then
    raise exception '„Ohne App“, Klassen und Fahrlehrer-Akte ändert nur das Büro mit Verwalten-Recht.';
  end if;
  return new;
end;
$function$;

create or replace function public.buero_fahrlehrer_akte(p_id uuid, p_daten jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare z public.profiles; n public.profiles; fl text[]; kl text[]; f text; a text; b text;
begin
  select * into z from public.profiles where id = p_id;
  if z.id is null or not (z.rolle in ('fahrlehrer', 'super_admin') or (z.rolle = 'fahrschule_admin' and z.faehrt_selbst)) then return jsonb_build_object('fehler', 'unbekannt'); end if;
  if not public.buero_darf_verwalten(z.fahrschule_id) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  fl := coalesce((select array_agg(distinct x order by x) from jsonb_array_elements_text(coalesce(p_daten->'fahrlehrerlaubnis', '[]'::jsonb)) x where x in ('A', 'BE', 'CE', 'DE')), '{}');
  -- Was er ausbilden darf (FahrlG § 1 Abs. 2). Ohne Fahrlehrerlaubnis bleiben die bisherigen Klassen (Altbestand).
  kl := case when cardinality(fl) = 0 then z.klassen else coalesce((select array_agg(distinct k order by k) from unnest(fl) l cross join lateral unnest(case l
          when 'BE' then array['B', 'BE'] when 'A' then array['A'] when 'CE' then array['C1', 'C1E', 'C', 'CE'] when 'DE' then array['D1', 'D1E', 'D', 'DE'] end) k), '{}') end;
  n := z;
  n.fahrlehrerlaubnis := fl;
  n.klassen := kl;
  n.fuehrerschein_klassen := coalesce((select array_agg(distinct x order by x) from jsonb_array_elements_text(coalesce(p_daten->'fuehrerschein_klassen', '[]'::jsonb)) x where x ~ '^[A-Z0-9]{1,4}$'), '{}');
  n.fuehrerschein_c_bis := nullif(p_daten->>'fuehrerschein_c_bis', '')::date;
  n.fuehrerschein_d_bis := nullif(p_daten->>'fuehrerschein_d_bis', '')::date;
  n.sz95_bis := nullif(p_daten->>'sz95_bis', '')::date;
  n.fortbildung_bis := nullif(p_daten->>'fortbildung_bis', '')::date;
  n.fahrlehrer_zusatz := coalesce((select array_agg(distinct x order by x) from jsonb_array_elements_text(coalesce(p_daten->'fahrlehrer_zusatz', '[]'::jsonb)) x where x in ('ASF', 'FES', 'AUSBILDUNG', 'BKF', 'ANWAERTER')), '{}');
  perform set_config('kompass.klassen_ok', '1', true);
  update public.profiles set fahrlehrerlaubnis = n.fahrlehrerlaubnis, klassen = n.klassen, fuehrerschein_klassen = n.fuehrerschein_klassen,
    fuehrerschein_c_bis = n.fuehrerschein_c_bis, fuehrerschein_d_bis = n.fuehrerschein_d_bis, sz95_bis = n.sz95_bis,
    fortbildung_bis = n.fortbildung_bis, fahrlehrer_zusatz = n.fahrlehrer_zusatz where id = p_id;
  perform set_config('kompass.klassen_ok', '', true);
  foreach f in array array['fahrlehrerlaubnis', 'klassen', 'fuehrerschein_klassen', 'fuehrerschein_c_bis', 'fuehrerschein_d_bis', 'sz95_bis', 'fortbildung_bis', 'fahrlehrer_zusatz'] loop
    execute format('select ($1).%I::text, ($2).%I::text', f, f) into a, b using z, n;
    if a is distinct from b and not (coalesce(a, '{}') = '{}' and coalesce(b, '{}') = '{}') then
      insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
      values (z.fahrschule_id, 'profiles', p_id::text, f, a, b, auth.uid(), public.buero_bearbeiter());
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'klassen', to_jsonb(kl));
exception when invalid_datetime_format or datetime_field_overflow then
  return jsonb_build_object('fehler', 'datum');
end $function$;

create or replace function public.buero_fahrlehrer_klassen(p_id uuid, p_klassen text[])
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare z public.profiles; neu text[];
begin
  select * into z from public.profiles where id = p_id;
  if z.id is null or not (z.rolle in ('fahrlehrer', 'super_admin') or (z.rolle = 'fahrschule_admin' and z.faehrt_selbst)) then return jsonb_build_object('fehler', 'unbekannt'); end if;
  if not public.buero_darf_verwalten(z.fahrschule_id) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  neu := coalesce((select array_agg(distinct k order by k) from unnest(p_klassen) k where k ~ '^[A-Z0-9+]{1,6}$'), '{}');
  if neu is not distinct from coalesce(z.klassen, '{}') then return jsonb_build_object('ok', true); end if;
  perform set_config('kompass.klassen_ok', '1', true);
  update public.profiles set klassen = neu where id = p_id;
  perform set_config('kompass.klassen_ok', '', true);
  insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
  values (z.fahrschule_id, 'profiles', p_id::text, 'klassen', array_to_string(coalesce(z.klassen, '{}'), ', '), array_to_string(neu, ', '), auth.uid(), public.buero_bearbeiter());
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.fahrstunden_uebertragen(p_ids text[], p_ziel uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_fs uuid; v_zfs uuid; v_n integer;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '42501'; end if;
  if not (is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    raise exception 'Nur die Fahrschul-Leitung darf Fahrstunden uebertragen.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'Hoechstens 500 Stunden auf einmal.'; end if;
  v_fs := my_fahrschule_id();
  select fahrschule_id into v_zfs from public.profiles where id = p_ziel and (rolle = 'fahrlehrer' or (rolle = 'fahrschule_admin' and faehrt_selbst)) and aktiv;
  if v_zfs is null or (v_zfs is distinct from v_fs and not is_super_admin(auth.uid())) then
    raise exception 'Ziel-Fahrlehrer nicht gefunden oder nicht aktiv.';
  end if;
  update public.kalender_termine t
     set fahrlehrer_id = p_ziel, fahrschule_id = v_zfs, aktualisiert_am = now()
   where t.id = any(p_ids) and t.geloescht = false and t.admin_entfernt_am is null
     and t.art in ('fahrstunde', 'sonder', 'nacht') and t.fahrschule_id = v_zfs;
  get diagnostics v_n = row_count;
  return v_n;
end $function$;
