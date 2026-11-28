# Kapitel 3: Kalender und Termine – Funktionsliste

Alle Funktionen aus dem Code (buero.js, buero-verwaltung.js, buero-nachweis.js). Rollen: Der Kalender, Urlaub, Schichtplan, „Wer hat Platz?“ sind für Büro, Leitung und Super-Admin gleich. Fahrzeuge anlegen/entfernen: nur Leitung und Büro-Personen mit Verwalter-Recht.

| Nr | Funktion (wie im Handbuch) | Fundstelle | Im Handbuch | Bilder |
|---|---|---|---|---|
| 1 | Der Kalender im Überblick | buero.js:2985-3060 (renderKalender, kopfKalender) | ja | 03-kalender-tag |
| 2 | Die drei Knöpfe oben rechts | buero.js:262-290 (kopfAktionenZeichnen, kNeuTerminVorgabe) | ja | 03-kopfknoepfe |
| 3 | Ansicht „Tag“ | buero.js:3033-3056 (renderKalender), 2904 (kStundenAchse) | ja | 03-tag-spalten |
| 4 | Der Termin-Kasten im Kalender | buero.js:2894-2903 (kTerminBlock), 2847 (K_FARBEN) | ja | 03-terminkarte, 03-art-farben |
| 5 | Ansicht „Woche“ | buero.js:3057-3081 (kalenderWoche) | ja | 03-ansicht-woche, 03-woche-lehrer |
| 6 | Ansicht „Monat“ | buero.js:3082-3104 (kalenderMonat), 2910-2926 (kTageSummen, kHitze) | ja | 03-ansicht-monat, 03-monat-zelle |
| 7 | Ansicht „Jahr“ | buero.js:3105-3130 (kalenderJahr) | ja | 03-ansicht-jahr |
| 8 | Blättern, „Heute“ und zu einem Datum springen | buero.js:2943-2957 (kopfKalender), 3131-3140, 1969-1979 (setzeFilter) | ja | 03-tag-kopf, 03-heute-springen, 03-datum-springen |
| 9 | Schüler im Kalender suchen | buero.js:2927-2942 (kSuchErgebnis) | ja | 03-suche |
| 10 | Fahrlehrer wählen (Spalten ein- und ausblenden) | buero.js:2958-2961 (kLehrerChips), 3145-3150 | ja | 03-filter-lehrer, 03-filter-lehrer-chips |
| 11 | Nach Terminart filtern | buero.js:2968-2985 (kArtChips) | ja | 03-filter-arten-zu, 03-filter-arten-offen, 03-filter-arten-gewaehlt |
| 12 | Termin anlegen | buero.js:3189-3336 (terminDialog), 3150-3158 | ja | 03-termin-neu-klick, 03-termin-neu-dialog, 03-termin-neu-gespeichert |
| 13 | Die Terminarten: Fahrstunde, Nachtfahrt, Sonderfahrt | buero.js:42-47 (ARTEN), 3189-3336, 2491 (SONDER_ARTEN) | ja | 03-termin-art-liste, 03-termin-sonder-ohneapp |
| 14 | Büro-Termine: Simulator, Beratung, Vortest, MPU | buero.js:48-49, 3199-3205 (Felder), 3268-3270, 3310-3318 (artFelder), 2847 | ja | 03-termin-simulator, 03-termin-vortest, 03-termin-mpu, 03-termin-beratung, 03-bueroarten-kalender, 03-bueroarten-filter, 03-bueroarten-beratung-dialog |
| 15 | Erste Hilfe und „Blockiert“ | buero.js:3206-3207, 3319-3320; 1858-1868 (auslastungWoche) | ja | 03-termin-ersthilfe, 03-termin-block |
| 16 | Termin öffnen, ändern und verschieben | buero.js:3189-3336 | ja | 03-termin-bearbeiten, 03-termin-verschieben |
| 17 | Termin absagen (löschen), „Rückgängig“ und Papierkorb | buero.js:3337-3367 (sageTermineAb), 3369-3387, 122-140 (toastUndo); buero-nachweis.js:481-502 (pkZeigen) | ja | 03-termin-absagen-haken, 03-termin-absagen-rueckgaengig, 03-papierkorb |
| 18 | Link zu einem Termin | buero.js:2986-3032 (kLinkEinloesen) | ja | 03-termin-link, 03-termin-link-offen, 03-termin-link-weg |
| 19 | Warnung bei Überschneidung | buero.js:2856-2890 (kfFinde, kfFrage, kfIdsAmTag), 3256-3258 | ja | 03-konflikt-frage, 03-konflikt-zeichen |
| 20 | Warnung bei Urlaub | buero-verwaltung.js:134-150 (vwUrlaubWarnen), buero.js:3259-3262 | ja | 03-urlaub-frage |
| 21 | Zahlung ausstehend, Stopp-Notiz und Umschreiber | buero.js:3163-3178, 3237-3250, 3322-3333; 599-602 (bueroGesperrt) | ja | 03-zahlung-karte, 03-zahlung-sperre, 03-stopp-notiz, 03-umschreiber-sonder |
| 22 | Schutz für vergangene Termine | buero.js:3223-3236, 3265-3267; buero-nachweis.js:315-343 | ja | 03-vergangen-unterschrieben, 03-vergangen-stornieren, 03-vergangen-heute-stornieren, 03-vergangen-bueroart |
| 23 | Prüfungen im Kalender | buero.js:3183-3190, 3223-3231; 3337-3345 | ja | 03-pruefung-im-kalender, 03-pruefung-dialog |
| 24 | Theorie-Termin und Anwesenheit | buero.js:2518-2525, 3218 | ja | 03-termin-theorie |
| 25 | „Wer hat Platz?“ | buero.js:1849-1895 (renderAuslastung) | ja | 03-auslastung, 03-auslastung-ohne-lehrer |
| 26 | Die Tabelle „Wer hat noch Platz?“ | buero.js:1796-1848 | ja | 03-auslastung-tabelle, 03-auslastung-regel |
| 27 | Die Reiter „Wer hat Platz? · Urlaub · Schichtplan“ | buero.js:263-271 (planReiter) | ja | 03-auslastung-reiter |
| 28 | Urlaub eintragen und ansehen | buero-verwaltung.js:152-228 (renderUrlaub, urlaubDialog) | ja | 03-urlaub-leer, 03-urlaub-dialog, 03-urlaub-andere, 03-urlaub-liste |
| 29 | Urlaub löschen | buero-verwaltung.js:107-117 (vwLoeschen), 192-203 | ja | 03-urlaub-loeschen, 03-urlaub-gestern |
| 30 | Schichtplan | buero-verwaltung.js:221-290 (renderSchichtplan, schichtDialog) | ja | 03-schichtplan, 03-schicht-dialog, 03-schicht-liste, 03-schicht-loeschen |
| 31 | Fahrzeuge: Liste | buero.js:4727-4770 (renderFlotte) | ja | 03-flotte |
| 32 | Fahrzeug anlegen, ändern und entfernen | buero.js:4771-4830 (fahrzeugDialog), 4856-4900 | ja | 03-flotte-dialog, 03-flotte-umbenennen, 03-flotte-entfernen, 03-flotte-fahrzeug-im-termin |
| 33 | Doppelbelegung von Fahrzeugen | buero.js:4690-4726, 4831-4855 (konfGesehenSetzen), 200 (Zahl am Menü) | ja | 03-flotte-konflikt, 03-flotte-gesehen |
| 34 | Kalender drucken | buero.js:5632-5680 (fuelleDruckKopf, Drucken), buero.css:514-560 | ja | 03-druck-knopf, 03-druck-vorschau, 03-druck-woche |
| 35 | Der Kalender am Handy | buero.js:3033-3056 (k-kurz/k-voll), buero.css | ja | 03-handy-tag, 03-handy-woche, 03-handy-monat, 03-handy-termin, 03-handy-auslastung, 03-handy-urlaub, 03-handy-schichtplan, 03-handy-flotte |

## Einzelne Bedienelemente

- Ansichten Tag/Woche/Monat/Jahr (`K_ANSICHTEN`, buero.js:2848): Kap. „Ansicht …“, Bilder 03-tag-spalten, 03-ansicht-woche, 03-ansicht-monat, 03-ansicht-jahr
- Pfeile ←/→, Heute, Zu Datum springen (`#kDatum`), Suche (`#kSuche`): „Blättern …“, „Schüler im Kalender suchen“
- Fahrlehrer-Häkchen (`data-klehrer`), Wochen-Auswahl (`#kWoLehrer`): „Fahrlehrer wählen“
- Terminarten-Filter (`data-kart`, `data-kartalle`, localStorage `buero-kalender-arten`): „Nach Terminart filtern“
- Klick in freie Stelle (`.k-flaeche`), Knopf + Termin (`#kNeuTermin`): „Termin anlegen“
- Termin-Fenster Felder Schüler, Art, Fahrlehrer, Datum, Fahrzeug, Von, Bis, Interessent Name/Telefon, Kurs bezahlt, Art der Sonderfahrt, Klasse dieser Stunde, Termin absagen, Link kopieren, Anwesenheitsliste drucken: im Handbuch erklärt
- Hinweise im Fenster: nurBueroHinweis, umSfHinweis, zahlHinweis, appHinweis, spiegelHinweis, Unterschrift-Warnung: erklärt
- Rückfragen: Überschneidung (kfFrage), Urlaub (vwUrlaubWarnen), Stopp-Notiz, Stornieren mit Grund (nwLoeschen), Name gibt es schon, Fahrzeug umbenennen: erklärt
- Online-Buchung: Mail an Schüler bei Änderung/Absage (`onlineBuchungMelden`): in „Termin öffnen, ändern …“ und „Termin absagen“
- Papierkorb unter dem Kalender (`pkZeigen`, Wiederherstellen): „Termin absagen“ (Inhalt des Papierkorbs sonst Kapitel Schüler)
- Prüfungen im Kalender (Spiegelzeile): „Prüfungen im Kalender“
- Urlaub: `renderUrlaub`, `urlaubDialog`, Löschen mit Rückgängig; Schichtplan: `renderSchichtplan`, `schichtDialog`, Löschen mit Rückgängig; Auslastung: `renderAuslastung`; Fahrzeuge: `renderFlotte`, `fahrzeugDialog`, Gesehen/Wieder anzeigen, Entfernte Fahrzeuge/Zurückholen; Drucken: `fuelleDruckKopf`

## ❓ Nicht sicher aus dem Code erklärt

- ❓ „Schaltkompetenz“: Bedeutung und Zählung stehen nicht im Kalender-Code.
- ❓ Statistik/Nachweis/Lohn für Büro-Termine: nur der Hinweistext „zählt nicht für Lohn, UE oder Statistik“ ist übernommen (KR.NUR_BUERO_ARTEN in kompass-rechnen.js nicht geprüft).
- ❓ „ausgefallene“ Stunden bei Absage (nwAusgefallen in buero-nachweis.js): nur grob beschrieben.
- ❓ Die 6 Sekunden Rückgängig sind eine Einstellung (KE rueckgaengig.sekunden 4 bis 30).
- ❓ Druck: nur Bildschirm-Vorschau (print-Ansicht) geprüft, kein echter Drucker.
- ❓ Die Felder Interessent Name/Telefon und „Kurs bezahlt“ erscheinen nur, wenn die Datenbank die Spalten hat. In der Vorführung fehlen sie; für die Bilder wurden sie im Browser ergänzt.
- ❓ Rollen-Unterschiede im Kalender: im Code keine gefunden (nur Fahrzeug-Verwaltung ist eingeschränkt).
