-- Grenzen für eigene Dateien und Unterrichte (Fund Fehlersucher Daten, 14.11.2026).
-- Je Fahrlehrer höchstens 100 eigene Dateien und 1 GB; Pfad im Speicher nur .pptx oder .pdf; teile höchstens ~100 KB.
create or replace function public.theorie_dateien_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int; summe bigint;
begin
  select count(*), coalesce(sum(bytes), 0) into n, summe from public.theorie_dateien where owner = new.owner;
  if n >= 100 then raise exception 'Zu viele eigene Dateien (höchstens 100).'; end if;
  if summe + new.bytes > 1073741824 then raise exception 'Speicher voll (höchstens 1 GB eigene Dateien).'; end if;
  return new;
end $$;
revoke all on function public.theorie_dateien_grenze() from public, anon, authenticated;
drop trigger if exists theorie_dateien_grenze on public.theorie_dateien;
create trigger theorie_dateien_grenze before insert on public.theorie_dateien
  for each row execute function public.theorie_dateien_grenze();

alter table public.theorie_unterrichte add constraint theorie_unterrichte_teile_groesse
  check (pg_column_size(teile) < 100000);

alter policy theorie_eigene_hochladen on storage.objects
  with check (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
              and (storage.foldername(name))[2] = auth.uid()::text
              and lower(name) ~ '\.(pptx|pdf)$'
              and public.theorie_aktiv());
