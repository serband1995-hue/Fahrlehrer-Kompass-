-- W20 (26.11.2026) · Büro darf den Verschiebungs-Verlauf seiner Fahrschule LESEN (Teil 4: Verlauf auf der Büro-Seite).
-- Lage (live, w20-1-lesen 1c): schueler_verschiebungen hat für Lesen nur „Fahrschule-Admin sieht eigene Verschiebungen“ (FOR ALL,
-- USING Leitung), „Fahrlehrer sieht eigene Benachrichtigungen“ (von/zu) und Super-Admin. Das Büro schreibt dort schon
-- (buero.js verschiebeSchueler; W18 hat dafür das WITH CHECK um Büro erweitert), konnte aber nichts lesen.
-- Neu: EINE Regel nur für SELECT (kein INSERT/UPDATE/DELETE, daher kein WITH CHECK nötig – Lehre W18 betrifft FOR ALL/UPDATE).
-- Rückweg: supabase/rueckweg/20261201_w20_03_rueckweg.sql
do $w20v$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'schueler_verschiebungen'
               and policyname = 'Buero sieht Verschiebungen der Fahrschule') then
    raise exception 'W20_ABBRUCH: Regel „Buero sieht Verschiebungen der Fahrschule“ gibt es schon.';
  end if;
end $w20v$;

create policy "Buero sieht Verschiebungen der Fahrschule" on public.schueler_verschiebungen
  as permissive for select to authenticated
  using (is_buero(auth.uid()) and fahrschule_id = my_fahrschule_id());
