# Übergabe: Paket-Baukasten (Werkstatt 12 → Werkstatt 13)

Stand: 24.11.2026. Erstellt von Werkstatt 12. Die Hauptsitzung hat den Plan freigegeben.

## Auftrag (🗣 Serband, wörtlich)

> „Paket hinzufügen und dann gibt es frei wählbare Posten. Erstmal Posten, die es bereits gibt: Grundbetrag, Fahr-Akademie Lernapp, Übungsstunden, Sonderfahrten, Simulator, Vorstellung zur praktischen Prüfung. Dann soll es die Möglichkeit geben, diese Felder mit Zahlen zu belegen und auch mit Preisen. Unten soll sich dann der Gesamtpreis befinden, und dieser soll sich jedes Mal in € angepasst haben zu dem, was oben in den Preislisten steht. Dann soll man die Möglichkeit haben, diese als Vorlage zu speichern, damit man sich darauf beziehen kann. Wenn ein Schüler sich anmeldet, soll er dann entweder normale Anmeldung bekommen oder halt Pakete verkauft bekommen. Der Name des Paketes kann auch frei gewählt werden. Alles aufgebaut wie ein Baukasten.“

Ziel: live bis 28.11.2026, 23:59 (Merge-Frist).

## Entscheidungen der Hauptsitzung (24.11.2026)

1. Der Vorlagenpreis folgt automatisch der Preisliste, außer bei einem eigenen eingetippten Preis.
2. Ein Schüler hat höchstens ein aktives Paket.
3. Kein Rabatt in Schritt 1. Posten: die 6 genannten plus „Sonstiges“ mit freiem Namen.
4. Rechte: Büro, Leitung und Super-Admin der eigenen Fahrschule.
5. Bedienung: ganz einfach, handytauglich, kein Bestätigen-Fenster, dafür Rückgängig.

## Ausgangslage

### Live-Datenbank (gelesen von der Hauptsitzung, 24.11.)

**`fahrschule_pakete`**
- Spalten: `id` uuid (gen_random_uuid), `fahrschule_id` uuid NOT NULL, `name` text NOT NULL, `beschreibung` text, `reihenfolge` int default 0, `aktiv` bool default true.
- Es gibt keine weiteren Spalten, also weder Posten noch Preis.
- Für die Tabelle gibt es keine CREATE-Migration im Repo.
- Rechte:
  - SELECT: eigene Fahrschule (`my_fahrschule_id()`).
  - ALL: nur `is_fahrschule_admin` (eigene Fahrschule) und der Super-Admin.
  - **Das Büro hat KEIN Schreibrecht.**
- Trigger: keine.
- Inhalt:
  - Boost hat 4 Pakete: „Turboboost“ (reihenfolge 0), „Boost-Paket B“ (1), „Boost-Paket B197“ (2) und „Einzelabrechnung (ohne Paket)“ (3). Alle sind aktiv, keines hat eine Beschreibung.
  - Die Test-Fahrschule hat „Paket 1–3“.

**`fahrschule_preise` (K9)**
- Spalten: `id`, `fahrschule_id`, `art`, `klasse`, `bezeichnung` NOT NULL, `einheit` (default 'pauschal'), `betrag_cent` int (null = entfällt), `inhalt`, `paket_id` (→ `fahrschule_pakete`, on delete set null), `gueltig_ab` date NOT NULL, `angelegt_von`, `angelegt_am`, `bearbeiter`.
- Check auf `art`: grundbetrag, fahrstunde, sonderfahrt, pruefung_praxis, pruefung_theorie, reaktivierung, paket, sonstiges.
  - **Es gibt kein `lernapp` und kein `simulator`.**
- Check auf `einheit`: pauschal, 45min, fahrt, paket.
- Rechte:
  - INSERT: Büro, Leitung, Super-Admin.
  - SELECT: eigene Fahrschule und Super-Admin.
  - DELETE: nur Super-Admin.
  - Kein UPDATE. Ändern heißt: neue Zeile mit neuem `gueltig_ab`.
- Trigger: `fahrschule_preise_schutz`. Er setzt Verfasser und Zeit, lässt Rückdatieren nur für den Super-Admin zu und prüft, dass `paket_id` zur eigenen Fahrschule gehört.
- Inhalt: **0 Zeilen.** Die Preisliste ist leer.

**`schueler`**
- Zum Thema Paket gibt es nur die Spalte `paket_id` uuid. Keine anderen Spalten zu Paket, Anmeldung, Preis oder Posten.
- Kein Schüler hat ein `paket_id`.

### Code (Stand main 9d061f5)

**Preisliste**
- `buero-preise.js`:
  - `PR_ARTEN` (Z. 10–20), `PR_SONDER` (Überland/Autobahn/Dunkelheit, Z. 22), `prSchluessel` (Z. 27), `prDarf` (Z. 29).
  - `preisAm(art, klasse, bezeichnung, datum)` (Z. 54–63) liefert € zurück: `undefined` = kein Eintrag, `null` = entfällt.
  - `renderPreise` ist eine einzige Tabelle ohne Reiter (Z. 65–106).
  - `prNeu` setzt `paket_id` nur, wenn der Name gleich ist (Z. 169–171).
- `preisAm` wird nur an zwei Stellen genutzt: Reaktivierung (`buero.js` ~465–473) und Zahlungsmail (`buero-zahlungsmail.js:204`).
- In der Büro-Navigation ist es die Seite „preise“ in der Gruppe „Geld“ (`buero.js:150`). Geladen wird bei `buero.js` ~4193 und 4218. Beim Fahrschulwechsel wird `S.preise = null` gesetzt (~4632).

**Pakete**
- Lesen:
  - `buero.js` ~4181 → `S.pakete`
  - `index.html:6026` → `_fsAgg.pakete`
  - `index.html:6441`
- Schreiben, nur in der App über `prompt()`:
  - `paketHinzufuegen` (`index.html` ~6741), `paketUmbenennen` (~6750)
  - Standardpakete beim Anlegen einer Fahrschule (~6413)
- Am Schüler:
  - Büro-Akte: Auswahl `buero.js:2136`, Speichern ~2170, Anzeige `paketName` ~1437, ~1468, ~3377.
  - App: `schuelerPaketSetzen` (~6728), Anzeige in der Akte ~7438–7442.
- **„Turboboost“ ist fest verdrahtet.** Das ⚡ hängt am Namen (`index.html` ~7437, ~8915, ~8966). Den Namen nicht ändern.

**Schüler anlegen**
- Büro: `schuelerDialog` (`buero.js:2128–2190`). Es gibt bereits die Paket-Auswahl.
- App:
  - `formView` (`index.html` ~12275) hat kein Paket.
  - `neuenSchuelerAnlegenFS` (~7679) per `prompt`.

**Simulator und Lernapp**
- Schalter `schueler.hat_simulator` und `hat_theorie_app`.
- Verkäufe laufen über `fahrschule_empfehlungen` mit festen Beträgen 100 € und 149 € aus der Konfiguration (`buero.js:2972–2978`), nicht aus der Preisliste.

**Verbrauch** (für Schritt 2)
- Es gibt keinen Zähler „gebucht/verbraucht“.
- Berechnen lässt sich:
  - Übungsstunden über `KR.ueOf` (`kompass-rechnen.js:17–26`)
  - Sonderfahrten über `plan.sonder` in der App und den Kalender im Büro (`buero.js:2040–2058`). Die beiden zählen unterschiedlich.
  - Fahrchecks über `fcGebucht`

**Tests**
- `scripts/preisliste-test.mjs` (P1–P14) prüft keine Pakete.
- Pakete gibt es nur als Attrappe in akte-, seiten-, chef-sicht-, wetter-, xss- und zugang-Test.

## Plan

### Schritt 1 (bis 28.11.), zwei PRs

**PR A: Migration plus Baukasten im Büro**

1. Migration `paket_baukasten_01` (idempotent, mit Rückweg, lokal prüfen, Fable, dann an die Hauptsitzung):
   - `fahrschule_pakete` bekommt die Spalten `klasse` text, `posten` jsonb default '[]', `aktualisiert_am` timestamptz und `bearbeiter` text.
     - `posten` ist eine Liste von {`art`, `bezeichnung`, `anzahl`, `preis_cent_fest` (null = Preis aus der Preisliste)}.
   - Rechte: Büro, Leitung und Super-Admin der eigenen Fahrschule dürfen INSERT und UPDATE.
     - Es gibt kein DELETE für das Büro. Archivieren heißt `aktiv = false`, weil Schüler darauf verweisen.
     - Ein Trigger setzt `bearbeiter` (`buero_bearbeiter()`) und `aktualisiert_am`.
   - `fahrschule_preise`: Den Check auf `art` um 'lernapp' und 'simulator' erweitern. Dazu den alten Constraint mit Namen ermitteln, droppen und neu anlegen.
   - Neue Tabelle `schueler_pakete` (verkaufte Pakete als feste Kopie):
     - Spalten: `id`, `fahrschule_id`, `schueler_id` text, `vorlage_id`, `name`, `klasse`, `posten` jsonb (feste Preise), `gesamt_cent`, `verkauft_am`, `verkauft_von`, `bearbeiter`, `storniert_am`.
     - Rechte: Büro, Leitung und Super-Admin schreiben. Der zuständige Fahrlehrer (`schueler.fahrlehrer_id = auth.uid()`) liest.
     - Kein DELETE, nur Stornieren.
     - Unique-Index: ein aktives Paket je Schüler (`where storniert_am is null`).
     - Spur über einen Trigger ins `aenderungsprotokoll`.
   - `schueler.paket_id` zeigt weiter auf die Vorlage (Anzeige, ⚡).
2. Büro › Preisliste bekommt zwei Reiter: „Preise“ und „Pakete“.
   - „+ Paket“, Name frei, Klasse optional.
   - Posten per Chip hinzufügen: Grundbetrag, Fahr-Akademie Lernapp, Übungsstunden, Sonderfahrten (Überland / Autobahn / Nacht), Simulator, Vorstellung zur praktischen Prüfung, Sonstiges (freier Name). Entfernen per ✕ mit Rückgängig.
   - Zuordnung der Posten zu den Preis-Arten:

     | Posten | Preis-Art |
     |---|---|
     | Grundbetrag | grundbetrag |
     | Lernapp | lernapp |
     | Übungsstunden | fahrstunde |
     | Sonderfahrten | sonderfahrt mit PR_SONDER-Bezeichnung |
     | Simulator | simulator |
     | Vorstellung zur praktischen Prüfung | pruefung_praxis |
     | Sonstiges | sonstiges |

   - Je Posten: Anzahl (Stepper, mindestens 44 px) und Einzelpreis.
     - Vorbelegt mit `preisAm(art, klasse, bezeichnung|null, heute)`. Der Wert folgt der Preisliste automatisch.
     - Eigener Preis: Eintippen setzt `preis_cent_fest`. Dann erscheint der Hinweis „eigener Preis“ und ein Knopf „zurück zur Preisliste“.
     - Fehlt ein Preis: „Preis fehlt in der Preisliste“ und ein Eingabefeld.
   - Unten steht der Gesamtpreis in €, live berechnet. Alles in ganzen Cent rechnen.
   - Speichern legt eine Vorlage an. Kopieren und Archivieren mit Rückgängig. Kein Bestätigen-Fenster.

**PR B: Verkauf an Schüler plus App-Ansicht**

3. Büro-Akte und neuer Schüler (`schuelerDialog`): Auswahl „Normale Anmeldung“ oder „Paket“.
   - Bei „Paket“: Vorlage wählen, im selben Baukasten anpassen, dann „Paket verkaufen“. Das legt eine feste Kopie in `schueler_pakete` an und setzt `schueler.paket_id` auf die Vorlage.
   - Wechsel des Pakets: das alte stornieren und das neue verkaufen, mit Rückgängig.
   - „Einzelabrechnung (ohne Paket)“ zählt als „Normale Anmeldung“.
4. App (index.html): Der Fahrlehrer sieht in der Akte den Paketnamen und die Posten, nur lesend.

### Schritt 2 (danach)

„Noch offen“ je Posten, zum Beispiel „Übungsstunden 12 von 20“. Der Verbrauch kommt aus dem Kalender. Dabei die unterschiedliche Zählung der Sonderfahrten in App und Büro beachten.

## Blindspots

**Kritisch**
- Das Büro hat keine Schreibrechte auf Pakete. Ohne die Migration geht nichts.
- Nie löschen, nur archivieren oder stornieren.
- Die Preisliste ist leer. Der Baukasten muss ohne Preise funktionieren.
- Verkaufte Pakete sind feste Kopien, sonst ändern sich alte Verträge rückwirkend.
- Alle Beträge in Cent.
- Die App muss mit der alten DB laufen. Fehlen die neuen Spalten oder Tabellen, Reiter und Funktionen ausblenden, ohne Fehlermeldung. Muster dafür: K9 `prTabelleFehlt`, K18 `konfTabelleFehlt`.

**Wichtig**
- Klassenpreise: Das Paket hat eine Klasse, und `preisAm` bekommt sie mit.
- „Turboboost“ nicht umbenennen.
- Die festen Beträge für Simulator und Akademie bei den Verkäufen (`fahrschule_empfehlungen`) nicht anfassen, sonst kippen die Provisionen.
- Preisaushang und Rechtliches nur als ❓-Hinweis. Brutto-Endpreise wie in der Preisliste.
- Werkstatt 11 hat Farbe B gebaut. Nur vorhandene Variablen nutzen, keine neuen Farben.

**Optional, nicht in Schritt 1**
- Rabatt-Posten.
- Frei anlegbare Posten-Arten über „Sonstiges“ hinaus.
- Export.

## Regeln (wie in Werkstatt 12)

- Eigener Branch je PR. Version (`APP_VERSION`, `CACHE_VERSION`) erst beim Merge auf die nächste freie Nummer. Neuigkeiten-Eintrag oben in `neuigkeiten.js`.
- Vor jedem Merge:
  1. `/pruefen`: Prüf-Team, dann Richter.
  2. Fable prüft ALLES, auch das Zusammenspiel mit allem seit v83.
  3. main holen.
  4. VOLLER Testlauf auf genau dem Endstand: alle `scripts/*-test.mjs` mit den `*_SCHNELL`-Schaltern, dazu `rechnen-test` und `release-check`. Höchstens 2 Chromium gleichzeitig.
  5. GitHub-Prüfung grün.
- Migrationen: als SQL-Datei (idempotent, mit Rückweg) an die Hauptsitzung per send_message. Merge erst nach „Migration ist live“.
- Lese-Abfragen an der echten DB nur über die Hauptsitzung. Prüfer und Fable lesen die Live-DB NICHT selbst, nur die lokale Postgres.
  - Postgres: `/var/tmp/pgk7/data`, Port 5432 nach dem Neustart. Starten mit `su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/pgk7/data -l /var/tmp/pgk7/log start"`.
  - Den Stub `stub.sql` aus dem Scratchpad von Werkstatt 12 gibt es in einer neuen Sitzung nicht. Einen eigenen Stub anlegen: `auth.uid()` aus `current_setting('t.uid')`, `is_buero`/`is_fahrschule_admin`/`is_super_admin` aus `t.rolle`, `my_fahrschule_id()`, `buero_bearbeiter()`, `aenderungsprotokoll` mit `id bigserial` und `geaendert_am`.
- Rollen-Test (`scripts/rollen-test.mjs`) muss grün bleiben und wird für neue Rollen-Funktionen erweitert.
- Keine Schülerdaten in Commits, Logs oder Tests. Keine Geheimnisse. Nichts verschicken. Vault nur lesen.
- Live-Versionen an die Hauptsitzung melden.

## Offene Punkte aus Werkstatt 12 (nicht Teil des Baukastens)

- H2: Urlaub ist über den Namen verknüpft. Wer sein Profil umbenennt, kann unter fremdem Namen Urlaub eintragen. Sauber wäre später eine `fahrlehrer_id`-Spalte.
- Das Büro-Formular überschreibt beim Speichern eine veraltete Akte. Das gab es schon vorher.
- „Büro (keine Provision)“ bei Verkauf erfassen: Werkstatt 12 baut das gerade fertig, nur in der App.
