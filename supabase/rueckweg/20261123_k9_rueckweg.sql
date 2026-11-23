-- Rückweg K9 Preisliste: entfernt Tabelle, Regeln und Schutz. ACHTUNG: gelöschte Preise sind weg
-- (vorher in der Büro-Seite „Preisliste herunterladen“ sichern). Die App läuft ohne die Tabelle weiter
-- (Reaktivierung fällt zurück auf die alte Einstellung bzw. 240 €).
drop trigger if exists fahrschule_preise_schutz on public.fahrschule_preise;
drop function if exists public.fahrschule_preise_schutz();
drop table if exists public.fahrschule_preise;
