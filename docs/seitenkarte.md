# Seitenkarte Fahrlehrer-Kompass (Block 0)

Stand: 15.11.2026, Branch `block1-navigation`, Commit 24181a2. Nur gelesen und gemessen, nichts im Code geändert.

Kennzeichnung: **[gemessen]** = mit Playwright (Chromium) gemessen, **[Code]** = nur im Quelltext gelesen, **[❓]** = nicht prüfbar (siehe Abschnitt 3).

Messaufbau: erfundene Testdaten (Anna, Bernd … Erfunden), Uhr fest auf Mi 14.10.2026 10:30, Netz blockiert, Supabase durch Attrappe ersetzt. Fenstergrößen 360x780, 768x1024, 1366x768, 1920x1080. Skripte liegen nur im Scratchpad, nicht im Repo.

---

## 1. Tabelle der Seiten und Fenster

### 1a. index.html (Fahrlehrer-App, alles in einer Datei)

Navigation: Reiterleiste unten (`tabGo`, Zeile 8206), Menü "Mehr" = Schublade `#drawer`, Zurück-Pfeil `#navBackBtn` (Zeile 2756), Verlauf `_navStack` (Zeile 17060). Der Menü-Knopf `#menuBtn` oben links ist dauerhaft `hidden` (Zeile 2753), das Menü öffnet nur über den Reiter "Mehr".

Android-Zurück (popstate, Zeile 17162) arbeitet in dieser Reihenfolge ab [Code]: Büro-Notiz-Popup (bleibt) > Fenster `#sheet` (eine Ebene) > Admin-Fenster > Filter-Schublade > Tafel-Schublade > Menü > Bogen-Seite > eine Seite zurück (`navZurueck`) > auf der ersten Seite Hinweis "Nochmal zurück zum Beenden". [gemessen: alle diese Schritte bis auf Admin/Filter/Tafel-Schublade]

| Seite / Fenster | Öffnen | Schließen / Zurück | Sichtbarer Zurück-Knopf | Android-Zurück | Befund |
|---|---|---|---|---|---|
| Anmelde-Overlay `#loginOverlay` | Start ohne Anmeldung | nach Anmeldung | nein | nichts (liegt über der App) | [gemessen] kein Überlauf, Logo exakt mittig (0 px) bei allen 4 Größen. "Passwort vergessen?" nur 15 px hoch, Auge 26x26 px (siehe F9) |
| Startbild `#splash` | Start, Tipp aufs Logo (`replaySplash`, Zeile 8162) | schließt selbst nach 1,5 s | nein | nicht abgefangen | [Code] |
| Heute `routeDashboard()` | Reiter Heute, Logo-Tipp | Reiter wechseln | nein (Hauptseite) | 1. Mal Hinweis "Nochmal zurück zum Beenden", 2. Mal App zu | [gemessen] |
| Schüler `routeHome()` | Reiter Schüler | Reiter wechseln | nein (Hauptseite) | geht im Verlauf zurück | [gemessen] |
| Kalender `routeKalender()` (Woche/Tag/Monat) | Reiter Kalender | Reiter wechseln | nein (Hauptseite) | geht im Verlauf zurück | [gemessen] |
| Prüfungen `routePruefungen()` (Termine / Wartet auf Theorie / Bereit) | Reiter Prüfungen | Reiter wechseln | nein (Hauptseite) | geht im Verlauf zurück | [gemessen] |
| Menü "Mehr" `#drawer` | Reiter Mehr | Tipp daneben (`#scrim`), Android-Zurück | kein Pfeil, Tipp daneben | schließt nur das Menü, Seite bleibt | [gemessen]. Einträge: To-Dos, Statistik, Archiv, Verkehrstafel, Theorieunterricht (Link zu `theorie.html`), Einstellungen |
| To-Dos `routeTodos()` | Menü To-Dos | Pfeil / Android-Zurück | ja | eine Seite zurück | [gemessen] |
| Statistik `routeStats()` | Menü Verdienst & Statistik | Pfeil | ja | eine Seite zurück | [gemessen] |
| Nicht-Besteher `routeNichtBesteher()` | Statistik (Zeile 16159) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Archiv `routeArchive()` | Menü Archiv | Pfeil | ja | eine Seite zurück | [gemessen] |
| Verkehrstafel `routeDraw(sid)` | Menü Verkehrstafel | Pfeil; eigene Tafel-Schublade | ja | schließt erst Tafel-Schublade, dann Seite [Code] | [gemessen] lädt; Zeichnen selbst [❓] |
| Einstellungen `routeSettings()` | Menü Einstellungen | Pfeil | ja | eine Seite zurück | [gemessen] (5 Abschnitte als Aufklapper) |
| Arbeitszeit `routeArbeitszeit()` | Kalender, Zahnrad `#calGear` (Zeile 13073) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Diese Woche `routePruefungenWoche()` | Prüfungen, `#openPruefWoche` (Zeile 14583) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Prüfer-Liste `routePrueferListe()`, Prüfer-Akte `routePrueferAkte()` | Prüfungen `#openPruefer` (Zeile 14584), Statistik `#toPruefer` (Zeile 16158); Akte über Namen in der Liste | Pfeil | ja | eine Seite zurück | [gemessen] |
| FC vergessen `routeFCMissing()` / Fahrcheck-Abgabe `routeFCAbgabe()` | Links `#fcMissingLink` / `#fcAbgabeLink` (Zeile 14736, 14737) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Schüler-Akte `routeDetail(id)` | Tipp auf Schülerkarte | Pfeil; Reiter Überblick/Plan/Termine/Prüfung/Notizen (Zeile 8457) | ja | eine Seite zurück | [gemessen] |
| Akte: Plan, Termine, Prüfung, Notizen `routePlan/AkteTermine/AktePruefung/Notes` | Akte-Reiter | Pfeil | ja | eine Seite zurück | [gemessen] |
| Historie `routeHistorie(id)` | Akte, Knopf "Historie" (Zeile 8748, 8841) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Persönlichkeitsbogen `routeBogen` / `routeProfil` | Akte, Knopf "Bogen" (Zeile 8747) | Pfeil, bei Bogen blättert Zurück eine Frage | ja | blättert Frage, dann Rückfrage "Bogen abbrechen?" | [gemessen] zeigt Einleitung (kein Ergebnis in Testdaten) |
| Prüfung eintragen `routeExam(id)` | Akte / Prüfungen | Pfeil | ja | eine Seite zurück | [gemessen] |
| Schüler neu/bearbeiten `routeSchuelerForm()` | Plus-Knopf, Akte | Pfeil `#backBtn`, Abbrechen | ja | fragt bei Eingaben "Deine Eingaben … Verwerfen?" | [gemessen] Rückfrage kommt bei Android-Zurück und Pfeil |
| Warteliste `routeWaitlist()` | Akte, Leiste `#wlLeiste` (Zeile 8797) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Risiko-Themen `routeRisk(id)` | **kein Einstieg gefunden** (nur Selbstaufruf Zeile 16936, siehe F14) | Pfeil | ja | eine Seite zurück | [gemessen] nur per Direktaufruf, Seite hat Inhalt (2 727 Zeichen) |
| Vorlagen / Plan-Vorlage / Schüler-Texte `routePlanVorlagen`, `routePlanVorlageEdit`, `routeSchuelerTexte` | Einstellungen, Knopf "Vorlagen verwalten" (Zeile 11866); Schüler-Texte über "Texte bearbeiten" auf der Vorlagen-Seite (Zeile 10011) | Pfeil | ja | eine Seite zurück | [gemessen] |
| Fahrstunde `routeFahrstunde(lid)` (Fahrmodus), Nach der Stunde `routeStundeFertig(lid)` | Heute "Fahrstunde starten" | Pfeil | ja | eine Seite zurück | [gemessen] |
| Wetter `routeWetter(w)` | Wetter-Knopf `#h2Wetter` auf Heute (Zeile 15553) bzw. `#weatherWidgetBtn` (Zeile 15202) | Pfeil | ja | ohne Wetterdaten Hinweis und zurück auf Heute | [gemessen] nur leerer Fall |
| Fahrschul-Gesamtansicht `routeFahrschule*` (17 Seiten: Dashboard, Verwaltung, Fahrschulen, Lehrer, Fahrzeuge, Statistik, Prüfer, Backups, Schichtplan, Urlaub, Provisionen, Kalender …) | nur Leitung/Admin, eigenes Menü (Zeile 5705) | Pfeil, Menüpunkt "Zu meiner Fahrlehrer-Ansicht" | [❓] | [❓] | [❓] nicht prüfbar ohne Leitungs-Anmeldung |
| Admin-Fenster `#adminPanel` | nur Super-Admin | Knopf ← (`closeAdminPanel`) | ja (←) | schließt Admin-Fenster [Code] | [❓] |

**Fenster (`openSheet`, Stapel `_sheetStapel`, Zeile 14084).** 75 Aufrufe im Code, 27 davon gemessen (alle 4 Größen). Gemeinsamer Aufbau [Code]: ✕ oben rechts + Griff, Tipp auf dunkle Fläche, Wischen, Esc und Android-Zurück schließen **genau eine Ebene** (`sheetZurueck`, Zeile 14104). `closeSheet()` im Code schließt alle Ebenen.

| Fenster (gemessen) | Öffnen | Ergebnis [gemessen] |
|---|---|---|
| Neuer Termin | Plus-Knopf im Kalender/Heute (`openNeuerTerminSheet`) | ✕, Tipp daneben, Android-Zurück schließen nur das Fenster. Unterfenster "Andere Art": 1. Zurück = zurück zu "Neuer Termin", 2. Zurück = zu |
| Filter Schüler, Termin-Art hinzufügen, Theorie-Termin, Blocker, Erinnerungen (Glocke), Kalender-Filter, Kalender-Ansicht, Kalender-Suche, Prüftermin neu, Kapazität, Verdienst, Pause, To-do neu, AGB, Theorie-Wartend, Mehrfach-Termin, Termin vergeben, Fahrstunde neu, Termin-Details, Schüler schnell anlegen, Prüfungsplan, Behörde, Unterschrift, Reaktivieren, Tag-Sheet, Fahrzeug wählen, Bogen-Wahl | je eigener Knopf | alle 27: öffnen, nicht leer, ✕ mindestens 44x44 px, ✕ / Tippen daneben / Android-Zurück schließen, Android-Zurück wechselt nie die Seite, kein Überlauf nach rechts, keine Konsolenfehler, bei allen 4 Größen |
| Fahrcheck-Menü `openFCMenu`, Ergebnis-Ablauf `openResultFlow` | [❓] meine Aufrufe öffneten kein Fenster (falsche Parameter, kein Fund im Code) | [❓] nicht gemessen |
| restliche ca. 45 Fenster (z. B. Unterschrift-Pad, Tafel-Fenster, Film-Liste, Band/Objekt-Eigenschaften der Verkehrstafel, Prämien) | | [❓] nicht einzeln geöffnet |

### 1b. buero.html + buero.js (Büro am PC)

Seitenleiste `#nav` mit 11 Bereichen (`BEREICHE`, buero.js Zeile 138), Navigation über `#bereich?filter` im Adresszeilen-Teil (Hash). Auf ≤900 px klappt `#menueKnopf` die Leiste auf. Dialoge: `<dialog>` mit eigenem Verlaufseintrag (`verlaufPush`, Zeile 3586), `popstate` Zeile 3645. Gemessen in der Vorführung `buero.html?vorfuehrung` (erfundene Daten, offline).

| Seite / Fenster | Öffnen | Schließen / Zurück | Zurück-Knopf | Android/Browser-Zurück | Befund |
|---|---|---|---|---|---|
| Anmeldung `#login` | ohne Sitzung | Anmelden; Links "Zur Fahrlehrer-Anmeldung" und "Passwort vergessen" führen zu `index.html` | Link zur App | verlässt Seite | [gemessen] Überlauf 397 > 360 px (F8) |
| Heute, Prüfungstafel, Fahrchecks, Fristen, Kalender, Auslastung, Schüler, Verkäufe, Zahlen, Fahrlehrer & Zugänge, Fahrzeuge | Seitenleiste, Zahlenkacheln, Links `#bereich` | andere Seite wählen | Link "← Zur Fahrlehrer-Ansicht" in der Leiste (`#zurApp`) | Hash-Verlauf: Zurück geht Bereich für Bereich (Schüler > Kalender > Prüfungstafel) | [gemessen] alle 11: kein Überlauf, keine Konsolenfehler, alle mit Inhalt, 4 Größen |
| Wer-bedient-Fenster `#wer` (PIN) | Start gemeinsames Konto, nach 20 Min. Leerlauf | PIN / "Abbrechen" | nein | [❓] | [❓] in der Vorführung nicht sichtbar |
| Dialoge (`oeffneDialog`, z. B. "Schüler anlegen") | Knöpfe wie `#sNeu`, `[data-sbearb]` | ✕, Abbrechen, Esc, Android-Zurück | ✕ (`[data-schliessen]`) | schließt nur das Fenster, bleibt auf `#schueler` | [gemessen] ✕ / Esc / Zurück schließen, Seite bleibt (bei 1366 und 360 px) |
| Hinweis-Seite `#hinweis` (gesperrt, falsche Rolle, AGB) | je nach Konto | Knöpfe | [❓] | [❓] | [❓] |

### 1c. Weitere Seiten

| Seite | Öffnen | Schließen / Zurück | Zurück-Knopf | Android-Zurück | Befund |
|---|---|---|---|---|---|
| theorie.html | Menü "Theorieunterricht" (index.html Zeile 2814) | Link `← Kompass` (`href="./"`, theorie.html Zeile 129) | ja, oben links | `popstate` (Zeile 553) schließt oberste Ebene (Fenster, Folienansicht), Tafel-Modus hat keinen Eintrag | [gemessen] nur Anmelde-Ansicht, 4 Größen ohne Fehler. Liste, Editor, Folien [❓] (brauchen Anmeldung und Daten) |
| quiz-tafel.html | Fenster aus Einstellungen (`#mQuiz`, index.html Zeile 11563) oder Theorie (theorie.html Zeile 326), `?l=<Lektion>` | "Schließen" nur im Koppel-Dialog; sonst Fenster zu machen | nein | verlässt Seite | [gemessen] Lektionsauswahl lädt, 4 Größen ohne Fehler. Spielablauf [❓] (braucht Datenbank) |
| quiz.html (Schüler-Handy) | QR-Code `?c=<Code>` | nein | nein | verlässt Seite | [gemessen] Beitreten-Formular, 4 Größen ohne Fehler. Spiel [❓] |
| quiz-lehrer.html (Lehrer-Handy) | QR-Code `#r=<Raum>&k=<Schlüssel>` | nein | nein | verlässt Seite | [gemessen] ohne Parameter nur Text "Bitte den QR-Code … scannen", kein Titel, kein Link (F10). Steuerung [❓] |
| quiz-loesungen.html | Link in Tafel (`quiz-tafel.html` Zeile 344), `?l=` | nein | nein | verlässt Seite | [gemessen] 36 600 Zeichen Inhalt, Sprungleiste `#l1…`, Knopf Drucken (`href="#"` mit `onclick … return false`, Zeile 61, in Ordnung) |
| einladung.html | Mail-Link mit `#<Supabase-Verify-Adresse>` | Knopf "Weiter" (setzt `location.href`) | nein | verlässt Seite | [gemessen] mit und ohne Link: Logo mittig (0 px), keine Fehler |
| buchen.html | Buchungslink `?lehrer=<slug>` (index.html Zeile 6688) | nein | nein | verlässt Seite | [gemessen] Startzustand "Fahrstunde buchen", 4 Größen ohne Fehler. Schritte 1-4 [❓] (brauchen die Schnittstelle). `#stornoLink` bekommt sein `href` per Skript vor dem Anzeigen (Zeile 209), kein toter Link |
| storno.html | Mail-Link `?token=` | Knopf "Ja, Termin stornieren" | nein | verlässt Seite | [gemessen] ohne Token "Ungültiger Link", mit Token ohne Netz "Netzwerkfehler"; Zustände cancellable/too_late [❓] |
| reaktion.html | **von keiner Seite verlinkt** (Suche in index.html, buero.js, theorie.html, quiz*.html) | nein | nein | verlässt Seite | [gemessen] Start-Knopf geht, Runde 1 von 5 startet, keine Fehler. Einstieg [❓] (vermutlich Link/QR von außen) |
| check.html | nur über QR-Text in Einstellungen (index.html Zeile 11869) | nein | Knopf "← zurück" nur zwischen Fragen | verlässt Seite | [gemessen] alle 18 Fragen durchgeklickt, Ergebnis "Dein Ergebnis: DER SEHER" erscheint, "Nochmal machen" da, keine Fehler |

---

## 2. Gefundene Fehler

Schweregrad: **kritisch** = Funktion kaputt / Daten weg, **wichtig** = sichtbar falsch oder verwirrend im Alltag, **klein** = Schönheit, toter Code.

Kritische Fehler: **keine gefunden.** Bei 4 Größen, 35 Routen, 27 Fenstern und 26 weiteren Seiten/Zuständen gab es 0 Konsolenfehler, 0 fehlgeschlagene lokale Anfragen, 0 waagerechten Überlauf (außer F8) und keine leere Seite. Statische Prüfung: 0 `onclick` auf nicht vorhandene Funktion, 0 `href="#x"` auf fehlende ID, 0 Aufrufe von `$("#id")`/`getElementById` auf nie vorhandene IDs (außer F7).

| Nr | Schwere | Fund | Wo | Größe | Art |
|---|---|---|---|---|---|
| F1 | wichtig | **Logo nicht in der Mitte.** Abstand Logo-Mitte zur Bildschirmmitte: 360 px: **-58 px**, 768 px: **-224**, 1366 px: **-520**, 1920 px: **-797** (auf allen 35 gemessenen Routen gleich). Ursache: `.tb-mitte{justify-content:flex-start}` setzt Logo und Titel linksbündig nebeneinander, der Titel reserviert seinen Platz auch wenn er unsichtbar ist (`.tb-doppelt{visibility:hidden}`), `.tb-logo-btn{justify-self:center}` hat dadurch keine Wirkung. Zusätzlich reserviert `.tb-left{min-width:94px}` (80 px auf ≤420 px) Platz für den Menü-Knopf, der nie sichtbar ist. Der Kommentar in Zeile 230 nennt "Titel neben dem Logo" als Absicht. | index.html:231 (`.tb-mitte`), :2578 (`.tb-doppelt`), :213 (`.tb-logo-btn`), :233 und :236 (`.tb-left`) | alle 4 | gemessen + Code |
| F2 | wichtig | **Auf Handy bei jedem Seitenwechsel ist das Logo links vom Mittelpunkt, auf PC/Tablet sitzt es am linken Rand der Seite**, nicht über der Inhaltsspalte (1366 px: Logo bei x=142, Inhalt ab x=167 bis 1199, Mitte 683). Gleiche Ursache wie F1. | index.html:205 (`.topbar` Grid `auto 1fr auto`) | 768 / 1366 / 1920 | gemessen |
| F3 | klein | **Toast überdeckt den Plus-Knopf.** Ohne Fenster liegt die Meldung unten bei `bottom:104px`. Auf der Schüler-Seite bei 360x780: Meldung y 631-676, x 114-246; Plus-Knopf "Neuer Schüler" y 634-688, x 160-344. Sie überlappen. Bei langer Meldung (2 Zeilen) Meldung y 593-676, x 16-344: Knopf ganz verdeckt. Auf Heute (Knopf nur 58 px breit rechts) und ab 768 px keine Überlappung. | index.html:2122-2123 (`.toast … bottom:calc(104px …)`) | 360x780 | gemessen |
| F4 | klein | **Toast bei offenem Fenster liegt oben (y 14-59) und deckt Logo, Titel und Glocke** (Kopfleiste y 0-65). Er ist nicht hinter dem Fenster: z-index 210 gegen Fenster 61, Fenster beginnt bei y 156-571 je nach Fenster. Der Block-1-Fix wirkt: die Regel Zeile 2125 mit `!important` setzt sich gegen Zeile 2122 durch. Bei 2 Zeilen Text y 14-97, bei "Rückgängig" y 14-84, immer über dem Fenster (nie in das Fenster hinein). Gemessen bei 27 Fenstern und 4 Größen: nie verdeckt, nie hinter dem Fenster, nie aus dem Bild. | index.html:928-929, :2125 | 360x780 (+ alle) | gemessen |
| F5 | klein | **Doppelte Toast-Regeln.** Zeilen 928-929 (ohne `!important`) sind bei offenem Fenster wirkungslos, weil 2122/2125 mit `!important` gewinnen. Die ältere Regel `.toast.show{transform …}` (Zeile 923) und die Block-1-Regel 2125 stehen an zwei Stellen. Wer eine davon ändert, merkt es nicht. | index.html:919-930 und :2122-2125 | - | Code |
| F6 | klein | **Toast liegt über dem geöffneten Menü** (Menü 310 px breit, Toast x 114-246, y 631-676), überdeckt dort Menüeinträge/Fußzeile. Text bleibt lesbar. | index.html:2122 | 360x780 | gemessen |
| F7 | klein | **Toter Code Dashboard-Kacheln:** `_dashTilesHTML()` (Zeile 15311) und `_bindDashTiles()` (Zeile 15333) werden nirgends aufgerufen; die IDs `dashTilesEditBtn` und `dashTilesWrap` gibt es in keiner Seite. Es gibt keinen sichtbaren toten Knopf, aber die Kachel-Umsortierung ist nicht erreichbar. | index.html:15311-15345 | - | Code |
| F8 | klein | **Büro-Anmeldung läuft auf Handybreite nach rechts über:** Karte 373 px breit ab x=24, Seite 397 px breit bei 360 und 390 px Fenster (ab 412 px kein Überlauf). Büro ist für den PC gedacht, ein Handy-Besuch kommt aber über den Link in der App (Anmelde-Overlay, `lo-buero`). | buero.css:62-63 (`.login`, `.login-karte`), buero.html:30 | 360 / 390 | gemessen, Ursache nicht geklärt |
| F9 | klein | **Anmelde-Overlay: kleine Tippflächen.** "Passwort vergessen?" 254x15 px, Passwort-Auge 26x26 px (Vorgabe im Projekt: 44 px). | index.html:2723 (`#loForgotBtn`), :1954 (`.lo-eye`) | alle | gemessen |
| F10 | klein | **quiz-lehrer.html ohne Parameter ist eine Sackgasse:** nur der Satz "Bitte den QR-Code „Lehrer-Handy“ an der Tafel scannen", kein Titel, kein Link zurück. | quiz-lehrer.html | alle | gemessen |
| F11 | klein | **Android-Zurück läuft durch alle besuchten Reiter.** Heute > Kalender > Prüfungen > Schüler, dann 2x Zurück: erst Prüfungen, dann Kalender, nicht Heute. Auf den Hauptseiten gibt es keinen Zurück-Pfeil, Android-Zurück geht aber doch durch den Verlauf. Das kann gewollt sein (Browser-Verhalten), steht aber im Kommentar Zeile 17066 als "Reiterwechsel ist kein Zurück". | index.html:17140-17147 (`navInstallieren`), :17066 | 360x780 | gemessen |
| F12 | klein | **reaktion.html ist von keiner Seite verlinkt** (check.html nur über den QR-Text in den Einstellungen). | - | - | Code (Suche) |
| F13 | klein | **Menü-Knopf `#menuBtn` ist tot:** immer `hidden`, `openDrawer`-Listener Zeile 8159 wird nie ausgelöst; er reserviert dennoch 80-94 px links (siehe F1). | index.html:2753, :8159 | alle | Code |
| F14 | klein | **Seite "Risiko-Themen" (`routeRisk`) ist nicht erreichbar:** kein Knopf, keine Menüzeile und kein Reiter ruft sie auf, nur ihre eigenen Tippflächen (Zeile 16936). Die Seite selbst funktioniert und ist gefüllt. Ob das so gewollt ist (Funktion abgeschaltet), ist aus dem Code nicht zu sehen. | index.html:16916-16936 | - | Code (Suche über die ganze Datei) |

### Tote Knöpfe und Links (Ergebnis)

- **index.html, Klicktest [gemessen]:** 19 Seiten (Heute, Schüler, Kalender, Prüfungen, Diese Woche, To-dos, Statistik, Archiv, Einstellungen, Warteliste, Arbeitszeit, Akte, Notizen, Historie, Prüfung eintragen, Akte-Termine, Planvorlagen, Prüfer-Liste, Fahrstunde) bei 360x780, je Klick frische Seite. 218 sichtbare Knöpfe/Links/Karten angeklickt (Kalender nur die ersten 32 von 42). **0 Knöpfe ohne Reaktion** (Reaktion = Seite, Fenster, Menü, Meldung, Rückfrage oder Inhalt änderte sich) und 0 Konsolenfehler. 21 Elemente waren nicht anklickbar: 18 in zugeklappten Abschnitten der Einstellungen (Schalter, Backup, PIN …), 1 Schülerkarte in der zugeklappten Wartet-Liste, 2 Pfeile "Nächster Monat / Nächstes Jahr" in Statistik (vermutlich gesperrt, weil nicht in der Zukunft). Das sind keine toten Knöpfe, mein Test zählte sie nur als sichtbar.
- **Statisch [Code]:** 0 `onclick` auf nicht vorhandene Funktion in allen 12 HTML-Dateien und buero.js; `href="#"` nur in buchen.html:73 (Skript setzt `href` vor der Anzeige, Zeile 209) und quiz-loesungen.html:61 (`onclick … return false`, Drucken). Beide in Ordnung. Alle `#bereich`-Links in buero.js zeigen auf vorhandene Bereiche.
- **buero.html (Vorführung) [gemessen]:** 11 Bereiche, je bis 40 Knöpfe/Links angeklickt, 1366 und 360 px. 38 Meldungen, alle erklärbar: Links auf den Bereich, in dem man schon ist (z. B. "Kommende", "Aktiv (22)"), und Einträge, die ein früherer Klick entfernt oder verändert hatte ("Löschen", "Erledigt", "Testfahrt ✓", "Bearbeiten"). Kein Konsolenfehler, kein eindeutig toter Knopf (nicht beweisbar, siehe ❓).
- **Tote Seite statt toter Knopf:** `routeRisk` ohne Einstieg (F14), Kachel-Umsortierung ohne Knopf (F7), Menü-Knopf immer versteckt (F13).


---

## 3. Nicht geprüft (❓)

- ❓ **Anmeldung mit Konto:** alles hinter Supabase-Login (echte Daten, Cloud-Sync, Backup-Dialoge). Die Messung lief mit Attrappe und erfundenen Daten.
- ❓ **Fahrschul-Gesamtansicht** (`routeFahrschule*`, 17 Seiten) und **Admin-Fenster `#adminPanel`**: nur mit Leitungs- bzw. Super-Admin-Konto erreichbar.
- ❓ **Etwa 45 der 75 Fenster** (`openSheet`) nicht einzeln geöffnet; `openFCMenu` und `openResultFlow` (Ergebnis-Ablauf) öffneten mit meinen Parametern kein Fenster.
- ❓ **Verkehrstafel zeichnen** (Band, Objekte, Film, Teilen), **Unterschrift-Pad** und **Fahrmodus** im Betrieb: nur das Laden der Seite gemessen.
- ❓ **theorie.html** hinter der Anmeldung (Liste, Editor, Folienansicht, Smartboard-Fenster `?tafel=`); gemessen nur die Anmelde-Ansicht.
- ❓ **Quiz im Spiel** (quiz.html, quiz-tafel.html, quiz-lehrer.html): Räume und Antworten brauchen die Datenbank; gemessen nur Start-Ansichten.
- ❓ **buchen.html Schritte 1-4 und storno.html mit gültigem Token:** brauchen die Antworten der Schnittstelle `public-booking`.
- ❓ **buero.html mit echtem Konto:** Wer-bedient-Fenster (PIN), Hinweis-Seiten (gesperrt, AGB), Rollenstreifen.
- ❓ **Echtes Android-Gerät:** Android-Zurück wurde mit `page.goBack()` in Chromium nachgestellt (gleiches `popstate`), nicht auf einem Handy. Ebenso Wisch-Schließen der Fenster, Safe-Area (`env(safe-area-inset-*)`), PWA-Installation, Dunkelmodus (nur Hell gemessen).
- ❓ **Tote Knöpfe in Büro:** automatischer Klicktest in der Vorführung brachte nur Ergebnisse, die sich erklären lassen (Links auf den schon offenen Bereich, Knöpfe, die ein früherer Klick entfernt hatte). Kein eindeutig toter Knopf, aber auch kein vollständiger Beweis.
- ❓ **Schriften:** Google Fonts waren blockiert (Messung mit Ersatzschrift). Zeilenumbrüche und Kopfbreiten können mit den echten Schriften um wenige Pixel abweichen.

---

## 4. Wie gemessen wurde (Kurz)

- 35 Routen von index.html x 4 Größen = 140 Messungen: Konsole/`pageerror`/lokale Requests, `scrollWidth > clientWidth`, Logo-Mitte (`#brandLogo`), Kopf-Überlappungen (paarweise Rechtecke in `header.topbar`), Textlänge gegen Leerseiten.
- 27 Fenster x 4 Größen: Öffnen, ✕-Größe, Schließen per ✕ / Tippen daneben / Android-Zurück (`page.goBack()`), Toast-Position per `getBoundingClientRect`.
- 7 Toast-Fälle (ohne Fenster, mit Fenster, langer Text, Rückgängig, Menü offen) x 3 Größen.
- 26 Seiten/Zustände (11 Büro-Bereiche in der Vorführung + 15 weitere Seiten/Link-Zustände) x 4 Größen = 104 Messungen; Büro-Dialoge und Hash-Verlauf auf 360 und 1366 px.
- Statische Prüfung aller 12 HTML-Dateien (+ buero.js): `onclick` auf unbekannte Funktionen, `href="#…"`, IDs in `getElementById` / `$("#…")`.
