-- Rückweg zu supabase/migrations/20261130_w18_01_with_check_rolle.sql
-- Setzt das WITH CHECK der 14 Regeln wieder auf den alten Stand (nur eigene Fahrschule, ohne Rolle).
-- Achtung: damit ist die W18-Lücke wieder offen (Fahrlehrer kann Zeilen für Kollegen anlegen).
do $w18r$
declare r record;
begin
  for r in
    select p.tablename as tab, p.policyname as pol
      from pg_policies p
     where p.schemaname = 'public'
       and (p.tablename, p.policyname) in (
         ('schueler', 'Buero sieht und bearbeitet Schueler der Fahrschule'),
         ('schueler', 'Fahrschule-Admin verwaltet eigene Schueler'),
         ('kalender_termine', 'Buero sieht und bearbeitet Termine der Fahrschule'),
         ('kalender_termine', 'Fahrschule-Admin verwaltet eigene Termine'),
         ('kalender_pruefungen', 'Buero sieht und bearbeitet Pruefungen der Fahrschule'),
         ('kalender_pruefungen', 'Fahrschule-Admin verwaltet eigene Pruefungen'),
         ('provisionen', 'Buero sieht und bearbeitet Provisionen der Fahrschule'),
         ('provisionen', 'Fahrschule-Admin verwaltet eigene Provisionen'),
         ('fahrschule_schichten', 'Fahrschule-Admin/Buero verwaltet Schichten'),
         ('fahrschule_urlaub', 'Fahrschule-Admin/Buero verwaltet Urlaub'),
         ('fahrschule_tafelbilder', 'Fahrschule-Admin/Buero verwaltet Tafelbilder'),
         ('fahrschule_fahrzeuge', 'Fahrschule-Admin verwaltet eigene Fahrzeuge'),
         ('fahrschule_empfehlungen', 'Buero/Admin verwaltet Empfehlungen'),
         ('schueler_verschiebungen', 'Fahrschule-Admin sieht eigene Verschiebungen'))
  loop
    execute format('alter policy %I on public.%I with check ((fahrschule_id = my_fahrschule_id()))', r.pol, r.tab);
  end loop;
end
$w18r$;
