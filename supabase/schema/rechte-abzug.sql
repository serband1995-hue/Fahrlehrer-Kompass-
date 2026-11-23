-- Abzug der Zugriffsregeln (RLS) und Trigger der Kompass-Datenbank (Projekt oectrvkjunntzsggyhxv), NUR ZUM LESEN.
-- Stand: 21.11.2026, nach Migration 20261121_zugang_01. Nicht ausführen – die Datenbank ist die Quelle.
-- Zweck (Fable-Prüfung 21.11.2026): Prüfer ohne Datenbank-Zugang sollen sehen, wer was lesen und schreiben darf.
-- Bei jeder Migration, die Rechte ändert, neu ziehen (lesend, z. B. per Supabase-Werkzeug):
--   select format('create policy %I on %I.%I as %s for %s to %s ...', ...) from pg_policies where schemaname in ('public','storage');
--   select pg_get_triggerdef(oid) from pg_trigger where not tgisinternal;
-- Hilfsfunktionen: is_super_admin(uid) / is_fahrschule_admin(uid) / is_buero(uid) = Rolle in profiles;
--   my_fahrschule_id() = fahrschule_id des Angemeldeten. Rolle 'entfernt' (gelöschter Zugang) erfüllt keine davon.
-- Wichtig zu wissen:
--   * profiles: jeder darf sein EIGENES Profil ändern („Eigenes Profil ändern“). Rolle, Fahrschule, E-Mail, aktiv
--     (und ab Migration 20261121_zugang_02 faehrt_selbst) schützt der Trigger profil_schutz (nur Super-Admin oder Server).
--   * Schreibregeln prüfen NICHT profiles.aktiv: Ein gesperrter Zugang mit noch gültigem Anmelde-Token (bis ~1 h)
--     kann eigene Zeilen noch ändern. Gelöschte Zugänge sind zusätzlich im Anmeldekonto gebannt.

-- ===== Trigger =====
CREATE TRIGGER trg_fc_abgaben_bearbeiter BEFORE INSERT ON public.fc_abgaben FOR EACH ROW EXECUTE FUNCTION fc_abgaben_bearbeiter();
CREATE TRIGGER trg_pruefung_verschiebung_schutz BEFORE UPDATE ON public.kalender_pruefungen FOR EACH ROW EXECUTE FUNCTION termin_verschiebung_schutz();
CREATE TRIGGER trg_termin_entfernt_schutz BEFORE UPDATE ON public.kalender_termine FOR EACH ROW EXECUTE FUNCTION termin_entfernt_schutz();
CREATE TRIGGER trg_termin_verschiebung_schutz BEFORE UPDATE ON public.kalender_termine FOR EACH ROW EXECUTE FUNCTION termin_verschiebung_schutz();
-- ab Migration 20261123_k8_01 (Sperre bei offener Zahlung):
CREATE TRIGGER trg_termin_zx_zahlung BEFORE INSERT OR UPDATE ON public.kalender_termine FOR EACH ROW EXECUTE FUNCTION termin_zahlung_sperre();
-- K7 (Migration 20261123_k7_01): Papierkorb. geloescht_am setzt nur der Server; gelaufene/unterschriebene Nachweis-Stunden
-- bekommen beim Löschen payload.storno (nie endgültig weg). papierkorb_leeren() (security definer, Büro/Leitung/Super-Admin
-- nur eigene Fahrschule, pg_cron alle) löscht endgültig nur > 30 Tage im Papierkorb, ohne Storno, nie unterschrieben.
CREATE TRIGGER trg_termin_zy_papierkorb BEFORE INSERT OR UPDATE ON public.kalender_termine FOR EACH ROW EXECUTE FUNCTION termin_papierkorb();
-- K9 (Migration 20261123_k9_01, nach der Datei nachgetragen, nicht live gezogen): Verfasser/Zeit/PIN-Person setzt der Server,
-- Rückdatieren nur Super-Admin, Paket muss zur eigenen Fahrschule gehören.
CREATE TRIGGER fahrschule_preise_schutz BEFORE INSERT ON public.fahrschule_preise FOR EACH ROW EXECUTE FUNCTION fahrschule_preise_schutz();
-- Auftrag 4 Zahlungsmail (Migration 20261124_zm_01, aus der Datei nachgetragen, nicht live gezogen): Verfasser/Zeit/PIN-Person
-- setzt der Server, IBAN-Prüfziffer, Texte ohne Steuerzeichen, „echt“ nur mit Kontoinhaber+IBAN; jede Änderung in aenderungsprotokoll.
CREATE TRIGGER fahrschule_zahlungsdaten_schutz BEFORE INSERT OR UPDATE ON public.fahrschule_zahlungsdaten FOR EACH ROW EXECUTE FUNCTION fahrschule_zahlungsdaten_schutz();
CREATE TRIGGER fahrschule_zahlungsdaten_spur AFTER INSERT OR UPDATE ON public.fahrschule_zahlungsdaten FOR EACH ROW EXECUTE FUNCTION fahrschule_zahlungsdaten_spur();
CREATE TRIGGER trg_profil_schutz BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profil_schutz();
CREATE TRIGGER trg_akademie_sync AFTER INSERT OR DELETE OR UPDATE ON public.schueler FOR EACH STATEMENT EXECUTE FUNCTION akademie_sync_anstossen();
CREATE TRIGGER trg_schueler_bogen_entfernen BEFORE INSERT OR UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_bogen_entfernen();
CREATE TRIGGER trg_schueler_buero_felder_schutz BEFORE INSERT OR UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_buero_felder_schutz();
CREATE TRIGGER trg_schueler_protokoll AFTER UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_protokoll();
CREATE TRIGGER trg_schueler_verschiebung_schutz BEFORE UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_verschiebung_schutz();
-- ab Migration 20261123_k8_01: zahlung_gesperrt_* nur Büro/Leitung/Super-Admin; Spur ins aenderungsprotokoll; Online-Buchung gesperrter Schüler neutral abgewiesen
CREATE TRIGGER trg_schueler_zahlung_schutz BEFORE INSERT OR UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_zahlung_schutz();
CREATE TRIGGER trg_schueler_zahlung_spur AFTER UPDATE ON public.schueler FOR EACH ROW EXECUTE FUNCTION schueler_zahlung_spur();
CREATE TRIGGER trg_buchung_zahlung_sperre BEFORE INSERT ON public.public_bookings FOR EACH ROW EXECUTE FUNCTION buchung_zahlung_sperre();
CREATE TRIGGER trg_aufgaben_bearbeiter BEFORE INSERT OR UPDATE ON public.schueler_aufgaben FOR EACH ROW EXECUTE FUNCTION notizen_bearbeiter();
CREATE TRIGGER trg_aufgaben_von_person BEFORE INSERT OR UPDATE ON public.schueler_aufgaben FOR EACH ROW EXECUTE FUNCTION aufgaben_von_person();
CREATE TRIGGER trg_notizen_bearbeiter BEFORE INSERT OR UPDATE ON public.schueler_notizen FOR EACH ROW EXECUTE FUNCTION notizen_bearbeiter();
CREATE TRIGGER trg_snapshots_server_zeit BEFORE INSERT OR UPDATE ON public.snapshots FOR EACH ROW EXECUTE FUNCTION snapshots_set_server_zeit();
CREATE TRIGGER theorie_dateien_grenze BEFORE INSERT ON public.theorie_dateien FOR EACH ROW EXECUTE FUNCTION theorie_dateien_grenze();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== Zugriffsregeln (RLS) =====
create policy "Protokoll lesen Buero Admin" on public.aenderungsprotokoll as PERMISSIVE for SELECT to authenticated
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Protokoll lesen Super Admin" on public.aenderungsprotokoll as PERMISSIVE for SELECT to authenticated
  using (is_super_admin(auth.uid()));
create policy "Personen lesen" on public.buero_personen as PERMISSIVE for SELECT to public
  using ((is_super_admin(auth.uid()) OR ((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id()))));
create policy "Fahrschule-Admin/Buero erstellt eigene Backups" on public.fahrschule_backups as PERMISSIVE for INSERT to public
  with check (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrschule-Admin/Buero sieht eigene Backups" on public.fahrschule_backups as PERMISSIVE for SELECT to public
  using (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Super Admin alles - Backups" on public.fahrschule_backups as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Buero/Admin verwaltet Empfehlungen" on public.fahrschule_empfehlungen as PERMISSIVE for UPDATE to public
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer legt eigene Empfehlung an" on public.fahrschule_empfehlungen as PERMISSIVE for INSERT to public
  with check (((fahrschule_id = my_fahrschule_id()) AND (fahrlehrer_id = auth.uid())));
create policy "Fahrlehrer sieht Empfehlungen seiner Fahrschule" on public.fahrschule_empfehlungen as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer storniert eigene offene Empfehlung" on public.fahrschule_empfehlungen as PERMISSIVE for UPDATE to public
  using (((fahrlehrer_id = auth.uid()) AND (status = 'empfohlen'::text) AND (fahrschule_id = my_fahrschule_id())))
  with check (((fahrschule_id = my_fahrschule_id()) AND (status = 'storniert'::text)));
create policy "Super Admin alles - Empfehlungen" on public.fahrschule_empfehlungen as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Buero mit Verwalten-Recht verwaltet Fahrzeuge" on public.fahrschule_fahrzeuge as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id()) AND buero_darf_verwalten(fahrschule_id)))
  with check ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id()) AND buero_darf_verwalten(fahrschule_id)));
create policy "Fahrlehrer sieht Fahrzeuge seiner Fahrschule" on public.fahrschule_fahrzeuge as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrschule-Admin verwaltet eigene Fahrzeuge" on public.fahrschule_fahrzeuge as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Fahrzeuge" on public.fahrschule_fahrzeuge as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Fahrlehrer sieht Pakete seiner Fahrschule" on public.fahrschule_pakete as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrschule-Admin verwaltet eigene Pakete" on public.fahrschule_pakete as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Pakete" on public.fahrschule_pakete as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
-- K9 fahrschule_preise (nach der Migration nachgetragen): kein UPDATE; anon keine Rechte, authenticated nur select/insert/delete.
create policy "Preise lesen Fahrschule" on public.fahrschule_preise as PERMISSIVE for SELECT to authenticated
  using (((fahrschule_id = k5_meine_fahrschule()) OR is_super_admin(auth.uid())));
create policy "Preise anlegen Buero Leitung" on public.fahrschule_preise as PERMISSIVE for INSERT to authenticated
  with check ((is_super_admin(auth.uid()) OR ((fahrschule_id = k5_meine_fahrschule()) AND COALESCE((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())), false))));
create policy "Preise loeschen nur Super-Admin" on public.fahrschule_preise as PERMISSIVE for DELETE to authenticated
  using (is_super_admin(auth.uid()));
-- Auftrag 4 (nach der Migration nachgetragen): zm_darf(fs) = aktives Konto UND (Super-Admin ODER eigene Fahrschule als Büro/Leitung).
-- fahrschule_zahlungsdaten: anon nichts, authenticated nur select/insert/update, kein Löschen.
create policy "Zahlungsdaten lesen Buero Leitung" on public.fahrschule_zahlungsdaten as PERMISSIVE for SELECT to authenticated
  using (zm_darf(fahrschule_id));
create policy "Zahlungsdaten anlegen Buero Leitung" on public.fahrschule_zahlungsdaten as PERMISSIVE for INSERT to authenticated
  with check (zm_darf(fahrschule_id));
create policy "Zahlungsdaten aendern Buero Leitung" on public.fahrschule_zahlungsdaten as PERMISSIVE for UPDATE to authenticated
  using (zm_darf(fahrschule_id)) with check (zm_darf(fahrschule_id));
-- zahlungs_mails: nur lesen (authenticated select); schreiben nur zahlungs_mail_vorbereiten() (security definer: Rolle, Fahrschule,
-- Limit 5 je Schüler und Modus / 100 je Fahrschule in 24 h, Empfänger im Test NUR Test-Adresse) und die Edge-Funktion zahlungs-mail.
create policy "Zahlungsmails lesen Buero Leitung" on public.zahlungs_mails as PERMISSIVE for SELECT to authenticated
  using (zm_darf(fahrschule_id));
create policy "Fahrlehrer sieht Schichten seiner Fahrschule" on public.fahrschule_schichten as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrschule-Admin/Buero verwaltet Schichten" on public.fahrschule_schichten as PERMISSIVE for ALL to public
  using (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Schichten" on public.fahrschule_schichten as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Fahrlehrer loescht eigenes Tafelbild" on public.fahrschule_tafelbilder as PERMISSIVE for DELETE to public
  using (((fahrschule_id = my_fahrschule_id()) AND (erstellt_von = auth.uid())));
create policy "Fahrlehrer sieht Tafelbilder seiner Fahrschule" on public.fahrschule_tafelbilder as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer teilt eigenes Tafelbild" on public.fahrschule_tafelbilder as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrschule-Admin/Buero verwaltet Tafelbilder" on public.fahrschule_tafelbilder as PERMISSIVE for ALL to public
  using (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Tafelbilder" on public.fahrschule_tafelbilder as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Fahrlehrer sieht Urlaub seiner Fahrschule" on public.fahrschule_urlaub as PERMISSIVE for SELECT to public
  using ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer traegt eigenen Urlaub ein" on public.fahrschule_urlaub as PERMISSIVE for INSERT to public
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrschule-Admin/Buero verwaltet Urlaub" on public.fahrschule_urlaub as PERMISSIVE for ALL to public
  using (((is_fahrschule_admin(auth.uid()) OR is_buero(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Urlaub" on public.fahrschule_urlaub as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Eigene Fahrschule lesen" on public.fahrschulen as PERMISSIVE for SELECT to public
  using ((id = my_fahrschule_id()));
create policy "Super Admin alles" on public.fahrschulen as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "FC-Abgaben Buero Admin anlegen" on public.fc_abgaben as PERMISSIVE for INSERT to authenticated
  with check (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id()) AND (bestaetigt_von = auth.uid())));
create policy "FC-Abgaben Buero Admin lesen" on public.fc_abgaben as PERMISSIVE for SELECT to authenticated
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "FC-Abgaben Fahrlehrer liest eigene" on public.fc_abgaben as PERMISSIVE for SELECT to authenticated
  using ((fahrlehrer_id = auth.uid()));
create policy "FC-Abgaben Super Admin anlegen" on public.fc_abgaben as PERMISSIVE for INSERT to authenticated
  with check ((is_super_admin(auth.uid()) AND (bestaetigt_von = auth.uid())));
create policy "FC-Abgaben Super Admin lesen" on public.fc_abgaben as PERMISSIVE for SELECT to authenticated
  using (is_super_admin(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.kalender_pruefungen as RESTRICTIVE for DELETE to public
  using ((NOT is_buero(auth.uid())));
create policy "Buero sieht und bearbeitet Pruefungen der Fahrschule" on public.kalender_pruefungen as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer bearbeitet eigene Pruefungen" on public.kalender_pruefungen as PERMISSIVE for UPDATE to public
  using ((fahrlehrer_id = auth.uid()))
  with check ((fahrlehrer_id = auth.uid()));
create policy "Fahrlehrer legt eigene Pruefungen an" on public.kalender_pruefungen as PERMISSIVE for INSERT to public
  with check (((fahrlehrer_id = auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrlehrer sieht eigene Pruefungen" on public.kalender_pruefungen as PERMISSIVE for SELECT to public
  using ((fahrlehrer_id = auth.uid()));
create policy "Fahrschule-Admin verwaltet eigene Pruefungen" on public.kalender_pruefungen as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Pruefungen" on public.kalender_pruefungen as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.kalender_termine as RESTRICTIVE for DELETE to public
  using ((NOT is_buero(auth.uid())));
create policy "Buero sieht und bearbeitet Termine der Fahrschule" on public.kalender_termine as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer bearbeitet eigene Termine" on public.kalender_termine as PERMISSIVE for UPDATE to public
  using ((fahrlehrer_id = auth.uid()))
  with check ((fahrlehrer_id = auth.uid()));
create policy "Fahrlehrer legt eigene Termine an" on public.kalender_termine as PERMISSIVE for INSERT to public
  with check (((fahrlehrer_id = auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrlehrer sieht eigene Termine" on public.kalender_termine as PERMISSIVE for SELECT to public
  using ((fahrlehrer_id = auth.uid()));
create policy "Fahrschule-Admin verwaltet eigene Termine" on public.kalender_termine as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Termine" on public.kalender_termine as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy lc_eingang_admin on public.lc_eingang as PERMISSIVE for ALL to authenticated
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy lc_zuordnung_admin on public.lc_zuordnung as PERMISSIVE for ALL to authenticated
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "Buero sieht Profile der Fahrschule" on public.profiles as PERMISSIVE for SELECT to authenticated
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Eigenes Profil lesen" on public.profiles as PERMISSIVE for SELECT to public
  using ((auth.uid() = id));
create policy "Eigenes Profil ändern" on public.profiles as PERMISSIVE for UPDATE to public
  using ((auth.uid() = id));
create policy "Fahrschule-Admin sieht eigene Fahrlehrer" on public.profiles as PERMISSIVE for SELECT to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrschule-Admin verwaltet eigene Fahrlehrer" on public.profiles as PERMISSIVE for UPDATE to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id()) AND (rolle = 'fahrlehrer'::text)))
  with check (((fahrschule_id = my_fahrschule_id()) AND (rolle = 'fahrlehrer'::text)));
create policy "Super Admin alles lesen" on public.profiles as PERMISSIVE for SELECT to public
  using (is_super_admin(auth.uid()));
create policy "Super Admin alles ändern" on public.profiles as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Buero loescht nicht endgueltig" on public.provisionen as RESTRICTIVE for DELETE to public
  using ((NOT is_buero(auth.uid())));
create policy "Buero sieht und bearbeitet Provisionen der Fahrschule" on public.provisionen as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer sieht eigene Provisionen" on public.provisionen as PERMISSIVE for SELECT to public
  using ((fahrlehrer_id = auth.uid()));
create policy "Fahrschule-Admin verwaltet eigene Provisionen" on public.provisionen as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Provisionen" on public.provisionen as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Pruefungstermine Buero Admin" on public.pruefungstermine as PERMISSIVE for ALL to authenticated
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Pruefungstermine Fahrlehrer lesen" on public.pruefungstermine as PERMISSIVE for SELECT to authenticated
  using ((fahrlehrer_id = auth.uid()));
create policy "Pruefungstermine Super Admin" on public.pruefungstermine as PERMISSIVE for ALL to authenticated
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "Buero Admin lesen Buchungen der Fahrschule" on public.public_bookings as PERMISSIVE for SELECT to authenticated
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (EXISTS ( SELECT 1 FROM profiles p
    WHERE ((p.id = public_bookings.fahrlehrer_id) AND (p.fahrschule_id = my_fahrschule_id()))))));
create policy fahrlehrer_liest_eigene_bookings on public.public_bookings as PERMISSIVE for SELECT to public
  using ((auth.uid() = fahrlehrer_id));
create policy fahrlehrer_updated_eigene_bookings on public.public_bookings as PERMISSIVE for UPDATE to public
  using ((auth.uid() = fahrlehrer_id)) with check ((auth.uid() = fahrlehrer_id));
create policy user_manages_eigene_subscriptions on public.push_subscriptions as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "quiz_raeume lesen" on public.quiz_raeume as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy "quiz_spieler lesen" on public.quiz_spieler as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy "Buero loescht nicht endgueltig" on public.schueler as RESTRICTIVE for DELETE to public
  using ((NOT is_buero(auth.uid())));
create policy "Buero sieht und bearbeitet Schueler der Fahrschule" on public.schueler as PERMISSIVE for ALL to public
  using ((is_buero(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Fahrlehrer bearbeitet eigene Schueler" on public.schueler as PERMISSIVE for UPDATE to public
  using ((fahrlehrer_id = auth.uid())) with check ((fahrlehrer_id = auth.uid()));
create policy "Fahrlehrer legt eigene Schueler an" on public.schueler as PERMISSIVE for INSERT to public
  with check (((fahrlehrer_id = auth.uid()) AND (fahrschule_id = my_fahrschule_id())));
create policy "Fahrlehrer sieht eigene Schueler" on public.schueler as PERMISSIVE for SELECT to public
  using ((fahrlehrer_id = auth.uid()));
create policy "Fahrschule-Admin verwaltet eigene Schueler" on public.schueler as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Schueler" on public.schueler as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Aufgaben Buero und Leitung" on public.schueler_aufgaben as PERMISSIVE for ALL to public
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Aufgaben Super Admin" on public.schueler_aufgaben as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "Gelesen Buero loescht" on public.schueler_notiz_gelesen as PERMISSIVE for DELETE to authenticated
  using ((is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM schueler_notizen n
    WHERE ((n.id = schueler_notiz_gelesen.notiz_id) AND (is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (n.fahrschule_id = my_fahrschule_id()))))));
create policy "Gelesen Buero sieht" on public.schueler_notiz_gelesen as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1 FROM schueler_notizen n
    WHERE ((n.id = schueler_notiz_gelesen.notiz_id) AND (is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (n.fahrschule_id = my_fahrschule_id())))));
create policy "Gelesen Fahrlehrer eigene" on public.schueler_notiz_gelesen as PERMISSIVE for SELECT to authenticated
  using ((fahrlehrer_id = auth.uid()));
create policy "Gelesen Fahrlehrer eintragen" on public.schueler_notiz_gelesen as PERMISSIVE for INSERT to authenticated
  with check (((fahrlehrer_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM (schueler_notizen n JOIN schueler s ON ((s.id = n.schueler_id)))
    WHERE ((n.id = schueler_notiz_gelesen.notiz_id) AND (s.fahrlehrer_id = auth.uid()))))));
create policy "Gelesen Super Admin" on public.schueler_notiz_gelesen as PERMISSIVE for SELECT to authenticated
  using (is_super_admin(auth.uid()));
create policy "Notizen Buero und Leitung" on public.schueler_notizen as PERMISSIVE for ALL to authenticated
  using (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())))
  with check (((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id())));
create policy "Notizen Fahrlehrer lesen eigene Schueler" on public.schueler_notizen as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = schueler_notizen.schueler_id) AND (s.fahrlehrer_id = auth.uid())))));
create policy "Notizen Super Admin" on public.schueler_notizen as PERMISSIVE for ALL to authenticated
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "Zugeordneter Fahrlehrer aendert Bogen" on public.schueler_privat as PERMISSIVE for UPDATE to authenticated
  using ((EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = schueler_privat.schueler_id) AND (s.fahrlehrer_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = schueler_privat.schueler_id) AND (s.fahrlehrer_id = auth.uid())))));
create policy "Zugeordneter Fahrlehrer legt Bogen an" on public.schueler_privat as PERMISSIVE for INSERT to authenticated
  with check ((EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = schueler_privat.schueler_id) AND (s.fahrlehrer_id = auth.uid())))));
create policy "Zugeordneter Fahrlehrer liest Bogen" on public.schueler_privat as PERMISSIVE for SELECT to authenticated
  using (((EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = schueler_privat.schueler_id) AND (s.fahrlehrer_id = auth.uid())))) OR is_super_admin(auth.uid())));
create policy "Fahrlehrer quittiert eigene Benachrichtigung" on public.schueler_verschiebungen as PERMISSIVE for UPDATE to public
  using (((von_fahrlehrer_id = auth.uid()) OR (zu_fahrlehrer_id = auth.uid())));
create policy "Fahrlehrer sieht eigene Benachrichtigungen" on public.schueler_verschiebungen as PERMISSIVE for SELECT to public
  using (((von_fahrlehrer_id = auth.uid()) OR (zu_fahrlehrer_id = auth.uid())));
create policy "Fahrschule-Admin sieht eigene Verschiebungen" on public.schueler_verschiebungen as PERMISSIVE for ALL to public
  using ((is_fahrschule_admin(auth.uid()) AND (fahrschule_id = my_fahrschule_id())))
  with check ((fahrschule_id = my_fahrschule_id()));
create policy "Super Admin alles - Verschiebungen" on public.schueler_verschiebungen as PERMISSIVE for ALL to public
  using (is_super_admin(auth.uid()));
create policy "Eigener Snapshot lesen" on public.snapshots as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Eigener Snapshot schreiben" on public.snapshots as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Eigener Snapshot updaten" on public.snapshots as PERMISSIVE for UPDATE to public using ((auth.uid() = user_id));
create policy "Super Admin snapshots lesen" on public.snapshots as PERMISSIVE for SELECT to public using (is_super_admin(auth.uid()));
create policy theorie_dateien_eigen on public.theorie_dateien as PERMISSIVE for ALL to authenticated
  using (((owner = auth.uid()) AND theorie_aktiv()))
  with check (((owner = auth.uid()) AND theorie_aktiv() AND (pfad ~~ (('eigene/'::text || (auth.uid())::text) || '/%'::text))));
create policy theorie_folien_lesen on public.theorie_folien as PERMISSIVE for SELECT to authenticated using (theorie_darf_bibliothek());
create policy theorie_freigabe_lesen on public.theorie_freigabe as PERMISSIVE for SELECT to authenticated
  using (((fahrschule_id = my_fahrschule_id()) OR is_super_admin(auth.uid())));
create policy theorie_klassen_lesen on public.theorie_klassen as PERMISSIVE for SELECT to authenticated using (true);
create policy theorie_lektionen_lesen on public.theorie_lektionen as PERMISSIVE for SELECT to authenticated using ((aktiv AND theorie_darf_bibliothek()));
create policy "Buero und Leitung sehen Theorie-Teilnahme" on public.theorie_teilnahme as PERMISSIVE for SELECT to authenticated
  using ((is_super_admin(auth.uid()) OR ((is_buero(auth.uid()) OR is_fahrschule_admin(auth.uid())) AND (fahrschule_id = my_fahrschule_id()))));
create policy "Fahrlehrer sieht Theorie-Teilnahme eigener Schueler" on public.theorie_teilnahme as PERMISSIVE for SELECT to authenticated
  using (((fahrlehrer_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM schueler s WHERE ((s.id = theorie_teilnahme.schueler_id) AND (s.fahrlehrer_id = auth.uid()))))));
create policy theorie_unterrichte_eigen on public.theorie_unterrichte as PERMISSIVE for ALL to authenticated
  using (((owner = auth.uid()) AND theorie_aktiv())) with check (((owner = auth.uid()) AND theorie_aktiv()));
create policy "Nur Super Admin Trinkgeld" on public.trinkgeld_privat as PERMISSIVE for ALL to public using (is_super_admin(auth.uid()));
-- storage.objects (Bucket „theorie“): theorie_bib_lesen, theorie_eigene_hochladen, theorie_eigene_lesen, theorie_eigene_loeschen
--   (nur eigener Ordner eigene/<uid>/, Bibliothek nur mit theorie_darf_bibliothek()).
