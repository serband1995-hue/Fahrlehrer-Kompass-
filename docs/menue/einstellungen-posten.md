# Einstellungen: echte Posten (Stand mainchk 9d061f5, kompass-v103)

**Schon einstellbar heute** (Fundstelle Datei:Zeile)
| Posten | Wo heute | Fundstelle |
|---|---|---|
| Standardbetrag Reaktivierung (Vorgabe 240 €) | Büro, Einstellungen (nur Super-Admin); gilt nur vor dem ersten Preislisten-Eintrag | buero.js:457-463, Formular buero.js:727 |
| Unterrichtseinheiten pro Fahrlehrer und Woche (Vorgabe 60) | Büro, Einstellungen | buero.js:728, buero.js:1346-1349 |
| Preise: Grundbetrag, Übungsfahrstunde, Sonderfahrten, Vorstellung praktische/theoretische Prüfung, Reaktivierung, Pakete, Sonstiges (je „gültig ab“) | Büro, Preisliste | buero-preise.js:10-18 |
| Zahlungsdaten für Mails: Kontoinhaber, IBAN, BIC, PayPal, Impressum, Test/Echt, Test-Adresse | Büro, Fristen-Seite unten | buero-zahlungsmail.js:101-103 |
| Büro-Personen (Namen) und PIN je Person | Büro, „Bedient gerade“ / Zugänge | buero.js:565-571 |
| Arbeitszeiten: Vormittag, Nachmittag, Nachtfahrt, Samstag, Theorie Mo–Fr / Sa | App, Kalender-Zahnrad (je Fahrlehrer) | index.html:14490-14500 |
| Länge eines Fahrblocks (Vorgabe 90 Minuten) | App, Arbeitszeiten (`workCfg.blockMin`) | index.html:10332, 12743 |
| Design hell / dunkel / auto | App, Symbol oben (Mond/Sonne) | index.html:8577, 8590 |
| Akademie-Vermittlung | Büro, Super-Admin | buero.js:2974 |

**Heute fest im Code** (im Bild als „neu“ markiert, wäre ein neuer Einstellungs-Posten)
| Posten | Fester Wert | Fundstelle |
|---|---|---|
| Reaktivierung fällig nach | 12 Monate nach Vertrag, danach jedes Jahr | kompass-rechnen.js:50-59 |
| Theorie-Frist | 12 Monate nach bestandener Theorie / abgeschlossenem Unterricht | kompass-rechnen.js:79-80 |
| Warnstufe „bald“ / „demnächst“ | 30 / 60 Tage | kompass-rechnen.js:69-70, 83 |
| UE pro Tag | 12 | buero.js:1346 |
| Papierkorb behält Nachweise | 30 Tage | buero-nachweis.js:119 |
| Rückgängig-Zeit nach „Zahlung anfordern“ | 5 Sekunden | buero-zahlungsmail.js:329 |
| Liste der Führerschein-Klassen | feste Liste | buero.js:451 |

Nicht gezeigt (technisch, kein Posten für Kristina): geladener Zeitraum 400 Tage (buero.js:3218).
