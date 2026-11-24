-- Rechte Urlaub und Tafelbild (Werkstatt 12, 🗣 Serband 24.11.2026 über die Hauptsitzung):
-- Lesen bleibt fahrschulweit. Ein Fahrlehrer trägt Urlaub nur für sich selbst ein und teilt Tafelbilder nur unter
-- seinem eigenen Namen. Büro, Leitung (eigene Fahrschule) und Super-Admin bleiben unverändert.
-- Empfehlungen und Schichten sind schon richtig (geprüft): Empfehlung nur mit fahrlehrer_id = eigene ID,
-- Schichten verwaltet nur Büro/Leitung. Ein UPDATE-Recht für Fahrlehrer gibt es bei Urlaub und Tafelbild nicht.
-- Idempotent. Rückweg: supabase/rueckweg/20261124_rechte_rueckweg.sql

-- 1. INSERT-Regeln für Fahrlehrer verschärfen: nur mit eigener ID als Verfasser
drop policy if exists "Fahrlehrer traegt eigenen Urlaub ein" on public.fahrschule_urlaub;
create policy "Fahrlehrer traegt eigenen Urlaub ein" on public.fahrschule_urlaub as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()) and (erstellt_von = auth.uid()));
drop policy if exists "Fahrlehrer teilt eigenes Tafelbild" on public.fahrschule_tafelbilder;
create policy "Fahrlehrer teilt eigenes Tafelbild" on public.fahrschule_tafelbilder as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()) and (erstellt_von = auth.uid()));

-- 2. Server setzt Verfasser und Namen (nur für Nutzer ohne Büro-/Leitungsrolle; Büro/Leitung tragen für andere ein)
create or replace function public.eigener_eintrag_setzen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  p jsonb;
  nm text;
begin
  if auth.uid() is null then return new; end if; -- Server, Nachtläufe
  if is_super_admin(auth.uid()) or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) then return new; end if;
  select to_jsonb(x) into p from public.profiles x where x.id = auth.uid();
  nm := nullif(btrim(coalesce(p->>'name', '')), '');
  new.erstellt_von := auth.uid();
  if tg_table_name = 'fahrschule_urlaub' then
    -- nur für sich selbst: der Name kommt aus dem eigenen Profil (der Kalender gleicht Urlaub über den Namen ab)
    new.mitarbeiter_name := coalesce(nm, nullif(btrim(coalesce(p->>'email', '')), ''), new.mitarbeiter_name); -- wie der Kalender: name, sonst E-Mail
  elsif tg_table_name = 'fahrschule_tafelbilder' then
    new.ersteller_name := coalesce(nm, nullif(btrim(coalesce(p->>'email', '')), ''), new.ersteller_name);
  end if;
  return new;
end $function$;

drop trigger if exists trg_urlaub_eigener_eintrag on public.fahrschule_urlaub;
create trigger trg_urlaub_eigener_eintrag before insert on public.fahrschule_urlaub
  for each row execute function public.eigener_eintrag_setzen();
drop trigger if exists trg_tafelbild_eigener_eintrag on public.fahrschule_tafelbilder;
create trigger trg_tafelbild_eigener_eintrag before insert on public.fahrschule_tafelbilder
  for each row execute function public.eigener_eintrag_setzen();

-- Ergebnis-Abfrage: erwartet policies = 2, trigger = 2, funktion = 1
select (select count(*) from pg_policies where schemaname = 'public'
          and ((tablename = 'fahrschule_urlaub' and policyname = 'Fahrlehrer traegt eigenen Urlaub ein')
            or (tablename = 'fahrschule_tafelbilder' and policyname = 'Fahrlehrer teilt eigenes Tafelbild'))
          and with_check like '%erstellt_von = auth.uid()%') as policies,
       (select count(*) from pg_trigger where tgname in ('trg_urlaub_eigener_eintrag', 'trg_tafelbild_eigener_eintrag')) as trigger,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'eigener_eintrag_setzen') as funktion;
