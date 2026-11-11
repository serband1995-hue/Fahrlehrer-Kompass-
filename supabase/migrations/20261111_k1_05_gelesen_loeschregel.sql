-- K1 (11.11.2026) · BE6. „Notiz wieder neu für den Fahrlehrer“ wirkte nicht: Für die Gelesen-Marken gab es
-- keine Löschregel, das Löschen entfernte still 0 Zeilen.
-- Jetzt dürfen Büro und Leitung die Marken zu Notizen der eigenen Fahrschule löschen (gleiche Bedingung wie beim Lesen),
-- der Super-Admin alle.
-- Rückweg: supabase/rueckweg/20261111_k1_rueckweg.sql, Abschnitt 5.
create policy "Gelesen Buero loescht" on public.schueler_notiz_gelesen
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.schueler_notizen n
       where n.id = schueler_notiz_gelesen.notiz_id
         and (public.is_buero(auth.uid()) or public.is_fahrschule_admin(auth.uid()))
         and n.fahrschule_id = public.my_fahrschule_id()
    )
  );
