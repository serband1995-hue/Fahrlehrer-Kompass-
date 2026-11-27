-- W21 Lesen (nur lesen, eine Abfrage, keine Namen): Stand von Prüfungstafel, Kalender-Spiegel und App-Tafel vor dem Umbau.
select json_build_object(
  'spalten', (select json_object_agg(table_name, s) from (
      select table_name, json_agg(json_build_object('n', column_name, 't', data_type, 'null', is_nullable, 'd', column_default) order by ordinal_position) s
      from information_schema.columns where table_schema = 'public' and table_name in ('pruefungstermine', 'kalender_termine', 'kalender_pruefungen')
      group by table_name) x),
  'pt_constraints', (select json_agg(json_build_object('n', conname, 'def', pg_get_constraintdef(oid))) from pg_constraint where conrelid = 'public.pruefungstermine'::regclass),
  'pt_indexe', (select json_agg(indexdef) from pg_indexes where schemaname = 'public' and tablename = 'pruefungstermine'),
  'pt_trigger', (select json_agg(pg_get_triggerdef(oid)) from pg_trigger where tgrelid = 'public.pruefungstermine'::regclass and not tgisinternal),
  'pt_rechte', (select json_agg(json_build_object('r', grantee, 'p', privilege_type)) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'pruefungstermine'),
  'kt_trigger_fn', (select json_agg(json_build_object('n', p.proname, 'def', pg_get_functiondef(p.oid)))
      from pg_proc p where p.proname in ('termin_zahlung_sperre', 'termin_papierkorb', 'termin_verschiebung_schutz', 'termin_entfernt_schutz', 'termin_fc_haken_schutz')),
  'extensions', (select json_agg(json_build_object('n', name, 'an', installed_version)) from pg_available_extensions where name in ('btree_gist', 'pg_net', 'pg_cron')),
  'pt_zahlen', (select json_build_object(
      'gesamt', count(*),
      'je_status', (select json_object_agg(status, n) from (select status, count(*) n from public.pruefungstermine group by status) y),
      'je_art', (select json_object_agg(coalesce(art, '-'), n) from (select art, count(*) n from public.pruefungstermine group by art) y),
      'kuenftig', count(*) filter (where datum >= current_date),
      'ohne_uhrzeit', count(*) filter (where von is null),
      'mit_kalender', count(*) filter (where kalender_termin_id is not null),
      'uhrzeiten_kuenftig', (select json_object_agg(v, n) from (select coalesce(von::text, '-') v, count(*) n from public.pruefungstermine where datum >= current_date group by 1) y))
    from public.pruefungstermine),
  'pt_doppelt_schueler_tag', (select count(*) from (select schueler_id, datum from public.pruefungstermine where art = 'praxis' and status <> 'abgesagt' group by 1, 2 having count(*) > 1) d),
  'pt_doppelt_zeit', (select count(*) from (select fahrschule_id, datum, von from public.pruefungstermine where status <> 'abgesagt' and von is not null group by 1, 2, 3 having count(*) > 1) d),
  'spiegel_datum_abweichend', (select count(*) from public.pruefungstermine p join public.kalender_termine k on k.id = p.kalender_termin_id where k.datum <> p.datum or k.von is distinct from p.von),
  'kp_zahlen', (select json_build_object('gesamt', count(*), 'kuenftig', count(*) filter (where datum >= current_date), 'mit_ergebnis', count(*) filter (where result is not null)) from public.kalender_pruefungen where not geloescht),
  'app_tafel', (select json_build_object(
      'konten_mit_tafel', count(distinct s.user_id),
      'termine_kuenftig', count(*) filter (where t->>'date' >= current_date::text),
      'belegt_kuenftig', coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(t->'slots', '[]'::jsonb)) e where e is not null and e <> 'null')) filter (where t->>'date' >= current_date::text), 0),
      'uhrzeiten_kuenftig', (select json_object_agg(v, n) from (select coalesce(t2->>'von', '-') v, count(*) n from public.snapshots s2, jsonb_array_elements(case when jsonb_typeof(s2.data->'termine') = 'array' then s2.data->'termine' else '[]'::jsonb end) t2 where t2->>'date' >= current_date::text group by 1) y))
    from public.snapshots s, jsonb_array_elements(case when jsonb_typeof(s.data->'termine') = 'array' then s.data->'termine' else '[]'::jsonb end) t)
);
