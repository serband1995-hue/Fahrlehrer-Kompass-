-- Fahrstunden verwalten (nur Fahrschul-Leitung / Super-Admin): entfernen und übertragen.
alter table public.kalender_termine add column if not exists admin_entfernt_am timestamptz;

-- Ein von der Leitung entfernter Termin darf von einem Gerät nicht wieder belebt werden.
create or replace function public.termin_entfernt_schutz() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if old.admin_entfernt_am is not null then
    raise exception 'Dieser Termin wurde von der Leitung entfernt.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_termin_entfernt_schutz on public.kalender_termine;
create trigger trg_termin_entfernt_schutz before update on public.kalender_termine
  for each row execute function public.termin_entfernt_schutz();

create or replace function public.fahrstunden_entfernen(p_ids text[]) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare v_fs uuid; v_n integer;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '42501'; end if;
  if not (is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    raise exception 'Nur die Fahrschul-Leitung darf Fahrstunden entfernen.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'Höchstens 500 Stunden auf einmal.'; end if;
  v_fs := my_fahrschule_id();
  update public.kalender_termine t
     set geloescht = true, admin_entfernt_am = now(), aktualisiert_am = now()
   where t.id = any(p_ids) and t.geloescht = false and t.admin_entfernt_am is null
     and t.art in ('fahrstunde', 'sonder', 'nacht')
     and (is_super_admin(auth.uid()) or t.fahrschule_id = v_fs);
  get diagnostics v_n = row_count;
  delete from public.kalender_termine where admin_entfernt_am < now() - interval '30 days';
  return v_n;
end $$;

create or replace function public.fahrstunden_uebertragen(p_ids text[], p_ziel uuid) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare v_fs uuid; v_zfs uuid; v_n integer;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '42501'; end if;
  if not (is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then
    raise exception 'Nur die Fahrschul-Leitung darf Fahrstunden übertragen.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'Höchstens 500 Stunden auf einmal.'; end if;
  v_fs := my_fahrschule_id();
  select fahrschule_id into v_zfs from public.profiles where id = p_ziel and rolle = 'fahrlehrer' and aktiv;
  if v_zfs is null or (v_zfs is distinct from v_fs and not is_super_admin(auth.uid())) then
    raise exception 'Ziel-Fahrlehrer nicht gefunden oder nicht aktiv.';
  end if;
  update public.kalender_termine t
     set fahrlehrer_id = p_ziel, fahrschule_id = v_zfs, aktualisiert_am = now()
   where t.id = any(p_ids) and t.geloescht = false and t.admin_entfernt_am is null
     and t.art in ('fahrstunde', 'sonder', 'nacht') and t.fahrschule_id = v_zfs;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.fahrstunden_entfernen(text[]) from public, anon;
revoke all on function public.fahrstunden_uebertragen(text[], uuid) from public, anon;
grant execute on function public.fahrstunden_entfernen(text[]) to authenticated;
grant execute on function public.fahrstunden_uebertragen(text[], uuid) to authenticated;

-- Täglich 03:17 (UTC): endgültig aus der Datenbank entfernen, was seit 30 Tagen von der Leitung entfernt ist.
select cron.schedule('fahrstunden-endgueltig-entfernen', '17 3 * * *',
  $$delete from public.kalender_termine where admin_entfernt_am < now() - interval '30 days'$$);
