-- Zugang bearbeiten/löschen (🗣 Serband 21.11.2026).
-- profil_schutz: Rolle, Fahrschule, E-Mail und Aktiv darf bisher nur der Super-Admin ändern. Neu darf das auch die
-- Server-Funktion admin-create-account (Dienst-Schlüssel, JWT-Rolle service_role). Sie prüft die Rechte selbst
-- (Leitung/Büro-Verwalter nur in der eigenen Fahrschule, nie der Super-Admin, nie man selbst).
-- Für angemeldete Nutzer (App, Büro-Seite) ändert sich nichts. Der zweite Teil (ohne App, Klassen, Akte) ist unverändert.
-- Rückweg: supabase/rueckweg/20261121_zugang_rueckweg.sql
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
      or new.aktiv is distinct from old.aktiv) then
    if not is_super_admin(auth.uid())
       and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      raise exception 'Rolle, Fahrschule-Zuordnung, E-Mail und Aktiv-Status dürfen nur vom Super-Admin geändert werden.';
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
