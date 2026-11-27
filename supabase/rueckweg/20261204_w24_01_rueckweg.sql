-- Rückweg zu 20261204_w24_01_sicherung_vollstaendig.sql
-- Folgen: „Jetzt sichern“ sichert wieder nur die 4 Tabellen von k1_04; Vorschau/Wiederherstellen gibt es nicht mehr.
-- Vorhandene Sicherungen (auch Format 2, mit geschütztem Teil in fahrschule_backups_privat) und die neuen Spalten BLEIBEN (nichts geht verloren; Herunterladen geht weiter).
-- Der Nachtlauf „kompass-sicherung-nacht“ wird entfernt und der frühere Auftrag „woechentliches-fahrschule-backup“ (täglich
-- 02:00 UTC, alle_fahrschulen_woechentlich_sichern) wieder geplant.
-- Büro/App ab W24 rufen fahrschule_backup_vorschau auf: vorher die Seiten auf den Stand davor zurücksetzen.
begin;
do $r$
declare j record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for j in execute 'select jobid from cron.job where jobname = ''kompass-sicherung-nacht''' loop
      perform cron.unschedule(j.jobid);
    end loop;
    if to_regprocedure('public.alle_fahrschulen_woechentlich_sichern()') is not null then
      perform cron.schedule('woechentliches-fahrschule-backup', '0 2 * * *', 'select public.alle_fahrschulen_woechentlich_sichern()');
    end if;
  end if;
end;
$r$;
drop function if exists public.fahrschule_backup_wiederherstellen(uuid, text, text[], text);
drop function if exists public.fahrschule_backup_vorschau(uuid, text, text[]);
drop function if exists public.fahrschule_backups_nachtlauf();
drop function if exists public.fahrschule_backups_aufraeumen(uuid);
drop function if exists public.w24_vorschau(uuid, text, text[]);
drop function if exists public.w24_vergleich(text, text, text, uuid, jsonb, text[]);

-- Funktion wie k1_04
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

drop function if exists public.w24_sichern(uuid, text, uuid, jsonb);
drop function if exists public.w24_darf(uuid, text);
drop function if exists public.w24_zeilen(text, text, text, uuid);
drop function if exists public.w24_teil(jsonb, text[]);
drop function if exists public.w24_bereich_sql(text, text, text);
drop function if exists public.w24_tabellen();
drop function if exists public.w24_ausgenommen();
drop function if exists public.w24_ohne_spalten(text);
drop function if exists public.w24_privat_tabellen();
drop function if exists public.w24_backup_inhalt(uuid);
drop function if exists public.w24_tabellen_liste();

drop policy if exists "Fahrschule-Admin/Buero erstellt eigene Backups" on public.fahrschule_backups;
create policy "Fahrschule-Admin/Buero erstellt eigene Backups" on public.fahrschule_backups as PERMISSIVE for INSERT to public
  with check (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
commit;
