# Kapitel 4: Prüfungen, Fristen und Fahrcheck – Funktionsliste

Hinweis: Zeilenangaben sind auf wenige Zeilen genau (Anfang der Funktion, Stand 28.11.2026). Fundstellen: `buero.js` (B), `buero-pruefungstage.js` (PT), `kompass-pruefungstage.js` (KPT), `buero-zahlungsmail.js` (ZM), `kompass-rechnen.js` (KR).
Bilder: `docs/buero-handbuch/bilder/<Name>.png` (Quelle: `kapitel/04-pruefungen.bilder.mjs`). Text: `kapitel/04-pruefungen.html`.
Rollen: Büro, Leitung und Super-Admin sehen und bedienen alle drei Seiten gleich (BEREICHE ohne `wenn`, B:189–194). Es gibt keine Rollen-Unterschiede.
Nicht in diesem Kapitel: Einstellungen „Fristen“ (`buero-fristen.js`, Kapitel 6), Durchfallgründe-Statistik (`buero-auswertung.js`, Kapitel 6), Akte (Kapitel 2), Zahlungs-Mail-Einstellungen (Kapitel 6), Glocke/WhatsApp (Kapitel 1).

## A. Seite „Prüfungen“ (`renderPruefungen` B:1380, `bindePruefungen` B:1464)

| Funktion (Name auf dem Bildschirm) | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| Seite im Überblick (Kacheln, Hinweiskarten, Reiter) | B:1380–1462 | ja, „Die Seite im Überblick“ | 04-pr-uebersicht |
| Zahl am Menüpunkt „Prüfungen“ (Ergebnis fehlt + offene Haken 14 Tage + App-Ergebnisse) | B:191, `zaehlePruefungen` B:1279 | ja | 04-pr-menue, 04-pr-menue-fristen-zahl |
| Kachel „Prüfungen in den nächsten 7 Tagen“ | B:1456 | ja, „Die drei Kacheln“ | 04-pr-kacheln |
| Kachel „mit offenen Haken (14 Tage)“ (gelb ab > 0) | B:1457 | ja | 04-pr-kacheln |
| Kachel „ohne Ergebnis“ (rot ab > 0) | B:1458 | ja | 04-pr-kacheln |
| Karte „n Prüfung(en) ohne Ergebnis“ mit „Ergebnisse eintragen“, „Ergebnis“, „Bearbeiten“ | B:1447 | ja | 04-pr-warnkarte |
| Karte „n Ergebnis(se) aus der App – in die Akte übernehmen“, „Alle übernehmen“, „In die Akte übernehmen“ | `ergAppHinweisHTML` B:1345, `uebernimmAppErgebnis(se)` B:1352–1378 | ja | 04-pr-appergebnis |
| Karte „n neue Prüfung(en) – Zahlungsaufforderung offen“, „Zahlungsaufforderung ansehen“ | PT:`ptZahlungsHinweisHTML` PT:160 | ja (Versand selbst Kap. 5) | 04-pr-zahlhinweis |
| Reiter „Tage“ (nur wenn Prüfungstage da: `ptAktiv`) | B:1381, B:1297 | ja | 04-pr-tage-leer |
| Reiter „Kommende“ | B:1312 | ja | 04-pr-kommende |
| Reiter „Ergebnisse eintragen (n)“ | B:1309 `renderErgebnisListe` | ja | 04-pr-ergebnisse |
| Reiter „Vergangene“ (Sortierung neueste zuerst) | B:1313 | ja | 04-pr-vergangene |
| Reiter „Alle“ | B:1297 | ja | 04-pr-alle |
| Art-Auswahl „Alle / Praxis / Theorie“ (nicht bei „Tage“) | B:1452 | ja | 04-pr-arten |
| Suchfeld „Name oder Datum suchen“ (Name, Fahrlehrer, Notiz, Klasse, Datum) | B:1453, B:1466 | ja | 04-pr-filter |
| Felder „von“ / „bis“ | B:1454 | ja | 04-pr-filter |
| Auswahl „Datum: älteste zuerst / neueste zuerst“ | B:1455 | ja | 04-pr-filter |
| „Filter löschen“ | B:1455 | ja | 04-pr-filter |
| Legende der drei Haken | B:1451 `legende` | ja | 04-pr-haken-legende |
| Haken „Vorstellungsentgelt bezahlt“ (blau) | HAKEN B:1286, `hakenHTML` B:1293, `setzeHaken` B:1507 | ja | 04-pr-haken-legende, 04-pr-tag-belegt |
| Haken „TÜV-Gutschein gekauft“ (rot) | wie oben | ja | wie oben |
| Haken „Letzte Stunde im AS-Portal eingetragen“ (grün) | wie oben | ja | wie oben |
| „Großansicht für die Küche“ / „Großansicht beenden“ (14 Tage, ohne Knöpfe) | B:1431–1436 | ja | 04-pr-gross |
| „+ Prüfungstag“ | B:1458, PT:`ptTagDialog` PT:265 | ja | 04-pr-tage-leer, 04-pr-tag-dialog |
| „+ Prüfung planen“ | B:1458, `pruefungDialog` B:1575 | ja | 04-pr-planen |
| Prüfzeile (Zeit, Art-Marke, Schüler, Fahrlehrer, Haken, „Ergebnis“, „Bearbeiten“, Wiederholungs-Hinweis, Warnzeile) | B:1409–1421 | ja, „Reiter Kommende, Vergangene, Alle“ | 04-pr-vergangene, 04-pr-alle |
| Leere Liste: „Keine kommenden Prüfungen geplant.“ usw. | B:1461 | ja | – (Text; ❓ kein Bild, siehe Bericht) |
| Drucken (Knopf oben rechts) | buero.html:120 | ja (kurz) | 04-pr-uebersicht (Knopf sichtbar) |

### Prüfungstage (Reiter „Tage“) – `buero-pruefungstage.js`, `kompass-pruefungstage.js`

| Funktion | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| Tageskarte (Datum, Prüfer, Start, „x geplant, y frei“, 9 Fenster à 55 Min) | PT:`ptTagKarte` PT:119, KPT:`zaehlText` | ja | 04-pr-tag-neu |
| „Prüfungstag anlegen“: Datum, Start (erstes Fenster, spätestens 15:44), Prüfer (Initialen, max. 10, Großbuchstaben) | PT:`ptTagDialog` PT:265 | ja | 04-pr-tag-dialog |
| Rückfrage „Gibt es diesen Prüfungstag schon?“ (gleiches Datum und Prüfer) | PT:239 | ja (Text) | – (Text; Rückfrage nicht abgebildet) |
| „Startzeit/Prüfer ändern“ („Prüfungstag ändern“) | PT:265 | ja | 04-pr-tag-bearb |
| Hinweis „Uhrzeit geändert – Schüler informieren“ + „Erledigt“ (14 Tage, nur auf diesem Gerät gemerkt) | PT:`ptMerkerSetzen` PT:66, `ptTagKarte` PT:119–135 | ja | 04-pr-tag-uhrzeit |
| „Mehrere einplanen“ (Gruppen „Bereit für die Praxisprüfung / Weitere Schüler / Haben schon eine Prüfung geplant“, Suche, Zähler, vorangekreuzt) | PT:`ptMehrereDialog` PT:373 | ja | 04-pr-mehrere, 04-pr-mehrere-fertig |
| „Tag löschen“ (nur leerer Tag) mit Rückfrage „Ja, löschen“ | PT:`ptTagLoeschen` PT:297 | ja | 04-pr-tag-loeschen, 04-pr-tag-neu |
| Freie Zeile „frei“ + „+ Schüler“ („Schüler einplanen“: Schüler, Klasse, Fahrlehrer, „Einplanen“) | PT:`ptFreiZeile` PT:90, `ptPlusDialog` PT:307 | ja | 04-pr-plus-dialog |
| Belegte Zeile: Griff ⋮⋮, Name, Klasse, „n Fenster“ (Lkw), Notiz | PT:`ptBelegtZeile` PT:71 | ja | 04-pr-tag-belegt |
| Fahrlehrer-Auswahl in der Zeile (sofort gespeichert; „nicht CE“-Zusatz) | PT:`ptFahrlehrerWechsel` PT:252, B:`lehrerOptionen` B:1566 | ja | 04-pr-tag-belegt |
| Marke „ausstehend / Ergebnis fehlt / bestanden / nicht bestanden“ + ✓ ✗ in der Zeile | PT:80–86 | ja | 04-pr-tag-belegt, 04-pr-freie |
| Folgezeile „↑ gehört zur Prüfung darüber (Lkw: zwei Fenster)“ | PT:`ptFolgeZeile` PT:96 | ja | 04-pr-tag-belegt |
| Ziehen: auf freies Fenster = verschieben, auf belegtes = tauschen (nur Maus, nur ausstehende) | PT:`ptAblegen` PT:226, `ptBinde` PT:186–225 | ja | 04-pr-tausch-hinweis, 04-pr-tag-belegt |
| Tausch/Verschieben ohne Maus: „Bearbeiten“ → Fenster, „Mit einem anderen Schüler tauschen“ | PT:`ptZeitFeldHTML` PT:427 | ja | 04-pr-planen |
| Karte „Prüfungen mit freier Uhrzeit“ (ohne Tag) und „Ohne Fenster (freie Uhrzeit)“ unter einer Tageskarte | PT:`ptTageHTML` PT:169, `ptFreieUhrzeitZeile` PT:101 | ja | 04-pr-freie, 04-pr-uebersicht |
| „Frühere Tage zeigen“ / „Nur die letzten 2 Wochen zeigen“ | PT:162 | ja | 04-pr-fruehere-tage |
| Tipp „Zeile auf ein freies Fenster ziehen …“ | PT:164 | ja | 04-pr-tausch-hinweis |
| Leer: „Noch kein Prüfungstag. Mit „+ Prüfungstag“ …“ | PT:163 | ja | 04-pr-tage-leer |
| Regeln: nur Klassen B/BE (B78, B197, Automatik) haben Fenster; Lkw 2 Fenster; ein Prüfer je Tag | KPT:1–10 | ja | 04-pr-tag-belegt (Lkw-Beispiel) |
| Fehlermeldungen des Servers (z. B. „Dieses Zeitfenster ist gerade schon vergeben worden.“) | KPT:`fehlerText` | ja, teils im Text bei den Abläufen | – (Texte) |
| Anzahl „Zahl am Menü“ siehe oben | | ja | |

### Ergebnisse und Folgen

| Funktion | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| „✓ Bestanden“ / „✗ Nicht bestanden“ (Reiter „Ergebnisse eintragen“) | B:1343, `tippe` B:1481, `setzeErgebnis` B:1712 | ja | 04-pr-ergebnisse, 04-pr-ergebnis-ja |
| „In der App: ✓ bestanden“ neben den Knöpfen | `appErgebnis` B:1300 | ja | 04-pr-ergebnisse (Text; im Bild kein Beispiel) ❓ |
| „In die Akte übernehmen“ (Ergebnis aus der App) | B:1321 | ja | 04-pr-appergebnis |
| Fenster „Ergebnis eintragen“ (bestanden / nicht bestanden, „Speichern“, „Glückwunsch! …“) | `ergebnisDialog` B:1776 | ja | 04-pr-ergebnis-dialog |
| Folge „bestanden Theorie“: Datum „Theorieprüfung bestanden am“ in der Akte | `uebertrageErgebnis` B:1680 | ja | 04-pr-ergebnis-dialog (Text) |
| Folge „bestanden Praxis“: Datum, Reaktivierung „befreit“ mit Notiz, Frage „Ins Archiv“ | B:1608 | ja | 04-pr-ergebnis-ja |
| Folge „nicht bestanden“: Aufgabe „Neuen Termin … planen“, fällig in 3 Tagen | B:1627 | ja | 04-pr-wiederholung |
| „Rückgängig“ (Ergebnis, Akte, Aufgabe) | `ergebnisRueckgaengig` B:1722 | ja | 04-pr-ergebnis-ja |
| „Ins Archiv“ (+ Frage „… ins Archiv legen?“, künftige Termine absagen, 6 Sekunden Rückgängig) | `insArchiv` B:1739 | ja | 04-pr-archiv-frage, 04-pr-ergebnis-ja |
| Wiederholungs-Hinweis „… frühestens ab (Datum)“ (14 Tage, § 18 FeV) | `wiederholungHinweis` B:1266 | ja | 04-pr-wiederholung |
| Versuche („Versuche: Theorie n, Praxis n“), Prüfungsliste und Marken in der Akte | `pruefungenAkteHTML` B:1750 | ja | 04-pr-akte |
| Durchfallgründe: werden nur vom Fahrlehrer in der App eingetragen; Büro sieht nur Statistik (Kap. 6) | buero-auswertung.js:1–9 | ja, Verweis | 04-pr-durchfall |

### Prüfung planen / bearbeiten (`pruefungDialog` B:1575)

| Funktion | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| Schüler (Pflicht), Fahrlehrer und Klasse werden vom Schüler vorgeschlagen | B:1575, B:1696 | ja | 04-pr-planen |
| Art (Praxisprüfung / Theorieprüfung) | B:1578 | ja | 04-pr-planen-theorie |
| Hinweis „Laut Anwesenheit in der App hat der Schüler erst x von y Pflicht-Lektionen besucht.“ (Theorie) | B:1681 | ja | 04-pr-planen-theorie (Text; im Bild kein Hinweis) |
| Klasse | B:1579 | ja | 04-pr-planen |
| Zeit: „Zeitfenster an einem Prüfungstag“ / „Freie Uhrzeit“ (Theorie nur frei) | PT:`ptZeitFeldBinden` PT:448 | ja | 04-pr-planen, 04-pr-planen-frei |
| Prüfungstag und Fenster (nur freie) | PT:`ptZeitFeldHTML` | ja | 04-pr-planen |
| Datum, Uhrzeit (bei freier Uhrzeit) | B:1581 | ja | 04-pr-planen-frei |
| Fahrlehrer, Prüfer (nur Initialen, max. 10), Haken, Notiz | B:1583–1588 | ja | 04-pr-planen |
| „Prüfung absagen“ (nur bei ausstehender Prüfung) | B:1589 | ja | 04-pr-bearbeiten |
| „Ergebnis korrigieren“ (bei Prüfung mit Ergebnis) inkl. Warnhinweis zur Reaktivierung | B:1590 | ja | 04-pr-korrigieren |
| Sperre „Zahlung ausstehend – erst „Bezahlt“ eintragen.“ (Praxis, künftig, mit Fahrlehrer und Uhrzeit) | B:1613 | ja | – (Text) |
| Urlaubs-Warnung des Fahrlehrers | `vwUrlaubWarnen` B:1617 | ja (kurz, Kap. 3) | – (Text; Fenster gehört Kap. 3) |
| Datum der bestandenen Prüfung korrigiert → Akte zieht Datum mit | B:1651 | ja | – (Text) |
| Kalender-Eintrag des Fahrlehrers wird nachgezogen / Hinweis wenn nicht | `abgleichKalender` B:1522 | ja | – (Text) |
| Karte „Zahlungsaufforderung“ nach dem Speichern | `zmNachPruefung` (ZM:410), B:1665 | ja, Verweis Kap. 5 | – (Kap. 5) |
| Marke Praxis (grün) / Theorie (blau) | B:1411 | ja | 04-pr-vergangene |
| Handy-Ansicht | buero.css | ja | 04-pr-handy, 04-pr-handy-ergebnis |

## B. Seite „Fristen“ (`renderFristen` B:837, `bindeFristen` B:936)

| Funktion | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| Seite im Überblick | B:837–932 | ja | 04-fr-uebersicht |
| Zahl am Menü „Fristen“ (gesperrt + nicht geprüft fällig + Antrag abgelaufen + Behörden-Frist abgelaufen + Umschreiber + „Zahlung ausstehend“) | B:192, `zaehleFristen` B:725–745 | ja | 04-fr-menue |
| Kachel „offen: n Reaktivierungen überfällig“ mit Summe in € | B:844 | ja | 04-fr-kacheln |
| Kachel „fällig, noch nicht geprüft“ | B:845 | ja | 04-fr-kacheln |
| Kachel „in 30 Tagen fällig“ (Tage aus den Einstellungen) | B:846 | ja | 04-fr-kacheln |
| Kachel „ohne Vertragsdatum“ | B:847 | ja | 04-fr-kacheln |
| Kachel „Führerscheinanträge abgelaufen oder bald (n abgelaufen)“ | B:848 | ja | 04-fr-kacheln |
| Kachel „läuft bald ab · ansehen →“ (Link) | B:849 | ja | 04-fr-kacheln |
| Kachel „Theorie-Frist oder Umschreiber-Frist abgelaufen oder bald“ (nur wenn > 0) | B:850 | ja | ❓ kein Bild (kommt in der Vorführung nicht vor) |
| Reiter „Handlungsbedarf“ | B:851–855 | ja | 04-fr-handeln |
| Reiter „Läuft bald ab“ (Wer, Was, Am, Noch, „Akte öffnen“, „Erinnern“) | `laeuftBaldListe` B:797, B:882–897 | ja | 04-fr-bald |
| Reiter „Alle Schüler“ | B:851 | ja | 04-fr-alle |
| Reiter „Ohne Vertragsdatum“ (+ Hinweistext) | B:858, B:918 | ja | 04-fr-ohne |
| Reiter „Theorie-Fristen“ (nach verbleibender Zeit sortiert) | B:859, B:866 | ja | 04-fr-theorie |
| Reiter „Antrag & Frist“ (Eingereicht, Gültig bis, Status, „Neu eingereicht“, „Bearbeiten“, „verlängert durch Theorie“, Zählung ohne Antragsdatum) | B:869–880 | ja | 04-fr-antrag, 04-fr-antrag-neu |
| Reiter „Umschreiber“ (Land, Wohnsitz seit, Führerschein-Marke, Übersetzung, § 29 FeV) | B:898–910 | ja | 04-fr-umschreiber |
| Suchfeld „Name, Telefon, Bewerbernr.“ | B:926–935 | ja | 04-fr-suche |
| Farben und Wörter (Reaktivierung, Theorie, Antrag, Behörden-Frist, Umschreiber) | `REAKT_TEXT` B:747, `THEORIE_TEXT` B:786, `FRIST_TEXT`, `UMSCHREIB_TEXT`, `ANTRAG_TEXT` B:790–792, KR:169–200, 325–380 | ja, mit Tabellen | 04-fr-zeile |
| Reaktivierung „240 € erhalten“ → Fenster „Reaktivierung bezahlt“ (Betrag, Bezahlt am, „Nach Absprache mit“, Notiz) | `zahlungErhalten` B:1138 | ja | 04-fr-zahlung |
| Reaktivierung „Nicht bezahlt“ (mit Rückfrage „Ja, sperren“) | `nichtBezahlt` B:1164 | ja | 04-fr-nichtbezahlt |
| „Zahlung offen“ (Grund-Knöpfe „Reaktivierung“, „Rechnung offen“, Freitext, „Zahlung ausstehend“) | `zahlungAusstehendDialog` B:632, `zahlungKnoepfe` B:653 | ja | 04-fr-zahlungoffen |
| „Bezahlt“ (Sperre aufheben) | `zahlungBezahlt` B:646 | ja | 04-fr-bezahlt |
| „Reaktivierung bezahlt (240 €)“ in der Akte | `zahlBlockHTML` B:663 | ja | 04-fr-akte-zahlblock |
| Marke „Zahlung ausstehend“ / „Reaktivierung offen“ | `zahlungPill` B:612 | ja | 04-fr-bezahlt |
| Fenster „Fristen: Name“ (Vertrag am, Ausbildungsart, Klasse, Reaktivierung noch nicht geprüft/bezahlt/befreit, Fälligkeit, Notiz, Antrag eingereicht + „heute“, Theorie-Frist, Theorie abgeschlossen, Theorie bestanden, Verlauf) | `fristenDialog` B:1173 | ja | 04-fr-dialog |
| Schutz „Nicht alles gespeichert“ (anderer PC hat dasselbe Feld geändert), „Meine Eingabe nehmen“ | B:1099–1110, `speichereAkteSicher` B:1000 | ja (kurz) | – (Text; Kasten nicht abgebildet) |
| „Neu eingereicht“ (Antragsdatum = heute) | B:945 | ja | 04-fr-antrag-neu |
| „Erinnern“ → Akte, Block „Zahlung per Mail“ (Reaktivierung: Betrag, Wofür, „Mail an … senden“ / „Test-Mail senden“) | ZM:`zmErinnern` ZM:514, `zmBlockHTML` ZM:252 | ja | 04-fr-akte-mail |
| „Erinnern“ → Akte, Block „Erinnerung per Mail“ (Theorie, Antrag, Behörde, Umschreiber; „Erinnerung schicken“ / „Test-Erinnerung schicken“) | ZM:`emErinnern` ZM:669, `emBlockHTML` ZM:576 | ja | 04-fr-erinnern-akte |
| 5 Sekunden „Rückgängig“ vor dem Versand | ZM:`emBinde` ZM:607 | ja | – (Meldung verschwindet; Text) |
| Haken „✓ erinnert am (Datum)“ (Test-Marke) in der Akte und in „Läuft bald ab“ | `baldErinnert` B:826, ZM:581 | ja | 04-fr-erinnert, 04-fr-erinnert-liste |
| Grau-Gründe: „E-Mail fehlt“, „Zahlungsdaten fehlen“, „Erst die laufende Mail abwarten“; Server-Fehlertexte; Limits 5/Tag je Schüler, 100/Tag je Fahrschule | ZM:30–44, ZM:589 | ja | 04-fr-akte-mail (Zahlungsdaten fehlen siehe Hinweis) |
| WhatsApp-Erinnerung bei Fristen | – | ja: gibt es hier nicht (nur Glocke, Kap. 1, `buero-luecken.js:252`) | 04-fr-erinnern-knopf |
| Regeltext unter der Liste („Reaktivierung: … fällig … Monate …“ / „entfällt laut Preisliste“) | B:922–924 | ja | 04-fr-regel |
| Hinweis „Zahlungsdaten in den Einstellungen“ (Link) | B:934 | ja | 04-fr-regel (Text; Link liegt unter der Karte) |
| Handy | buero.css `[data-baldliste]` | ja | 04-fr-handy, 04-fr-handy-bald |
| Fristen-EINSTELLUNGEN (Dauer, gelb, blau) | `buero-fristen.js` | nur Verweis (Kap. 6) | – (Kap. 6) |

## C. Seite „Fahrcheck“ (`renderFahrchecks` B:3498, `renderFcStunden` B:3608, `bindeFahrchecks` B:3732)

| Funktion | Fundstelle | Erklärt | Bild |
|---|---|---|---|
| Seite im Überblick | B:3498–3555 | ja | 04-fc-uebersicht |
| Zahl am Menü „Fahrcheck“ (Fahrlehrer ohne Quittung im letzten Zeitraum) | B:194, `fcOffeneAbgaben` B:3467 | ja | 04-fc-menue |
| Kachel „Fahrchecks erwartet (Zeitraum)“ | B:3535 | ja | 04-fc-kacheln |
| Kachel „davon bestätigt abgegeben“ | B:3536 | ja | 04-fc-kacheln |
| Kachel „Fahrlehrer ohne Quittung“ | B:3537 | ja | 04-fc-kacheln |
| Reiter „Abgaben je Fahrlehrer“ / „Alle Fahrcheck-Stunden“ | `fcTabs` B:3492 | ja | 04-fc-uebersicht |
| Filter „Fahrlehrer suchen“ | B:3541 | ja | 04-fc-filter |
| Auswahl „Alle Fahrlehrer“ | B:3542 | ja | 04-fc-filter |
| Auswahl Zeitraum („Aktuell“, „Letzter Zeitraum“, 12 frühere Halbmonate) | `fcPeriodenOptionen` B:3480 | ja | 04-fc-filter |
| Auswahl „Alle Abgaben / Noch ohne Quittung / Mit fehlenden Fahrchecks / Vollständig abgegeben“ | B:3544 | ja | 04-fc-filter |
| Tabelle: Fahrlehrer, Erwartet, Als fehlend vermerkt, Abgabe-Marken („Zeitraum läuft“, „noch nicht abgegeben“, „✓ n von n“, „n von n“, „bestätigt (Datum)“) | B:3511–3533 | ja | 04-fc-tabelle |
| Lohn-Marken „n Std. warten auf Büro“ (gelb), „n Std. Fahrcheck fehlt“ (rot) | `lohnOffen` B:3450, KR:`lohnStand` KR:260 | ja | 04-fc-lohn |
| „Abgabe erfassen“ / „Neu erfassen“ | B:3527 | ja | 04-fc-tabelle, 04-fc-abgabe-fertig |
| „Stunden“ (Wechsel zum Reiter, mit Fahrlehrer und Zeitraum) | B:3528 | ja | 04-fc-tabelle |
| Fenster „Fahrcheck-Abgabe erfassen“: Erwartet, „Gezählt im Umschlag“, Ergebnis („✓ Stimmt genau“ / „Es fehlen n“ / „n mehr als erwartet“), „Stunden im Zeitraum“ mit „fehlt“-Haken, Notiz, „Abgabe bestätigen“ | `fcAbgabeDialog` B:3775 | ja | 04-fc-abgabe, 04-fc-abgabe-stimmt |
| Rückfrage „Es fehlen Fahrchecks“ → „Trotzdem speichern“ | B:3777 | ja | – (Text) |
| Folge: Status je Stunde „abgegeben“ / „fehlt“, Zahl wird mitgeschrieben | B:3781–3801 | ja | 04-fc-abgabe-fertig |
| Quittung nicht änderbar, „Neu erfassen“, alte bleibt im Verlauf | B:3552 | ja | 04-fc-abgabe-fertig |
| Karte „Letzte Quittungen“ / „Quittungen von (Name)“, „Alle n Quittungen anzeigen“ | `renderFcVerlauf` B:3714 | ja | 04-fc-verlauf |
| Erklärtext „So geht's“ und „Lohn:“ (ab 01.12.2026) | B:3551–3553 | ja | 04-fc-lohn |
| Reiter „Alle Fahrcheck-Stunden“: 4 Kacheln | B:3647 | ja | 04-fc-stunden |
| Filter: Suche, Fahrlehrer, Stundenart, Fahrcheck-Typ, Status Büro, Gültigkeit, von/bis, Sortierung, „Filter löschen“, „Alle geladenen Monate“ | B:3656–3668 | ja | 04-fc-stunden-filter |
| Zeile: Datum/Zeit, „gültig bis“, „läuft bald ab“ (gelb), „verfallen (Datum)“ (rot), Schüler, FC „x von y“, Vermerk, Status Büro, „Lohn: …“ | B:3634–3643 | ja | 04-fc-stunden, 04-fc-stunden-zeilen |
| „Abgegeben“ / „2 abgegeben“ / „1 abgegeben“ (Zahl wählbar ab 2 gebuchten FC) | B:3622, `fcSetzeStatus` B:3682 | ja | 04-fc-stunden-zeilen, 04-fc-abgehakt |
| „Fehlt“ | B:3630 | ja | 04-fc-stunden-zeilen |
| „Nachgereicht“ (alle gebuchten FC zählen, Datum heute) | B:3631, B:3738 | ja | 04-fc-typen |
| „Ändern“: Fenster „Fahrcheck ändern“ (Status im Büro, „Nachgereicht am“, „Abgegeben“-Zahl) | `fcStundeDialog` B:3748 | ja | 04-fc-stunde-dialog |
| Vermerk des Fahrlehrers: „Alle FC erhalten“, „1 FC fehlt“ (v1), „2 FC fehlen“ (v2), „geschenkt“, „FC noch offen“, „nachgereicht“, „keine FC“ | `FC_TYP` B:3553, `fcTyp` B:3557, KR:210–235 | ja, mit Tabelle | 04-fc-typen |
| Status Büro: „noch nicht geprüft“, „abgegeben“, „fehlt“ | `FC_BUERO` B:3567 | ja | 04-fc-stunden-zeilen, 04-fc-abgehakt |
| Gültigkeit der Fahrcheck-Zettel (12 Monate, Warnung 60 Tage – einstellbar Kap. 6) | KR:`fcGueltigkeit` KR:456 | ja | 04-fc-gueltigkeit |
| Grenze 300 Zeilen („Angezeigt: die ersten 300 von n“) | B:3579, B:3671 | ja | 04-fc-stunden (Text) |
| Rechenregel: 1 FC je volle 45 Minuten, Halbmonate, heutige Stunden erst nach Ende | KR:210–230, KR:464–495 | ja | 04-fc-uebersicht (Text) |
| Handy | buero.css, `fcNeuZeichnen` B:3727 | ja | 04-fc-handy, 04-fc-handy-stunden |

## ❓ Nicht sicher erklärt

- Ob die Karte „Zahlungsaufforderung offen“ auch ohne eingetragene Zahlungsdaten Einträge zeigt (in der Vorführung ja, mit Zusatz „Zahlungsdaten fehlen“).
- Der genaue Wortlaut der Erinnerungs-Mail (steht nicht in der Büro-Seite).
- „In der App: ✓ bestanden“ neben den Ergebnis-Knöpfen: Lässt sich in der Vorführung nicht zeigen.
- Kachel „Theorie-Frist oder Umschreiber-Frist …“ kommt in der Vorführung nicht vor.
- Die zwei Auswahlknöpfe „2 abgegeben / 1 abgegeben“ und die Auswahl „Abgegeben“ im Fenster „Fahrcheck ändern“ erscheinen nur, wenn die Datenbank die Spalte `buero_fc_anzahl` kennt. In den Bildern ist sie von der Vorführung eingeschaltet.
