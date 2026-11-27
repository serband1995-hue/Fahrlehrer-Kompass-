/* Fahrlehrer-Kompass – KS: Anzeige der Sicherungen (Backups) für App und Büro (W24, 27.11.2026).
   Nur Anzeige-Hilfen, kein Datenbank-Zugriff. Im Browser window.KS, in node module.exports.
   Die Sicherung selbst macht der Server (Migration 20261204_w24_01): fahrschule_backup_erstellen, _vorschau, _wiederherstellen.

   KS.SPALTEN                    → Spalten für die Liste (ohne die großen Daten)
   KS.name(tabelle)              → Bereich in einfachen Worten („Termine (mit Papierkorb)“)
   KS.art(backup)                → „Nacht (automatisch)“, „von Hand“, „vor dem Zurückholen“, „alt (nur 4 Bereiche)“
   KS.groesse(bytes)             → „12 KB“, „3,4 MB“
   KS.summe(zaehlung)            → Zahl aller Einträge
   KS.bereiche(backup)           → [{tabelle, name, n, art}] sortiert: mit Einträgen zuerst, dann nach Name
   KS.wiederherstellbar(backup)  → true nur bei Format 2 (alte Sicherungen kann man nur herunterladen) */
(function () {
  "use strict";
  const NAMEN = {
    fahrschulen: "Fahrschule", profiles: "Zugänge (nur zum Nachschlagen)", fahrschule_einstellungen: "Einstellungen",
    fahrschule_zahlungsdaten: "Zahlungsdaten", beleg_zaehler: "Beleg-Nummern", fahrschule_fahrzeuge: "Fahrzeuge",
    fahrschule_pakete: "Pakete (Vorlagen)", fahrschule_preise: "Preisliste", fahrschule_pruefer: "Prüfer",
    fahrschule_pruefer_notizen: "Prüfer-Notizen", fahrschule_tafelbilder: "Tafelbilder", fahrschule_empfehlungen: "Empfehlungen",
    fahrschule_urlaub: "Urlaub", fahrschule_schichten: "Schichtplan", buero_personen: "Büro-Personen", theorie_freigabe: "Theorie-Freigabe",
    schueler: "Schüler (auch gelöschte)", schueler_privat: "Private Angaben", schueler_eltern: "Eltern-Kontakte", schueler_notizen: "Notizen",
    schueler_notiz_gelesen: "Notizen gelesen", schueler_aufgaben: "Aufgaben", schueler_pakete: "Pakete der Schüler",
    schueler_verschiebungen: "Verschiebungen", schueler_punkte: "Punkte", provisionen: "Provisionen", pruefungstage: "Prüfungstage",
    kalender_termine: "Termine (mit Papierkorb)", pruefungstermine: "Prüfungen", kalender_pruefungen: "Prüfungsergebnisse",
    fc_abgaben: "Fahrcheck-Abgaben", public_bookings: "Online-Buchungen", fahrzeug_konflikt_gesehen: "Fahrzeug-Hinweise gesehen",
    zahlungsbelege: "Belege", zahlungs_mails: "Zahlungs-Mails", erinnerungs_mails: "Erinnerungs-Mails",
    aenderungsprotokoll: "Änderungsprotokoll", snapshots: "Handy-Stände der Fahrlehrer"
  };
  const KS = {
    SPALTEN: "id,erstellt_am,automatisch,format,anlass,zaehlung,arten,groesse_bytes",
    name(t) { return NAMEN[t] || String(t || "").replace(/_/g, " "); },
    art(b) {
      if (!b) return "";
      if (!b.format || b.format < 2) return "alt (nur 4 Bereiche)";
      if (b.anlass === "vor_wiederherstellung") return "vor dem Zurückholen";
      if (b.anlass === "nacht" || (!b.anlass && b.automatisch)) return "Nacht (automatisch)";
      return "von Hand";
    },
    groesse(bytes) {
      const n = Number(bytes);
      if (!isFinite(n) || n <= 0) return "–";
      if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)).toLocaleString("de-DE") + " KB";
      return (n / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
    },
    summe(z) {
      if (!z || typeof z !== "object") return 0;
      return Object.values(z).reduce((s, n) => s + (Number(n) || 0), 0);
    },
    bereiche(b) {
      const z = (b && b.zaehlung) || {}, a = (b && b.arten) || {};
      return Object.keys(z).map((t) => ({ tabelle: t, name: KS.name(t), n: Number(z[t]) || 0, art: a[t] || "" }))
        .sort((x, y) => (y.n > 0) - (x.n > 0) || x.name.localeCompare(y.name, "de"));
    },
    wiederherstellbar(b) { return !!(b && b.format >= 2); }
  };
  if (typeof window !== "undefined") window.KS = KS;
  if (typeof module !== "undefined" && module.exports) module.exports = KS;
})();
