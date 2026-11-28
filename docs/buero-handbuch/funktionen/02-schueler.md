# Kapitel 2: Schüler und Akte – Funktionsliste

Quellen: `buero.js` (B), `buero-nachweis.js` (N), `buero-punkte.js` (P), `buero-pakete.js` (PK), `buero-zahlungsmail.js` (ZM).
Abschnitt = Überschrift in `kapitel/02-schueler.html`. ❓ = nicht sicher aus dem Code verstanden.

## Seite „Schüler“ (B:1897 renderSchueler, B:1980 bindeSchueler)

| Funktion (wie am Bildschirm) | Fundstelle | Im Handbuch | Bild |
|---|---|---|---|
| Seite „Schüler“ (Menüpunkt, Sortierung A–Z, „n Schüler“) | B:190, B:1913, B:1946 | „Die Seite Schüler im Überblick“ | 02-liste |
| Reiter „Aktiv (n)“ | B:1936 | „Reiter“ | 02-liste |
| Reiter „Warteliste (n)“ (wartet auf Theorie / nach Theorie auf Fahrstunden / auf Praxisprüfung) | B:701, B:715, B:1946 | „Reiter“ | 02-reiter-warte |
| Reiter „Archiv (n)“ | B:1936, B:1946 | „Reiter“ | 02-reiter-archiv |
| Reiter „Alle“ | B:1936 | „Reiter“ | 02-reiter-alle |
| Leere Listen („Das Archiv ist leer.“, „Niemand steht auf der Warteliste.“, „Keine Schüler gefunden.“) | B:1947 | „Reiter“ | 02-reiter-warte |
| Filter „Alle Klassen“ (B, B78, B197, BE, B + BE, C1, C1E, C, CE, BKF) | B:574, B:1938 | „Filter“ | 02-filter-klasse |
| Filter „Alle Notizen“: Mit offener Notiz / Notiz noch nicht gelesen / Theorie noch nicht vollständig | B:1942, B:1905 | „Filter“ | 02-filter-notiz, 02-filter-theorie |
| Filter „Alle Fahrlehrer“ / „Ohne Fahrlehrer“ / ein Fahrlehrer | B:1934 | „Filter“ | 02-liste-ohne-lehrer |
| Filter stehen in der Adresse (#schueler?klasse=…) | B:1957, B:1969 | „Filter“ (Gut zu wissen) | – |
| Suchfeld „Name, Telefon, Bewerber-/Kundennr.“ (250 ms verzögert; K-Schreibweisen; Leerzeichen egal) | B:1911, B:1989 | „Suche“ | 02-suche |
| Spalte „Schüler“ (Farbpunkt, Name, Kundennummer, Telefon, E-Mail, „im Archiv seit“, „vom Fahrlehrer ausgeblendet am“, Klasse · Art · Paket) | B:1925 | „Die Liste: Spalten und Marken“ | 02-liste-zeile |
| Spalte „Fahrlehrer“ (Name oder rote Marke „ohne Fahrlehrer“) | B:1926 | dito | 02-liste-kopf, 02-liste-ohne-lehrer |
| Spalte „Klasse“ (nur sehr breite Bildschirme; Klasse, Art, Paket, „seit …“) | B:1927 | „Die Liste“ (Gut zu wissen) | – (bei 1366 px nicht sichtbar) |
| Spalte „Ausbildungsstand“ (Balken %, „Theorie … %“, „wird neu berechnet“) | B:1928, B:1886 | dito | 02-liste-zeile |
| Spalte „Nächster Termin“ (nur sehr breit) | B:1929 | „Die Liste“ (Gut zu wissen) | – |
| Spalte „Reaktivierung“: Marken überfällig·gesperrt, fällig·in CCD prüfen, bald fällig, in n Tagen, bezahlt, befreit, Vertragsdatum fehlt, entfällt, nichts fällig | B:747, B:777, B:1930 | dito | 02-liste-gesperrt |
| Marke „Testfahrt offen“ / „Testfahrt ✓ Datum“ (B197) | B:1923 | dito, „Knöpfe in der Liste“ | 02-testfahrt |
| Marken „Notiz · gelesen/ungelesen“, „Stopp-Notiz“ | B:1950 | „Die Liste“ | 02-liste-zeile, 02-filter-notiz |
| Marke „Aufgabe offen“ / „n Aufgaben offen“ · heute | B:2209 | „Die Liste“ | 02-liste-zeile ❓ (in der Vorführung nicht in jedem Bild sichtbar) |
| Marke „Zahlung ausstehend“ / „Reaktivierung offen“ unter dem Namen | B:612 | „Die Liste“ (Gut zu wissen) | 02-liste-zeile, 02-akte-zahlung |
| Zahl „ohne Fahrlehrer“ am Menüpunkt | B:190 | „Zahl ohne Fahrlehrer am Menü“ | 02-menue-zahl |
| Knopf „Testfahrt ✓“ | B:1985 | „Knöpfe in der Liste“ | 02-testfahrt |
| Knöpfe „Zahlung offen“ / „Bezahlt“ / „Reaktivierung bezahlt“ | B:653 | „Knöpfe in der Liste“, „Zahlung ausstehend“ (Kap. 5 nur verwiesen) | 02-liste-gesperrt |
| Knopf „Beleg“ (Quittung) | B:1931, B:1997 | „Knöpfe in der Liste“ (Kap. 5 verwiesen) | 02-liste-gesperrt |
| Knopf „Punkte“ (nur wenn Punktesystem an) | B:1931, P:21 | „Knöpfe in der Liste“, „Punkte“ | 02-punkte-knopf |
| Knopf „Bearbeiten“ (öffnet die Akte) | B:1996 | „Seite im Überblick“ | 02-liste-zeile |
| Drucken (Kopf mit Fahrschule, Datum, Person, Filter; quer ab 7 Spalten) | B:5638–5674 | „Die Schüler-Liste drucken“ | 02-druck-knopf, 02-druck-liste |
| Daten-Export (Datei) | – | Nur als Hinweis („gibt es auf dieser Seite nicht“) | – |
| Handy-Ansicht der Liste | – | „Schüler anlegen auf dem Handy“ | 02-liste-handy |

## „+ Schüler anlegen“ (B:2645 schuelerDialog(null))

| Funktion / Feld | Fundstelle | Im Handbuch | Bild |
|---|---|---|---|
| Knopf „+ Schüler anlegen“ | B:1944, B:1981 | „Schüler anlegen: persönliche Angaben“ | 02-liste |
| Name (Pflicht, max. 100) | B:2655 | dito | 02-neu-oben |
| Straße und Hausnummer, PLZ (5 Ziffern), Ort (nur wenn Datenbank die Spalten hat) | B:2656, B:2703, B:3179 | dito | 02-neu-oben, 02-neu-plz-fehler |
| Telefon (Login Fahr-Akademie) | B:2659 | dito | 02-neu-oben |
| E-Mail | B:2660 | dito | 02-neu-oben |
| E-Mail Eltern (optional) und „Zahlungs-Mails gehen an“ | B:2590 | dito, „E-Mail der Eltern“ | 02-neu-oben, 02-akte-eltern |
| Kundennummer (nicht eingebbar, vom Server) | B:2640, B:996 | „Persönliche Angaben“, „Kundennummer“ | 02-akte-kundennummer |
| Fahrlehrer (sortiert nach Klasse und Auslastung, „(nicht B)“, „– kein Fahrlehrer –“) | B:1566 | „Anlegen: Fahrlehrer, Ausbildungsart, Klasse und Vertrag“ | 02-neu-oben |
| Paket (alte Datenbank) / Anmeldung („Normale Anmeldung“ oder Paket; Anpassen) | B:2663, PK:500, PK:470 | „Anlegen: Anmeldung und Paket“ | 02-akte-paket, 02-neu-unten |
| Ausbildungsart (Ersterwerb, Fahrschulwechsel, Umschreibung, Neuerteilung, Auffrischung, Erweiterung) | B:567, B:2664 | „Fahrlehrer, Ausbildungsart, Klasse und Vertrag“ | 02-neu-oben |
| Klasse | B:574, B:2665 | dito | 02-neu-oben |
| Vertrag abgeschlossen am (Vorgabe heute) | B:2666, B:2646 | dito | 02-neu-oben |
| Behörde: Bewerbernummer (Rücklaufnummer) | B:2370 | „Anlegen: Behörde und Vorbesitz“ | 02-neu-behoerde |
| Behörde: Theorie-Frist bis (laut Behörde) | B:2371 | dito | 02-neu-behoerde |
| Behörde: Sehhilfe (Schlüsselzahl 01) – noch nicht bekannt / ja / nein | B:2372 | dito | 02-neu-behoerde |
| Behörde: Vorbesitz (AM … T) | B:2349, B:2374 | dito | 02-neu-behoerde |
| Umschreiber-Block (Land, Klasse, Datum der Lizenz, Führerscheinnummer, Ausstellende Behörde, + weiteren (max. 5), Entfernen, Wohnsitz in Deutschland seit, Übersetzung liegt vor, Rechen-Hinweis) | B:2355, B:2376, B:2393, B:2401 | „Anlegen: Umschreiber“ | 02-neu-umschreibung |
| B197: Testfahrt abgegeben + am | B:2669, B:2792–2798 | „Anlegen: B197 und die Testfahrt“ | 02-neu-b197 |
| Interne Notiz (nur Büro) | B:2684 | „Interne Notiz und To-do“ | 02-neu-unten, 02-akte-intern |
| To-do / aktueller Stand (nur Büro) – nur wenn Datenbank-Spalte da | B:2685 | „Interne Notiz und To-do“ | in der Vorführung nicht vorhanden ❓ (Feld erscheint dort nicht, daher kein Bild) |
| Speichern: Name-Pflicht, Warnung doppelte Telefonnummer (letzte 9 Ziffern), PLZ-Prüfung, Paket-Prüfung, offene Aufgabe/Notiz im Feld | B:2690–2703 | „Anlegen: Speichern, Prüfungen und Warnungen“ | 02-neu-doppelt, 02-neu-plz-fehler, 02-neu-fertig |
| Meldungen nach dem Anlegen („… angelegt und … zugeordnet“ / „(noch ohne Fahrlehrer)“) | B:2738–2740 | dito | 02-neu-fertig |
| Abbrechen / ✕ / „Eingaben verwerfen?“ | B:4909, B:5008 | „Daten ändern, speichern und verwerfen“ | 02-akte-verwerfen |
| Simulator, Theorie-App, Antrag-Datum | – | im Formular **nicht vorhanden** (Antrag steht im Fenster „Fristen“, Kap. 4; `hat_simulator` setzt der Verkauf B:3972) | – ❓ |
| Handy-Ansicht | – | „Schüler anlegen auf dem Handy“ | 02-neu-handy |

## Schüler-Akte (Fenster „Schüler: Name“, B:2645)

| Funktion | Fundstelle | Im Handbuch | Bild |
|---|---|---|---|
| Akte öffnen, Aufbau | B:2654–2688 | „Die Akte öffnen und ihr Aufbau“ | 02-akte-ganz, 02-akte-handy |
| Hinweis „Vom Fahrlehrer ausgeblendet am …“ | B:2527, B:2654 | „Kundennummer und Hinweis ausgeblendet“ | – (in der Vorführung kein ausgeblendeter Schüler) ❓ |
| Kundennummer-Zeile („wird vergeben“) | B:2640 | „Kundennummer …“ | 02-akte-kundennummer |
| Daten bearbeiten und „Speichern“ (nur Geändertes, „Gespeichert“ / „Nichts geändert“) | B:2713–2762, B:997 | „Daten ändern, speichern und verwerfen“ | 02-akte-speichern |
| Fenster-Sperre bei Leerlauf/PIN-Wechsel („Dein Fenster mit den Eingaben ist wieder da.“) | B:4923–4939 | „Daten ändern …“ (Gut zu wissen) | – (nur Text) ❓ |
| Konflikt-Hinweis „Nicht alles gespeichert“ + „Meine Eingabe nehmen“ | B:1093, B:1118 | „Konflikt-Hinweis“ | 02-akte-konflikt |
| Fahrlehrer zuweisen | B:2662 | „Fahrlehrer zuweisen und Lehrerwechsel“ | 02-akte-fahrlehrer |
| Lehrerwechsel: „Künftige Termine mitnehmen?“, Urlaubs-Warnung, Prüfungs-Spiegel, Übergabe-Eintrag, Meldung „… ist jetzt bei …“ | B:2805–2833 | dito | 02-akte-lehrerwechsel |
| Schalter „Aktiv / Im Archiv“ | B:2673, B:2799 | „Aktiv oder Archiv“ | 02-akte-aktiv, 02-akte-im-archiv |
| Archivieren: Frage „n künftige Termine auch absagen?“ (Ja, alle absagen / Nein, nur archivieren / Abbrechen), „… liegt jetzt im Archiv.“, Rückgängig 6 s | B:3399, B:3337, B:2747–2765 | dito | 02-akte-archivieren |
| Warteliste setzen | – | keine Akte-Funktion; ergibt sich aus der App des Fahrlehrers (siehe Reiter) | – ❓ |
| Zahlung-Block: „Zahlung offen“ → Fenster mit Gründen „Reaktivierung“ / „Rechnung offen“ | B:632, B:663 | „Zahlung ausstehend und Bezahlt“ (Kap. 5 nur verwiesen) | 02-akte-zahlung-offen |
| „Bezahlt“, roter Text „Zahlung ausstehend seit …“ | B:646, B:663 | dito | 02-akte-zahlung |
| „Reaktivierung bezahlt (240 €)“ (Fenster Betrag/Datum/Absprache/Notiz) | B:1138 | „Zahlung ausstehend …“ (Gut zu wissen) | – (Kap. 5) |
| Fahr-Akademie: Sprache + „Akademie-Zugang anlegen“ | B:2535, B:2564 | „Fahr-Akademie: Zugang anlegen“ | 02-akte-akademie |
| Knopf „Ausbildungsnachweis“ | B:2676 | „Ausbildungsnachweis: öffnen und Übersicht“ | 02-akte-nachweis-knopf |
| Knopf „Serientermine anlegen“ (nur Paket Turboboost; Hinweis „Turboboost: mehrere Termine auf einmal“) | B:2677, buero-luecken.js:346, :411 | „Serientermine anlegen (Paket Turboboost)“ | 02-akte-nachweis-knopf |
| Fenster „Serientermine (Turboboost)“: Erster Tag, Uhrzeit, Art (Fahrstunde/Sonderfahrt), Wie oft (täglich, jeden 2. Tag, wöchentlich), Anzahl Termine (1–20), Vorschau, „Termine anlegen“ | buero-luecken.js:355–372, :395–402 | dito | 02-serien-dialog |
| Serientermine: Sperren/Meldungen (kein Fahrlehrer, Zahlung ausstehend, Umschreiber ohne Sonderfahrt, „Zu spät am Tag für 90 Minuten“) | buero-luecken.js:353, :366–372 | dito (Gut zu wissen) | – (nur Text) |
| Serientermine: Warnung „Überschneidung … Trotzdem speichern?“, Urlaubs-Frage „Trotzdem alle anlegen?“ | buero-luecken.js:378–379 | dito | 02-serien-warnung |
| Serientermine: Meldung „n Termine angelegt“ + „Rückgängig“ | buero-luecken.js:385–395 | dito | 02-serien-fertig |
| Block „Prüfungen“ (nur Ansicht) | B:1750 | „Prüfungen und Mails in der Akte“ (Kap. 4 verwiesen) | 02-akte-pruefungen |
| Block „Zahlung per Mail“ | ZM:252 | dito (Kap. 5 verwiesen) | 02-akte-zahlungsmail |
| Block „Erinnerung per Mail“ (nur wenn Frist bald abläuft) | ZM:576, ZM:542 | dito | – (in der Vorführung nicht angeboten) ❓ |
| Block „Theorieunterricht“ (Teile, besuchte Lektionen) | B:2459 | „Theorieunterricht in der Akte“ | 02-akte-theorie |
| Block „Sonderfahrten“ (Fahrlehrer ohne App) | B:2499 | „Sonderfahrten-Zähler“ | 02-akte-sonder |
| Paket in der Akte (verkauft, „noch offen“, „Paket ändern“, Storno) | PK:437–600 | „Pakete in der Akte“ | 02-akte-paket |
| Notiz an den Fahrlehrer: Art Info/Stopp, Text, „An Fahrlehrer senden“ | B:2008, B:2062 | „Notiz an den Fahrlehrer (mit Stopp)“ | 02-akte-notiz-stopp, 02-akte-notiz |
| Notiz: Bearbeiten, Löschen (mit Rückgängig), Erledigt (mit Rückgängig), Wieder öffnen, „gelesen von …“ | B:2014, B:2072–2117 | dito | 02-akte-notiz, 02-akte-notiz-bearbeiten |
| Interne Notiz | B:2684 | „Interne Notiz und To-do“ | 02-akte-intern |
| Interne Aufgaben: Text, Fällig am, Für wen, Dringend, „Aufgabe speichern“, „📌 Heute zu tun“ | B:2215, B:2295 | „Interne Aufgaben zum Schüler“ | 02-akte-aufgaben |
| Aufgabe: Bearbeiten, Löschen, Erledigt, „Heute zu tun/Nicht mehr heute“, „Wieder öffnen“, Erledigt (n) | B:2220, B:2272 | dito | 02-akte-aufgabe-bearbeiten, 02-akte-aufgabe-erledigt |
| E-Mail Eltern + „Zahlungs-Mails gehen an“ | B:2590 | „E-Mail der Eltern“ | 02-akte-eltern |
| B197-Testfahrt in der Akte | B:2669 | „Anlegen: B197“ | 02-akte-testfahrt (auch 02-neu-b197) |
| Verlauf/Protokoll der Schülerdaten | B:1236 (nur im Fenster „Fristen“, B:1173) | „Verlauf der Akte (Protokoll im Fenster Fristen)“ | 02-akte-verlauf |
| Schüler endgültig löschen | – | gibt es im Büro nicht (nur Archiv) | – |

## Punkte (buero-punkte.js)

| Funktion | Fundstelle | Im Handbuch | Bild |
|---|---|---|---|
| Fenster „Punkte · Name“ (Kontostand, Verlauf) | P:35–50 | „Punkte des Schülers“ | 02-punkte-dialog |
| Buchen: Punkte geben / Einlösen / Verschenken (nur wenn erlaubt) / Eigene Buchung (Richtung) | P:51–85 | dito | 02-punkte-dialog, 02-punkte-eigene |
| Rückfrage „Punkte buchen?“, Meldungen (nicht genug Punkte, System aus) | P:25, P:93 | dito | – (nur Text) |
| Einstellungen › Punktesystem | P:110 ff | nur verwiesen (Kap. 6) | – |

## Ausbildungsnachweis (buero-nachweis.js)

| Funktion | Fundstelle | Im Handbuch | Bild |
|---|---|---|---|
| Fenster „Ausbildungsnachweis: Name“ (Kacheln, „Noch offen“) | N:150, N:187 | „Ausbildungsnachweis: öffnen und Übersicht“ | 02-nw-uebersicht |
| Liste „Gefahrene Stunden“ mit Unterschrift-Spalte (bis 30.06.2027) | N:157, N:44 | dito | 02-nw-uebersicht |
| „+ Fahrstunde nachtragen“ | N:175, N:231 | „Fahrstunde ändern oder nachtragen“ | 02-nw-nachtragen |
| „Ändern“ (Datum, Fahrlehrer, Beginn, Ende, Art, Grund; Unterschrift wird ungültig) | N:231–303 | dito | 02-nw-aendern |
| „Löschen“ (Fehleintrag, Rückgängig) / „Stornieren“ (Grund Pflicht) | N:315–343 | „Stornieren, Papierkorb und Wiederherstellen“ | 02-nw-stornieren |
| Papierkorb des Nachweises, „Wiederherstellen“ | N:177, N:344 | dito | 02-nw-papierkorb |
| Verlauf der Änderungen | N:180, N:140 | „Verlauf der Änderungen“ | 02-nw-verlauf |
| „Teil-Nachweis“ Haken | N:183 | „Nachweis erstellen, drucken“ | 02-nw-unten |
| „Nachweis erstellen“ → Druckfenster (Drucken / als PDF speichern, E-Mail vorbereiten, Schließen) | N:187–194, N:365–435 | dito | 02-nw-unten, 02-nw-druck |
| Druckbild alt/neu (ab 01.07.2027) | N:13, N:365 | dito (Gut zu wissen) | 02-nw-druck |
| Papierkorb der Fahrschule im Kalender (Wiederherstellen, „Storniert, bleibt aufbewahrt“) | N:437–502, B:3132 | „Papierkorb der Fahrschule“ (Kalender selbst: Kap. 3) | 03-papierkorb (Bild aus Kap. 3) |

## Nicht sicher / offen

- Welche Rolle (Büro, Leitung, Super-Admin) genau welche Knöpfe auf der Schüler-Seite sieht: im Code nur bei Beleg, Punkte, Zahlung per Mail (alle drei Rollen) klar.
- Wie das Büro eine Schüler-Warteliste selbst setzt: Es gibt keinen Knopf im Büro, die Warteliste kommt aus der Fahrlehrer-App (`ausbildung.theorieWait` / `ready`) und den Terminen. ❓
- Bedeutung der Datenbank-Spalten `hat_simulator`, `hat_theorie_app`, `bogen_ausgefuellt`: im Büro nur `hat_simulator` (wird bei Simulator-Verkauf gesetzt).
- „Erinnerung per Mail“ und „Hinweis ausgeblendet“ ließen sich in der Vorführung nicht zeigen (kein passender Fall).
