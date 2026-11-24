-- Empfehlungen: Geld nur durch Büro, Leitung, Super-Admin (Werkstatt 12, Entscheidung Hauptsitzung 24.11.2026).
-- Fund (Fable): Ein Fahrlehrer konnte eine eigene Empfehlung gleich mit status 'bezahlt' und beliebigem betrag anlegen
-- und beim Stornieren fahrlehrer_id/betrag mit ändern. Neu, nur für Fahrlehrer (ohne Büro-/Leitungsrolle):
--   * Anlegen: immer status 'empfohlen', kein betrag, keine aufteilung, fahrlehrer_id = eigene ID.
--   * Ändern: nur die eigene, noch offene Empfehlung (status 'empfohlen') auf 'storniert'. Alle anderen Felder
--     bleiben, wie sie sind (vom Server erzwungen).
-- Büro, Leitung und Super-Admin bleiben frei (auch Status wie 'zugangsdaten_ausgegeben').
-- Live geprüft (Hauptsitzung): 3 Zeilen, alle vom Super-Admin, keine mit Betrag – nichts zu bereinigen.
-- Idempotent. Rückweg: supabase/rueckweg/20261124_rechte_03_rueckweg.sql

create or replace function public.empfehlung_schutz()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if auth.uid() is null or is_super_admin(auth.uid()) or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'empfohlen';
    new.betrag := null;
    new.aufteilung := null;
    new.fahrlehrer_id := auth.uid();
    return new;
  end if;
  -- UPDATE: nur „eigene offene Empfehlung stornieren“
  if old.fahrlehrer_id is distinct from auth.uid() or old.status is distinct from 'empfohlen' or new.status is distinct from 'storniert' then
    raise exception 'Empfehlungen ändert nur das Büro. Du kannst nur deine offene Empfehlung stornieren.';
  end if;
  new.id := old.id;
  new.fahrschule_id := old.fahrschule_id;
  new.schueler_id := old.schueler_id;
  new.schueler_name := old.schueler_name;
  new.fahrlehrer_id := old.fahrlehrer_id;
  new.fahrlehrer_name := old.fahrlehrer_name;
  new.typ := old.typ;
  new.betrag := old.betrag;
  new.aufteilung := old.aufteilung;
  new.erstellt_am := old.erstellt_am;
  new.aktualisiert_am := now();
  return new;
end $function$;

drop trigger if exists trg_empfehlung_schutz on public.fahrschule_empfehlungen;
create trigger trg_empfehlung_schutz before insert or update on public.fahrschule_empfehlungen
  for each row execute function public.empfehlung_schutz();

-- Zusätzlich in der Regel selbst: Fahrlehrer legen nur offene Empfehlungen ohne Betrag an
drop policy if exists "Fahrlehrer legt eigene Empfehlung an" on public.fahrschule_empfehlungen;
create policy "Fahrlehrer legt eigene Empfehlung an" on public.fahrschule_empfehlungen as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()) and (fahrlehrer_id = auth.uid()) and (status = 'empfohlen') and (betrag is null));

-- Ergebnis-Abfrage: erwartet trigger = 1, policy = 1
select (select count(*) from pg_trigger where tgname = 'trg_empfehlung_schutz') as trigger,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'fahrschule_empfehlungen'
          and policyname = 'Fahrlehrer legt eigene Empfehlung an' and with_check like '%betrag IS NULL%') as policy;
