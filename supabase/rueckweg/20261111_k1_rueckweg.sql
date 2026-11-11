-- Rückweg für K1 (11.11.2026). Jeder Abschnitt lässt sich einzeln ausführen und stellt den Stand vom 10.11.2026 her.
-- Server-Funktionen: alte Fassungen liegen in der Git-Geschichte dieses Ordners bzw. als Version davor in Supabase
--   (trigger-akademie-push v3, trigger-akademie-fortschritt v3, kompass-termine-export v2).

-- 1. Export an die Akademie wieder ohne Filter (erst kompass-termine-export auf v2 zurücksetzen, dann dies)
create or replace view public.v_akademie_schueler_export
with (security_invoker = on) as
select name, telefon, email, nullif(ausbildung ->> 'form', '') as klasse
  from public.schueler s
 where status = 'aktiv';
drop view if exists public.v_akademie_export_schueler;
update public.fahrschulen set konfiguration = konfiguration - 'akademie_export';

-- 2. Test-Schüler der Test-Fahrschule entfernen (nur erfundene Zeilen, Kennung beginnt mit "muster-")
delete from public.schueler
 where id like 'muster-%'
   and fahrschule_id = (select id from public.fahrschulen where slug = 'test-fahrschule');

-- 3. Büro darf wieder endgültig löschen
drop policy if exists "Buero loescht nicht endgueltig" on public.schueler;
drop policy if exists "Buero loescht nicht endgueltig" on public.kalender_termine;
drop policy if exists "Buero loescht nicht endgueltig" on public.kalender_pruefungen;
drop policy if exists "Buero loescht nicht endgueltig" on public.provisionen;

-- 4. Backup-Funktion wie vorher (ohne Aufruferprüfung, ohne Recht für angemeldete Nutzer)
revoke execute on function public.fahrschule_backup_erstellen(uuid, boolean) from authenticated;
create or replace function public.fahrschule_backup_erstellen(fs_id uuid, ist_automatisch boolean default true)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  neue_id uuid;
  payload jsonb;
begin
  select jsonb_build_object(
    'schueler', (select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from public.schueler s where s.fahrschule_id = fs_id and s.status <> 'geloescht'),
    'kalender_termine', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.kalender_termine t where t.fahrschule_id = fs_id and t.geloescht = false),
    'kalender_pruefungen', (select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.kalender_pruefungen p where p.fahrschule_id = fs_id and p.geloescht = false),
    'fahrschule_fahrzeuge', (select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from public.fahrschule_fahrzeuge f where f.fahrschule_id = fs_id and f.aktiv = true)
  ) into payload;
  insert into public.fahrschule_backups (fahrschule_id, automatisch, daten)
  values (fs_id, ist_automatisch, payload)
  returning id into neue_id;
  return neue_id;
end;
$function$;

-- 5. Löschregel für Gelesen-Marken wieder weg
drop policy if exists "Gelesen Buero loescht" on public.schueler_notiz_gelesen;

-- 6. Einmal-Kopien entfernen (erst, wenn sicher nichts mehr gebraucht wird)
-- drop schema sicherung cascade;
