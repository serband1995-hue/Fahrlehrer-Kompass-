# Video-Overlay: Referenz

## Formate
| Format | Ziel | Befehl-Kern | Besonderheiten |
|---|---|---|---|
| Reel / TikTok / Short | Reichweite, Link zur Landingpage | `--preset reel --look cinematic --endcard` | 30–60 s, Hook in 2 s, große Wörter, Karte oben. Skripte vorher mit `/video-skript` |
| Kurs-Lektion (Online-Theorie ab 2027) | volle Lektion quer | `--preset kurs --lower-third "…" --endcard`, dazu `subtitles.py`, `chapters.py` | Keine Wort-Einblendungen (Untertitel als Datei), Karte oben rechts, vorher `cut_silence.py` |
| Akademie-Erklärvideo | Videos in der Fahr-Akademie | wie Reel oder Kurs, plus `subtitles.py` | Upload, Bunny, Datenbank macht die Akademie-Verwaltung. **Nicht von hier aus schreiben.** |
| Webseiten-Film | Landingpage | nur Prüfung (`check.py`) und Untertitel | Gestaltung nach Webseiten-Regeln (dunkel, ruhig, golden). Film „Stille“ läuft in einer eigenen Sitzung |
| Nur Text im Bild (ohne Gesicht) | Reels-Plan Phase 1 | HyperFrames (`npx hyperframes`, lokal) laut Vault `Plan Einnahmen mit Claude` | Dieses Werkzeug ist für Aufnahmen **mit** Serban |

## Werkzeuge
- `transcribe.py`: Sprache zu Wörtern mit Zeiten (lokal). Optional `--glossar glossar.txt` (Fachwörter als Erkennungshilfe): im Test mit Computerstimme kein Vorteil, darum aus. Bei echtem Material vergleichen.
- `cut_silence.py`: Pausen über `--max-pause 0.45` auf `--keep 0.2` kürzen, „ähm“ entfernen, neue Wortzeiten in `*.words_cut.json`. Über etwa 30 Minuten langsam, vorher in Kapitel teilen.
- `lint_text.py` und `regeln.json`: harte Fehler und Warnungen aus Serbans Regeln. Neue Regel = neuer Eintrag in `regeln.json`.
- `captions.py`: Wort-Einblendungen als ASS, Gold = `#d9b56b` (Webseite). Schrift laut `brand.json` (Liberation Sans). Die Markenschriften Archivo/Inter liegen im Webseiten-Repo und sind hier nicht installiert.
- `render.py`: Karten, Zwischenschnitte, Lower-Third, Endkarte mit Logo (`icon-512.png`), Kino-Look, Lautstärke. Schreibt `*.quellen.txt` (Rechteprüfung). `--audio-clean` (Rumpeln filtern, Rauschen dämpfen, Stimme gleichmäßiger, Lautstärke): im Test mit künstlichem Rauschen 6 dB besserer Abstand zwischen Stimme und Rauschen als ohne, 9 dB besser als nur `--loudnorm`. Optionen: `--caption-y --card-x --card-y --card-w --card-h --upper --captions --no-captions --no-lint`.
- `subtitles.py`: `words.json` → `de.srt`, `de.vtt`, `cues.json`. Übersetzen: Texte aus `cues.json` übersetzen, Liste in `uebersetzung_xx.json`, dann `subtitles.py --apply cues.json uebersetzung_xx.json untertitel/xx`. Verkehrsrechtliche Begriffe nur mit Serbans Freigabe oder Vermerk „nicht fachlich geprüft“. Die Akademie hat eine eigene Untertitel-Pipeline (Tabelle `untertitel.zeilen`, Function `academy-untertitel`); SRT/VTT von hier sind nur Vorlage.
- `chapters.py`: `--suggest words.json` zeigt Pausen als Kandidaten, `chapters.json` prüft und gibt „mm:ss Titel“ für die Akademie und die YouTube-Beschreibung aus.
- `check.py`: Format, Ton, Lautstärke, Schwarzbilder, Sicherheitsränder (TikTok unten ab etwa y=1540, rechts ab etwa x=940, geschätzt), Vorschaubogen.
- `record_scene.mjs`: Lernszene als Clip. `NODE_PATH=$(npm root -g) node scripts/video-overlay/record_scene.mjs --list`, dann `… auffahren clip.mp4 --view 3d --seconds 8` (Ansichten `oben`, `3d`, `fahrer`). 22 Szenen, 1080×1920, ohne Ton, ohne Bedienknöpfe. Nur die Szene „auffahren“ wurde angesehen; vor Einsatz jede weitere Szene prüfen.

## Veröffentlichen (erst nach Serbans Freigabe)
- Metricool-Connector: `createScheduledPostForReview` (Entwurf zur Freigabe) vor `createScheduledPost`. Preis des Metricool-Tarifs vorher klären (laut Vault offen). Öffentliches Posten auf TikTok über eine eigene API ist laut Vault nicht belegt.
- Jeder Beitrag mit Link zur Landingpage. Bei KI-Bildern Kennzeichnung in der Beschreibung.
- Keine Preise, keine Versprechen („bestanden garantiert“), keine Hashtags mit Markennamen anderer Fahrschulen.

## Fachlich sichere Bildquellen
- Amtliche Verkehrszeichen: Bilder und Quellen laut Akademie-Repo (`verkehr/vorfahrt-zeichen/QUELLEN.md`). Nicht neu zeichnen lassen.
- Lernszenen aus dem Kompass: von Serban gebaut, Regeln mit Paragrafen hinterlegt.
- Higgsfield-Bilder: Anatomie (Hände, Arme), Rechtsverkehr, deutsche oder keine Kennzeichen, keine Fantasie-Schrift, keine Logos, keine erkennbaren Personen. Was nicht stimmt, wird nicht eingesetzt.

## Beim Filmen (Qualität kommt vom Dreh)
Hochkant 1080×1920, 30 fps, Handy auf Augenhöhe, Licht von vorn (Fenster vor, nicht hinter ihm), ruhiger Hintergrund, Ton über Mikrofon nah am Mund, „Nicht stören“ an. Erste 2 Sekunden: Hook ohne Begrüßung.
