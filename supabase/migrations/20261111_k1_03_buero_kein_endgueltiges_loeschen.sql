-- K1 (11.11.2026) · S5, Teil von KD4 und KA6.
-- Das gemeinsame Büro-Konto darf auf vier Tabellen nicht mehr endgültig löschen.
-- Je Tabelle genau EINE zusätzliche einschränkende Regel, nur für DELETE. Vorhandene Regeln bleiben unverändert.
-- Die App löscht dort nie endgültig (nur status = 'geloescht' bzw. geloescht = true), sie ist nicht betroffen.
-- Leitung, Super-Admin, Nachtläufe und Server-Funktionen sind nicht betroffen.
-- Rückweg: supabase/rueckweg/20261111_k1_rueckweg.sql, Abschnitt 3.
create policy "Buero loescht nicht endgueltig" on public.schueler
  as restrictive for delete to public using (not public.is_buero(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.kalender_termine
  as restrictive for delete to public using (not public.is_buero(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.kalender_pruefungen
  as restrictive for delete to public using (not public.is_buero(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.provisionen
  as restrictive for delete to public using (not public.is_buero(auth.uid()));
