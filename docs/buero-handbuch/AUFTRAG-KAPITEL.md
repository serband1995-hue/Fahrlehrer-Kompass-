# Auftrag für ein Kapitel des Büro-Handbuchs (für Helfer-Agenten)

Ziel (Wunsch von Serband, 28.11.2026): PDFs, die die Büro-Seite (buero.html + buero*.js) **vollständig** erklären.
„Jede Funktion soll erklärt werden mit Bildern. Jede, alles, einfach alles.“ Leser: Büro-Personen ohne Technikwissen.

## Dein Ergebnis (nur diese drei Dateien anlegen, sonst nichts im Repo ändern, App-Code NIE ändern)
1. `docs/buero-handbuch/funktionen/NN-name.md` – vollständige Liste aller Funktionen deines Bereichs, aus dem Code abgeleitet:
   jeder Bereich, jeder Reiter, jeder Knopf, jedes Feld mit Bedeutung, jeder Ablauf, jede Warnung/Sperre, Rollen-Unterschiede
   (Büro / Leitung / Super-Admin). Je Eintrag: Name wie auf dem Bildschirm, Fundstelle (Datei:Zeile), im Handbuch erklärt (ja/Abschnitt),
   Bild (Datei). Was du nicht sicher aus dem Code verstehst: mit ❓ markieren.
2. `docs/buero-handbuch/kapitel/NN-name.bilder.mjs` – die Screenshots (Format siehe Kopf von `docs/buero-handbuch/bilder.mjs`).
   Bild-IDs beginnen mit `NN-` (deine Kapitelnummer). Wichtige Stellen mit `marken` (Rahmen + Nummer) markieren; die Nummern
   entsprechen den Schritten in „So geht’s“. Bei Dialogen/Formularen: vorher mit `vorher` öffnen/ausfüllen (nur erfundene Werte
   wie „Max Muster“, „Musterweg 1“, „0170 0000000“, „max@example.org“). Ausschnitte (`ausschnitt`) verwenden, damit Text im PDF
   lesbar bleibt (ganzer PC-Bildschirm 1366 px wird im PDF sehr klein). Wo sinnvoll ein Handy-Bild (`geraet: "handy"`).
3. `docs/buero-handbuch/kapitel/NN-name.html` – der Text: nur `<section class="funktion">…</section>`-Blöcke, Aufbau siehe
   `docs/buero-handbuch/kapitel/beispiel.html.txt`. Je Funktion: `<h2>` Name, „Wofür“, „So geht’s“ (nummerierte Schritte,
   Bild(er) mit `<img src="bilder/<id>.png" class="mittel|klein|handy">`), „Gut zu wissen“, optional `<p class="unsicher">`.
   Knopfnamen so schreiben wie auf dem Bildschirm, gern als `<span class="knopf-name">Speichern</span>`.
   `class="funktion neue-seite"` für große Abschnitte, die oben auf einer neuen Seite beginnen sollen.

**JEDE Funktion bekommt mindestens ein Bild.** Lieber mehr Bilder (Ausschnitte) als weniger.

## Schreibregeln
- Deutsch, einfache kurze Sätze, kein Fachwort (statt „Datenbank“ → „wird gespeichert“; statt „Filter“ ist ok, weil es so auf dem Knopf steht).
- Anrede „du“ wie die Büro-Seite selbst (sie sagt „Tippe deinen Namen an“).
- Nichts erfinden. Jede Aussage muss im Code stehen. Unsicheres → `<p class="unsicher">…</p>` und in der .md mit ❓.
- Keine echten Daten, keine echten Namen, keine Geheimnisse. Nur Vorführ-Daten (buero-vorfuehrung.js) und erfundene Eingaben.
- Absender ist „Fahrschule Boost“ (macht das Deckblatt automatisch). Keine Rechtsform erfinden.

## Werkzeuge (vom Repo-Ordner /home/user/Fahrlehrer-Kompass- aus)
- Bilder nur deines Kapitels: `NODE_PATH=$(npm root -g) node docs/buero-handbuch/bilder.mjs NN` (ein Bild: `--nur=<id>`)
- PDF nur deines Kapitels: `NODE_PATH=$(npm root -g) node docs/buero-handbuch/bauen.mjs N` → `docs/buero-handbuch/pdf/`
- Die Vorführung läuft als Leitung (sieht fast alles). `rolle: "buero"` + `pin: true` meldet als Büro-Person „Mia Muster“ an.
- Zum Nachsehen: PDF-Seiten mit `pdftoppm -r 60 -png <pdf> /tmp/…/s` in Bilder wandeln und ansehen. Prüfe jedes Bild selbst:
  Ist das Richtige zu sehen? Sitzen die Marken? Ist der Text lesbar? Kein JS-Fehler?
- Zeit: Die Vorführung friert die Uhr auf Mi 02.12.2026, 09:30 Uhr ein (Datum in Bildern).
- `page.on("dialog")` lehnt Browser-Rückfragen (confirm) ab. Lösch-Abläufe also nur bis zur Rückfrage zeigen oder die Rückfrage im Text beschreiben.
- Nichts wird gespeichert (Attrappe im Browser), du kannst also gefahrlos klicken. Niemals echte Supabase ansprechen.

## Am Ende
Kurzer Bericht an den Lead (deine letzte Nachricht): Dateien, Zahl der Funktionen, Zahl der Bilder, Seiten des Kapitel-PDFs,
Liste „nicht sicher erklärt“, und Funktionen ohne Bild (sollte leer sein) mit Grund.
