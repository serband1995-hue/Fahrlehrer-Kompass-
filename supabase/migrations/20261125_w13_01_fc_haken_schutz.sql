-- W13 Fahrcheck-Haken: Kristina wählt die Zahl, und nur das Büro hakt ab (Werkstatt 13, Fable W6/R4, freigegeben von der
-- Hauptsitzung am 24.11.2026, Serband „Ja“ am 25.11.2026).
-- Seit kompass-v115 zählt eine Fahrstunde im verkauften Paket erst, wenn das Büro „Fahrchecks abgegeben“ abhakt
-- (kalender_termine.buero_fc_status, 🗣 Serband 24.11.2026). Der Haken bedeutet damit Geld.
-- Bisher schützte keine Regel die Spalte: „Fahrlehrer bearbeitet eigene Termine“ erlaubt jede Spalte der eigenen Zeile.
-- Die App schreibt die Spalte als Fahrlehrer nicht (_terminZeile), über die Schnittstelle ginge es aber.
-- Neu 1: Spalte buero_fc_anzahl = wie viele Fahrchecks das Büro für die Stunde bekommen hat. 🗣 Serband 25.11.2026: „Wenn 90 min
--   eingetragen ist, dann muss halt Kristina abhaken: 2 Fahrchecks abgegeben oder 1 Fahrcheck abgegeben.“ Leer = wie vom
--   Fahrlehrer vermerkt (so zählen alle bisherigen Haken weiter). Im Paket zählt mit Haken genau diese Zahl (KR.fcVomBuero).
-- Neu 2: buero_fc_status, buero_fc_anzahl und buero_fc_nachgereicht_am ändern nur Büro, Leitung (fahrschule_admin), Super-Admin.
--   * Andere (Fahrlehrer, auch gesperrte oder entfernte Zugänge): beim Ändern bleibt der alte Wert stehen, still, ohne
--     Fehler. Sonst bräche das Hochladen der ganzen Termin-Liste der App ab (Upsert). Alle anderen Spalten speichern normal.
--   * Ändert ein Fahrlehrer an einer abgehakten Stunde Vermerk (payload.fc), Uhrzeit oder Art, springt der Haken auf
--     „offen“ zurück: Das Büro hakt den neuen Stand neu ab (Fable R4, sonst zählte „nachgereicht“ sofort voll).
--   * Neuer Termin eines Fahrlehrers: der Haken startet auf „offen“ (noch nicht geprüft), ohne Nachreich-Datum,
--     auch wenn etwas anderes mitgeschickt wird. Leer bleibt leer (die App liest leer und „offen“ gleich).
--   * Server, Nachtläufe, Migrationen (auth.uid() ist leer): unverändert erlaubt.
-- Idempotent. Rückweg: supabase/rueckweg/20261125_w13_fc_haken_rueckweg.sql

alter table public.kalender_termine add column if not exists buero_fc_anzahl smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'kalender_termine_buero_fc_anzahl_check') then
    alter table public.kalender_termine add constraint kalender_termine_buero_fc_anzahl_check check (buero_fc_anzahl is null or buero_fc_anzahl between 0 and 20);
  end if;
end $$;

create or replace function public.termin_fc_haken_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  u uuid := auth.uid();
begin
  if u is null then return new; end if; -- Server, Nachtläufe, Migrationen
  if public.is_buero(u) or public.is_fahrschule_admin(u) or public.is_super_admin(u) then return new; end if;
  if tg_op = 'UPDATE' then
    new.buero_fc_status := old.buero_fc_status;
    new.buero_fc_anzahl := old.buero_fc_anzahl;
    new.buero_fc_nachgereicht_am := old.buero_fc_nachgereicht_am;
    -- Fable R4: Der Haken gilt für den Stand, den das Büro gesehen hat. Ändert der Fahrlehrer danach Vermerk (payload.fc),
    -- Uhrzeit oder Art einer abgehakten Stunde, muss das Büro neu abhaken (sonst zählte z. B. „nachgereicht“ sofort voll).
    if old.buero_fc_status = 'abgegeben' and (
         (new.payload ->> 'fc') is distinct from (old.payload ->> 'fc')
         or new.von is distinct from old.von or new.bis is distinct from old.bis or new.art is distinct from old.art) then
      new.buero_fc_status := 'offen';
      new.buero_fc_anzahl := null;
    end if;
  else
    if new.buero_fc_status is not null and new.buero_fc_status <> 'offen' then new.buero_fc_status := 'offen'; end if;
    new.buero_fc_anzahl := null;
    new.buero_fc_nachgereicht_am := null;
  end if;
  return new;
end;
$function$;
-- Nur für den Trigger
revoke all on function public.termin_fc_haken_schutz() from public, anon, authenticated;

-- Vor den anderen Schutz-Triggern (BEFORE-Trigger laufen nach Namen): trg_termin_c… < trg_termin_entfernt_schutz
drop trigger if exists trg_termin_c_fc_haken on public.kalender_termine;
create trigger trg_termin_c_fc_haken before insert or update on public.kalender_termine
  for each row execute function public.termin_fc_haken_schutz();

-- Ergebnis: erwartet spalte = 1, funktion = 1, trigger = 1
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'kalender_termine'
          and column_name = 'buero_fc_anzahl') as spalte,
       (select count(*) from pg_proc where proname = 'termin_fc_haken_schutz') as funktion,
       (select count(*) from pg_trigger where tgname = 'trg_termin_c_fc_haken' and not tgisinternal) as trigger;
