-- K9 Preisliste je Fahrschule (Büro, Nachtplan 22.11.2026):
--   Grundbetrag, Fahrstunde je Klasse, Sonderfahrten, Prüfungsvorstellung, Reaktivierung, Pakete.
--   Jede Zahl ist änderbar mit „gültig ab“ und Verlauf; alte Verträge behalten ihren Preis
--   (es gilt der Preis, der am Vertragsdatum gültig war).
--   Vorbereitet für eine maschinenlesbare Ausgabe (Preisregister § 32 FahrlG ab 01.07.2027).
--
-- Eine Zeile = ein Preis ab einem Tag. Ändern heißt: neue Zeile mit neuem „gültig ab“ (nie überschreiben).
--   betrag_cent null = „entfällt ab diesem Tag“.
--   Gleiche Preisposition = gleiche Fahrschule, Art, Klasse und Bezeichnung (Groß/klein egal).
--   Bei zwei Zeilen mit gleichem „gültig ab“ gilt die zuletzt angelegte (Tippfehler am selben Tag korrigieren).
-- Rechte: lesen alle aktiven Konten derselben Fahrschule (Fahrlehrer, Leitung, Büro) und Super-Admin.
--   Anlegen: Leitung (fahrschule_admin) und Super-Admin. Ändern geht nicht (Verlauf bleibt).
--   Löschen: nur Super-Admin (Notfall). „gültig ab“ in der Vergangenheit: nur Super-Admin,
--   damit niemand nachträglich den Preis eines schon geschlossenen Vertrags ändert.
-- Einmal ausführbar und wiederholbar (if not exists / create or replace / drop policy if exists).
-- Rückweg: supabase/rueckweg/20261123_k9_rueckweg.sql
-- Braucht k5_meine_fahrschule() aus der K5-Migration (ist live).

create table if not exists public.fahrschule_preise (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  art text not null check (art in ('grundbetrag','fahrstunde','sonderfahrt','pruefung_praxis','pruefung_theorie','reaktivierung','paket','sonstiges')),
  klasse text check (klasse is null or length(btrim(klasse)) between 1 and 12),
  bezeichnung text not null check (length(btrim(bezeichnung)) between 1 and 120),
  einheit text not null default 'pauschal' check (einheit in ('pauschal','45min','fahrt','paket')),
  betrag_cent integer check (betrag_cent is null or (betrag_cent >= 0 and betrag_cent <= 10000000)),
  inhalt text check (inhalt is null or length(inhalt) <= 500),
  paket_id uuid references public.fahrschule_pakete(id) on delete set null,
  gueltig_ab date not null,
  angelegt_von uuid default auth.uid(),
  angelegt_am timestamptz not null default now()
);
create index if not exists fahrschule_preise_fs on public.fahrschule_preise (fahrschule_id, art, gueltig_ab);
alter table public.fahrschule_preise enable row level security;

drop policy if exists "Preise lesen Fahrschule" on public.fahrschule_preise;
create policy "Preise lesen Fahrschule" on public.fahrschule_preise for select to authenticated
  using (fahrschule_id = k5_meine_fahrschule() or is_super_admin(auth.uid()));
drop policy if exists "Preise anlegen Leitung" on public.fahrschule_preise;
create policy "Preise anlegen Leitung" on public.fahrschule_preise for insert to authenticated
  with check (
    (is_super_admin(auth.uid()))
    or (fahrschule_id = k5_meine_fahrschule() and coalesce(is_fahrschule_admin(auth.uid()), false))
  );
drop policy if exists "Preise loeschen nur Super-Admin" on public.fahrschule_preise;
create policy "Preise loeschen nur Super-Admin" on public.fahrschule_preise for delete to authenticated
  using (is_super_admin(auth.uid()));
-- keine update-Regel: Zeilen bleiben, wie sie angelegt wurden

-- Schutz: Verfasser und Zeit setzt der Server; Rückdatieren nur Super-Admin; Paket muss zur Fahrschule gehören
create or replace function public.fahrschule_preise_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  new.angelegt_von := auth.uid();
  new.angelegt_am := now();
  new.bezeichnung := btrim(new.bezeichnung);
  new.klasse := nullif(btrim(coalesce(new.klasse, '')), '');
  if new.gueltig_ab < (now() at time zone 'Europe/Berlin')::date and not coalesce(is_super_admin(auth.uid()), false) then
    raise exception 'gueltig_ab liegt in der Vergangenheit' using errcode = '22023';
  end if;
  if new.paket_id is not null and not exists (
       select 1 from public.fahrschule_pakete p where p.id = new.paket_id and p.fahrschule_id = new.fahrschule_id) then
    raise exception 'Paket gehört nicht zu dieser Fahrschule' using errcode = '22023';
  end if;
  return new;
end
$function$;

drop trigger if exists fahrschule_preise_schutz on public.fahrschule_preise;
create trigger fahrschule_preise_schutz before insert on public.fahrschule_preise
  for each row execute function public.fahrschule_preise_schutz();

grant select, insert, delete on public.fahrschule_preise to authenticated;
