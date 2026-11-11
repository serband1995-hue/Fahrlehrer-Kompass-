-- K1 (11.11.2026) · Fund des Prüf-Teams: Die erfundenen Schüler der Test-Fahrschule passten nicht ganz zur App.
-- beginn als TT.MM.JJJJ (so zeigt und schreibt es die App); plan, risk und planSnapshot weg, damit die App den
-- Ausbildungsplan selbst anlegt. Betrifft nur die 8 erfundenen Zeilen (Kennung muster-…) der Test-Fahrschule.
update public.schueler s
   set ausbildung = (s.ausbildung - 'plan' - 'risk' - 'planSnapshot')
                    || jsonb_build_object('beginn', to_char(s.vertrag_am, 'DD.MM.YYYY'))
  from public.fahrschulen f
 where f.id = s.fahrschule_id and f.slug = 'test-fahrschule' and s.id like 'muster-%';
