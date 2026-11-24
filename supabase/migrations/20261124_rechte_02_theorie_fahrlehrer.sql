-- Theorie bestanden aus der App (Werkstatt 12, 🗣 Serband 24.11.2026, Entscheidung Hauptsitzung):
-- Der eigene Fahrlehrer eines Schülers darf schueler.theorie_bestanden_am setzen – nur auf heute oder ein früheres Datum
-- (Berlin). Zurücknehmen (auf leer) oder ein anderes Datum eintragen darf er nur, wenn er selbst den jetzigen Wert heute
-- gesetzt hat (letzter Spur-Eintrag zu dem Feld: von ihm, von heute); sonst bleibt das beim Büro.
-- Alle anderen Büro-Felder bleiben gesperrt wie bisher. Die Spur schreibt schueler_protokoll (theorie_bestanden_am steht
-- dort schon). Neu beim Anlegen durch einen Fahrlehrer: ein Datum in der Zukunft wird verworfen.
-- Grundlage: Funktionstext live vom 24.11.2026 (pg_get_functiondef), nur um die Ausnahme ergänzt.
-- Idempotent. Rückweg: supabase/rueckweg/20261124_rechte_02_rueckweg.sql (stellt den alten Text wieder her)

create or replace function public.schueler_buero_felder_schutz()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  darf boolean := auth.uid() is null
    or is_super_admin(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_buero(auth.uid());
  heute date := (now() at time zone 'Europe/Berlin')::date;
  theorie_ok boolean := false;
  letzte record;
begin
  if darf then return new; end if;
  if tg_op = 'INSERT' then
    new.reakt_status := 'pruefen'; new.reakt_bezahlt_bis := null; new.reakt_notiz := null;
    new.reakt_betrag := null; new.b197_testfahrt_am := null; new.inaktiv_seit := null; new.antrag_am := null;
    new.praxis_bestanden_am := null; new.theorie_frist_bis := null;
    if new.theorie_bestanden_am > heute then new.theorie_bestanden_am := null; end if;
    return new;
  end if;
  -- Ausnahme: der eigene Fahrlehrer und „Theorie bestanden“
  if new.theorie_bestanden_am is distinct from old.theorie_bestanden_am
     and old.fahrlehrer_id = auth.uid() and new.fahrlehrer_id is not distinct from old.fahrlehrer_id then
    if new.theorie_bestanden_am is not null and new.theorie_bestanden_am > heute then
      raise exception 'Theorie bestanden: das Datum darf nicht in der Zukunft liegen.';
    end if;
    if old.theorie_bestanden_am is null then
      theorie_ok := new.theorie_bestanden_am is not null;
    else
      select a.geaendert_von, a.geaendert_am into letzte
        from public.aenderungsprotokoll a
       where a.tabelle = 'schueler' and a.datensatz_id = old.id::text and a.feld = 'theorie_bestanden_am'
       order by a.id desc limit 1; -- id: eindeutig in Schreib-Reihenfolge (geaendert_am ist der Beginn der Transaktion)
      -- coalesce: ohne Nutzer (Server, SQL-Editor) ist geaendert_von leer – das zählt nicht als „selbst gesetzt“
      theorie_ok := coalesce(found and letzte.geaendert_von = auth.uid()
                    and (letzte.geaendert_am at time zone 'Europe/Berlin')::date = heute, false);
    end if;
    if not theorie_ok then
      raise exception 'Das Datum „Theorie bestanden“ kann nur das Büro ändern.';
    end if;
  end if;
  if new.vertrag_am is distinct from old.vertrag_am
     or new.klasse is distinct from old.klasse
     or new.ausbildungsart is distinct from old.ausbildungsart
     or new.reakt_status is distinct from old.reakt_status
     or new.reakt_bezahlt_bis is distinct from old.reakt_bezahlt_bis
     or new.reakt_notiz is distinct from old.reakt_notiz
     or new.reakt_betrag is distinct from old.reakt_betrag
     or new.theorie_abgeschlossen_am is distinct from old.theorie_abgeschlossen_am
     or (new.theorie_bestanden_am is distinct from old.theorie_bestanden_am and not theorie_ok)
     or new.praxis_bestanden_am is distinct from old.praxis_bestanden_am
     or new.b197_testfahrt_am is distinct from old.b197_testfahrt_am
     or new.inaktiv_seit is distinct from old.inaktiv_seit
     or new.antrag_am is distinct from old.antrag_am
     or new.theorie_frist_bis is distinct from old.theorie_frist_bis then
    raise exception 'Fristen, Reaktivierung und Aktiv-Status darf nur das Büro ändern.';
  end if;
  return new;
end $function$;

-- Ergebnis-Abfrage: erwartet ausnahme = true
select position('theorie_ok' in pg_get_functiondef('public.schueler_buero_felder_schutz'::regproc)) > 0 as ausnahme;
