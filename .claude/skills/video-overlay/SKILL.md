---
name: video-overlay
description: Edit a recorded video of Serban (vertical clip or full lesson): cut pauses and ähm, big word captions, matching pictures or short clips, cinematic color look, subtitle files (SRT/VTT) in several languages, and a final quality check. Use when Serban sends a video and wants Schnitt, Einblendungen, Untertitel, Bilder im Video, "cinematischen Look" or a Video-Prüfung.
allowed-tools: Read, Write, Bash(python3 *), Bash(ffmpeg *), Bash(ffprobe *), Bash(ls *), mcp__Dropbox__download_link, mcp__Dropbox__list_folder
---
Werkzeuge in `scripts/video-overlay/`: `transcribe.py`, `cut_silence.py`, `captions.py`, `render.py`, `subtitles.py`, `check.py`, `record_scene.mjs`. Nötig: `ffmpeg` (mit libass), `pip install faster-whisper pillow` (am besten in einem venv außerhalb des Repos).

## Ablauf
1. **Video holen.** Anhang aus dem Chat oder `mcp__Dropbox__download_link` (einmaliger Link, mit `curl` laden). In ein eigenes leeres Arbeitsverzeichnis legen, nicht ins Repo. Original nie überschreiben.
2. **Text mit Zeiten:** `python3 scripts/video-overlay/transcribe.py video.mp4 words.json --model small`. Läuft lokal. **Text gegenlesen** und Fehler in `words.json` von Hand korrigieren (Fachwörter, Eigennamen). Die Erkennung verhört sich, zum Beispiel „Rand“ als „Hand“.
3. **Pausen und Füllwörter schneiden** (vor allem bei langen Aufnahmen): `python3 scripts/video-overlay/cut_silence.py video.mp4 --words words.json --out geschnitten.mp4`. Danach mit `geschnitten.words_cut.json` weiterarbeiten (die Zeiten sind neu berechnet). Einstellungen: `--max-pause 0.45` (längere Pausen werden gekürzt), `--keep 0.2`, `--fillers`. Bei Aussagen, die Serband bewusst langsam spricht, `--max-pause` höher setzen.
4. **Plan schreiben (`plan.json`)** für Kurzclips:
   - `emphasis`: 3 bis 6 Schlüsselwörter in Gold.
   - `items`: je wichtiger Aussage ein Bild oder Clip mit `start`, `end` (Sekunden aus der Wörter-Datei), `file`, `mode`.
   - `mode: "card"` (Standard) = kleine Karte oben, Serband bleibt sichtbar, höchstens 3,5 s. `mode: "full"` = Zwischenschnitt über das ganze Bild, Ton läuft weiter, höchstens 2,5 s, sparsam.
   - Höchstens eine Einblendung alle 4 bis 5 Sekunden.
5. **Bilder besorgen** (siehe „Realistische Bilder“).
6. **Rendern:** `python3 scripts/video-overlay/render.py geschnitten.mp4 --words geschnitten.words_cut.json --broll plan.json --out fertig.mp4 --look cinematic --loudnorm`. Der Plan wird vorher geprüft.
7. **Prüfen (Pflicht):** `python3 scripts/video-overlay/check.py fertig.mp4 --vertical --max-sec 60 --caption-y 1380 --sheet bogen.png`. Den Vorschaubogen ansehen: Gesicht frei, Schrift lesbar, nichts abgeschnitten, Karte nur zur geplanten Zeit. Bei FEHLER nicht senden, sondern beheben.
8. **Senden** (`SendUserFile`) mit zwei Sätzen, was er prüfen soll. Änderungswünsche: `--caption-y`, `--card-y`, `--card-w`, `--card-h`, `--upper`, `--no-captions`.

## Untertitel für Kurs, Bunny und Akademie
- Deutsch: `python3 scripts/video-overlay/subtitles.py words.json untertitel/de` → `de.srt`, `de.vtt`, `cues.json`.
- Übersetzen: Texte aus `cues.json` übersetzen, als Liste (genau so viele wie Untertitel) in `uebersetzung_xx.json` speichern, dann `python3 scripts/video-overlay/subtitles.py --apply untertitel/cues.json uebersetzung_xx.json untertitel/xx`. Zeiten bleiben gleich. Zahl und Fachbegriffe stimmen nicht automatisch: Verkehrsrecht (StVO-Begriffe, Paragrafen) nur mit Serbans Freigabe oder Vermerk „nicht fachlich geprüft“ übernehmen.
- Bunny-Untertitel haben eine Kostengrenze (laut Vault 25 $ insgesamt). Vor dem Hochladen nachfragen.

## Realistische Bilder
- Quellen: eigene Fotos, Canva (`generate-image`), Higgsfield (`generate_image`, vorher `models_explore` für ein Foto-Modell). **Guthaben ist begrenzt:** erst planen, dann gebündelt erzeugen (Batch), nur was der Plan braucht, Preis vorher ansehen.
- Format: Karte quer (z. B. 1600×1000), `full` hochkant 1080×1920.
- Prompt: konkrete Szene, Perspektive, Licht, Alltagsmaterial („Fahrersicht durch die Windschutzscheibe, Landstraße, Abenddämmerung, leichter Regen, Fotostil“). Keine Schrift im Bild verlangen (die KI schreibt sie falsch), Beschriftung macht die Einblendung.
- **Jedes Bild vor dem Einbau selbst prüfen** (Serbans Regeln): Anatomie (Hände, Armlänge), Verkehrslogik (Fahrerseite links, Rechtsverkehr, Spurführung), deutsche Kennzeichen oder keine, keine Fantasie-Schrift, keine Markenlogos, keine erkennbaren echten Personen. Was nicht stimmt, wird nicht eingesetzt und nicht „schon irgendwie passt“.
- Für Verkehrssituationen die Lernszenen der App nehmen (siehe unten), nicht KI-Bilder.

## Lernszenen als Clips (animierte Verkehrssituationen aus dem Kompass)
- 22 Szenen (Autobahn, Einparken, Kreisverkehr, Zebrastreifen …). Liste: `NODE_PATH=$(npm root -g) node scripts/video-overlay/record_scene.mjs --list`.
- Aufnehmen: `NODE_PATH=$(npm root -g) node scripts/video-overlay/record_scene.mjs auffahren clip.mp4 --view 3d --seconds 8`. Ansichten: `oben`, `3d`, `fahrer`. Ergebnis: 1080×1920, ohne Ton, ohne Bedienknöpfe (mit `--keep-ui` mit Knöpfen). Der Kompass wird dazu lokal in einem unsichtbaren Browser gestartet, es geht nichts ins Netz.
- Den Clip als `file` in `plan.json` eintragen (`card` oder `full`). Die Szenen sind fachlich von Serban gebaut und deshalb sicherer als KI-Bilder.
- Vor dem Einsetzen den Ausschnitt ansehen: In der Karte wird die Mitte des Bildes gezeigt. Die Szene muss in dem Moment zeigen, was Serban gerade sagt (Zeit mit `--seconds` und Plan abstimmen, Szenen sind 11 bis 60 s lang).

## Regeln
- Keine Ausschnitte aus Filmen, Serien oder fremden Videos (Urheberrecht). Keine echten Gesichter von Dritten. Keine Fahrschüler im Bild. Echtes Logo im Schnitt statt von der KI gemalt.
- Aussagen bleiben Serbans Worte. Nichts hinzuerfinden. Stimmt ein Fachbegriff nicht, ihm sagen und nicht stillschweigend ändern.
- Sehr lange Aufnahmen (über etwa 30 Minuten) sind mit `cut_silence.py` langsam, weil das Bild neu berechnet wird. Vorher in Kapitel teilen.
- Der Kino-Look färbt nur das Sprecherbild. Licht, Hintergrund, Ton und Bildausschnitt entstehen beim Filmen.

## Stand
- 07.10.2026: Alle Werkzeuge mit künstlichem Testmaterial geprüft (Schnitt: 11,1 s → 4,9 s, neu berechnete Wortzeiten stimmen auf 0,05 s mit einer zweiten Erkennung überein; Prüfer schlägt bei falschem Format, fehlendem Ton, Schwarzbild an). **Noch nicht mit echtem Material von Serban.** Position von Karte und Schriftgröße nach dem ersten echten Clip nachstellen.
- Die Sicherheitsabstände für TikTok (unten ab etwa y=1540, rechts ab etwa x=940) sind aus Screenshots geschätzt, nicht offiziell.
