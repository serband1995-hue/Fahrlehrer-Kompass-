-- K1 (11.11.2026) · Einmal-Kopie vor den Änderungen.
-- Eigenes Schema "sicherung": nicht über die Schnittstelle erreichbar, keine Rechte für angemeldete oder anonyme Nutzer.
-- Rückweg: Die Kopien bleiben liegen, bis die Hauptsitzung sie nach dem 21.11. löschen lässt (drop schema sicherung cascade).
create schema if not exists sicherung;
revoke all on schema sicherung from public, anon, authenticated;

create table sicherung.fahrschulen_20261111 as table public.fahrschulen;
create table sicherung.schueler_20261111 as table public.schueler;
create table sicherung.schueler_notiz_gelesen_20261111 as table public.schueler_notiz_gelesen;

alter table sicherung.fahrschulen_20261111 enable row level security;
alter table sicherung.schueler_20261111 enable row level security;
alter table sicherung.schueler_notiz_gelesen_20261111 enable row level security;
revoke all on all tables in schema sicherung from public, anon, authenticated;
