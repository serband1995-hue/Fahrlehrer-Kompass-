-- Einmal-Schlüssel für den Import der Bibliothek (Edge Function theorie-import, inzwischen stillgelegt).
-- Gespeichert wird nur die SHA-256-Prüfsumme; Zugriff nur für die Service-Rolle.
create table if not exists public.theorie_import_schluessel (
  hash text primary key,
  gueltig_bis timestamptz not null
);
alter table public.theorie_import_schluessel enable row level security;
revoke all on public.theorie_import_schluessel from anon, authenticated;
-- (Eintrag mit Prüfsumme wurde einmalig für 6 Stunden angelegt; nicht im Repo.)
