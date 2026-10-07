---
name: video-overlay
description: Edit a recorded video of Serban (Reel, Online-Kurs-Lektion, Akademie- oder Webseiten-Video): cut pauses and ähm, big word captions, pictures and Lernszenen clips, lower third, end card with logo, cinematic look, subtitles (SRT/VTT), chapters, text check against his rules and a final quality check. Use when Serban sends a video or asks for Schnitt, Einblendungen, Untertitel, Kapitel, Bilder im Video, Kino-Look or a Video-Prüfung.
allowed-tools: Read, Write, Bash(python3 *), Bash(ffmpeg *), Bash(ffprobe *), Bash(node *), Bash(ls *), mcp__Dropbox__download_link, mcp__Dropbox__list_folder
---
Werkzeuge in `scripts/video-overlay/` (Details, Formate, Veröffentlichen: `REFERENZ.md` neben dieser Datei lesen, wenn nötig). Nötig: `ffmpeg` mit libass, `pip install faster-whisper pillow` (venv außerhalb des Repos), für Lernszenen Playwright.

## Ablauf
1. **Video holen** (Chat-Anhang oder `mcp__Dropbox__download_link` + `curl`) in ein eigenes leeres Arbeitsverzeichnis. Original nie überschreiben.
2. **Text:** `transcribe.py video.mp4 words.json --model small`, dann **gegenlesen und von Hand korrigieren** (die Erkennung verhört sich, z. B. „Rand“ → „Hand“).
3. **Schneiden** (lange Aufnahmen): `cut_silence.py video.mp4 --words words.json --out geschnitten.mp4`, danach mit `geschnitten.words_cut.json` weiterarbeiten.
4. **Textprüfung:** `lint_text.py words.json plan.json`. FEHLER (z. B. nicht belegte Aussagen) beheben. Warnungen (Preise, Eigenlob, Kennzeichen, Telefonnummern) einzeln prüfen. `render.py` bricht bei FEHLER ab.
5. **Plan (`plan.json`):** `emphasis` (3–6 Gold-Wörter) und `items` mit `start`, `end`, `file`, `mode` (`card` Standard, `full` sparsam), **`quelle`** (eigen, canva, higgsfield, lernszene, verkehrszeichen …) und `ki: true` bei KI-Bildern. Höchstens eine Einblendung alle 4–5 s.
6. **Bilder/Clips:** Reihenfolge der Quellen: amtliche Verkehrszeichen als echte Bilder → Lernszenen (`record_scene.mjs`, siehe REFERENZ) → eigene Fotos → Canva → Higgsfield (Guthaben begrenzt, nur nach Plan, gebündelt). Jedes Bild vorher selbst prüfen.
7. **Rendern:**
   - Reel: `render.py geschnitten.mp4 --words … --broll plan.json --out fertig.mp4 --look cinematic --loudnorm --endcard`
   - Kurs-Lektion quer: `render.py … --preset kurs --lower-third "Lektion 1 · Persönliche Voraussetzungen" --endcard`
8. **Prüfen (Pflicht):** `check.py fertig.mp4 --vertical|--landscape --sheet bogen.png`, Vorschaubogen ansehen: Gesicht frei, Schrift lesbar, Karte nur zur geplanten Zeit, Endkarte sauber. Bei FEHLER nicht senden.
9. **Untertitel/Kapitel** bei Kursvideos: `subtitles.py`, `chapters.py` (siehe REFERENZ).
10. **Senden** (`SendUserFile`) mit zwei Sätzen, was er prüfen soll. **Nie selbst veröffentlichen.** Freigabe durch Serban am Handy, erst danach planen/posten (REFERENZ).

## Harte Regeln (aus Serbans Vault, nicht verhandelbar)
- Keine Fahrschul-Preise im Video (§ 19 FahrlG). Kein Eigenlob, keine Bestehensquote, kein Verkaufsdruck.
- Keine fremde Musik, keine Trend-Sounds (GEMA). Keine KI-Stimme. Keine Ausschnitte aus Filmen, Serien, fremden Videos.
- Keine Fahrschüler im Bild ohne schriftliche Einwilligung (Eltern bei Minderjährigen), keine Schülerdaten, keine echten Kennzeichen.
- Verkehrszeichen nur als echte amtliche Bilder, nie von KI gezeichnet. Boost- oder eigenes Logo nie von KI gemalt.
- Fotorealistische KI-Bilder kennzeichnen (EU AI Act Art. 50, laut Vault ab 02.08.2026).
- Aussagen bleiben Serbans Worte; nicht belegte Aussagen (siehe `regeln.json`) nicht übernehmen. Fachbegriffe nicht stillschweigend ändern.
- Nie in die Fahr-Akademie-Datenbank schreiben und nichts zu Bunny hochladen (Kostengrenze 25 $ für Untertitel). Dafür gibt es die Akademie-Verwaltung.

## Stand
07./08.10.2026: alle Werkzeuge mit künstlichem Testmaterial geprüft, mit Gegenproben. **Noch kein echter Clip von Serban.** Position der Karte und Schriftgröße nach dem ersten echten Clip nachstellen. TikTok-Sicherheitsränder aus Screenshots geschätzt.
