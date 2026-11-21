-- Rückweg zu 20261121_zugang_01_profil_schutz_server.sql: profil_schutz wie vor dem 21.11.2026
-- (Rolle/Fahrschule/E-Mail/Aktiv nur Super-Admin). Danach gehen update_account (Rollenwechsel, E-Mail) und delete_account nicht mehr.
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
    if not is_super_admin(auth.uid()) then
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
-- Gelöschte Zugänge (rolle = 'entfernt') bleiben so; zurückholen nur von Hand (Rolle, aktiv, E-Mail, Sperre im Anmeldekonto).

-- ===== Abschnitt 2: Rückweg zu 20261121_zugang_02_leitung_faehrt_selbst.sql =====
-- Die drei Funktionen nehmen wieder nur Fahrlehrer/Super-Admin als Ziel an (Bedingung in der ersten Zeile zurück):
--   buero_fahrlehrer_akte / buero_fahrlehrer_klassen:  z.rolle not in ('fahrlehrer', 'super_admin')
--   fahrstunden_uebertragen:                            ... where id = p_ziel and rolle = 'fahrlehrer' and aktiv;
-- Am einfachsten: die Funktionsdefinitionen aus dieser Migration nehmen und nur diese Bedingungen zurücksetzen.
-- profil_schutz: die Fassung aus 20261121_zugang_01_profil_schutz_server.sql erneut einspielen (ohne faehrt_selbst).
-- Die Spalte erst danach entfernen (die App liest sie über select * und kommt ohne sie aus; vorher App-Stand zurücksetzen,
-- weil die Fahrlehrer-Listen in der App nach faehrt_selbst filtern):
-- alter table public.profiles drop column if exists faehrt_selbst;
