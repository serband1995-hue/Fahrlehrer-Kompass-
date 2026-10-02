# Übergabe: Theorieunterricht Klasse C und CE

Für: die neue Claude-Sitzung. Von: der Sitzung, die die Klasse-B-Abende (Lektion 1–14) fertiggestellt hat.
Stand: 02.10.2026.

Lies diese Datei komplett, bevor du irgendetwas baust. Hier steht, wie Serband es haben will und welche Fehler schon passiert sind. Keiner davon darf sich wiederholen.

---

## 1. Wer ist der Auftraggeber?

- **Serband Abdullah**, Fahrlehrer bei der **Fahrschule Boost in Offenbach am Main**. Er unterrichtet die Theorie selbst.
- Sprich mit ihm **in einfachem Deutsch**: kurze Sätze, keine Fachbegriffe aus der IT und kein Englisch. Er hat sich schon beschwert („Verstehe nichts, du redest Englisch“).
- Schreib ihm **nur das Wichtige**: was fertig ist, wo es liegt und was er entscheiden muss. Keine langen Technik-Berichte.
- Er erwartet, dass du **selbstständig arbeitest**. Frag nur, wenn eine Entscheidung wirklich bei ihm liegt.
- Seine Dropbox-Mail ist serband1995@gmail.com. Das Team-Konto heißt „Fahrlehrerserband“.

## 2. Der Auftrag

Baue die **Theorie-Präsentationen für die Klassen C und CE** (Lkw über 3,5 t und Lkw mit Anhänger), Lektion für Lektion.

**Verbindliche Vorgaben von Serband:**
1. **Keine Gruppenarbeiten.** Das ist anders als bei Klasse B. Stattdessen soll alles hervorragend erklärt sein, mit Fragen an die Klasse, Quiz und Mitschreib-Folien.
2. **Vollständig recherchieren**, bevor eine Lektion gebaut wird. Sie muss inhaltlich perfekt vorbereitet sein.
3. **Eine Präsentation nach der anderen.** Mit der nächsten fängst du erst an, wenn die aktuelle **komplett fertig, geprüft und hochgeladen** ist.
4. **Tolle Animationen und Grafiken.** Zeig, was du kannst: Morph-Abläufe, animierte Draufsichten, Diagramme, Fotos. Die Messlatte ist **Perfektion auf jeder Folie**: alles sauber, nichts überlappt, ein roter Faden.
5. **Mit Higgsfield zusammenarbeiten**, für Bilder und kurze Videos (Regeln dazu in Abschnitt 6).
6. **Tolle Notizen für ihn** auf jeder Folie (Abschnitt 5).

## 3. Rahmen: Lektionen, Zeit, Nummern

- **Was gelehrt werden muss, steht in der FahrschAusbO.** Klassenspezifischer Zusatzstoff, Anlagen 2.x: Recherchiere die Anlagen für **C** und **CE** auf gesetze-im-internet.de und buzer.de.
  - Typisch sind für C 10 Doppelstunden Zusatzstoff und für CE 4 Doppelstunden, wenn die Fahrerlaubnis C schon da ist. **Prüf das nach.** Prüf auch, was bei Erweiterung von B auf C für den Grundstoff gilt.
- **Nummern und Titel der Lektionen genau wie im DEGENER-Ausbildungsplan** für C und CE. Serband arbeitet nach Degener. Bei Klasse B war Degener deckungsgleich mit dem amtlichen Rahmenplan.
  - Quelle für B war ein Degener-PDF (fahrschulteam.info). Such das passende Degener-Blatt für C/CE.
  - Prüfe am Anfang jeder Lektion: Stimmen Nummer und Titel mit Degener überein?
- **Eine Lektion dauert 90 Minuten.**
  - Bei Klasse B war ein Abend 2 Lektionen mit 15 Minuten Pause, also eine Datei pro Abend mit Pause-Folie.
  - **Frag Serband einmal am Anfang**, ob das bei C/CE auch so sein soll: eine Datei pro Abend mit 2 Lektionen und Pause-Folie oder eine Datei pro Lektion.
  - Planung der Zeit:
    - Rechne grob mit 1 bis 1,5 Minuten pro Folie plus Zeit für Klicks und Fragen.
    - Als Richtwert lief bei B eine 90-Minuten-Lektion mit etwa 50–78 Folien und etwa 140 Klicks.
    - Zeitangaben auf Agenda- und Lernziel-Folien müssen zur echten Dauer passen.
- **Nur das Wesentliche.** Serband: „Es muss nicht immer alles erklärt werden. Nur die wesentlichen Sachen, die auf jeden Fall wichtig sind.“ Erlaubt sind Pflichtstoff, Prüfungsrelevantes und Gefährliches aus der Praxis. Kein Kleinkram. Für ihn ist zum Beispiel die Insassenunfallversicherung „Quatsch“.
- **Themen, die für C/CE wahrscheinlich dazugehören** (aus Recherche bestätigen, nicht raten):
  - Sozialvorschriften: Lenk- und Ruhezeiten, Fahrtenschreiber
  - Abmessungen und Gewichte, Ladungssicherung, Achslasten
  - Druckluftbremse, Dauerbremsen
  - Toter Winkel und Abbiegeassistent
  - Kurvenverhalten und Kippgefahr
  - Kupplung von Anhängern (CE)
  - Abfahrtkontrolle
  - Maut
  - Fahrverbote: Sonntag, Ferien, Überholverbote für Lkw
  - Geschwindigkeiten für Lkw
  - Grundqualifikation BKrFQG: nur abgrenzen, ist ein eigener Kurs

## 4. Bauweise: das Starter-Paket

Im Repo-Ordner `theorie-kit/` liegt das Werkzeug, mit dem Klasse B gebaut wurde. Nutze es weiter, damit alles im gleichen Stil bleibt.
- **Installieren:** `npm install` im Ordner.
- **Hinweis:** In dieser Umgebung lag `node_modules` unter dem Scratchpad. Wenn `npm install` nicht geht, frag nach der Netzwerk-Freigabe.

| Datei | Wozu |
|---|---|
| `lib.js` | Basis-Bibliothek: Deck, Formen, Text, Bilder, Videos, alle Animationen, Morph, Übergänge, Notizen-Kopf „FOLIE N VON M · k Klicks“, CAP-Grenzen für flüssige Animationen |
| `gs.js` | Stil-Bausteine: `base`, `kick`, `title`, `card`, `point`, `quiz`, `steps` (Morph-Schrittfolge), `roadH`, `veh` (Fahrzeug-Sprites) |
| `build.js`, `render.sh` | Teile bauen (`PARTS=partA,partB node build.js`) und als JPG rendern |
| `beispiel_l910/` | Echte Teile aus Lektion 9+10 als Vorlage: Morph-Abläufe Wenden/Einparken, Foto-Folien, Quiz, animierte Diagramme |
| `art/` | Fahrzeug-Sprites von oben (Pkw, Lkw, Rad, Moto, Fußgänger, Blinker), dazu `ov_left.png` als dunkler Verlauf für Text auf Fotos |
| `sprechzettel.js` | Sprechzettel als PDF (Folienbild plus Notizen). Braucht `notes.json`, `render/s-NNN.jpg`, den Ordner `worksheets/` und `boost_logo.png` |
| `notecheck.py` | Prüft alle Folien: Notizen vorhanden, Übergang ➜ vorhanden, Kopfzeile und Klickzahl stimmen, keine veralteten Verweise |
| `apply.py` | Übergänge und Korrekturen aus JSON in die Notizen eintragen |
| `pptx_merge_beispiel.py` | Folien aus einer pptx in eine andere einfügen (python-pptx, mit Bildern, Timing, Morph) |
| `dropbox_upload.js` | Upload über Serbands Dropbox-Dateianfrage (Playwright), siehe Abschnitt 8 |
| `REGELN_Didaktik.md` | Didaktik-Regeln. Achtung: Regel 7 (Gruppenarbeit) gilt für C/CE **nicht** |

**Design-Stil:**
- Dunkel und filmisch (cinematic dark).
- Schrift Calibri, Überschriften 36–44 pt fett.
- Dunkle Karten (111B28) mit feinem Rand.
- Kicker in Großbuchstaben mit Sperrung, darunter der Titel.
- Fußzeile mit Thema und Seitenzahl (`!!ftR`, nach dem Zusammenbau neu nummerieren).
- Pro Kapitel eine eigene Akzentfarbe.
- Kapitel-Trennfolien mit großer Nummer.
- Draufsicht-Straßen mit Sprites.
- Neue Folien müssen exakt im Stil der bestehenden aussehen.

## 5. Notizen: so will Serband sie

Auf **jeder** Folie Notizen in diesem Schema:
- `▶ Sagen:` was er wörtlich sagen kann, in einfacher Sprache und mit „ihr“ an die Klasse
- `❓` die Frage an die Klasse
- `✅` die Antwort mit Paragraf, Zahl und Quelle
- `🖱 Klick 1: … Klick 2: …`, genau passend zur echten Klick-Reihenfolge
- `💡` Tipp oder typischer Fehler, wenn sinnvoll
- `➜ „…“` als Übergang zur nächsten Folie, **auf jeder Folie außer der letzten**. Er muss zum Inhalt der nächsten Folie passen.

**Weitere Regeln:**
- Nach jedem Umbau prüfen, ob Notizen und Übergänge noch stimmen. Beispiel: „Gruppe 4 zeigt das gleich“, obwohl es die Gruppe nicht mehr gibt. Solche veralteten Hinweise sind schon passiert.
- Nach jedem Bauen `notecheck.py` laufen lassen. Ergebnis: **0 Auffälligkeiten**.

## 6. Bilder und Higgsfield

**Wofür:**
- Fotos: Modell `gpt_image_2_5`, quality high, 2k, 16:9.
- Kurze Kamerafahrten: Kling 3.0 pro mit Start- und Endbild, Ton „off“.
- Videos auf 1920×1080 bringen, sonst sind sie nicht 16:9.

**Was du beachten musst:**
- **Keine Menschen in Nahaufnahme und keine Körperhaltungen** wie Schulterblick, Hände am Lenkrad oder Kopfdrehung. Die Bilder waren anatomisch falsch, und Serband war sehr verärgert („die sehen alle anatomisch ziemlich scheiße aus“).
  - So etwas zeigst du als **gezeichnete Draufsicht** (Fahrzeug von oben, Blickbereiche als farbige Kegel, ohne Menschen).
  - Für Lkw passt das besonders gut: tote Winkel, Spiegel, Kurvenradius, Schleppkurve.
- **Prüfe jedes Bild**, bevor es auf eine Folie kommt:
  - Passt der Inhalt zur Aussage der Folie? Beispiele für Fehler: „beide Seiten zugeparkt“, aber es parkt nur eine Seite. Ein Abschleppseil, das schief zum falschen Auto hängt.
  - Rechtsverkehr, Lenkrad links, Fahrer links.
  - Deutsche Verkehrszeichen, keine lesbaren Kennzeichen.
  - Physikalisch plausibel.
  - Bei Fehlern: neu erzeugen oder weglassen. Nie ein falsches Bild einbauen.
- **Tag und Nacht mischen.** Nicht alles nachts. Serband: „Es müssen nicht immer Bilder sein, die abends sind. Tags geht auch.“
- **Links ein ruhiges Drittel freilassen**, damit Text auf dunklem Verlauf (`ov_left.png`) lesbar ist.
- **Niemals einen Hinweis wie „KI-generiert“ oder „Higgsfield“ auf eine Folie schreiben.** Serband: „Ich will auf keiner einzigen Folie stehen haben: KI-generiert.“
- **Credits sparen.** Erst den Prompt gut durchdenken, dann mehrere Bilder als Batch erzeugen. Nicht für dasselbe Motiv zehnmal neu würfeln.

## 7. Qualität: jede Präsentation so prüfen

1. **Fakten:** Lass einen unabhängigen Subagenten jede Lektion gegen Primärquellen prüfen.
   - Quellen: StVO, StVZO, FeV, FahrschAusbO, BKatV-Anlage, Fahrpersonalgesetz und -verordnung, EU-VO 561/2006, EU-VO 165/2014 (Fahrtenschreiber).
   - Für Fahrtechnik: ADAC, DGUV, BG Verkehr.
   - Bußgelder und Punkte immer mit Nummer aus dem Bußgeldkatalog.
   - Unsicheres als unsicher markieren, nicht raten.
2. **Layout:**
   - Alles rendern (`render.sh`, LibreOffice zu PDF zu JPG) und **jede Folie ansehen**.
   - Nichts darf überlappen, kein Text abgeschnitten, keine Zeilenumbrüche in Titeln, die auf Karten laufen.
   - Textränder in gefüllten Textfeldern: in pptxgenjs ist `margin` ein Array in Punkt. `[10,10,10,10]` funktioniert.
3. **Technik:**
   - `validate.py` aus dem pptx-Skill muss „PASSED“ melden.
   - Nach dem Speichern mit python-pptx fehlt oft `<Default Extension="jpg">` in `[Content_Types].xml`. Ergänzen (siehe `apply.py`).
4. **Klicks:**
   - Antworten erscheinen **immer erst auf Klick**, nie gleichzeitig mit der Frage.
   - Einflüge 0,4–0,55 s, flüssig.
   - Auf dem Smartboard muss alles gut aussehen.
5. **Notizen:** `notecheck.py` ergibt 0 Auffälligkeiten.
6. **Zeit:** Passt der Umfang zu 90 Minuten? Stimmen die Agenda-Zeiten?
7. Erst danach den Sprechzettel bauen, hochladen und die Übersicht in Dropbox aktualisieren.

## 8. Dropbox: Ablage und Upload

- **Klasse B liegt unter:** `/Team-Ordner „Fahrlehrerserband“/Theorie Unterricht/`. Dort gibt es pro Abend einen Ordner und `00 Übersicht - Stand der Lektionen.md`.
- **Für C/CE:** Leg einen eigenen Ordner an, zum Beispiel `/Team-Ordner „Fahrlehrerserband“/Theorie Unterricht C und CE/`.
  - Darin pro Lektion oder pro Abend einen Unterordner.
  - Dazu eine eigene `00 Übersicht`.
  - Sag Serband einmal, wo alles liegt.
- **Hochladen:** Der Dropbox-Connector kann keine Binärdateien hochladen. Darum gibt es den Upload über Serbands Dateianfrage:
  1. Dateien nach `files/` neben `dropbox_upload.js` legen.
  2. `GO=1 MAIL=serband1995@gmail.com node dropbox_upload.js <dateien…>` ausführen (Playwright, Chromium unter /opt/pw-browsers).
  3. Die Dateien landen im Ordner „Lektion 03 + 04 …“ der Klasse B als „Claude für Serband - NAME“.
  4. Danach mit `mcp__Dropbox__move` in den richtigen Ordner verschieben und dabei umbenennen.
  5. Alte Versionen mit `mcp__Dropbox__delete` löschen. Sie landen in „Gelöschte Dateien“ und sind wiederherstellbar.
  6. Zum Schluss mit `search` prüfen, ob keine „Claude für Serband“-Dateien mehr irgendwo herumliegen.
- **Falls die Dateianfrage geschlossen ist:** Serband bitten, sie wieder zu öffnen, oder mit `create_file_request` eine neue anlegen und die URL in `dropbox_upload.js` tauschen.
- **Textdateien** (.md) direkt mit `create_file` anlegen. Ersetzen geht nur so: erst löschen, dann neu anlegen.
- **Verbindungsabbrüche:** Die Dropbox- und Higgsfield-Connectoren trennen sich manchmal kurz. Dann mit `ToolSearch` neu laden und weitermachen.

## 9. Fehler aus der Klasse-B-Arbeit, die nicht wieder passieren dürfen

1. Englisch oder Technik-Sprache gegenüber Serband.
2. KI-Bilder von Menschen und Körperhaltungen (Schulterblick). Credits verschwendet, Serband verärgert.
3. Bilder, deren Inhalt nicht zur Folie passt.
4. Ein „KI-generiert (Higgsfield)“-Hinweis auf 21 Folien. Er musste nachträglich entfernt werden.
5. Präsentationen mit „90 Minuten“, die nur die Hälfte des Abends füllten. Keine Pause-Folie, falsche Agenda-Zeiten.
6. Vertauschte Lektionsnummern: 7 und 8 im Vergleich zu Degener.
7. Pflichtthemen aus dem Rahmenplan fehlten. Andererseits zu viel Kleinkram.
8. Fehlende Übergänge (➜) auf hunderten Folien. Veraltete Notizen nach Umbauten.
9. Überlappende Titel, Text ohne Innenrand, abgeschnittene Zeilen. Wurden erst beim Prüfen der Bilder entdeckt, also immer rendern und ansehen.
10. Kleine Faktenfehler in den Notizen, zum Beispiel ein fehlendes Fahrverbot bei der Rettungsgasse. Das Fehlen ist erst bei der unabhängigen Faktenprüfung aufgefallen. Also: immer prüfen lassen.
11. Dateien blieben im falschen Dropbox-Ordner liegen, oder alte Versionen wurden nicht ersetzt.
12. Zu lange Berichte an Serband.

## 10. Ablauf pro Lektion

1. Recherche (Subagent): Rahmenplan-Inhalt dieser Lektion, Degener-Titel, Fakten mit Quellen, typische Prüfungsfragen, typische Irrtümer. Als FAKTEN-Datei speichern.
2. Gliederung und Zeitplan für 90 Minuten. Bei echten Weichen kurz an Serband (einfaches Deutsch).
3. Bilder planen, dann mit Higgsfield im Batch erzeugen und jedes Bild prüfen.
4. Folien bauen: Animationen, Morph, Diagramme, Quiz, Mitschreib-Folien, Abschluss „Das nimmst du mit“.
5. Notizen komplett, mit Übergängen.
6. Prüfen nach Abschnitt 7 (Fakten-Subagent, Rendern, Validieren, `notecheck`, Zeit).
7. Sprechzettel, Upload, Übersicht aktualisieren.
8. Kurze Meldung an Serband: was fertig ist, wo es liegt, was er testen soll (z. B. ob Videos starten und Animationen flüssig laufen).
9. Erst dann die nächste Lektion.
