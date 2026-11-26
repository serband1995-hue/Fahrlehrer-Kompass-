---
name: video-overlay
description: Video tools for Serban's projects, usable by any skill or session that needs to animate, caption or edit video: cut pauses and ähm, big word captions, pictures, animated Lernszenen clips (22 traffic scenes recorded as video), lower third, end card with logo, cinematic look, subtitles (SRT/VTT), chapters, text check against his rules, quality check. Use for Reel, Online-Kurs-Lektion, Akademie- or Webseiten-Video, and whenever Serban asks for Schnitt, Einblendungen, Animation, animieren, Untertitel, Kapitel, Bilder im Video, Kino-Look, Video-Prüfung, Soundeffekte, SFX, Geräusche or Vertonung.
allowed-tools: Read, Write, Bash(python3 *), Bash(ffmpeg *), Bash(ffprobe *), Bash(node *), Bash(ls *), mcp__Dropbox__download_link, mcp__Dropbox__list_folder
---
Werkzeuge in `scripts/video-overlay/` (Details, Formate, Veröffentlichen: `REFERENZ.md` neben dieser Datei lesen, wenn nötig). Einrichten in jeder frischen Sitzung (ca. 1 Min.): `source scripts/video-overlay/setup.sh` (setzt `$VO_PY`, Python mit allen Paketen; danach `$VO_PY scripts/video-overlay/…py` statt `python3`). Nötig: `ffmpeg` mit libass, für Lernszenen Playwright.

## Ablauf
1. **Video holen** (Chat-Anhang oder `mcp__Dropbox__download_link` + `curl`) in ein eigenes leeres Arbeitsverzeichnis. Original nie überschreiben.
2. **Text:** `transcribe.py video.mp4 words.json --model small`, dann **gegenlesen und von Hand korrigieren** (die Erkennung verhört sich, z. B. „Rand“ → „Hand“).
3. **Schneiden** (lange Aufnahmen): `cut_silence.py video.mp4 --words words.json --out geschnitten.mp4`, danach mit `geschnitten.words_cut.json` weiterarbeiten.
4. **Textprüfung:** `lint_text.py words.json plan.json`. FEHLER (z. B. nicht belegte Aussagen) beheben. Warnungen (Preise, Eigenlob, Kennzeichen, Telefonnummern) einzeln prüfen. `render.py` bricht bei FEHLER ab.
5. **Plan (`plan.json`):** `emphasis` (3–6 Gold-Wörter) und `items` mit `start`, `end`, `file`, `mode` (`card` Standard, `full` sparsam), **`quelle`** (eigen, canva, higgsfield, lernszene, verkehrszeichen …) und `ki: true` bei KI-Bildern. Höchstens eine Einblendung alle 4–5 s.
6. **Bilder/Clips:** Reihenfolge der Quellen: amtliche Verkehrszeichen als echte Bilder → Lernszenen (`record_scene.mjs`, siehe REFERENZ) → eigene Fotos → Canva → Higgsfield (Guthaben begrenzt, nur nach Plan, gebündelt). Jedes Bild vorher selbst prüfen.
7. **Rendern:**
   - Reel: `render.py geschnitten.mp4 --words … --broll plan.json --out fertig.mp4 --look cinematic --audio-clean --endcard`
   - Kurs-Lektion quer: `render.py … --preset kurs --lower-third "Lektion 1 · Persönliche Voraussetzungen" --endcard`
7b. **Soundeffekte (nur wenn sie dem Video helfen, sparsam):** einrichten mit `source scripts/video-overlay/sfx_setup.sh` (earshot ohne PyTorch, uisfx, setzt `$SFX_PY`, `$REAL_SFX`, `$SFX_BIB`).
   - **Echte Aufnahmen zuerst:** fehlende Geräusche mit `python3 -I scripts/video-overlay/sfx_openverse.py "car door" whoosh --anzahl 5 --max-sek 8 --index` holen (nur CC0, Herkunft in `$SFX_BIB/openverse/herkunft.csv`, Bibliothek bleibt auf dem Gerät, nie ins Repo). Treffer sind unscharf: jede Wahl im Cue-Bericht prüfen.
   - **Setzen mit real-sfx** (`cd $REAL_SFX`, Anleitung `.claude/skills/real-sfx/SKILL.md`): Ereignisliste aus den Bildern (`look.py`, `find_moments.py`), dann `from_cues.py … --ui library`, `mix.py cues.json --out ergebnis.mp4 --voice-safe`, danach `critique.py`. Ergebnis: neue MP4 + eigene WAV-Spur + Cue-Bericht.
   - **earshot nur, wenn keine echte Aufnahme passt** (`$SFX_PY -m earshot make "…" -o datei.wav` bzw. `earshot make`, dann Datei in die Bibliothek legen und Index neu bauen). real-sound (Skill) nur mit CC0-Quellen oder eigenen Aufnahmen, nie Mixkit/Pixabay/CC-BY.
   - Wann was: echte Geräusche im Bild (Tür, Blinker, Bremse, Hupe) → Openverse + real-sfx. Schnitt-Übergänge, Einblendungen → real-sfx (`whoosh`, `pop`, `click` aus der Bibliothek). Nichts Passendes → earshot. Klingt-es-gut-Fragen: Claude hört nicht, nur Zahlen (LUFS, Spitzen, Zeitpunkte); Serban hört am Handy gegen.
8. **Prüfen (Pflicht):** `check.py fertig.mp4 --vertical|--landscape --sheet bogen.png`, Vorschaubogen ansehen: Gesicht frei, Schrift lesbar, Karte nur zur geplanten Zeit, Endkarte sauber. Bei FEHLER nicht senden.
9. **Untertitel/Kapitel** bei Kursvideos: `subtitles.py`, `chapters.py` (siehe REFERENZ).
10. **Senden** (`SendUserFile`) mit zwei Sätzen, was er prüfen soll. **Nie selbst veröffentlichen.** Freigabe durch Serban am Handy, erst danach planen/posten (REFERENZ).

## Harte Regeln (aus Serbans Vault, nicht verhandelbar)
- Keine Fahrschul-Preise im Video (§ 19 FahrlG). Kein Eigenlob, keine Bestehensquote, kein Verkaufsdruck.
- **Soundeffekte:** nur eigene Aufnahmen oder CC0 (Herkunftsliste mitgeben). Serbans Stimme hat immer Vorrang (`mix.py --voice-safe`). **Originalprüfungen bekommen NIE Ton oder Effekte** (immer ohne Ton). `earshot llm` / `--yes-upload` nie benutzen (lädt Ton zu Google hoch), `listen_page.py --lan` nie. Kein PyTorch-Modell (`hear.py install`) ohne Serbans Ja.
- Keine fremde Musik, keine Trend-Sounds (GEMA). Keine KI-Stimme. Keine Ausschnitte aus Filmen, Serien, fremden Videos.
- Keine Fahrschüler im Bild ohne schriftliche Einwilligung (Eltern bei Minderjährigen), keine Schülerdaten, keine echten Kennzeichen.
- Verkehrszeichen nur als echte amtliche Bilder, nie von KI gezeichnet. Boost- oder eigenes Logo nie von KI gemalt.
- Fotorealistische KI-Bilder kennzeichnen (EU AI Act Art. 50, laut Vault ab 02.08.2026).
- Aussagen bleiben Serbans Worte; nicht belegte Aussagen (siehe `regeln.json`) nicht übernehmen. Fachbegriffe nicht stillschweigend ändern.
- Nie in die Fahr-Akademie-Datenbank schreiben und nichts zu Bunny hochladen (Kostengrenze 25 $ für Untertitel). Dafür gibt es die Akademie-Verwaltung.

## Für andere Skills und Sitzungen (Akademie, Webseite, Theorie, Reels)
- Wer ein Video **animieren** oder mit Einblendungen versehen will, nutzt diese Werkzeuge statt eigener Lösungen, damit Serbans Regeln (Preise, Musik, KI-Label, Quellenliste) überall gleich gelten.
- Aus einem anderen Repo: Kompass-Repo mit `add_repo` (`serband1995-hue/Fahrlehrer-Kompass-`) holen und klonen, dann `scripts/video-overlay/` benutzen (`source scripts/video-overlay/setup.sh`). Dateien nicht in das andere Repo kopieren, sonst laufen sie auseinander.
- **Animierte Szenen:** `record_scene.mjs` nimmt eine der 22 Lernszenen als Clip auf (Ansicht `oben`, `3d`, `fahrer`). Das ist der erste Weg für „zeig, was ich sage“, bevor KI-Bilder oder -Videos Guthaben kosten.
- Text im Bild ohne Gesicht (Reels-Plan): HyperFrames laut Vault `Plan Einnahmen mit Claude`. Danach trotzdem `lint_text.py` und `check.py` laufen lassen.
- Ergebnisse gehen nur an Serban zur Freigabe, nie direkt veröffentlichen, nichts zu Bunny oder in die Akademie-Datenbank schreiben.

## Stand
26.11.2026: Schritt Soundeffekte eingebaut (real-sfx, earshot, real-sound, Openverse-CC0), an der Lernszene „Gefahrbremsung“ getestet (`kontrolle-bilder/sfx/`), nur gemessen, nicht gehört.
07./08.10.2026: alle Werkzeuge mit künstlichem Testmaterial geprüft, mit Gegenproben. **Noch kein echter Clip von Serban.** Position der Karte und Schriftgröße nach dem ersten echten Clip nachstellen. TikTok-Sicherheitsränder aus Screenshots geschätzt.
