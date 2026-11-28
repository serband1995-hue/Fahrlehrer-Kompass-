# Kapitel 5 – Geld, Quittung und Druck: Funktionsliste

Stand: 28.11.2026. Abgeleitet aus `buero.js`, `buero-preise.js`, `buero-pakete.js`, `buero-belege.js`, `buero-zahlungsmail.js`, `buero-punkte.js`, `buero-luecken.js`, `kompass-druck.js`, `buero.css`, `buero.html`.
Spalten: Name auf dem Bildschirm · Fundstelle · im Handbuch (Abschnitt in `kapitel/05-geld.html`) · Bild. ❓ = nicht sicher aus dem Code verstanden.
Rollen: B = Büro, L = Leitung (fahrschule_admin), S = Super-Admin. Fahrlehrer arbeiten nicht auf dieser Seite.

## 1. Seite „Zahlungen“ (Reiter)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Menüpunkt „Zahlungen“ mit roter Zahl (offene Empfehlungen) | buero.js:193 (BEREICHE), offeneVerkaeufe | „Die Seite Zahlungen und ihre Reiter“ | 05-zahlungen-nav |
| Reiter Preise / Pakete / Belege / Verkäufe & Provision | buero.js:231 zahlungsReiter, 212–215 | dito | 05-zahlungen-reiter |
| Zahl am Reiter „Verkäufe & Provision“ („empfohlen“) | buero.js:234 | dito | 05-zahlungen-reiter |
| Reiter beim Öffnen einmal festlegen (Verkäufe wenn etwas wartet, sonst Preise) | buero.js:227 zahlungenFestlegen | dito | – (Text) |
| Reiter „Pakete“ nur mit Paket-Datenbank (bkDa) | buero-pakete.js:bkDa | dito | – |
| Reiter „Belege“ nur B/L/S (belegDarf) | buero-belege.js:17 | dito | – |

## 2. Preise (buero-preise.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Preisliste, Gruppen je Art, Spalten Preis/Heute/Geplant | buero-preise.js:69 renderPreise | „Preisliste lesen“ | 05-preise-tabelle, 05-preise-handy |
| „Verlauf (n)“ aufklappen | :69 (details.pr-verlauf) | dito | 05-preise-verlauf |
| Marke „nur Übersicht“ bei alten Paketpreisen | :69 | dito | – |
| Meldung „noch nicht eingerichtet“ / „Noch keine Preise eingetragen“ | :70, :69 | dito | – ❓ nicht im Bild |
| Neuer Preis (Art, Klasse, Bezeichnung, Einheit, Preis, Gültig ab, Inhalt) | :169 prNeu, :121 prFormular | „Neuer Preis“ | 05-preis-neu |
| Vorschläge Bezeichnung/Einheit je Art, Reaktivierung fest | :169–200 | dito | 05-preis-neu |
| Prüfungen: Preis 0–100.000, „Diesen Preis gibt es schon“ | :169 | dito | – |
| Preis ändern (neuer Preis, Gültig ab, Haken „gibt es nicht mehr“) | :201 prAendern | „Preis ändern“ | 05-preis-aendern |
| Datum in der Vergangenheit nur S | :121 (min), prAbPruefen | dito | – |
| „Als Excel-Tabelle“ (CSV, Semikolon) | :245 prCsv | „Preisliste speichern“ | 05-preise-kopf |
| „Für das Preisregister“ (JSON, § 32 FahrlG) | :218 prAusgabe | dito | 05-preise-kopf |
| Nur-Lesen-Hinweis „Preise ändern Büro und Leitung“ | :69 | – | – ❓ (für Rollen ohne Rechte, auf der Büro-Seite kaum sichtbar) |
| Einstellungen › Preise & Pakete (Links, Standardbetrag Reaktivierung, nur S) | buero-einstellungen.js:191 | „Einstellungen › Preise & Pakete“ | 05-einst-preise |

## 3. Pakete (buero-pakete.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Liste mit Name, Klasse, Gesamtpreis, Posten, „Preis fehlt“-Marke | :124 renderPakete | „Pakete: die Vorlagen ansehen“ | 05-pakete-liste |
| Neues Paket (Name, Klasse) | :259 bkEditor | „Neues Paket bauen“ | 05-paket-neu |
| Posten hinzufügen (Grundbetrag, Lernapp, Übungsstunden, Sonderfahrt, Simulator, Prüfung, Sonstiges) | :259 | dito | 05-paket-neu, 05-paket-posten-a, -b |
| Anzahl − / + / tippen (1–999) | :259 | dito | 05-paket-posten-a, -b |
| Einzelpreis aus Preisliste / eigener Preis / „Preis aus der Liste nehmen“ | :259 bkHinweisHTML | dito | 05-paket-posten-a, -b |
| Hinweise: „Preis fehlt in der Preisliste“, „entfällt“, „Preis nicht lesbar“ | bkHinweisHTML | dito | – |
| Posten entfernen (✕) mit Rückgängig | :259 | dito | 05-paket-posten-a, -b |
| Gesamtpreis, „Posten ohne Preis“ | :259 rechne | dito | 05-paket-posten-a, -b |
| Bearbeiten, Rückgängig, Konflikt „Jemand anderes hat dieses Paket gerade geändert“ | bkSchreiben | dito | 05-paket-posten-a, -b |
| Kopieren („… (Kopie)“) | bkFreierName | „Paket kopieren, archivieren …“ | 05-paket-kopieren |
| Archivieren / Zurückholen / Archiv (6 s Rückgängig) | :192 bkAktiv | dito | 05-pakete-liste, 05-paket-archiviert |
| Turboboost: Name fest (⚡) | bkTurbo | „Pakete ansehen“ (Gut zu wissen) | – |
| Paket an Schüler: Feld „Anmeldung“, Normale Anmeldung / Vorlage | :500 bkAnmeldungHTML, :541 bkAnmeldungBinden | „Paket an einen Schüler verkaufen“ | 05-akte-paket-normal, 05-akte-paket-wahl |
| „Anpassen“ → Baukasten „Paket für …“ / „Übernehmen“ | :541 | dito | 05-akte-paket-anpassen |
| Verkauf beim Speichern der Akte, Rückgängig, Storno bei Wechsel | :541 nachSpeichern | dito | 05-akte-paket-verkauft |
| „noch offen“ je Posten, Hinweise, mehr als im Paket | :454 bkVerbrauchQuelle, bkVerbrauchText | dito | 05-akte-paket-verkauft |
| Vorlage ohne Posten nur zuordnen | :541 | dito | – |

## 4. Belege und Quittung (buero-belege.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Kacheln (Belege insgesamt, heute erhalten, heute storniert) | :50 renderBelege | „Belege: Übersicht“ | 05-belege-ueberblick |
| Suche (Name, Nummer, Zweck, Datum) | :50 | dito | 05-belege-ueberblick, 05-belege-zeilen |
| Tabelle, Marken „Storno“ / „storniert (Nr.)“ | :50 | dito | 05-belege-zeilen |
| „Erneut laden“, „Datenbank noch nicht bereit“ | :50 | dito | – ❓ kein Bild (Fehlerfall) |
| Neuer Beleg (Schüler, Datum, Betrag, Zweck, Zahlart) | :101 belegDialog | „Neuen Beleg erstellen“ | 05-beleg-neu |
| Warnung „Auf der Quittung fehlt noch …“ | :101 | dito | 05-beleg-neu-warnung |
| Bar nur mit Schalter („Bar (ausgeschaltet)“) | :101 | dito | 05-beleg-neu |
| Rückfrage „Gibt es schon“ (Doppel) | :101 | dito | – (Text) |
| Rückfrage „Beleg erstellen?“ | :101 | dito | 05-beleg-pruefen |
| Knopf „Beleg“ in der Schülerliste | buero.js:1931, 1997 | dito | 05-schueler-beleg-knopf |
| Stornieren (Grund, Gegenbeleg) | :156 belegStornieren | „Beleg stornieren“ | 05-beleg-storno, 05-quittung-storno |
| Drucken (Quittung über unsichtbaren Rahmen) | :267 belegDrucken, kompass-druck.js:130 rahmen | „Alle Druckansichten“ | 05-quittung-normal |
| Aufbau der Quittung (Kopf, Logo, Nr., Datum, Kundennummer, Adresse, Tabelle, Summe, Dank, Aussteller, Unterschrift) | :180 belegHTML | „Die Quittung: was darauf steht“ | 05-quittung-normal |
| Quittung Storno-Stempel, „Gegenbeleg zu“ | :180 | dito | 05-quittung-storno |
| Quittung mit Steuerzeilen und Hinweis | :180 | dito | 05-quittung-steuer |
| Quittung ohne Kundennummer/Adresse (Zeilen entfallen) | :180 | dito | 05-quittung-schlicht |
| Einstellungen › Belege & Quittungen (Kopf, Steuer, Hinweis, Bargeld) | :276 | „Einstellungen › Belege & Quittungen“ | 05-einst-belege-a, 05-einst-belege-b |
| Rückfrage „Bargeld-Belege einschalten?“ | :276 | dito | 05-einst-bargeld-frage |

## 5. Verkäufe & Provision (buero.js, buero-luecken.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Kacheln (verkauft, Umsatz, Provision offen, neue Empfehlungen) | buero.js:3859 renderVerkaeufe | „Verkäufe & Provision: Überblick“ | 05-verkaeufe-ueberblick |
| Filter Monat / Fahrlehrer / Stand | :3859 | dito | 05-verkaeufe-ueberblick |
| Tabelle, Marken (Art, Stand), Provisionsspalte | :3859 | dito | 05-verkaeufe-ueberblick |
| Text zur Aufteilung (L/S alle Anteile, B nur Fahrlehrer) | :3859 | dito | – (Text) |
| + Verkauf erfassen (Schüler, Was, Verkauft von) | :4029 verkaufNeuDialog | „Verkauf erfassen“ | 05-verkauf-neu |
| Zugang ausgegeben | :3930 verkaufStatus | „Zugang ausgegeben und Bezahlt“ | 05-verkauf-zeilen |
| Bezahlt → „Zahlung eintragen“ mit Aufteilung | :3939 verkaufBezahltDialog | dito | 05-verkauf-bezahlt |
| Provision automatisch buchen, Simulator-Haken | :3939 | dito | – |
| Zurücknehmen / Stornieren (Rückfrage) | :3992 verkaufStorno | „Zurücknehmen, Stornieren …“ | 05-verkauf-zeilen |
| Wieder öffnen | :4011 | dito | 05-verkauf-zeilen |
| Offene Provisionen je Fahrlehrer | :3859 | „Offene Provisionen …“ | 05-provisionen |
| Als ausgezahlt markieren (Rückfrage, Rückgängig) | :4014 provisionAusgezahlt | dito | 05-provision-ausgezahlt |
| + Provision von Hand (Fahrlehrer, Wofür, Betrag; ab 10.000 € Rückfrage; Rückgängig) | buero-luecken.js:116 luProvisionDialog | „Provision von Hand erfassen“ | 05-provision-hand |

## 6. Zahlung offen / Bezahlt (Sperre)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Knopf „Zahlung offen“ (Liste und Akte) | buero.js:653 zahlungKnoepfe | „Zahlung offen und Bezahlt“ | 05-liste-zahlung-ausstehend |
| Fenster „Zahlung ausstehend: Name“ mit Grund-Knöpfen | :632 | dito | 05-akte-zahlung-offen-dialog |
| „Bezahlt“, Block in der Akte mit Warntext | :646, :663 zahlBlockHTML | dito | 05-akte-zahlung-sperre |
| Marke „Zahlung ausstehend“ / „Reaktivierung offen“ | :615 zahlungPill | dito | 05-liste-zahlung-ausstehend |
| „Reaktivierung bezahlt“ | buero.js:653 | nur verwiesen (Kapitel 4) | – |

## 7. Zahlungs-Mail und Erinnerung (buero-zahlungsmail.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Einstellungen › Zahlungen & Mails (Modus, Test-Adresse, Kontoinhaber, IBAN, BIC, PayPal, Impressum) | :110 zmEinstellungenHTML | „Zahlungsdaten für Mails“ | 05-einst-zahlungsdaten-a, -b |
| IBAN-Prüfung, Fehler „Echt“ ohne Daten, Konflikt beim Speichern | :140–200 zmBindeEinstellungen | dito | 05-einst-zahlungsdaten-fehler |
| Block „Zahlung per Mail“ in der Akte, 3 Arten | :252 zmBlockHTML, :217 zmAngebote | „Zahlung per Mail aus der Akte“ | 05-akte-zahlung-mail |
| Hinweis „Zahlungsdaten fehlen“ | :252 | dito | 05-akte-zahlung-keine-daten |
| Echt-Modus, Empfänger Schüler/Eltern | :252 zmEmpfaenger | dito | 05-akte-zahlung-echt |
| 5 Sekunden Rückgängig, dann Versand | :459 zmVersand | dito | 05-akte-zahlung-wartet |
| Haken „✓ gesendet am …“ | :252 | dito | 05-akte-zahlung-gesendet |
| Fehlertexte (zu viele, Modus geändert, Reaktivierung nicht fällig …) | :20–50 ZM_FEHLER | dito (Text) | – |
| Karte nach dem Eintragen einer Prüfung (20 s) | :410 zmNachPruefung | „Karte … nach dem Eintragen einer Prüfung“ | 05-karte-nach-pruefung |
| Erinnerung per Mail an Frist (Theorie, Antrag, Behörde, Umschreiber) | :576 emBlockHTML | „Erinnerung per Mail an eine Frist“ | 05-akte-erinnerung-mail |
| „Erinnerung schicken“ aus „Läuft bald ab“ | :zmErinnern | nur verwiesen (Kapitel 4) | – |

## 8. Punkte (buero-punkte.js) – geldbezogen (Bonuspunkte, wirken wie Rabatt), darum hier
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Einstellungen › Punktesystem (einschalten, Regeln, Prämien, Verschenken, Bedingungen) | :140–228 | „Punktesystem einrichten“ | 05-einst-punkte-a, -b, 05-einst-punkte-aus |
| Rückfrage „Punktesystem einschalten?“ | :210 | dito | – (Text) |
| Knopf „Punkte“ in der Schülerliste (nur wenn an) | buero.js:1931, 1998 | „Punkte buchen“ | 05-punkte-liste |
| Fenster: Kontostand, Verlauf | buero-punkte.js:41 punkteDialog | dito | 05-punkte-dialog |
| Punkte geben / Einlösen / Verschenken / Eigene Buchung | :41 | dito | 05-punkte-dialog, 05-punkte-eigene |
| Rückfrage „Punkte buchen?“, Meldung „Gebucht ✓“ | :41 | dito | – |

## 9. Drucken (buero.js, buero.css, kompass-druck.js)
| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Knopf „Drucken“ (Symbol), am Handy ausgeblendet, im Bereich „Fahrlehrer & Büro“ verborgen | buero.html:120, buero.css:696, buero.js:~295 | „Der Knopf Drucken oben“ | 05-druck-knopf, 05-druck-handy |
| Druckkopf (Fahrschule, Logo, Bereich, „gedruckt am … von …“, Filter) | buero.js:5639 fuelleDruckKopf | „Das Druckbild“ | 05-druck-vorschau-belege, -preise |
| Fuß „Vertraulich …“ und „Seite x von y“ | buero.css:513 (@page) | dito | dito |
| Querformat (Kalender, Urlaub, Schichtplan, Auslastung, ≥7 Spalten) | buero.js:5658 druckQuer, buero.css:538 | dito | 05-druck-vorschau-kalender |
| Team-Bereich wird nicht gedruckt | buero.css:589 | dito | 05-druck-team |
| Anwesenheitsliste Theorie (Fenster, Querformat >5 Lektionen) | buero.js:2478 druckeAnwesenheit, 3333 | „Alle Druckansichten“ | 05-druck-anwesenheit-fenster, -blatt |
| Monatsbericht (PDF) | buero-luecken.js:237 | dito | 05-druck-monatsbericht-fenster, -blatt |
| Buchungs-QR | buero-luecken.js:59 luBuchungsDialog (QR drucken) | dito | 05-druck-qr-blatt |
| Ausbildungsnachweis | buero-nachweis.js:365 nwDruckHTML | dito | 05-druck-nachweis-blatt |
| Quittung | siehe 4 | dito | 05-quittung-normal |
| Gemeinsames Druckbild (kompass-druck.js: kopf, css, dokument, fenster, rahmen) | kompass-druck.js | dito | – |

## Nicht sicher erklärt (❓)
- Rolle „Fahrlehrer“ bei Preisen/Belegen: Der Code erlaubt nur B/L/S das Ändern. Ob Fahrlehrer die Büro-Seite überhaupt sehen, gehört in Kapitel 1.
- Tagesansicht des Kalenders erschien im Test-Druck ohne Inhalt (Wochenansicht ok).
- Buchungs-QR-Blatt zeigt die Überschrift „Dokument“ (Titel leer, `DRUCK.dokument` setzt Vorgabe „Dokument“). Auffälligkeit, nicht geändert.
- Im Testlauf wird das Logo in neuen Druckfenstern zu früh verworfen (Test-Netz). Beim Bild nachgereicht.
- Dateiablage der Downloads (CSV/JSON) hängt vom Browser ab.
- Versand der Mails, Mailtext: läuft über Server-Funktion, nicht im Büro-Code.
- Punktestand für Schüler in einer App: nicht im Büro-Code.
