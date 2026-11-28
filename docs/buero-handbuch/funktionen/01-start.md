# Kapitel 1: Start und Anmeldung – Funktionsliste

Spalten: Name auf dem Bildschirm | Fundstelle | im Handbuch erklärt | Bild

| Funktion | Fundstelle | Handbuch | Bild |
|---|---|---|---|
| Anmeldung mit E-Mail und Passwort | buero.html:62–76, buero.js:5680–5697 | ja: „Anmeldung mit E-Mail und Passwort“ | 01-login, 01-login-handy |
| Passwort anzeigen | buero.html:70, buero.js:5681 | ja: „Passwort anzeigen“ | 01-login-zeigen |
| Wenn die Anmeldung nicht klappt | buero.js:5680–5686 | ja: „Wenn die Anmeldung nicht klappt“ | 01-login-fehler |
| Passwort vergessen und Wechsel zur Fahrlehrer-App | buero.html:74–76 | ja: „Passwort vergessen und Wechsel zur Fahrlehrer-App“ | 01-login-links |
| Hinweis „Zugang gesperrt“ | buero.js:5567–5570 | ja: „Hinweis „Zugang gesperrt““ | 01-hinweis-gesperrt |
| Hinweis „Nur für das Büro“ (falsche Rolle) | buero.js:5571–5578, startseite.js | ja: „Hinweis „Nur für das Büro“ (falsche Rolle)“ | 01-hinweis-rolle |
| Hinweis „Nutzungsbedingungen“ | buero.js:5579–5583 | ja: „Hinweis „Nutzungsbedingungen““ | 01-hinweis-agb |
| Hinweis „Keine Verbindung“ | buero.js:5560–5566 | ja: „Hinweis „Keine Verbindung““ | 01-hinweis-verbindung |
| Hinweise „Keine Fahrschule“ und „Fahrschule deaktiviert“ | buero.js:5598–5606 | ja: „Hinweise „Keine Fahrschule“ und „Fahrschule deaktiviert““ | 01-hinweis-fahrschule |
| Büro-Personen und die Kompass-App | startseite.js:20–40, index.html:4310–4330, buero.html:112–115 | ja: „Büro-Personen und die Kompass-App“ | 01-index-hinweis |
| Rollen-Streifen oben | buero.js:5519–5538, buero.html:97 | ja: „Rollen-Streifen oben“ | 01-streifen-leitung, 01-streifen-buero |
| Wer bedient gerade? Namen antippen | buero.js:5272–5290, buero.html:121–128 | ja: „Wer bedient gerade? Namen antippen“ | 01-wer-namen |
| PIN eingeben | buero.js:5307–5420, 5483–5497 | ja: „PIN eingeben“ | 01-wer-pin, 01-wer-pin-falsch |
| Falsche PIN und Sperre nach Fehlversuchen | buero.js:5420–5422, 5375–5385; supabase/migrations/20261201_w20_02:18 | ja: „Falsche PIN und Sperre nach Fehlversuchen“ | 01-wer-gesperrt, 01-wer-gesperrt-liste |
| Erste PIN festlegen („neu: PIN festlegen“) | buero.js:5311–5352, 5352–5418 | ja: „Erste PIN festlegen („neu: PIN festlegen“)“ | 01-wer-festlegen1, 01-wer-festlegen2, 01-wer-zueinfach |
| Wenn sich gerade niemand anmelden kann | buero.js:5291–5306 | ja: „Wenn sich gerade niemand anmelden kann“ | 01-wer-ausweg |
| Sperren (Platz verlassen) | buero.html:104–108, buero.js:5226–5236, 5490 | ja: „Sperren (Platz verlassen)“ | 01-wer-knoepfe, 01-wer-kopf, 01-wer-gesperrt-seite |
| Wechseln (andere Person) | buero.js:5488, 5272 | ja: „Wechseln (andere Person)“ | 01-wer-wechseln |
| PIN ändern | buero.js:5489, 5352–5370 | ja: „PIN ändern“ | 01-wer-pin-aendern |
| Automatische Sperre nach 20 Minuten | buero.js:5500–5510, 5469–5481, 5200 | ja: „Automatische Sperre nach 20 Minuten“ | 01-wer-gesperrt-seite |
| Abmelden und „Büro-Konto ganz abmelden“ | buero.js:5545–5557, buero.html:98–103 | ja: „Abmelden und „Büro-Konto ganz abmelden““ | 01-abmelden-buero, 01-wer-ganz-abmelden, 01-abmelden |
| Seitenleiste (Menü) | buero.js:164–262, buero.html:84–110 | ja: „Seitenleiste (Menü)“ | 01-menue |
| Zahlen an den Menüpunkten | buero.js:183–195, 241–262 | ja: „Zahlen an den Menüpunkten“ | 01-menue-zahlen |
| Menü am Handy (Knopf „Menü“) | buero.html:91, buero.js:406–431 | ja: „Menü am Handy (Knopf „Menü“)“ | 01-handy-menue-zu, 01-handy-menue-offen |
| Fahrschul-Wahl (nur Super-Admin) | buero.js:5612–5625, 5651–5665 | ja: „Fahrschul-Wahl (nur Super-Admin)“ | 01-schulwahl |
| Kopfzeile: Titel, Stand, Drucken, Aktualisieren | buero.html:112–125, buero.js:142–148, 368–405 | ja: „Kopfzeile: Titel, Stand, Drucken, Aktualisieren“ | 01-kopf |
| Status „Stand“ und Fehleranzeige | buero.js:5170–5195 | ja: „Status „Stand“ und Fehleranzeige“ | 01-kopf-fehler |
| Drucken | buero.js:5639–5675 | ja: „Drucken“ | 01-kopf-druck |
| Glocke „Erinnerungen“ | buero-luecken.js:250–340, buero.html:81–83 | ja: „Glocke „Erinnerungen““ | 01-glocke, 01-glocke-fenster |
| Die Seite „Heute“ | buero.js:485–568 | ja: „Die Seite „Heute““ | 01-heute-ganz, 01-heute-handy |
| Aufgaben: „Für mich“, „Wichtig“, „Alle offenen“ | buero.js:2121–2165, 536–557 | ja: „Aufgaben: „Für mich“, „Wichtig“, „Alle offenen““ | 01-heute-aufgaben, 01-heute-leitung, 01-heute-alle |
| Eine Aufgabe lesen | buero.js:2156–2166 | ja: „Eine Aufgabe lesen“ | 01-heute-zeile |
| Neue Aufgabe (+ Aufgabe) | buero.js:2167–2192 | ja: „Neue Aufgabe (+ Aufgabe)“ | 01-aufgabe-neu |
| Neue Aufgabe für dich (Fenster nach der PIN) | buero.js:2193–2208 | ja: „Neue Aufgabe für dich (Fenster nach der PIN)“ | 01-aufgabe-fuer-dich |
| Aufgabe bearbeiten | buero.js:2272–2294 | ja: „Aufgabe bearbeiten“ | 01-aufgabe-bearbeiten |
| Aufgabe erledigt | buero.js:2246–2255 | ja: „Aufgabe erledigt“ | 01-aufgabe-erledigt |
| Aufgabe löschen | buero.js:2256–2271 | ja: „Aufgabe löschen“ | 01-aufgabe-geloescht |
| Kürzlich erledigt und „Wieder öffnen“ | buero.js:512–520 | ja: „Kürzlich erledigt und „Wieder öffnen““ | 01-heute-erledigt |
| Von dir an andere vergeben | buero.js:521–523 | ja: „Von dir an andere vergeben“ | 01-heute-vonmir |
| Fristen und Warnungen | buero.js:524–566 | ja: „Fristen und Warnungen“ | 01-heute-warnungen |
| Warnung „Erste Hilfe noch nicht bezahlt“ | buero-luecken.js:380–450 | ja: „Warnung „Erste Hilfe noch nicht bezahlt““ | 01-heute-ersthilfe |
| Warnung „Seit über 4 Wochen ohne Fahrstunde“ | buero-luecken.js:400–470 | ja: „Warnung „Seit über 4 Wochen ohne Fahrstunde““ | 01-heute-ohnefahrt |
| Warnung „Notizen an Fahrlehrer noch nicht gelesen“ | buero.js:539–540, 2008–2057 | ja: „Warnung „Notizen an Fahrlehrer noch nicht gelesen““ | 01-heute-notizwarnung |
| Termine heute | buero.js:495–517 | ja: „Termine heute“ | 01-heute-termine |
| Kacheln auf der Seite „Heute“ | buero.js:499–504 | ja: „Kacheln auf der Seite „Heute““ | 01-heute-kacheln |
| Neuigkeiten (Seite) | buero.js:453–465, neuigkeiten.js | ja: „Neuigkeiten (Seite)“ | 01-neuigkeiten-seite, 01-neuigkeiten |
| Hinweis nach einem Update | buero.js:466–478 | ja: „Hinweis nach einem Update“ | 01-neuigkeiten-hinweis |
| Als App installieren | buero.html:113–114, buero.js:5698–5712 | ja: „Als App installieren“ | 01-installieren |
