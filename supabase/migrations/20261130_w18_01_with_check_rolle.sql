-- W18 (26.11.2026): Schreibregeln der Leitung und des Büros prüfen beim Speichern auch die Rolle.
--
-- Fund (W18, Prüfung „10 Fahrlehrer“): Die Regeln „Büro …“ und „Fahrschule-Admin …“ sind FOR ALL (bzw. UPDATE).
-- Ihr USING prüft die Rolle (is_buero / is_fahrschule_admin), ihr WITH CHECK aber nur fahrschule_id = my_fahrschule_id().
-- Postgres prüft beim Einfügen NUR das WITH CHECK, und beim Ändern reicht das WITH CHECK IRGENDEINER erlaubenden Regel.
-- Folge: Jeder Fahrlehrer der Fahrschule konnte (über die Schnittstelle, nicht über die App)
--   * Schüler, Termine, Prüfungen, Provisionen, Schichten, Urlaub, Tafelbilder, Fahrzeuge, Verschiebungs-Vermerke
--     mit der fahrlehrer_id eines Kollegen (oder ohne Fahrlehrer) ANLEGEN,
--   * eine eigene offene Empfehlung selbst auf „bezahlt“ mit Betrag setzen (statt nur „storniert“).
-- Lesen, Ändern oder Löschen FREMDER Zeilen ging nicht (USING bleibt streng); fremde Fahrschulen waren nie betroffen.
--
-- Reparatur: Für genau diese Regeln wird das WITH CHECK gleich ihrem USING gesetzt (Rolle UND eigene Fahrschule),
-- so wie es die Regeln „Buero mit Verwalten-Recht verwaltet Fahrzeuge“ und „Fahrschule-Admin verwaltet eigene Pakete“
-- schon tun. Das USING bleibt unverändert. Der Text wird aus der LIVE-Regel genommen (pg_policies.qual), nicht geraten.
-- Schutz: Jede Regel muss genau so vorhanden sein (Name, Tabelle), ihr USING muss die Rolle prüfen und ihr WITH CHECK
-- darf sie noch nicht prüfen. Sonst bricht die Migration ab, BEVOR etwas geändert ist (eine Transaktion).
-- Ausnahme schueler_verschiebungen: WITH CHECK = Leitung ODER Büro (das Büro hat dort keine eigene Regel, siehe unten).
-- Wer ist betroffen: Büro (is_buero), Leitung (is_fahrschule_admin, auch „fährt selbst“) arbeiten wie vorher, denn
-- ihre Zeilen erfüllen das USING ohnehin. Super-Admin hat eigene Regeln. Fahrlehrer behalten ihre eigenen Regeln
-- („Fahrlehrer legt eigene … an“ mit fahrlehrer_id = auth.uid()). Die App nutzt die gelockerten Wege nicht
-- (Prüf-Team W18: Provisionen, Fahrzeuge, Schichten, Empfehlungen schreiben nur Leitung/Büro mit eigener Regel).
-- Einzige Ausnahme war schueler_verschiebungen: Dort schreibt das Büro (buero.js verschiebeSchueler) ohne eigene Regel – deshalb
-- bekommt diese Regel Leitung ODER Büro. Büro ohne Verwalten-Recht konnte bisher Fahrzeuge nur ANLEGEN (nicht ändern); den Knopf
-- zeigt die Büro-Seite ihm ohnehin nicht (buero.js, „+ Fahrzeug“ nur mit Verwalten-Recht).
-- Bewusst NICHT geändert: profiles „Fahrschule-Admin verwaltet eigene Fahrlehrer“ (nur UPDATE, live mit with_check
-- fahrschule_id = my_fahrschule_id() AND rolle = 'fahrlehrer'). Ein UPDATE erreicht nur Zeilen, deren USING passt; für einen
-- Fahrlehrer ist das allein sein eigenes Profil („Eigenes Profil ändern“, auth.uid() = id). Die neue Zeile erfüllt dann ohnehin
-- dessen Prüfung (Standard = USING); Rolle, Fahrschule, E-Mail, Aktiv und „fährt selbst“ schützt der Auslöser profil_schutz.
-- Die lockere Prüfung öffnet also keine fremde Zeile und kein neues Feld. Ein INSERT-Weg besteht nicht (Regel nur für UPDATE).
-- Live-Abfrage 1d-5 (W18, 26.11.2026) bestätigt genau diese 14 Regeln plus die profiles-Regel.
-- Rückweg: supabase/rueckweg/20261130_w18_rueckweg.sql
-- Nur für Prüfungen ohne Live-Datenbank (PGlite): set_config('w18.nur_vorhandene','1') überspringt fehlende Tabellen.
do $w18m$
declare
  r record;
  v_qual text;
  v_check text;
  v_fehlt text[] := '{}';
  v_n int := 0;
  v_nur_vorhandene boolean := coalesce(current_setting('w18.nur_vorhandene', true), '') = '1';
begin
  for r in
    select * from (values
      ('schueler',                'Buero sieht und bearbeitet Schueler der Fahrschule'),
      ('schueler',                'Fahrschule-Admin verwaltet eigene Schueler'),
      ('kalender_termine',        'Buero sieht und bearbeitet Termine der Fahrschule'),
      ('kalender_termine',        'Fahrschule-Admin verwaltet eigene Termine'),
      ('kalender_pruefungen',     'Buero sieht und bearbeitet Pruefungen der Fahrschule'),
      ('kalender_pruefungen',     'Fahrschule-Admin verwaltet eigene Pruefungen'),
      ('provisionen',             'Buero sieht und bearbeitet Provisionen der Fahrschule'),
      ('provisionen',             'Fahrschule-Admin verwaltet eigene Provisionen'),
      ('fahrschule_schichten',    'Fahrschule-Admin/Buero verwaltet Schichten'),
      ('fahrschule_urlaub',       'Fahrschule-Admin/Buero verwaltet Urlaub'),
      ('fahrschule_tafelbilder',  'Fahrschule-Admin/Buero verwaltet Tafelbilder'),
      ('fahrschule_fahrzeuge',    'Fahrschule-Admin verwaltet eigene Fahrzeuge'),
      ('fahrschule_empfehlungen', 'Buero/Admin verwaltet Empfehlungen'),
      ('schueler_verschiebungen', 'Fahrschule-Admin sieht eigene Verschiebungen')
    ) as t(tab, pol)
  loop
    if to_regclass('public.' || r.tab) is null and v_nur_vorhandene then
      continue;
    end if;
    select p.qual, p.with_check into v_qual, v_check
      from pg_policies p
     where p.schemaname = 'public' and p.tablename = r.tab and p.policyname = r.pol;
    if not found then
      v_fehlt := v_fehlt || (r.tab || ': Regel fehlt: ' || r.pol);
      continue;
    end if;
    if v_qual is null or v_qual !~ '(is_buero|is_fahrschule_admin)\(' then
      v_fehlt := v_fehlt || (r.tab || ': USING prüft keine Rolle: ' || r.pol);
      continue;
    end if;
    if v_check ~ '(is_buero|is_fahrschule_admin)\(' then
      continue; -- schon repariert (zweiter Lauf ändert nichts)
    end if;
    if v_check is null or v_check !~ 'fahrschule_id = my_fahrschule_id\(\)' then
      v_fehlt := v_fehlt || (r.tab || ': WITH CHECK anders als erwartet: ' || r.pol || ' = ' || coalesce(v_check, 'leer'));
      continue;
    end if;
  end loop;
  if cardinality(v_fehlt) > 0 then
    raise exception 'W18-Migration abgebrochen, nichts geändert: %', array_to_string(v_fehlt, ' | ');
  end if;

  -- Zweiter Durchgang: erst ändern, wenn ALLE Regeln wie erwartet aussehen
  for r in
    select p.tablename as tab, p.policyname as pol, p.qual
      from pg_policies p
     where p.schemaname = 'public'
       and (p.tablename, p.policyname) in (
         ('schueler', 'Buero sieht und bearbeitet Schueler der Fahrschule'),
         ('schueler', 'Fahrschule-Admin verwaltet eigene Schueler'),
         ('kalender_termine', 'Buero sieht und bearbeitet Termine der Fahrschule'),
         ('kalender_termine', 'Fahrschule-Admin verwaltet eigene Termine'),
         ('kalender_pruefungen', 'Buero sieht und bearbeitet Pruefungen der Fahrschule'),
         ('kalender_pruefungen', 'Fahrschule-Admin verwaltet eigene Pruefungen'),
         ('provisionen', 'Buero sieht und bearbeitet Provisionen der Fahrschule'),
         ('provisionen', 'Fahrschule-Admin verwaltet eigene Provisionen'),
         ('fahrschule_schichten', 'Fahrschule-Admin/Buero verwaltet Schichten'),
         ('fahrschule_urlaub', 'Fahrschule-Admin/Buero verwaltet Urlaub'),
         ('fahrschule_tafelbilder', 'Fahrschule-Admin/Buero verwaltet Tafelbilder'),
         ('fahrschule_fahrzeuge', 'Fahrschule-Admin verwaltet eigene Fahrzeuge'),
         ('fahrschule_empfehlungen', 'Buero/Admin verwaltet Empfehlungen'),
         ('schueler_verschiebungen', 'Fahrschule-Admin sieht eigene Verschiebungen'))
       and p.with_check !~ '(is_buero|is_fahrschule_admin)\('
  loop
    if r.tab = 'schueler_verschiebungen' then
      -- Ausnahme: Für diese Tabelle hat das Büro KEINE eigene Regel. Das Büro schreibt beim Fahrlehrer-Wechsel eines Schülers
      -- (buero.js verschiebeSchueler) den Übergabe-Hinweis hier hinein und kam bisher nur über das lockere WITH CHECK dieser
      -- Leitungs-Regel durch (Prüf-Team W18). Deshalb: Leitung ODER Büro, eigene Fahrschule. USING bleibt unverändert.
      execute format('alter policy %I on public.%I with check (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))', r.pol, r.tab);
    else
      execute format('alter policy %I on public.%I with check (%s)', r.pol, r.tab, r.qual);
    end if;
    v_n := v_n + 1;
  end loop;
  raise notice 'W18-Migration: % Regeln angepasst (WITH CHECK = USING)', v_n;
end
$w18m$;
