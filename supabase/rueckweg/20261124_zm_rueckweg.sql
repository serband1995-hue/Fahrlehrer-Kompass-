-- Rückweg zu 20261124_zm_01_zahlungsmail.sql (Auftrag 4 Zahlungsaufforderung per Mail).
-- Achtung: löscht die eingetragenen Zahlungsdaten und die Spur der versendeten Mails (Spur in aenderungsprotokoll bleibt).
drop trigger if exists zahlungs_mails_schueler_weg on public.schueler;
drop function if exists public.zahlungs_mails_schueler_weg();
drop function if exists public.zahlungs_mail_vorbereiten(text, text, integer, text);
drop table if exists public.zahlungs_mails;
drop trigger if exists fahrschule_zahlungsdaten_spur on public.fahrschule_zahlungsdaten;
drop trigger if exists fahrschule_zahlungsdaten_schutz on public.fahrschule_zahlungsdaten;
drop table if exists public.fahrschule_zahlungsdaten;
drop function if exists public.fahrschule_zahlungsdaten_spur();
drop function if exists public.fahrschule_zahlungsdaten_schutz();
drop function if exists public.zm_darf(uuid);
drop function if exists public.iban_gueltig(text);
