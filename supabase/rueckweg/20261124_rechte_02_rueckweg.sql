-- Rückweg zu 20261124_rechte_02_theorie_fahrlehrer.sql: Funktionstext wie live vor der Änderung (24.11.2026).
CREATE OR REPLACE FUNCTION public.schueler_buero_felder_schutz()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  darf boolean := auth.uid() is null
    or is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid());
begin
  if darf then return new; end if;
  if tg_op = 'INSERT' then
    new.reakt_status := 'pruefen'; new.reakt_bezahlt_bis := null; new.reakt_notiz := null;
    new.reakt_betrag := null; new.b197_testfahrt_am := null; new.inaktiv_seit := null; new.antrag_am := null;
    new.praxis_bestanden_am := null; new.theorie_frist_bis := null;
    return new;
  end if;
  if new.vertrag_am is distinct from old.vertrag_am
     or new.klasse is distinct from old.klasse
     or new.ausbildungsart is distinct from old.ausbildungsart
     or new.reakt_status is distinct from old.reakt_status
     or new.reakt_bezahlt_bis is distinct from old.reakt_bezahlt_bis
     or new.reakt_notiz is distinct from old.reakt_notiz
     or new.reakt_betrag is distinct from old.reakt_betrag
     or new.theorie_abgeschlossen_am is distinct from old.theorie_abgeschlossen_am
     or new.theorie_bestanden_am is distinct from old.theorie_bestanden_am
     or new.praxis_bestanden_am is distinct from old.praxis_bestanden_am
     or new.b197_testfahrt_am is distinct from old.b197_testfahrt_am
     or new.inaktiv_seit is distinct from old.inaktiv_seit
     or new.antrag_am is distinct from old.antrag_am
     or new.theorie_frist_bis is distinct from old.theorie_frist_bis then
    raise exception 'Fristen, Reaktivierung und Aktiv-Status darf nur das Büro ändern.';
  end if;
  return new;
end $function$;
-- Ergebnis-Abfrage: erwartet ausnahme = false
select position('theorie_ok' in pg_get_functiondef('public.schueler_buero_felder_schutz'::regproc)) > 0 as ausnahme;
