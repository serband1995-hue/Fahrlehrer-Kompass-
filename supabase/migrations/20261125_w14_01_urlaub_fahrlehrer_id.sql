-- W14 Urlaub über die Fahrlehrer-ID (Auftrag Hauptsitzung 24.11.2026, von Serband freigegeben).
-- Bisher glich der Kalender Urlaub über den Namen ab (fahrschule_urlaub.mitarbeiter_name = Profilname). Wer seinen
-- Profilnamen änderte, konnte so Urlaub unter fremdem Namen eintragen; ein Tippfehler im Büro blockierte niemanden.
-- 1. Spalte fahrlehrer_id (leer = andere Person, z. B. Büro: steht nur in der Liste, blockt keinen Kalender).
-- 2. Altdaten: nur bei GENAU einem Namenstreffer in derselben Fahrschule zuordnen (gleiche Regel wie der Kalender bisher:
--    Profilname, sonst E-Mail, ohne Groß/klein und Leerzeichen am Rand). Mehrdeutige oder ohne Treffer bleiben leer.
-- 3. Trigger trg_urlaub_fahrlehrer (läuft nach trg_urlaub_eigener_eintrag, Reihenfolge nach Name):
--    Fahrlehrer: immer die eigene ID (eintragen nur für sich selbst). Büro/Leitung/Super-Admin: die ID muss ein Zugang
--    DERSELBEN Fahrschule sein, der Name kommt dann aus dessen Profil. Gilt auch bei Änderungen (UPDATE).
-- Idempotent. Rückweg: supabase/rueckweg/20261125_w14_urlaub_rueckweg.sql

-- ---------- 1. Spalte ----------
alter table public.fahrschule_urlaub add column if not exists fahrlehrer_id uuid references public.profiles(id) on delete set null;
create index if not exists fahrschule_urlaub_fahrlehrer_idx on public.fahrschule_urlaub (fahrschule_id, fahrlehrer_id);

-- ---------- 2. Altdaten (nur eindeutige Treffer) ----------
update public.fahrschule_urlaub u set fahrlehrer_id = t.pid
from (
  select u2.id, min(p.id::text)::uuid as pid, count(*) as n
  from public.fahrschule_urlaub u2
  join public.profiles p on p.fahrschule_id = u2.fahrschule_id
   and lower(btrim(coalesce(nullif(btrim(p.name), ''), p.email, ''))) = lower(btrim(coalesce(u2.mitarbeiter_name, '')))
  where u2.fahrlehrer_id is null and nullif(btrim(coalesce(u2.mitarbeiter_name, '')), '') is not null
  group by u2.id
) t
where u.id = t.id and t.n = 1;

-- ---------- 3. Trigger ----------
create or replace function public.urlaub_fahrlehrer_setzen()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  p record;
begin
  if auth.uid() is null then return new; end if; -- Server, Nachtläufe
  if not (is_super_admin(auth.uid()) or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) then
    -- Fahrlehrer (eine UPDATE-Regel hat er nicht): nur für sich selbst
    if tg_op = 'INSERT' then new.fahrlehrer_id := auth.uid(); else new.fahrlehrer_id := old.fahrlehrer_id; end if;
    return new;
  end if;
  if new.fahrlehrer_id is not null and (tg_op = 'INSERT' or new.fahrlehrer_id is distinct from old.fahrlehrer_id
                                        or new.fahrschule_id is distinct from old.fahrschule_id) then
    select x.id, x.name, x.email, x.fahrschule_id into p from public.profiles x where x.id = new.fahrlehrer_id;
    if not found or p.fahrschule_id is distinct from new.fahrschule_id then
      raise exception 'Diese Person gehört nicht zu dieser Fahrschule' using errcode = '22023';
    end if;
    new.mitarbeiter_name := coalesce(nullif(btrim(coalesce(p.name, '')), ''), nullif(btrim(coalesce(p.email, '')), ''), new.mitarbeiter_name);
  end if;
  return new;
end $function$;

revoke all on function public.urlaub_fahrlehrer_setzen() from public, anon, authenticated;

drop trigger if exists trg_urlaub_fahrlehrer on public.fahrschule_urlaub;
create trigger trg_urlaub_fahrlehrer before insert or update on public.fahrschule_urlaub
  for each row execute function public.urlaub_fahrlehrer_setzen();

-- Ergebnis-Abfrage: erwartet spalte = 1, trigger = 1, funktion = 1, zugeordnet = „eindeutig“ aus der Vorab-Abfrage,
-- ohne_id = gesamt − eindeutig
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'fahrschule_urlaub'
          and column_name = 'fahrlehrer_id') as spalte,
       (select count(*) from pg_trigger where tgname = 'trg_urlaub_fahrlehrer') as trigger,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'urlaub_fahrlehrer_setzen') as funktion,
       (select count(*) from public.fahrschule_urlaub where fahrlehrer_id is not null) as zugeordnet,
       (select count(*) from public.fahrschule_urlaub where fahrlehrer_id is null) as ohne_id;
