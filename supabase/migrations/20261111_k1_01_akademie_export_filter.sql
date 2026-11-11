-- K1 (11.11.2026) · KD9, Teil von BR15 und BR6.
-- Der Export an die Fahr-Akademie liefert nur noch
--   1. Schüler von Fahrschulen, bei denen der Schalter konfiguration.akademie_export = true steht, und
--   2. Schüler in Ausbildung (nicht bestanden, nicht vom Büro auf inaktiv gesetzt).
-- Vorher: alle Schüler mit status = 'aktiv', aus allen Fahrschulen.
-- Rückweg: supabase/rueckweg/20261111_k1_rueckweg.sql, Abschnitt 1.

-- Schalter: heute nutzt nur die Fahrschule Boost die Brücke. Die Test-Fahrschule bleibt aus.
update public.fahrschulen
   set konfiguration = coalesce(konfiguration, '{}'::jsonb) || jsonb_build_object('akademie_export', true)
 where slug = 'boost';

-- Gemeinsame Grundlage für beide Exporte (Schülerliste und Prüfungstermine).
-- in_ausbildung = false: aktiv geführt, aber bestanden oder archiviert. Solche Zeilen braucht nur der Termin-Export,
-- um doppelte Telefonnummern zu erkennen; herausgegeben werden sie nicht.
create view public.v_akademie_export_schueler
with (security_invoker = on) as
select s.id,
       s.name,
       s.telefon,
       s.email,
       nullif(s.ausbildung ->> 'form', '') as klasse,
       s.status,
       (coalesce(s.ausbildung ->> 'passed', '') = ''
        and s.praxis_bestanden_am is null
        and s.inaktiv_seit is null) as in_ausbildung
  from public.schueler s
  join public.fahrschulen f on f.id = s.fahrschule_id
 where s.status = 'aktiv'
   and f.aktiv = true
   and (f.konfiguration ->> 'akademie_export') = 'true';

revoke all on public.v_akademie_export_schueler from public, anon, authenticated;
grant select on public.v_akademie_export_schueler to service_role;

-- Die Sicht, die kompass-schueler-export liest: gleiche vier Felder wie bisher, security_invoker bleibt an.
create or replace view public.v_akademie_schueler_export
with (security_invoker = on) as
select name, telefon, email, klasse
  from public.v_akademie_export_schueler
 where in_ausbildung;

revoke all on public.v_akademie_schueler_export from public, anon, authenticated;
grant select on public.v_akademie_schueler_export to service_role;
