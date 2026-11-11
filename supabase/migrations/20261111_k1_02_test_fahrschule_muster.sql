-- K1 (11.11.2026) · BE10. Erfundene Schüler für die Test-Fahrschule, damit niemand echte Namen vorführen muss.
-- Alle Namen sind erfunden (Nachname „Muster“), die Telefonnummern stammen aus dem Bereich, den die Bundesnetzagentur
-- für Film und Fernsehen freihält (0171 39200xx). Kein Anmelde-Konto, kein Fahrlehrer zugeordnet.
-- Die Test-Fahrschule hat den Akademie-Export aus (Migration k1_01): Diese Zeilen gehen NICHT an die Fahr-Akademie.
-- Rückweg: supabase/rueckweg/20261111_k1_rueckweg.sql, Abschnitt 2.
insert into public.schueler (id, fahrschule_id, name, telefon, status, klasse, ausbildungsart, vertrag_am, ausbildung)
select v.id, f.id, v.name, v.telefon, 'aktiv', v.klasse, 'ersterwerb', v.vertrag_am::date,
       jsonb_build_object('form', v.form, 'created', (extract(epoch from v.vertrag_am::timestamptz) * 1000)::bigint,
                          'beginn', v.vertrag_am, 'notiz', '', 'plan', '{}'::jsonb, 'risk', '{}'::jsonb,
                          'planSnapshot', '[]'::jsonb, 'standPct', v.stand, 'theoriePct', v.theorie)
  from public.fahrschulen f,
       (values
         ('muster-01', 'Anna Muster',    '0171 3920001', 'B', 'B',         '2026-08-03', 20, 40),
         ('muster-02', 'Ben Muster',     '0171 3920002', 'B', 'B',         '2026-08-17', 35, 60),
         ('muster-03', 'Clara Muster',   '0171 3920003', 'B', 'Automatik', '2026-09-01', 50, 100),
         ('muster-04', 'David Muster',   '0171 3920004', 'B', 'B197',      '2026-09-14', 65, 100),
         ('muster-05', 'Elif Muster',    '0171 3920005', 'B', 'B',         '2026-09-28', 80, 100),
         ('muster-06', 'Finn Muster',    '0171 3920006', 'B', 'B',         '2026-10-05', 10, 20),
         ('muster-07', 'Greta Muster',   '0171 3920007', 'B', 'Automatik', '2026-10-19', 5, 0),
         ('muster-08', 'Hamza Muster',   '0171 3920008', 'B', 'B197',      '2026-10-26', 90, 100)
       ) as v(id, name, telefon, klasse, form, vertrag_am, stand, theorie)
 where f.slug = 'test-fahrschule'
on conflict (id) do nothing;
