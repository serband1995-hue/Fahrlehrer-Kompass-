-- Rückweg zu supabase/migrations/20261124_rechte_01_urlaub_tafelbild.sql: alte INSERT-Regeln (nur Fahrschule) zurück.
drop trigger if exists trg_urlaub_eigener_eintrag on public.fahrschule_urlaub;
drop trigger if exists trg_tafelbild_eigener_eintrag on public.fahrschule_tafelbilder;
drop function if exists public.eigener_eintrag_setzen();
drop policy if exists "Fahrlehrer traegt eigenen Urlaub ein" on public.fahrschule_urlaub;
create policy "Fahrlehrer traegt eigenen Urlaub ein" on public.fahrschule_urlaub as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()));
drop policy if exists "Fahrlehrer teilt eigenes Tafelbild" on public.fahrschule_tafelbilder;
create policy "Fahrlehrer teilt eigenes Tafelbild" on public.fahrschule_tafelbilder as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()));
-- Ergebnis-Abfrage: erwartet 0
select count(*) as trigger from pg_trigger where tgname in ('trg_urlaub_eigener_eintrag', 'trg_tafelbild_eigener_eintrag');
