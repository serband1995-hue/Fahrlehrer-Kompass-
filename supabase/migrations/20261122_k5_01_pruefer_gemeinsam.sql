-- K5 Prüfer-Wissen gemeinsam je Fahrschule (🗣 Serband, Boost-Termin 21.11.2026):
--   Prüfer, Notizen, Strecken und Ergebnisse sehen alle Fahrlehrer derselben Fahrschule sofort.
--   Jede Notiz zeigt den Verfasser und das Datum. Jeder darf Prüfer anlegen.
--   In der Fahrlehrer-Ansicht keine fremden Schülernamen (nur Zahlen).
-- Bisher lag die Prüfer-Akte (Tags, Strecken, Notiz) nur im persönlichen Speicher jedes Fahrlehrers;
-- Prüfungsergebnisse (kalender_pruefungen) sieht ein Fahrlehrer nur von sich selbst (RLS bleibt so).
--
-- 1) Tabelle fahrschule_pruefer: ein Prüfer je Fahrschule und Name (Groß/klein egal), mit Behörde, Tags, Strecken.
-- 2) Tabelle fahrschule_pruefer_notizen: Notizen über Prüfer, Verfasser und Name setzt der Server (nicht fälschbar).
-- 3) Funktion fs_pruefer_ergebnisse(): Prüfungen der ganzen Fahrschule (nur Prüfer, Datum, Ergebnis, Strecke, Fehler,
--    Fahrlehrer-Name). Schülername und Schüler-ID NUR bei eigenen Prüfungen oder für Büro/Leitung/Super-Admin.
-- 4) Funktion fs_pruefer_umbenennen(alt, neu): benennt Prüfer, Notizen und Prüfungen der Fahrschule um (oder führt zusammen).
--
-- Rechte: lesen/anlegen alle aktiven Konten derselben Fahrschule (Fahrlehrer, Leitung, Büro; nicht „entfernt“).
--   Tags/Strecken ändern: alle derselben Fahrschule. Prüfer ausblenden (geloescht): wer ihn angelegt hat, Büro, Leitung.
--   Umbenennen/zusammenführen (ganze Fahrschule): wer den Prüfer angelegt hat, Büro, Leitung.
--   Notiz ändern/löschen: nur der Verfasser, Büro, Leitung. Endgültig löschen: nur Super-Admin.
-- Einmal ausführbar und wiederholbar (if not exists / create or replace / drop policy if exists).
-- Rückweg: supabase/rueckweg/20261122_k5_rueckweg.sql

-- Hilfsfunktion: aktives Konto mit Fahrschule (nicht gesperrt, nicht gelöscht)
create or replace function public.k5_meine_fahrschule()
 returns uuid
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select p.fahrschule_id from public.profiles p
   where p.id = auth.uid() and coalesce(p.aktiv, true) and coalesce(p.rolle, '') not in ('entfernt', '')
$function$;

create or replace function public.k5_darf_verwalten()
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(is_super_admin(auth.uid()) or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()), false)
$function$;

-- 1) Prüfer
create table if not exists public.fahrschule_pruefer (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  behoerde text check (behoerde is null or length(behoerde) <= 120),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  routen jsonb not null default '[]'::jsonb check (jsonb_typeof(routen) = 'array'),
  angelegt_von uuid default auth.uid(),
  angelegt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  geloescht boolean not null default false
);
create unique index if not exists fahrschule_pruefer_name_eindeutig
  on public.fahrschule_pruefer (fahrschule_id, lower(btrim(name))) where not geloescht;
alter table public.fahrschule_pruefer enable row level security;

drop policy if exists "Pruefer lesen Fahrschule" on public.fahrschule_pruefer;
create policy "Pruefer lesen Fahrschule" on public.fahrschule_pruefer for select to authenticated
  using (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()));
drop policy if exists "Pruefer anlegen Fahrschule" on public.fahrschule_pruefer;
create policy "Pruefer anlegen Fahrschule" on public.fahrschule_pruefer for insert to authenticated
  with check (fahrschule_id = k5_meine_fahrschule() and angelegt_von = auth.uid() and not geloescht);
drop policy if exists "Pruefer aendern Fahrschule" on public.fahrschule_pruefer;
create policy "Pruefer aendern Fahrschule" on public.fahrschule_pruefer for update to authenticated
  using (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()))
  with check (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()));
drop policy if exists "Pruefer endgueltig loeschen nur Super-Admin" on public.fahrschule_pruefer;
create policy "Pruefer endgueltig loeschen nur Super-Admin" on public.fahrschule_pruefer for delete to authenticated
  using (is_super_admin(auth.uid()));

-- Schutz: Fahrschule, Ersteller und Anlagezeit bleiben; ausblenden nur Ersteller/Büro/Leitung; Zeitstempel vom Server
create or replace function public.fahrschule_pruefer_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.angelegt_am := now(); new.aktualisiert_am := now(); new.name := btrim(new.name);
    return new;
  end if;
  if new.fahrschule_id is distinct from old.fahrschule_id or new.angelegt_von is distinct from old.angelegt_von
     or new.angelegt_am is distinct from old.angelegt_am then
    raise exception 'Fahrschule und Ersteller eines Prüfers bleiben unverändert.';
  end if;
  if new.geloescht is distinct from old.geloescht and auth.uid() is not null
     and old.angelegt_von is distinct from auth.uid() and not k5_darf_verwalten()
     and coalesce(current_setting('kompass.pruefer_umbenennen', true), '') <> '1' then
    raise exception 'Einen gemeinsamen Prüfer löschen nur, wer ihn angelegt hat, das Büro oder die Leitung.';
  end if;
  -- Umbenennen geht über fs_pruefer_umbenennen (sonst passen die Prüfungen nicht mehr)
  if new.name is distinct from old.name and coalesce(current_setting('kompass.pruefer_umbenennen', true), '') <> '1'
     and auth.uid() is not null and not is_super_admin(auth.uid()) then
    raise exception 'Prüfer bitte über „Umbenennen“ umbenennen.';
  end if;
  new.aktualisiert_am := now();
  return new;
end;
$function$;
drop trigger if exists trg_fahrschule_pruefer_schutz on public.fahrschule_pruefer;
create trigger trg_fahrschule_pruefer_schutz before insert or update on public.fahrschule_pruefer
  for each row execute function public.fahrschule_pruefer_schutz();

-- 2) Notizen über Prüfer
create table if not exists public.fahrschule_pruefer_notizen (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  pruefer_name text not null check (length(btrim(pruefer_name)) between 1 and 80),
  text text not null check (length(btrim(text)) between 1 and 2000),
  verfasser_id uuid not null default auth.uid(),
  verfasser_name text,
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  geloescht boolean not null default false
);
create index if not exists fahrschule_pruefer_notizen_fs on public.fahrschule_pruefer_notizen (fahrschule_id, lower(pruefer_name));
alter table public.fahrschule_pruefer_notizen enable row level security;

drop policy if exists "Pruefernotiz lesen Fahrschule" on public.fahrschule_pruefer_notizen;
create policy "Pruefernotiz lesen Fahrschule" on public.fahrschule_pruefer_notizen for select to authenticated
  using (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()));
drop policy if exists "Pruefernotiz schreiben Fahrschule" on public.fahrschule_pruefer_notizen;
create policy "Pruefernotiz schreiben Fahrschule" on public.fahrschule_pruefer_notizen for insert to authenticated
  with check (fahrschule_id = k5_meine_fahrschule() and verfasser_id = auth.uid() and not geloescht);
drop policy if exists "Pruefernotiz aendern Verfasser oder Buero" on public.fahrschule_pruefer_notizen;
create policy "Pruefernotiz aendern Verfasser oder Buero" on public.fahrschule_pruefer_notizen for update to authenticated
  using ((fahrschule_id = k5_meine_fahrschule() and (verfasser_id = auth.uid() or k5_darf_verwalten())) or is_super_admin(auth.uid()))
  with check (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()));
drop policy if exists "Pruefernotiz endgueltig loeschen nur Super-Admin" on public.fahrschule_pruefer_notizen;
create policy "Pruefernotiz endgueltig loeschen nur Super-Admin" on public.fahrschule_pruefer_notizen for delete to authenticated
  using (is_super_admin(auth.uid()));

-- Verfasser und sein Name kommen vom Server (aus profiles), Zeitstempel ebenso
create or replace function public.fahrschule_pruefer_notiz_verfasser()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.verfasser_id := auth.uid(); end if;
    select coalesce(nullif(btrim(p.name), ''), split_part(p.email, '@', 1)) into new.verfasser_name
      from public.profiles p where p.id = new.verfasser_id;
    new.erstellt_am := now(); new.aktualisiert_am := now();
    return new;
  end if;
  if new.verfasser_id is distinct from old.verfasser_id or new.verfasser_name is distinct from old.verfasser_name
     or new.fahrschule_id is distinct from old.fahrschule_id or new.erstellt_am is distinct from old.erstellt_am then
    raise exception 'Verfasser, Fahrschule und Datum einer Notiz bleiben unverändert.';
  end if;
  if new.pruefer_name is distinct from old.pruefer_name and coalesce(current_setting('kompass.pruefer_umbenennen', true), '') <> '1'
     and auth.uid() is not null and not is_super_admin(auth.uid()) then
    raise exception 'Notiz bleibt beim Prüfer.';
  end if;
  new.aktualisiert_am := now();
  return new;
end;
$function$;
drop trigger if exists trg_fahrschule_pruefer_notiz_verfasser on public.fahrschule_pruefer_notizen;
create trigger trg_fahrschule_pruefer_notiz_verfasser before insert or update on public.fahrschule_pruefer_notizen
  for each row execute function public.fahrschule_pruefer_notiz_verfasser();

-- 3) Ergebnisse der ganzen Fahrschule, schmal (keine fremden Schülernamen für Fahrlehrer)
create or replace function public.fs_pruefer_ergebnisse()
 returns table (id text, fahrlehrer_id uuid, fahrlehrer_name text, eigen boolean, pruefer text, datum date, result text,
                attempt integer, b197 boolean, note text, faults jsonb, eingriff boolean, eing_note text,
                schueler_id text, schueler_name text)
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare fs uuid := k5_meine_fahrschule(); voll boolean := k5_darf_verwalten();
begin
  if fs is null then return; end if;
  return query
  select k.id::text, k.fahrlehrer_id,
         coalesce(nullif(btrim(p.name), ''), split_part(p.email, '@', 1), 'Fahrlehrer'),
         (k.fahrlehrer_id = auth.uid()),
         k.pruefer, k.datum::date, k.result, k.attempt,
         coalesce(k.payload->>'b197', '') in ('true', 't', '1'),
         nullif(btrim(coalesce(k.payload->>'note', '')), ''),
         case when jsonb_typeof(k.payload->'faults') = 'array' then k.payload->'faults' else '[]'::jsonb end,
         coalesce(k.payload->>'eingriff', '') in ('true', 't', '1'),
         nullif(btrim(coalesce(k.payload->>'eingNote', '')), ''),
         case when voll or k.fahrlehrer_id = auth.uid() then k.schueler_id::text end,
         case when voll or k.fahrlehrer_id = auth.uid() then coalesce(s.name, k.payload->>'name') end
    from public.kalender_pruefungen k
    left join public.profiles p on p.id = k.fahrlehrer_id
    left join public.schueler s on s.id::text = k.schueler_id::text
   where k.fahrschule_id = fs and not coalesce(k.geloescht, false)
     and k.pruefer is not null and btrim(k.pruefer) <> ''
   order by k.datum desc nulls last
   limit 5000;
end;
$function$;
revoke all on function public.fs_pruefer_ergebnisse() from public, anon;
grant execute on function public.fs_pruefer_ergebnisse() to authenticated;

-- 4) Umbenennen / zusammenführen für die ganze Fahrschule
create or replace function public.fs_pruefer_umbenennen(p_alt text, p_neu text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare fs uuid := k5_meine_fahrschule(); a public.fahrschule_pruefer; b public.fahrschule_pruefer; n integer := 0;
begin
  p_alt := btrim(coalesce(p_alt, '')); p_neu := btrim(coalesce(p_neu, ''));
  if fs is null then return jsonb_build_object('fehler', 'keine_fahrschule'); end if;
  if p_alt = '' or p_neu = '' or length(p_neu) > 80 then return jsonb_build_object('fehler', 'name'); end if;
  if p_alt = p_neu then return jsonb_build_object('ok', true, 'pruefungen', 0); end if;
  select * into a from public.fahrschule_pruefer where fahrschule_id = fs and not geloescht and lower(name) = lower(p_alt) limit 1;
  -- Wirkt auf die ganze Fahrschule: nur wer den Prüfer angelegt hat, Büro oder Leitung (Prüf-Team 22.11.2026)
  if a.id is not null and a.angelegt_von is distinct from auth.uid() and not k5_darf_verwalten() then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  perform set_config('kompass.pruefer_umbenennen', '1', true);
  select * into b from public.fahrschule_pruefer where fahrschule_id = fs and not geloescht and lower(name) = lower(p_neu)
     and (a.id is null or id <> a.id) limit 1;
  if a.id is not null and b.id is not null then
    -- zusammenführen: Tags und Strecken vereinen, alten ausblenden
    update public.fahrschule_pruefer set
      tags = (select coalesce(jsonb_agg(distinct t), '[]'::jsonb) from jsonb_array_elements(b.tags || a.tags) t),
      routen = b.routen || a.routen,
      behoerde = coalesce(b.behoerde, a.behoerde)
     where id = b.id;
    update public.fahrschule_pruefer set geloescht = true where id = a.id;
  elsif a.id is not null then
    update public.fahrschule_pruefer set name = p_neu where id = a.id;
  elsif b.id is null then
    insert into public.fahrschule_pruefer (fahrschule_id, name, angelegt_von) values (fs, p_neu, auth.uid());
  end if;
  update public.fahrschule_pruefer_notizen set pruefer_name = p_neu where fahrschule_id = fs and lower(pruefer_name) = lower(p_alt);
  update public.kalender_pruefungen set pruefer = p_neu, aktualisiert_am = now()
   where fahrschule_id = fs and lower(btrim(pruefer)) = lower(p_alt);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'pruefungen', n);
end;
$function$;
revoke all on function public.fs_pruefer_umbenennen(text, text) from public, anon;
grant execute on function public.fs_pruefer_umbenennen(text, text) to authenticated;
revoke all on function public.k5_meine_fahrschule() from public, anon;
grant execute on function public.k5_meine_fahrschule() to authenticated;
revoke all on function public.k5_darf_verwalten() from public, anon;
grant execute on function public.k5_darf_verwalten() to authenticated;
