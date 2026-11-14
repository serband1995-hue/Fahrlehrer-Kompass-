-- Theorie-Modus (14.11.2026): Folien-Bibliothek, eigene Unterrichte und eigene Dateien je Fahrlehrer.
-- Speicher: privater Bucket "theorie".
--   bibliothek/<klasse>/<lektion>.pptx           Originale (Serbands Folien)
--   bibliothek/<klasse>/<lektion>/f<nnn>.webp    Vorschaubilder je Folie
--   eigene/<user_id>/<datei_id>.<pptx|pdf>       eigene Uploads eines Fahrlehrers

-- Wer darf die Bibliothek sehen: Fahrschulen mit Freigabe und der Super-Admin.
create table if not exists public.theorie_freigabe (
  fahrschule_id uuid primary key references public.fahrschulen(id) on delete cascade,
  seit timestamptz not null default now()
);
alter table public.theorie_freigabe enable row level security;
create policy theorie_freigabe_lesen on public.theorie_freigabe for select to authenticated
  using (fahrschule_id = public.my_fahrschule_id() or public.is_super_admin(auth.uid()));

create or replace function public.theorie_darf_bibliothek()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_user_active(auth.uid()), false) and (
    public.is_super_admin(auth.uid())
    or exists (select 1 from public.theorie_freigabe f where f.fahrschule_id = public.my_fahrschule_id())
  );
$$;
revoke all on function public.theorie_darf_bibliothek() from public, anon;
grant execute on function public.theorie_darf_bibliothek() to authenticated;

-- Klassen: auch leere (A, BE, D …) stehen hier, damit später Folien dazukommen können.
create table if not exists public.theorie_klassen (
  klasse text primary key,
  titel text not null,
  beschreibung text,
  sort int not null default 0
);
alter table public.theorie_klassen enable row level security;
create policy theorie_klassen_lesen on public.theorie_klassen for select to authenticated using (true);

create table if not exists public.theorie_lektionen (
  id text primary key,                       -- z. B. B01, C01, CE1
  klasse text not null references public.theorie_klassen(klasse),
  nr int not null,
  code text not null,                        -- Anzeige: "Lektion 1", "C1", "CE1"
  titel text not null,
  untertitel text,
  bereich text,                              -- Grundstoff / Zusatzstoff
  abend int,                                 -- Lektionen, die zusammen einen Abend bilden
  datei_pfad text not null,                  -- im Bucket theorie
  datei_bytes bigint,
  folien_anzahl int not null default 0,
  quiz_lektion int,                          -- quiz-tafel.html?l=N
  aktiv boolean not null default true,
  geaendert timestamptz not null default now()
);
alter table public.theorie_lektionen enable row level security;
create policy theorie_lektionen_lesen on public.theorie_lektionen for select to authenticated
  using (aktiv and public.theorie_darf_bibliothek());

create table if not exists public.theorie_folien (
  lektion_id text not null references public.theorie_lektionen(id) on delete cascade,
  nr int not null,                           -- Reihenfolge in der Präsentation (1 …)
  titel text,
  notiz text,                                -- Notizen der Referentenansicht
  bild_pfad text,                            -- Vorschaubild im Bucket
  primary key (lektion_id, nr)
);
alter table public.theorie_folien enable row level security;
create policy theorie_folien_lesen on public.theorie_folien for select to authenticated
  using (public.theorie_darf_bibliothek());

-- Eigene Dateien (hochgeladene PowerPoint oder PDF) – nur für den Besitzer.
create table if not exists public.theorie_dateien (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  klasse text references public.theorie_klassen(klasse),
  name text not null check (char_length(name) between 1 and 160),
  pfad text not null,
  mime text not null check (mime in ('application/vnd.openxmlformats-officedocument.presentationml.presentation','application/pdf')),
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  erstellt timestamptz not null default now()
);
alter table public.theorie_dateien enable row level security;
create policy theorie_dateien_eigen on public.theorie_dateien for all to authenticated
  using (owner = auth.uid() and public.is_user_active(auth.uid()))
  with check (owner = auth.uid() and public.is_user_active(auth.uid())
              and pfad like 'eigene/' || auth.uid()::text || '/%');

-- Eigene Unterrichte: Auswahl und Reihenfolge von Bibliotheks-Lektionen und eigenen Dateien,
-- je Lektion abgewählte Folien (werden beim Öffnen in PowerPoint ausgeblendet).
-- teile: [{"typ":"lektion","lektion_id":"B01","aus":[3,7]}, {"typ":"datei","datei_id":"…"}]
create table if not exists public.theorie_unterrichte (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  klasse text references public.theorie_klassen(klasse),
  titel text not null check (char_length(titel) between 1 and 120),
  notiz text check (notiz is null or char_length(notiz) <= 2000),
  teile jsonb not null default '[]'::jsonb check (jsonb_typeof(teile) = 'array'),
  erstellt timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
alter table public.theorie_unterrichte enable row level security;
create policy theorie_unterrichte_eigen on public.theorie_unterrichte for all to authenticated
  using (owner = auth.uid() and public.is_user_active(auth.uid()))
  with check (owner = auth.uid() and public.is_user_active(auth.uid()));
create index if not exists theorie_unterrichte_owner on public.theorie_unterrichte(owner);
create index if not exists theorie_dateien_owner on public.theorie_dateien(owner);

-- Speicher
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('theorie', 'theorie', false, 52428800,
        array['application/vnd.openxmlformats-officedocument.presentationml.presentation','application/pdf','image/webp'])
on conflict (id) do nothing;

create policy theorie_bib_lesen on storage.objects for select to authenticated
  using (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'bibliothek' and public.theorie_darf_bibliothek());
create policy theorie_eigene_lesen on storage.objects for select to authenticated
  using (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
         and (storage.foldername(name))[2] = auth.uid()::text and public.is_user_active(auth.uid()));
create policy theorie_eigene_hochladen on storage.objects for insert to authenticated
  with check (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
              and (storage.foldername(name))[2] = auth.uid()::text and public.is_user_active(auth.uid()));
create policy theorie_eigene_loeschen on storage.objects for delete to authenticated
  using (bucket_id = 'theorie' and (storage.foldername(name))[1] = 'eigene'
         and (storage.foldername(name))[2] = auth.uid()::text);

-- Grunddaten
insert into public.theorie_klassen (klasse, titel, beschreibung, sort) values
  ('A',  'Klasse A',  'Motorrad – Folien folgen', 10),
  ('B',  'Klasse B',  'Grundstoff 1–12 und Zusatzstoff B 13–14', 20),
  ('BE', 'Klasse BE', 'Pkw mit Anhänger – Folien folgen', 30),
  ('C',  'Klasse C',  'Zusatzstoff C1–C10', 40),
  ('CE', 'Klasse CE', 'Zusatzstoff CE1–CE4', 50),
  ('D',  'Klasse D',  'Bus – Folien folgen', 60)
on conflict (klasse) do nothing;

insert into public.theorie_freigabe (fahrschule_id)
select id from public.fahrschulen where name = 'Fahrschule Boost'
on conflict do nothing;
