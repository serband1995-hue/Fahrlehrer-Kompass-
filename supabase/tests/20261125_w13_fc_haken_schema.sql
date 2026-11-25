-- Teil der Live-Tabelle kalender_termine samt Zugriffsregeln (aus supabase/schema/rechte-abzug.sql), nur für den lokalen Test.
create table if not exists public.kalender_termine (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, schueler_id text, art text, datum date,
  von time, bis time, status text, geloescht boolean default false, payload jsonb default '{}'::jsonb, buero_fc_status text default 'offen',
  buero_fc_nachgereicht_am date, aktualisiert_am timestamptz);
alter table public.kalender_termine enable row level security;
create policy "Buero sieht und bearbeitet Termine der Fahrschule" on public.kalender_termine as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id()))) with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer bearbeitet eigene Termine" on public.kalender_termine as PERMISSIVE for UPDATE to public
  using ((fahrlehrer_id = auth.uid())) with check ((fahrlehrer_id = auth.uid()));
create policy "Fahrlehrer legt eigene Termine an" on public.kalender_termine as PERMISSIVE for INSERT to public
  with check (((fahrlehrer_id = auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrlehrer sieht eigene Termine" on public.kalender_termine as PERMISSIVE for SELECT to public using ((fahrlehrer_id = auth.uid()));
create policy "Fahrschule-Admin verwaltet eigene Termine" on public.kalender_termine as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id()))) with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Termine" on public.kalender_termine as PERMISSIVE for ALL to public using (is_super_admin(auth.uid()));
grant select, insert, update, delete on public.kalender_termine to authenticated;
