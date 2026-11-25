-- W11 Schritt 3a (25.11.2026): eine einzige Ablage für einstellbare Werte je Fahrschule.
-- Abgestimmt mit W15 (Fristen, Nachrichten-Vorlagen) und W13/W16 (Sonderfahrt-Länge). Idempotent; Rückweg: supabase/rueckweg/20261125_einst_rueckweg.sql
-- Voraussetzung: zm_darf (20261124_zm_01), k5_meine_fahrschule (K5), buero_bearbeiter(), aenderungsprotokoll.
-- 1. Tabelle fahrschule_einstellungen (fahrschule_id, schluessel, wert jsonb-Objekt). Schlüssel mit Bereich davor, z. B. 'fristen.reaktivierung'.
--    Lesen: alle aktiven Mitglieder der eigenen Fahrschule + Super-Admin  →  NIE Geheimes hier ablegen.
--    Schreiben/Löschen: Büro, Leitung (eigene Fahrschule), Super-Admin. Löschen = zurück auf den eingebauten Standardwert.
-- 2. Jede Änderung steht im aenderungsprotokoll (mit Büro-Person).
-- 3. Für andere security-definer-Funktionen (NICHT für Clients freigegeben; Clients lesen die Tabelle mit RLS):
--    fahrschule_einstellung(fs, schluessel) -> jsonb
--    fahrschule_einstellung_zahl(fs, schluessel, feld, standard, min, max) -> int (wirft nie; außerhalb der Grenzen = Standard)
--    Beispiel W15: fahrschule_einstellung_zahl(fs, 'fristen.reaktivierung', 'monate', 12, 1, 60)

create table if not exists public.fahrschule_einstellungen (
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  schluessel text not null,
  wert jsonb not null,
  geaendert_am timestamptz not null default now(),
  geaendert_von uuid default auth.uid(),
  primary key (fahrschule_id, schluessel)
);
do $$ begin
  alter table public.fahrschule_einstellungen add constraint fe_schluessel check (
    schluessel ~ '^(fristen|vorlagen|fahrstunden|papierkorb|rueckgaengig)(\.[a-z][a-z0-9_]*)+$' and length(schluessel) <= 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fahrschule_einstellungen add constraint fe_groesse check (octet_length(wert::text) <= 16000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fahrschule_einstellungen add constraint fe_objekt check (jsonb_typeof(wert) = 'object');
exception when duplicate_object then null; end $$;

alter table public.fahrschule_einstellungen enable row level security;

drop policy if exists "Einstellungen lesen Mitglieder" on public.fahrschule_einstellungen;
create policy "Einstellungen lesen Mitglieder" on public.fahrschule_einstellungen for select to authenticated
  using (coalesce(exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true))
    and (is_super_admin(auth.uid()) or fahrschule_id = k5_meine_fahrschule()), false));
drop policy if exists "Einstellungen anlegen Buero Leitung" on public.fahrschule_einstellungen;
create policy "Einstellungen anlegen Buero Leitung" on public.fahrschule_einstellungen for insert to authenticated
  with check (zm_darf(fahrschule_id));
drop policy if exists "Einstellungen aendern Buero Leitung" on public.fahrschule_einstellungen;
create policy "Einstellungen aendern Buero Leitung" on public.fahrschule_einstellungen for update to authenticated
  using (zm_darf(fahrschule_id)) with check (zm_darf(fahrschule_id));
drop policy if exists "Einstellungen loeschen Buero Leitung" on public.fahrschule_einstellungen;
create policy "Einstellungen loeschen Buero Leitung" on public.fahrschule_einstellungen for delete to authenticated
  using (zm_darf(fahrschule_id));

-- Wer/wann setzt der Server; Fahrschule und Schlüssel einer Zeile bleiben fest
create or replace function public.fahrschule_einstellungen_stempel()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then new.fahrschule_id := old.fahrschule_id; new.schluessel := old.schluessel; end if;
  new.geaendert_am := now();
  new.geaendert_von := auth.uid();
  return new;
end;
$function$;
drop trigger if exists fahrschule_einstellungen_stempel on public.fahrschule_einstellungen;
create trigger fahrschule_einstellungen_stempel before insert or update on public.fahrschule_einstellungen
  for each row execute function public.fahrschule_einstellungen_stempel();

-- Spur: jede Änderung (auch Löschen = zurück auf Standard) ins aenderungsprotokoll
create or replace function public.fahrschule_einstellungen_spur()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    -- Fahrschule wird gerade ganz gelöscht (Kaskade): keine Spur
    if not exists (select 1 from public.fahrschulen f where f.id = old.fahrschule_id) then return null; end if;
    insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
      values (old.fahrschule_id, 'fahrschule_einstellungen', old.fahrschule_id::text, old.schluessel, old.wert::text, null,
              auth.uid(), nullif(coalesce(public.buero_bearbeiter(), ''), ''));
    return null;
  end if;
  if tg_op = 'UPDATE' and old.wert is not distinct from new.wert then return null; end if;
  insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
    values (new.fahrschule_id, 'fahrschule_einstellungen', new.fahrschule_id::text, new.schluessel,
            case when tg_op = 'UPDATE' then old.wert::text end, new.wert::text,
            auth.uid(), nullif(coalesce(public.buero_bearbeiter(), ''), ''));
  return null;
end;
$function$;
drop trigger if exists fahrschule_einstellungen_spur on public.fahrschule_einstellungen;
create trigger fahrschule_einstellungen_spur after insert or update or delete on public.fahrschule_einstellungen
  for each row execute function public.fahrschule_einstellungen_spur();

-- Lesen für andere Server-Funktionen (nur aus security-definer-Funktionen desselben Eigentümers aufrufen)
create or replace function public.fahrschule_einstellung(p_fs uuid, p_schluessel text)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select wert from public.fahrschule_einstellungen where fahrschule_id = p_fs and schluessel = p_schluessel;
$function$;

create or replace function public.fahrschule_einstellung_zahl(p_fs uuid, p_schluessel text, p_feld text, p_standard int, p_min int, p_max int)
 returns int
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce((
    select case when (e.wert ->> p_feld) ~ '^[0-9]{1,6}$' then
             case when (e.wert ->> p_feld)::int between p_min and p_max then (e.wert ->> p_feld)::int end end
      from public.fahrschule_einstellungen e where e.fahrschule_id = p_fs and e.schluessel = p_schluessel), p_standard);
$function$;

revoke all on function public.fahrschule_einstellungen_stempel() from public, anon, authenticated;
revoke all on function public.fahrschule_einstellungen_spur() from public, anon, authenticated;
revoke all on function public.fahrschule_einstellung(uuid, text) from public, anon, authenticated;
revoke all on function public.fahrschule_einstellung_zahl(uuid, text, text, int, int, int) from public, anon, authenticated;

revoke all on public.fahrschule_einstellungen from anon;
revoke all on public.fahrschule_einstellungen from authenticated;
grant select, insert, update, delete on public.fahrschule_einstellungen to authenticated;

-- Ergebniszeile (erwartet: tabelle=1, rls=true, policies=4, trigger=2, funktionen=2, rpc_offen=false, anon_liest=false)
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename = 'fahrschule_einstellungen') as tabelle,
  (select relrowsecurity from pg_class where oid = 'public.fahrschule_einstellungen'::regclass) as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'fahrschule_einstellungen') as policies,
  (select count(*) from pg_trigger where tgrelid = 'public.fahrschule_einstellungen'::regclass and not tgisinternal) as trigger,
  (select count(*) from pg_proc where proname like 'fahrschule_einstellung%' and pronargs > 0) as funktionen,
  has_function_privilege('authenticated', 'public.fahrschule_einstellung(uuid,text)', 'execute') as rpc_offen,
  has_table_privilege('anon', 'public.fahrschule_einstellungen', 'select') as anon_liest;
