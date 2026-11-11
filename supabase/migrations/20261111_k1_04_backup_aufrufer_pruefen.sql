-- K1 (11.11.2026) · KD7. Knopf „Jetzt sichern“ in der Fahrschul-Ansicht.
-- Vorher: kein Ausführungsrecht für angemeldete Nutzer (Knopf zeigte „permission denied“), und die Funktion
-- prüfte den Aufrufer nicht. Jetzt: erst prüfen, dann das Recht geben.
--   · Aufruf mit Nutzer: nur aktives Konto; Super-Admin für jede Fahrschule, Leitung und Büro nur für die eigene.
--     Solche Sicherungen zählen immer als „von Hand“ (automatisch = false), egal was der Aufrufer mitgibt.
--   · Aufruf ohne Nutzer (Nachtlauf, Server-Schlüssel): wie bisher.
-- Rückweg: supabase/rueckweg/20261111_k1_rueckweg.sql, Abschnitt 4.
create or replace function public.fahrschule_backup_erstellen(fs_id uuid, ist_automatisch boolean default true)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  neue_id uuid;
  payload jsonb;
  v_uid uuid := auth.uid();
  v_rolle text := coalesce(auth.role(), '');
  v_automatisch boolean := coalesce(ist_automatisch, true);
begin
  if v_uid is not null or v_rolle in ('authenticated', 'anon') then
    if v_uid is null
       or not exists (select 1 from public.profiles p where p.id = v_uid and p.aktiv = true)
       or not (
         public.is_super_admin(v_uid)
         or ((public.is_fahrschule_admin(v_uid) or public.is_buero(v_uid)) and fs_id = public.my_fahrschule_id())
       ) then
      raise exception 'Keine Berechtigung für diese Sicherung' using errcode = '42501';
    end if;
    v_automatisch := false;
  end if;

  if not exists (select 1 from public.fahrschulen f where f.id = fs_id) then
    raise exception 'Fahrschule nicht gefunden' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'schueler', (select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from public.schueler s where s.fahrschule_id = fs_id and s.status <> 'geloescht'),
    'kalender_termine', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.kalender_termine t where t.fahrschule_id = fs_id and t.geloescht = false),
    'kalender_pruefungen', (select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.kalender_pruefungen p where p.fahrschule_id = fs_id and p.geloescht = false),
    'fahrschule_fahrzeuge', (select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from public.fahrschule_fahrzeuge f where f.fahrschule_id = fs_id and f.aktiv = true)
  ) into payload;

  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten)
  values (fs_id, v_automatisch, payload)
  returning id into neue_id;

  return neue_id;
end;
$function$;

revoke all on function public.fahrschule_backup_erstellen(uuid, boolean) from public, anon;
grant execute on function public.fahrschule_backup_erstellen(uuid, boolean) to authenticated, service_role;
