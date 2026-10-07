---
name: video-skript
description: Write short social-media clip scripts (TikTok, Reels, Shorts) for Serban from one theory lesson, using only facts from his Sprechzettel. Use when Serban asks for Video-Skripte, Kurzclips, Reels or TikTok texts for a lesson.
allowed-tools: Read, Write, Bash(ls *), Bash(git *), mcp__Dropbox__fetch, mcp__Dropbox__list_folder
---
Ziel: Aus einer Lektion 3 bis 4 Kurzclip-Skripte machen, die Serband vor der Kamera sprechen kann. Er prüft und gibt frei. Du veröffentlichst nichts.

## Quelle (nur lesend)
Sprechzettel der Lektion in Dropbox, Team-Ordner `ns:14648808867//Theorie Unterricht/Lektion NN + MM - …/Abend_LektionNN_MM_Sprechzettel.pdf`. Pfad bei Bedarf mit `list_folder` (`recursive=false`) suchen. Für L5+6, L7+8 und L11+12 liegt (Stand 04.10.2026) kein Sprechzettel in Dropbox; dann die Lektionsnotiz im Vault und die Folien-Inhaltsdateien im Git (`sprechzettel.js`) nutzen und im Skript vermerken: „Quelle nicht der Sprechzettel“. Mit `mcp__Dropbox__fetch` lesen (Limit 5 MiB). Bei C/CE liegen die Dateien im Ordner `Theorie Unterricht C und CE`.
Zahlen, Paragrafen und Quellen **nur** aus dem Sprechzettel übernehmen. Nichts aus dem Gedächtnis ergänzen.

## Was ein Clip enthält
- **Länge:** 30 bis 45 Sekunden, rund 70 bis 100 gesprochene Wörter.
- **Hook** (erste 2 Sekunden): eine Frage oder ein Satz, der neugierig macht, ohne zu übertreiben.
- **Eine** Kernaussage pro Clip. Dazu ein Merksatz aus der Folie, wenn es einen gibt.
- **Bildidee** ohne Fahrschüler: Folie, Grafik, Serband allein, Auto von außen.
- **Einblendung** (Text im Bild): kurz, höchstens 6 Wörter pro Zeile.
- **Quelle und Folie** zur Kontrolle: Folie Nr., Quelle laut Sprechzettel.

## Ton (verbindlich, aus dem Vault)
Du-Form, kurze Sätze, gesprochene Sprache. Ehrlich statt werblich. Konkret statt Floskel. Bodenständig, ein Stück melancholisch, hoffnungsvoll. Kein Eigenlob, keine Bestehensquote, keine Superlative, keine Werbesprache, kein Verkaufsdruck. Humor nur in Maßen.

## Was nie hineinkommt
- Bußgeldbeträge und Punkte, wenn es nicht der Kern ist. Sie ändern sich. Wenn doch: Stand und Quelle nennen.
- Die Aussagen, die der Sprechzettel mit ⚠ als **nicht belegt** markiert, zum Beispiel „90 % der Informationen sind visuell“, „Anfänger schauen zu nah vors Auto“, „jeder 4. tödliche Autobahnunfall durch Sekundenschlaf“.
- Fahrschüler im Bild, Namen, Fotos von Schülern. Keine echten Kennzeichen, keine Firmenlogos von der KI malen lassen.
- Verkaufsaussagen zum Online-Kurs, solange die Rechtslage und der Kurs nicht stehen.
- Fahrschul-Preise (§ 19 FahrlG), fremde Musik und Trend-Sounds (GEMA), KI-Stimme. Mit `scripts/video-overlay/lint_text.py` den Sprechtext vor der Freigabe prüfen.

## Ablauf
1. Sprechzettel lesen. Die 3 bis 4 stärksten, eigenständigen Aussagen wählen (merkbar, belegt, ohne Vorwissen verständlich).
2. Skripte schreiben. Jede Zahl gegen den Sprechzettel gegenprüfen (rechnen, nicht schätzen).
3. Datei im Vault ablegen: `Projekte/Theorieunterricht/Video-Skripte/Lektion NN – Kurzclips.md`, Frontmatter nach `Vorlagen/Notiz-Konventionen.md`, Stand **Entwurf, nicht freigegeben**. Im Hub `Projekte/Theorieunterricht.md` verlinken.
4. Serband kurz berichten (einfaches Deutsch): welche Clips, was er prüfen soll. Neue Texte gehen erst nach seiner Freigabe weiter.
