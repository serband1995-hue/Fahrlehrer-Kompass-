-- K6 Schüler-Überblick und Weitergeben (🗣 Serband, Boost-Termin 21.11.2026):
--   Jeder Fahrlehrer sieht alle Schüler der Fahrschule, aber nur als Überblick (Name, Prozent-Stand, Stand Theorie).
--   Akte, Ausbildungsplan, Prüfungsreife, Notizen bleiben gesperrt (die Tabellen-Regeln für schueler bleiben unverändert:
--   ein Fahrlehrer liest und ändert weiter nur eigene Schüler). Der eigene Fahrlehrer kann den Schüler an einen
--   Kollegen weitergeben (Spur in schueler_verschiebungen, künftige Termine gehen mit). Büro sieht und ändert alles wie bisher.
--   Entscheidungen Hauptsitzung 22.11.: Empfänger kann nicht ablehnen (Büro kann zurückgeben), keine Bestätigen-Fenster.
--
-- 1) fs_schueler_ueberblick(): schmale Liste der aktiven Schüler der eigenen Fahrschule (keine Telefonnummer, keine Akte).
-- 2) fs_kollegen(): Fahrlehrer der Fahrschule (Name, Klassen) als Empfänger fürs Weitergeben.
-- 3) schueler_weitergeben(schueler, an): nur der eigene Fahrlehrer (oder Büro/Leitung), Empfänger aktiv in derselben Fahrschule.
-- Alle drei SECURITY DEFINER mit eigener Prüfung – die Sperre liegt auf dem Server, nicht nur in der Anzeige.
-- Einmal ausführbar und wiederholbar (create or replace). Rückweg: supabase/rueckweg/20261122_k6_rueckweg.sql

create or replace function public.k6_meine_fahrschule()
 returns uuid
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select p.fahrschule_id from public.profiles p
   where p.id = auth.uid() and coalesce(p.aktiv, true) and coalesce(p.rolle, '') not in ('entfernt', '')
$function$;

create or replace function public.k6_darf_verwalten()
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(is_super_admin(auth.uid()) or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()), false)
$function$;

-- 0) Die Schutz-Trigger für Schüler und Termine (nur Leitung/Büro/Super-Admin dürfen verschieben) bekommen EINE Ausnahme:
--    die Server-Funktion schueler_weitergeben setzt innerhalb ihrer Transaktion kompass.weitergabe = '1'.
--    Von außen (REST) lässt sich das nicht setzen; sonst bleibt jede Zeile wie vorher (Stand 22.11.2026 laut Hauptsitzung).
create or replace function public.schueler_verschiebung_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (new.fahrlehrer_id is distinct from old.fahrlehrer_id or new.fahrschule_id is distinct from old.fahrschule_id)
     and not (is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid()))
     and not (coalesce(current_setting('kompass.weitergabe', true), '') = '1' and new.fahrschule_id is not distinct from old.fahrschule_id) then
    raise exception 'Nur Fahrschule-Admin, Büro oder Super-Admin dürfen Schüler verschieben.';
  end if;
  return new;
end;
$function$;

create or replace function public.termin_verschiebung_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (new.fahrlehrer_id is distinct from old.fahrlehrer_id or new.fahrschule_id is distinct from old.fahrschule_id)
     and not (is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid()))
     and not (coalesce(current_setting('kompass.weitergabe', true), '') = '1' and new.fahrschule_id is not distinct from old.fahrschule_id) then
    raise exception 'Nur Fahrschule-Admin, Büro oder Super-Admin dürfen Termine verschieben.';
  end if;
  return new;
end;
$function$;

-- 1) Überblick
create or replace function public.fs_schueler_ueberblick()
 returns table (id text, name text, fahrlehrer_id uuid, fahrlehrer_name text, eigen boolean, stand_pct integer,
                klasse text, form text, ausbildungsart text, vorbesitz jsonb, umschreiber boolean,
                theorie_bestanden_am date, theorie_lektionen text[])
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare fs uuid := k6_meine_fahrschule();
begin
  if fs is null then return; end if;
  return query
  select s.id::text, s.name, s.fahrlehrer_id,
         case when s.fahrlehrer_id is null then null else coalesce(nullif(btrim(p.name), ''), split_part(p.email, '@', 1), 'Fahrlehrer') end,
         (s.fahrlehrer_id = auth.uid()),
         case when (s.ausbildung->>'standPct') ~ '^-?[0-9]+(\.[0-9]+)?$' then greatest(0, least(100, round((s.ausbildung->>'standPct')::numeric)))::integer end,
         s.klasse::text, (s.ausbildung->>'form'), s.ausbildungsart::text,
         case when jsonb_typeof(to_jsonb(s.vorbesitz)) = 'array' then to_jsonb(s.vorbesitz) else '[]'::jsonb end,
         (coalesce(s.ausbildungsart::text, '') = 'umschreibung' or coalesce((s.ausbildung->>'umschreiber')::boolean, false)),
         s.theorie_bestanden_am::date,
         coalesce((select array_agg(distinct t.lektion::text) from public.theorie_teilnahme t
                    where t.schueler_id::text = s.id::text and t.entfernt_am is null), '{}')
    from public.schueler s
    left join public.profiles p on p.id = s.fahrlehrer_id
   where s.fahrschule_id = fs and s.status = 'aktiv'
   order by s.name
   limit 3000;
end;
$function$;
revoke all on function public.fs_schueler_ueberblick() from public, anon;
grant execute on function public.fs_schueler_ueberblick() to authenticated;

-- 2) Kollegen (Empfänger)
create or replace function public.fs_kollegen()
 returns table (id uuid, name text, klassen text[])
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare fs uuid := k6_meine_fahrschule();
begin
  if fs is null then return; end if;
  return query
  select p.id, coalesce(nullif(btrim(p.name), ''), split_part(p.email, '@', 1)), coalesce(p.klassen, '{}')::text[]
    from public.profiles p
   where p.fahrschule_id = fs and coalesce(p.aktiv, true)
     and (p.rolle = 'fahrlehrer' or (p.rolle = 'fahrschule_admin' and coalesce(p.faehrt_selbst, false)))
   order by 2;
end;
$function$;
revoke all on function public.fs_kollegen() from public, anon;
grant execute on function public.fs_kollegen() to authenticated;

-- 3) Weitergeben
create or replace function public.schueler_weitergeben(p_schueler text, p_an uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare fs uuid := k6_meine_fahrschule(); s public.schueler; ziel public.profiles; alt uuid; n integer := 0;
begin
  if fs is null or auth.uid() is null then return jsonb_build_object('fehler', 'keine_fahrschule'); end if;
  select * into s from public.schueler where id::text = p_schueler and fahrschule_id = fs and status = 'aktiv' for update;
  if s.id is null then return jsonb_build_object('fehler', 'unbekannt'); end if;
  if not (s.fahrlehrer_id = auth.uid() or k6_darf_verwalten()) then return jsonb_build_object('fehler', 'nicht_deiner'); end if;
  select * into ziel from public.profiles where id = p_an and fahrschule_id = fs and coalesce(aktiv, true)
     and (rolle = 'fahrlehrer' or (rolle = 'fahrschule_admin' and coalesce(faehrt_selbst, false)));
  if ziel.id is null then return jsonb_build_object('fehler', 'empfaenger'); end if;
  alt := s.fahrlehrer_id;
  if alt = p_an then return jsonb_build_object('ok', true, 'termine', 0); end if;
  perform set_config('kompass.weitergabe', '1', true); -- nur für diese Transaktion (Ausnahme in den Schutz-Triggern)
  -- Erst die künftigen Termine, dann der Schüler (wie im Büro): so landet nichts Ungefahrenes in der Übergabe-Spur
  if alt is not null then
    update public.kalender_termine set fahrlehrer_id = p_an, aktualisiert_am = now()
     where schueler_id::text = s.id::text and fahrlehrer_id = alt and datum >= current_date and not coalesce(geloescht, false)
       and admin_entfernt_am is null; -- von der Leitung entfernte Termine bleiben (Trigger termin_entfernt_schutz)
    get diagnostics n = row_count;
  end if;
  update public.schueler set fahrlehrer_id = p_an, aktualisiert_am = now() where id = s.id;
  insert into public.schueler_verschiebungen (schueler_id, von_fahrlehrer_id, zu_fahrlehrer_id, verschoben_von, fahrschule_id)
  values (s.id, alt, p_an, auth.uid(), fs);
  return jsonb_build_object('ok', true, 'termine', n, 'an_name', coalesce(nullif(btrim(ziel.name), ''), split_part(ziel.email, '@', 1)));
end;
$function$;
revoke all on function public.schueler_weitergeben(text, uuid) from public, anon;
grant execute on function public.schueler_weitergeben(text, uuid) to authenticated;
revoke all on function public.k6_meine_fahrschule() from public, anon;
grant execute on function public.k6_meine_fahrschule() to authenticated;
revoke all on function public.k6_darf_verwalten() from public, anon;
grant execute on function public.k6_darf_verwalten() to authenticated;
