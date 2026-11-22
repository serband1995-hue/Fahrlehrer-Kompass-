-- Rückweg zu 20261122_k6_01_schueler_ueberblick.sql (K6 Schüler-Überblick und Weitergeben).
-- Entfernt nur die Funktionen; Daten ändern sich nicht. Schon weitergegebene Schüler bleiben beim neuen Fahrlehrer
-- (zurückgeben wie bisher im Büro). Die App zeigt danach den Überblick nicht mehr (sie prüft das selbst).
drop function if exists public.schueler_weitergeben(text, uuid);
drop function if exists public.fs_kollegen();
drop function if exists public.fs_schueler_ueberblick();
drop function if exists public.k6_darf_verwalten();
drop function if exists public.k6_meine_fahrschule();
-- Schutz-Trigger ohne die Ausnahme „kompass.weitergabe“ (Stand vor K6):
create or replace function public.schueler_verschiebung_schutz() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if (new.fahrlehrer_id is distinct from old.fahrlehrer_id or new.fahrschule_id is distinct from old.fahrschule_id)
     and not (is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid())) then
    raise exception 'Nur Fahrschule-Admin, Büro oder Super-Admin dürfen Schüler verschieben.';
  end if;
  return new;
end; $function$;
create or replace function public.termin_verschiebung_schutz() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if (new.fahrlehrer_id is distinct from old.fahrlehrer_id or new.fahrschule_id is distinct from old.fahrschule_id)
     and not (is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid())) then
    raise exception 'Nur Fahrschule-Admin, Büro oder Super-Admin dürfen Termine verschieben.';
  end if;
  return new;
end; $function$;
