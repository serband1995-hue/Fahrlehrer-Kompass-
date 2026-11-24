# Vorschlag: Alles leicht finden (Werkstatt 11, Fassung 2 nach Fable + Design-Prüfer)

🗣 Serband: „Mir ist besonders wichtig, dass die Kompass-Seite so aufgebaut ist, dass man alles ziemlich leicht finden kann.“
Grundlage: Ist-Aufnahme 24.11.2026 (`ist.md`). Noch nichts gebaut. Geprüft von Fable („tragfähig nach Änderung von 8 Punkten“ – alle eingearbeitet) und Design-Prüfer (4 Muss – eingearbeitet).

## Die 5 Regeln
1. **Ein Wort für eine Sache – in App und Büro gleich**, gleiche Reihenfolge (Heute · Kalender · Schüler …).
2. **Wenige feste Hauptpunkte, immer sichtbar, jeder mit seinem Zähler.** Kein Zähler geht verloren.
3. **Suche „Was suchst du?“** – im Büro oben in der Leiste, in der App als Lupe oben auf jeder Seite (neben der Glocke). Findet Schüler, Seiten, Aufgaben; alte Namen als Suchwörter („Reaktivierung“, „Fahrcheck“, „Auslastung“).
4. **Alles zu einem Schüler in seiner Akte** – mit Reitern im bestehenden Fenster.
5. **Das Häufigste mit wenigen Tipps**, Seltenes unter „Einstellungen“.

## Wörter (nur Knöpfe/Seiten, keine Datenänderung)
| Heute | Neu |
|---|---|
| Prüfungen, Prüfungstafel | **Prüfungen** |
| Zahlung per Mail, Zahlungsaufforderung … | Knopf überall **„Zahlung anfordern“** |
| Zahlung ausstehend, Reaktivierung, Prüfungsgebühr | **bleiben** (verschiedene Dinge; „Zahlung ausstehend“ ist Serbands K8-Wort und steckt in der Datenbank) |
| Büro „Zahlen“, „Statistiken“ | **Statistik** · in der App für Fahrlehrer bleibt **„Verdienst“** |
| FC vergessen, Fahrcheck-Kontrolle, Fahrchecks | **Fahrcheck** |
| To-Dos, Interne Aufgaben | **Aufgaben** |
| Alle Fahrlehrer, Fahrlehrer & Zugänge, Büro-Zugänge | **Fahrlehrer & Büro** |
| Fahrzeugflotte | **Fahrzeuge** |
| Was ist neu? | **Neuigkeiten** |
| Weitere Verwaltung | aufgelöst: Schichtplan/Urlaub → Kalender · Backups/Empfehlungen → Einstellungen |

## Büro (PC/Tablet) – 8 feste Punkte, Suche oben
1. **Heute** – Dringendes (rot) zuerst, dann Aufgaben, Termine heute
2. **Kalender** – Knopf **„+ Termin“** oben (Fahrlehrer/Tag/Uhrzeit vorbelegt), Auslastung „Wer hat Platz?“, Urlaub
3. **Schüler** (Zähler „ohne Fahrlehrer“) – Liste + Akte
4. **Prüfungen**
5. **Fristen** (Zähler) – Behörden-/Theorie-Fristen, Antrag, Umschreiber (eigener Punkt: kein Geld)
6. **Zahlungen** (nur Geld) – Zahlung ausstehend · Zahlung anfordern · Preise & Pakete · Verkäufe & Provision
7. **Fahrcheck** (Zähler) · darunter **Fahrlehrer & Büro**, **Fahrzeuge** als eigene Zeilen
8. **Statistik**

Unten: **Einstellungen** (Zahlungsdaten für Mails, PIN, Fahrschule, Backups) · Neuigkeiten · Büro-Zeile „Bedient gerade · Sperren · Wechseln“ · „← Zur Fahrlehrer-Ansicht“ · Abmelden.

**Akte (Reiter, ≥ 44 px, roter Punkt bei Handlungsbedarf):** Überblick (alles Dringende) · Stammdaten · Termine · Prüfungen · Zahlungen · Ausbildungsnachweis · Notizen. Ein „Speichern“ wie heute.

## App (Handy)
- **Untere Leiste bleibt** (Heute · Kalender · Schüler · Prüfungen · Mehr). Neu: **Lupe oben** auf jeder Seite.
- **„Mehr“:** Aufgaben · Verdienst · Archiv · Verkehrstafel · Theorieunterricht · Buchungs-QR · Einstellungen · Neuigkeiten · Abmelden (abgesetzt; Rückfrage bei ungesicherten Daten bleibt).
- **Leitung/Büro:** Schalter **„Ansicht: Ich / Fahrschule“ oben** als Streifen (nur wer selbst fährt, hat „Ich“). Neu dazu: **Einstellungen** und **Zahlung ausstehend** (Liste zum Ansehen).
- **Fahrlehrer:** kein Zahlungen-Reiter (darf die Mail-Daten nicht sehen); Hinweis im Überblick bleibt wie heute.

## Pakete
Unter **Zahlungen → Preise & Pakete**. Erst bauen, wenn Werkstatt 12 gemergt ist.

## Tippzahlen (ehrlich gezählt, Büro)
| Aufgabe | vorher | nachher |
|---|---|---|
| Schüler finden | 3 | 2 (Suche, Treffer) |
| Termin anlegen | 3 + Fläche treffen | 2 + Felder prüfen |
| Zahlung anfordern | 6 + Scrollen | 5 (oder Zahlungen → Zahlung anfordern: 3) |
| Nachweis drucken | 6 + Scrollen | 4 |
| Pakete | 4–6 | 2 |
| Fristen / Fahrcheck | 1 | 1 |
| Kalender Woche | 3 | 2 |
| Einstellungen | gibt es nicht | 1 |
| App: Schüler finden | 2 | 2 (Lupe, Treffer) |
| App Leitung: Einstellungen | gibt es nicht | 2 |

## Deine Entscheidung nötig
1. **Gruppen links:** Gestern (K16) wolltest du sie zuklappbar. Jetzt durch 8 feste Punkte ersetzen? (Empfehlung: ja – mit 8 Punkten muss nichts mehr zugeklappt werden.)
2. Reihenfolge freigeben (unten).

## Umbau in Schritten (nach Freigabe)
a. Büro: 8 feste Punkte, „+ Termin“, Einstellungen-Seite, ungefährliche Namen
b. Akte mit Reitern (im bestehenden Fenster, mit Stammdaten)
c. Suche „Was suchst du?“ (Büro und App)
d. Zahlungen-Seite mit Paketen (nach Werkstatt 12)
e. App: Lupe, Leitung/Büro mit Einstellungen und Ansicht-Streifen (eigenes Vorhaben, Rollen-Test erweitern)

Nicht behandelt (später): Super-Admin-Menü, Büro am Handy unter 900 px.
