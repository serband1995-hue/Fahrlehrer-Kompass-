-- W19 Teil 3 (26.11.2026): Punktesystem mit Platzhaltern. 🗣 Serband 26.11.: „Alles bauen, beim Punktesystem Platzhalter lassen,
-- damit man selber angeben kann, was der Schüler bekommen soll.“ Idempotent. Rückweg: supabase/rueckweg/20261202_w19_03_rueckweg.sql
-- Voraussetzung: 20261201_w19_02_zahlungsbelege.sql (Schlüssel 'punkte.*' im Constraint fe_schluessel), fahrschule_einstellungen +
--   fahrschule_einstellung() (20261125_einst_01), zm_darf (20261124_zm_01), k5_meine_fahrschule (K5), buero_bearbeiter(), schueler.fahrlehrer_id.
--
-- Nichts ist vorgegeben: Standard ist AUS, die Listen sind leer. Die Fahrschule legt selbst fest (Einstellungen › Punktesystem):
--    punkte.system   {aktiv, verschenken, bedingungen}   Standard {false, false, ""}
--    punkte.regeln   {liste:[{id, name, punkte}]}        „Wofür gibt es Punkte“
--    punkte.praemien {liste:[{id, name, punkte}]}        „Was kann man einlösen“
-- Tabelle schueler_punkte = Kontobuchungen, nach dem Anlegen nicht änderbar und nicht löschbar (Korrektur = Gegenbuchung).
--   art: vergeben (+) | einloesen (−) | verschenkt_ab (−, beim Schenkenden) | verschenkt_an (+, beim Beschenkten)
--   Das Vorzeichen setzt der Server nach art. Wer/wann (erstellt_von, erstellt_am, bearbeiter) setzt der Server.
--   Der Server prüft: Schalter an (verschenken: auch Schalter „verschenken“), Schüler gehört zur Fahrschule, Kontostand reicht
--   (Sperre je Schüler gegen gleichzeitiges Einlösen), Fahrlehrer dürfen nur Einträge aus den Listen der Fahrschule buchen.
-- Rechte: Lesen Büro/Leitung der eigenen Fahrschule, Super-Admin, und der eigene Fahrlehrer des Schülers. Anlegen: dieselben, aber
--   direkt nur vergeben/einloesen; Verschenken nur über die Funktion punkte_verschenken (zwei Zeilen in einer Transaktion).
--   Rolle und Besitz stehen auch im WITH CHECK (Lehre W18). Fremde Fahrschule nie.

-- ===== 0. Voraussetzung Teil 2: Schlüssel punkte.* erlaubt (sonst Abbruch, nichts geändert) =====
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fe_schluessel' and pg_get_constraintdef(oid) like '%punkte%') then
    raise exception 'Zuerst 20261201_w19_02_zahlungsbelege.sql einspielen (Schlüssel punkte.*).';
  end if;
end $$;

-- ===== 1. Hilfsfunktion: bin ich der eigene Fahrlehrer dieses Schülers (in dieser Fahrschule)? =====
create or replace function public.punkte_eigener_fl(fs uuid, sid text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select coalesce(
    fs is not null and sid is not null and auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true))
    and fs = public.k5_meine_fahrschule()
    and exists (select 1 from public.schueler s where s.id = sid and s.fahrschule_id = fs and s.fahrlehrer_id = auth.uid()), false);
$function$;

-- ===== 2. Tabelle =====
create table if not exists public.schueler_punkte (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete restrict,
  schueler_id text not null,                -- bewusst ohne Fremdschlüssel: Buchungen sind fest, ein endgültig gelöschter Schüler darf nicht daran scheitern
  art text not null check (art in ('vergeben','einloesen','verschenkt_ab','verschenkt_an')),
  punkte integer not null,
  grund text not null,
  gegen_schueler_id text,
  erstellt_am timestamptz not null default now(),
  erstellt_von uuid default auth.uid(),
  bearbeiter text,
  constraint schueler_punkte_vorzeichen check ((art in ('vergeben','verschenkt_an') and punkte > 0) or (art in ('einloesen','verschenkt_ab') and punkte < 0)),
  constraint schueler_punkte_menge check (abs(punkte) <= 1000000),
  constraint schueler_punkte_grund check (length(btrim(grund)) between 1 and 200),
  constraint schueler_punkte_gegen check ((art in ('verschenkt_ab','verschenkt_an')) = (gegen_schueler_id is not null))
);
create index if not exists schueler_punkte_schueler on public.schueler_punkte (fahrschule_id, schueler_id, erstellt_am desc);
alter table public.schueler_punkte enable row level security;

drop policy if exists "Punkte lesen" on public.schueler_punkte;
create policy "Punkte lesen" on public.schueler_punkte for select to authenticated
  using (zm_darf(fahrschule_id) or punkte_eigener_fl(fahrschule_id, schueler_id));
drop policy if exists "Punkte anlegen" on public.schueler_punkte;
create policy "Punkte anlegen" on public.schueler_punkte for insert to authenticated
  with check (art in ('vergeben','einloesen') and (zm_darf(fahrschule_id) or punkte_eigener_fl(fahrschule_id, schueler_id)));
-- keine UPDATE-/DELETE-Regel: eine Buchung ist nach dem Anlegen fest (zusätzlich Auslöser unten)

-- ===== 3. Anlegen: der Server setzt Vorzeichen, Wer/Wann und prüft Schalter, Schüler, Liste und Kontostand =====
create or replace function public.schueler_punkte_anlegen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  sys jsonb;
  liste jsonb;
  bestand bigint;
  passt boolean;
begin
  sys := coalesce(public.fahrschule_einstellung(new.fahrschule_id, 'punkte.system'), '{}'::jsonb);
  if coalesce(sys ->> 'aktiv', 'false') <> 'true' then
    raise exception 'Das Punktesystem ist ausgeschaltet' using errcode = '42501';
  end if;
  if new.art in ('verschenkt_ab','verschenkt_an') and coalesce(sys ->> 'verschenken', 'false') <> 'true' then
    raise exception 'Verschenken ist ausgeschaltet' using errcode = '42501';
  end if;
  if not exists (select 1 from public.schueler s where s.id = new.schueler_id and s.fahrschule_id = new.fahrschule_id) then
    raise exception 'Schüler gehört nicht zu dieser Fahrschule' using errcode = '22023';
  end if;
  if new.art in ('verschenkt_ab','verschenkt_an') then
    if new.gegen_schueler_id is null or new.gegen_schueler_id = new.schueler_id
       or not exists (select 1 from public.schueler s where s.id = new.gegen_schueler_id and s.fahrschule_id = new.fahrschule_id) then
      raise exception 'Der andere Schüler gehört nicht zu dieser Fahrschule' using errcode = '22023';
    end if;
  else
    new.gegen_schueler_id := null;
  end if;
  new.grund := btrim(coalesce(new.grund, ''));
  if new.punkte is null or new.punkte = 0 then raise exception 'Punkte dürfen nicht 0 sein' using errcode = '22023'; end if;
  new.punkte := case when new.art in ('vergeben','verschenkt_an') then abs(new.punkte) else -abs(new.punkte) end;
  -- Fahrlehrer buchen nur, was die Fahrschule in den Listen angelegt hat (Büro, Leitung und Dienst dürfen frei buchen, z. B. Korrektur)
  if new.art in ('vergeben','einloesen') and auth.uid() is not null and not public.zm_darf(new.fahrschule_id) then
    liste := public.fahrschule_einstellung(new.fahrschule_id, case when new.art = 'vergeben' then 'punkte.regeln' else 'punkte.praemien' end) -> 'liste';
    passt := false;
    if liste is not null and jsonb_typeof(liste) = 'array' then
      select exists (select 1 from jsonb_array_elements(liste) e
        where jsonb_typeof(e) = 'object' and btrim(coalesce(e ->> 'name', '')) = new.grund
          and case when (e ->> 'punkte') ~ '^[0-9]{1,7}$' then (e ->> 'punkte')::int end = abs(new.punkte)) into passt;
    end if;
    if not passt then raise exception 'Das steht nicht in der Liste der Fahrschule' using errcode = '42501'; end if;
  end if;
  -- Einlösen und Verschenken nur, wenn der Kontostand reicht. Sperre je Schüler: zwei gleichzeitige Buchungen laufen nacheinander.
  if new.punkte < 0 then
    perform pg_advisory_xact_lock(hashtextextended('punkte:' || new.fahrschule_id::text || ':' || new.schueler_id, 0));
    select coalesce(sum(punkte), 0) into bestand from public.schueler_punkte where fahrschule_id = new.fahrschule_id and schueler_id = new.schueler_id;
    if bestand + new.punkte < 0 then
      raise exception 'Nicht genug Punkte: Kontostand %, gebraucht %', bestand, abs(new.punkte) using errcode = '22023';
    end if;
  end if;
  new.erstellt_am := now();
  new.erstellt_von := auth.uid();
  new.bearbeiter := nullif(coalesce(public.buero_bearbeiter(), ''), '');
  return new;
end;
$function$;
drop trigger if exists schueler_punkte_anlegen on public.schueler_punkte;
create trigger schueler_punkte_anlegen before insert on public.schueler_punkte
  for each row execute function public.schueler_punkte_anlegen();

-- Fest: Ändern und Löschen sind für jeden gesperrt (auch mit Dienst-Schlüssel), Korrektur nur als Gegenbuchung
create or replace function public.schueler_punkte_fest()
 returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  raise exception 'Eine Punkte-Buchung kann nicht geändert oder gelöscht werden. Bitte eine Gegenbuchung machen.' using errcode = '42501';
end;
$function$;
drop trigger if exists schueler_punkte_fest on public.schueler_punkte;
create trigger schueler_punkte_fest before update or delete on public.schueler_punkte
  for each row execute function public.schueler_punkte_fest();

-- ===== 4. Verschenken: zwei Zeilen in einer Transaktion =====
create or replace function public.punkte_verschenken(p_fahrschule uuid, p_von text, p_an text, p_punkte integer, p_grund text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare g text := btrim(coalesce(p_grund, ''));
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
  -- Verschenken nur Büro/Leitung/Super-Admin (Prüfer Daten: sonst schickt ein Fahrlehrer freien Text in die Akte eines Kollegen)
  if not public.zm_darf(p_fahrschule) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_von is null or p_an is null or p_von = p_an then raise exception 'Bitte zwei verschiedene Schüler wählen' using errcode = '22023'; end if;
  if p_punkte is null or p_punkte <= 0 or p_punkte > 1000000 then raise exception 'Punkte müssen größer als 0 sein' using errcode = '22023'; end if;
  if g = '' then raise exception 'Bitte einen Grund eintragen' using errcode = '22023'; end if;
  -- erst abziehen (prüft Schalter, Schüler und Kontostand), dann gutschreiben; scheitert eines, gilt keines
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id)
    values (p_fahrschule, p_von, 'verschenkt_ab', -p_punkte, g, p_an);
  insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id)
    values (p_fahrschule, p_an, 'verschenkt_an', p_punkte, g, p_von);
end;
$function$;

-- Kontostand (immer die ganze Summe, nicht nur die letzten Zeilen)
create or replace function public.punkte_kontostand(p_fahrschule uuid, p_schueler text)
 returns integer language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not (public.zm_darf(p_fahrschule) or public.punkte_eigener_fl(p_fahrschule, p_schueler)) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  return coalesce((select sum(punkte) from public.schueler_punkte where fahrschule_id = p_fahrschule and schueler_id = p_schueler), 0)::int;
end;
$function$;

revoke all on function public.schueler_punkte_anlegen() from public, anon, authenticated;
revoke all on function public.schueler_punkte_fest() from public, anon, authenticated;
revoke all on function public.punkte_eigener_fl(uuid, text) from public, anon;
grant execute on function public.punkte_eigener_fl(uuid, text) to authenticated;   -- Regeln (Policies) laufen mit den Rechten des Aufrufers
revoke all on function public.punkte_verschenken(uuid, text, text, integer, text) from public, anon;
revoke all on function public.punkte_kontostand(uuid, text) from public, anon;
grant execute on function public.punkte_verschenken(uuid, text, text, integer, text) to authenticated;
grant execute on function public.punkte_kontostand(uuid, text) to authenticated;
revoke all on public.schueler_punkte from anon;
revoke all on public.schueler_punkte from authenticated;
grant select, insert on public.schueler_punkte to authenticated;

-- Ergebniszeile (erwartet: tabelle=1, rls=true, policies=2, trigger=2, funktionen=5)
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename = 'schueler_punkte') as tabelle,
  (select relrowsecurity from pg_class where oid = 'public.schueler_punkte'::regclass) as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'schueler_punkte') as policies,
  (select count(*) from pg_trigger where tgrelid = 'public.schueler_punkte'::regclass and not tgisinternal) as trigger,
  (select count(*) from pg_proc where proname in ('punkte_eigener_fl','schueler_punkte_anlegen','schueler_punkte_fest','punkte_verschenken','punkte_kontostand')) as funktionen;
