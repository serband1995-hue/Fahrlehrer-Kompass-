/* Fahrlehrer-Kompass – Neuigkeiten (Zeitstrahl aller Updates in einfachen Worten).
   Gilt für App (index.html) und Büro (buero.html). Neuester Eintrag steht OBEN.
   Bei jedem Update: oben einen Eintrag ergänzen, "version" = APP_VERSION aus index.html.
   "kurz" (höchstens ~60 Zeichen) erscheint nach dem Update einmal als kleiner Hinweis (verschwindet von selbst, kein Knopf).
   Einfache Worte, keine Fachwörter, keine Schülerdaten. */
window.KOMPASS_NEU = [
  { version: "2026.11.22.2", datum: "2026-11-22", kurz: "Neu: Das Wetter für Offenbach ist jetzt sofort da.",
    punkte: ["Das Wetter kommt jetzt kostenlos vom Deutschen Wetterdienst. Du musst nichts mehr einrichten.",
             "Den Ort kannst du in den Einstellungen unter „Wetter“ ändern, zum Beispiel auf Hanau.",
             "Wer kein Wetter möchte, kann es dort ausschalten."] },
  { version: "2026.11.22.1", datum: "2026-11-22", kurz: "Neu: Die Seite „Neuigkeiten“ zeigt alle Updates.",
    punkte: ["Neue Seite „Neuigkeiten“ unter „Mehr“ (im Büro im Menü): alle Updates als Zeitstrahl.", "Nach jedem Update erscheint einmal ein kleiner Hinweis, was neu ist. Er verschwindet von selbst."] },
  { version: "2026.11.21.3", datum: "2026-11-22", kurz: "Ausbildungsnachweis im Büro.",
    punkte: ["Büro sieht und druckt den Ausbildungsnachweis jedes Schülers.", "Änderungen am Nachweis werden mit Name und Zeit festgehalten.", "Unterschriebene Stunden sind geschützt."] },
  { version: "2026.11.21.2", datum: "2026-11-21", kurz: "Leitung, die selbst fährt, hat ihre eigene Fahrlehrer-Ansicht.",
    punkte: ["Wer leitet und selbst fährt, sieht beim Start die eigenen Schüler und kann Schüler anlegen.", "Jede Rolle wird vor jedem Update automatisch durchgespielt."] },
  { version: "2026.11.21.1", datum: "2026-11-21", kurz: "Fahrlehrer bearbeiten und löschen.",
    punkte: ["Im Büro lassen sich Fahrlehrer bearbeiten und entfernen."] },
  { version: "2026.11.20.1", datum: "2026-11-20", kurz: "Mehrere Geräte: Abmelden nur auf diesem Gerät.",
    punkte: ["Wer sich am Handy abmeldet, bleibt am Tablet oder PC angemeldet."] },
  { version: "2026.11.18.4", datum: "2026-11-18", kurz: "Lernszenen: Schilder wie im Verkehrszeichen-Katalog.",
    punkte: ["Die Schilder in den Lernszenen sehen jetzt aus wie die echten."] },
  { version: "2026.11.18.3", datum: "2026-11-18", kurz: "Prüfer-Akte mit Strecken und Notizen.",
    punkte: ["Jeder Prüfer hat eine Akte mit den Reitern Schüler, Strecken & Notizen und Profil."] },
  { version: "2026.11.17.3", datum: "2026-11-17", kurz: "Lernszenen auf Deutsch und Englisch.",
    punkte: ["Lernszenen mit Sprecherstimme, Umschalter Deutsch/Englisch.", "Neue Szenen: Kreisverkehr, Fahrradstraße und mehr."] },
  { version: "2026.11.16.1", datum: "2026-11-16", kurz: "10 neue Lernszenen und kompaktere Abstände.",
    punkte: ["10 neue Lernszenen: Vorfahrt, Abbiegen, Ampel, Bahnübergang, Straßenbahn und mehr.", "Startseite, Karten und Einstellungen sind kompakter."] },
  { version: "2026.11.15.9", datum: "2026-11-15", kurz: "Theorie-Besuche in der Schülerakte.",
    punkte: ["Besuchte Theorie-Lektionen lassen sich in der Schülerakte eintragen.", "Die Anmeldeseite blitzt beim Zurückkommen nicht mehr auf."] }
];
