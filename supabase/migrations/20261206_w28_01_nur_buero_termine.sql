-- W28 (28.11.2026): Terminarten „nur Büro“ – Vortest, Simulator, Beratungsgespräch vor Ort, MPU-Termin.
-- 🗣 Serband (27.11.): Diese Termine erscheinen nur im Büro, nicht in der Fahrlehrer-App, nicht in Lohn, UE, Fahrcheck, Statistik.
-- Schutz auf dem Server: RESTRICTIVE-Regeln auf kalender_termine. Sie kommen zu den bestehenden Regeln dazu (UND), ändern keine
-- bestehende Regel und keine Zeile. Wer nicht Büro, Leitung oder Super-Admin ist (also Fahrlehrer), kann Termine dieser Arten
-- weder lesen noch anlegen, ändern oder löschen. Für alle anderen Arten ändert sich nichts.
-- Leitung, die selbst fährt, liest sie weiter (Büro-Seite); die App blendet sie für alle Rollen selbst aus (index.html, istNurBueroArt).
-- Funktionen mit „security definer“ (Spiegel der Prüfungen, Papierkorb, Sicherung) und Edge Functions (service_role) sind nicht betroffen.
-- Spalte art bleibt Text ohne Prüfregel; „mpu“ ist ein neuer Wert. Fehlt art (null), gilt die Zeile nicht als Büro-Art.
-- Rückweg: supabase/rueckweg/20261206_w28_01_rueckweg.sql
begin;

create or replace function public.termin_art_nur_buero(p_art text)
 returns boolean language sql immutable
as $f$ select coalesce(p_art = any (array['vortest', 'simulator', 'beratung', 'mpu']), false) $f$;

create or replace function public.darf_buero_termine()
 returns boolean language sql stable security definer
 set search_path to 'public'
-- Dieselben Hilfsfunktionen wie die bestehenden Regeln auf kalender_termine (Lese-Abfrage A6 vom 28.11.): gleiche Definition von Büro/Leitung/Super-Admin
as $f$ select coalesce(public.is_buero(auth.uid()) or public.is_fahrschule_admin(auth.uid()) or public.is_super_admin(auth.uid()), false) $f$;

revoke all on function public.darf_buero_termine() from public;
grant execute on function public.darf_buero_termine() to authenticated, anon;
grant execute on function public.termin_art_nur_buero(text) to authenticated, anon;

drop policy if exists "W28 Buero-Termine lesen nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine anlegen nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine aendern nur Buero und Leitung" on public.kalender_termine;
drop policy if exists "W28 Buero-Termine loeschen nur Buero und Leitung" on public.kalender_termine;

create policy "W28 Buero-Termine lesen nur Buero und Leitung" on public.kalender_termine
  as restrictive for select to public
  using (not public.termin_art_nur_buero(art) or (select public.darf_buero_termine()));
create policy "W28 Buero-Termine anlegen nur Buero und Leitung" on public.kalender_termine
  as restrictive for insert to public
  with check (not public.termin_art_nur_buero(art) or (select public.darf_buero_termine()));
-- Ändern: weder einen Büro-Termin anfassen (USING) noch einen Termin zu einem Büro-Termin machen (WITH CHECK)
create policy "W28 Buero-Termine aendern nur Buero und Leitung" on public.kalender_termine
  as restrictive for update to public
  using (not public.termin_art_nur_buero(art) or (select public.darf_buero_termine()))
  with check (not public.termin_art_nur_buero(art) or (select public.darf_buero_termine()));
create policy "W28 Buero-Termine loeschen nur Buero und Leitung" on public.kalender_termine
  as restrictive for delete to public
  using (not public.termin_art_nur_buero(art) or (select public.darf_buero_termine()));

commit;

-- Prüf-Abfrage: 4 Regeln, 2 Funktionen
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'kalender_termine' and policyname like 'W28 %' and permissive = 'RESTRICTIVE') as regeln,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('termin_art_nur_buero', 'darf_buero_termine')) as funktionen;
