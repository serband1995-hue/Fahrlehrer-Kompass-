-- Fix (14.11.2026): Angemeldete Nutzer dürfen is_user_active() nicht direkt aufrufen
-- ("permission denied for function is_user_active"). Eigene Prüf-Funktion für die Theorie-Regeln.
create or replace function public.theorie_aktiv()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select aktiv from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.theorie_aktiv() from public, anon;
grant execute on function public.theorie_aktiv() to authenticated;

create or replace function public.theorie_darf_bibliothek()
returns boolean language sql stable security definer set search_path = public as $$
  select public.theorie_aktiv() and (
    public.is_super_admin(auth.uid())
    or exists (select 1 from public.theorie_freigabe f where f.fahrschule_id = public.my_fahrschule_id())
  );
$$;

alter policy theorie_dateien_eigen on public.theorie_dateien
  using (owner = auth.uid() and public.theorie_aktiv())
  with check (owner = auth.uid() and public.theorie_aktiv() and pfad like 'eigene/' || auth.uid()::text || '/%');
alter policy theorie_unterrichte_eigen on public.theorie_unterrichte
  using (owner = auth.uid() and public.theorie_aktiv())
  with check (owner = auth.uid() and public.theorie_aktiv());
alter policy theorie_eigene_lesen on storage.objects
  using (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
         and (storage.foldername(name))[2] = auth.uid()::text and public.theorie_aktiv());
alter policy theorie_eigene_hochladen on storage.objects
  with check (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
              and (storage.foldername(name))[2] = auth.uid()::text and public.theorie_aktiv());
