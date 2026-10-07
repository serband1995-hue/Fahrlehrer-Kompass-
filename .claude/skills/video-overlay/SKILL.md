---
name: video-overlay
description: Add big word captions, matching pictures or short clips, and an optional cinematic color look to a vertical talking-head video of Serban, keeping him in the foreground. Use when Serban sends a recorded video and wants Einblendungen, Untertitel, B-Roll, Bilder im Video or "cinematischen Look".
allowed-tools: Read, Write, Bash(python3 *), Bash(ffmpeg *), Bash(ffprobe *), Bash(ls *), mcp__Dropbox__download_link, mcp__Dropbox__list_folder
---
Werkzeuge liegen in `scripts/video-overlay/`: `transcribe.py`, `captions.py`, `render.py`. Nötig: `ffmpeg` (mit libass), `pip install faster-whisper pillow` (am besten in einem venv außerhalb des Repos).

## Ablauf
1. **Video holen.** Anhang aus dem Chat oder per `mcp__Dropbox__download_link` (einmaliger Link, mit `curl` laden). Datei in ein eigenes leeres Arbeitsverzeichnis legen, nicht im Repo.
2. **Text mit Zeiten:** `python3 scripts/video-overlay/transcribe.py video.mp4 words.json --model small`. Läuft lokal, nichts geht an Dritte. Den Text kurz gegenlesen: Eigennamen und Fachwörter prüfen, Fehler in `words.json` von Hand korrigieren.
3. **Plan schreiben (`plan.json`):**
   - `emphasis`: 3 bis 6 Schlüsselwörter, die in Gold erscheinen.
   - `items`: pro wichtiger Aussage ein Bild oder Clip mit `start`, `end` (Sekunden aus `words.json`), `file`, `mode`.
   - `mode: "card"` (Standard) = kleine Karte oben, Serband bleibt sichtbar, höchstens 3,5 s. `mode: "full"` = Zwischenschnitt über das ganze Bild, Ton läuft weiter, höchstens 2,5 s, nur sparsam.
   - Nicht mehr als eine Einblendung alle 4 bis 5 Sekunden, sonst steht Serband nicht mehr im Vordergrund.
4. **Bilder besorgen:** eigene Bilder, Canva (`generate-image`) oder Higgsfield. Das Higgsfield-Guthaben ist begrenzt: Bilder erst erzeugen, wenn der Plan steht, gebündelt, nur was wirklich gebraucht wird. Bei `full` Hochformat-Bilder oder -Clips nehmen, sonst wird beschnitten.
5. **Rendern:** `python3 scripts/video-overlay/render.py video.mp4 --words words.json --broll plan.json --out fertig.mp4 --look cinematic`. Der Plan wird vorher geprüft (Datei fehlt, Überlappung, zu lang, nach Videoende).
6. **Selbst prüfen** (Pflicht): 4 bis 6 Einzelbilder aus `fertig.mp4` ziehen (`ffmpeg -ss T -i fertig.mp4 -frames:v 1 f.png`) und ansehen: Gesicht frei? Schrift lesbar und nicht abgeschnitten? Karte nur zur geplanten Zeit? Ton vorhanden?
7. **Serband senden** (`SendUserFile`), kurz sagen, was er prüfen soll. Änderungswünsche über Optionen: `--caption-y` (Höhe der Schrift), `--card-y`, `--card-w`, `--card-h`, `--upper`, `--no-captions`, `--loudnorm`.

## Regeln
- Keine Ausschnitte aus Filmen, Serien oder fremden Videos (Urheberrecht). Keine echten Gesichter von Dritten. Keine Fahrschüler im Bild, keine echten Kennzeichen, keine Firmenlogos von der KI malen lassen (echtes Logo im Schnitt).
- Texte und Aussagen bleiben Serbands Worte. Nichts hinzuerfinden. Stimmt ein Fachbegriff nicht, ihm sagen und nicht stillschweigend ändern.
- Das Original nie überschreiben.
- Lange Aufnahmen (ganze Lektion) sind zu schwer für dieses Werkzeug. Zuerst in Kurzclips schneiden.
- Der Kino-Look färbt nur das Sprecherbild (dunkelgrüne Schatten, goldene Lichter, Vignette, Korn). Gutes Licht, Hintergrund und Ton entstehen beim Filmen. Das kann der Look nicht ersetzen.

## Bekannte Grenzen
- Stand 07.10.2026 nur mit einem künstlichen Testvideo geprüft, noch nicht mit echtem Material von Serband. Position der Karte und Größe der Schrift nach dem ersten echten Clip nachstellen.
- Ein vollständig animiertes 3D-Video (wie bei manchen TikTokern) ist ein eigenes Projekt: mehrere Higgsfield-Szenen mit gleichbleibenden Figuren, kostet Guthaben. Günstiger sind die vorhandenen Lernszenen der App (`lernszenen.js`), die sich als Clips aufnehmen lassen.
