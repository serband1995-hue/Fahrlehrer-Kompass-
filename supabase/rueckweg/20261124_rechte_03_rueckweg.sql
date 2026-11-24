-- Rückweg zu 20261124_rechte_03_empfehlungen.sql: Trigger weg, alte INSERT-Regel zurück.
drop trigger if exists trg_empfehlung_schutz on public.fahrschule_empfehlungen;
drop function if exists public.empfehlung_schutz();
drop policy if exists "Buero/Admin legt Empfehlungen an" on public.fahrschule_empfehlungen;
drop policy if exists "Fahrlehrer legt eigene Empfehlung an" on public.fahrschule_empfehlungen;
create policy "Fahrlehrer legt eigene Empfehlung an" on public.fahrschule_empfehlungen as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()) and (fahrlehrer_id = auth.uid()));
-- Ergebnis-Abfrage: erwartet 0
select count(*) as trigger from pg_trigger where tgname = 'trg_empfehlung_schutz';
