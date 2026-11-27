-- =====================================================================================================================
-- W22 (Fahrlehrer-Kompass) – Teil 1: NUR LESEN. Projekt oectrvkjunntzsggyhxv. NIE im Akademie-Projekt ausfuehren.
-- EINE Abfrage, liefert EIN json. Nur IDs und Zahlen, keine Namen, keine Telefonnummern. Aendert nichts.
-- Zweck: Wer ist heute Umschreiber – laut Buero (Spalte schueler.ausbildungsart), laut App-Stand in der Datenbank
-- (schueler.ausbildung->>'umschreiber', vom Fahrlehrer-Geraet geschrieben) und laut App-Sicherung (snapshots.data.students[])?
-- Abweichungen in beide Richtungen. Geloeschte Schueler (status = 'geloescht') zaehlen nicht.
-- =====================================================================================================================
with sch as (
  select s.id::text as id, s.fahrschule_id, s.fahrlehrer_id,
         coalesce(s.ausbildungsart::text, '') = 'umschreibung' as buero,
         coalesce(s.ausbildung->>'umschreiber', '') in ('true', 't', '1') as app_jsonb
  from public.schueler s
  where coalesce(s.status::text, '') <> 'geloescht'
), snap as (
  select distinct on (st->>'id') st->>'id' as id, sn.user_id,
         coalesce(st->>'umschreiber', '') in ('true', 't', '1') as app_snap
  from public.snapshots sn
  cross join lateral jsonb_array_elements(case when jsonb_typeof(sn.data->'students') = 'array' then sn.data->'students' else '[]'::jsonb end) st
  where st ? 'id'
  order by st->>'id', sn.updated_at desc
), alle as (
  select coalesce(sch.id, snap.id) as id, sch.id is not null as in_schueler, sch.fahrschule_id,
         coalesce(sch.buero, false) as buero, coalesce(sch.app_jsonb, false) as app_jsonb, coalesce(snap.app_snap, false) as app_snap
  from sch full join snap on snap.id = sch.id
)
select json_build_object(
  'schueler_gesamt',                    (select count(*) from sch),
  'buero_umschreiber',                  (select count(*) from sch where buero),
  'app_jsonb_umschreiber',              (select count(*) from sch where app_jsonb),
  'app_sicherung_umschreiber',          (select count(*) from snap where app_snap),
  'app_sicherung_nur_ohne_fahrschule',  (select count(*) from alle where app_snap and not in_schueler),
  -- Buero sagt Umschreiber, App (jsonb) nicht: neue App holt das nach (setzt Merker „vom Buero“)
  'buero_ja_app_nein',                  (select count(*) from alle where in_schueler and buero and not app_jsonb),
  'buero_ja_app_nein_ids',              (select coalesce(json_agg(id order by id), '[]'::json) from alle where in_schueler and buero and not app_jsonb),
  -- App sagt Umschreiber, Buero (Spalte) nicht: so bleibt es, bis HS7/Serband entscheidet (W22 aendert nichts)
  'app_ja_buero_nein',                  (select count(*) from alle where in_schueler and not buero and (app_jsonb or app_snap)),
  'app_ja_buero_nein_ids',              (select coalesce(json_agg(id order by id), '[]'::json) from alle where in_schueler and not buero and (app_jsonb or app_snap)),
  -- jsonb und Sicherung uneinig (Geraet hat noch nicht hochgeladen o. ae.)
  'jsonb_ungleich_sicherung',           (select count(*) from alle where in_schueler and app_jsonb <> app_snap),
  'beide_ja',                           (select count(*) from alle where in_schueler and buero and app_jsonb),
  'je_fahrschule',                      (select coalesce(json_agg(json_build_object('fahrschule_id', fahrschule_id, 'buero', b, 'app', a, 'abweichung', x)), '[]'::json)
                                         from (select fahrschule_id, count(*) filter (where buero) b, count(*) filter (where app_jsonb or app_snap) a,
                                                      count(*) filter (where buero <> (app_jsonb or app_snap)) x
                                               from alle where in_schueler group by fahrschule_id) q)
) as w22_umschreiber_stand;
