---
description: Make one sound with earshot from the words given and write it into the project
argument-hint: "[the sound in words, e.g. a soft success chime for a finance app, a wooden drawer closing]"
---

> **Bei Serband (Kompass-Repo), gilt vor allem unten:** zuerst `source scripts/video-overlay/sfx_setup.sh` (installiert
> earshot fest auf Commit 7a7f7c5 und legt `earshot` in den PATH). Den `uv tool install`-Befehl unten NICHT benutzen
> (ohne feste Version). Kein earshot-MCP-Server: immer den `earshot`-Befehl. Dateien **nie ins Repo** schreiben
> (kein `sounds/`, kein App-Ordner), sondern nach `~/sfx-bibliothek/openverse/earshot/` (dann findet real-sfx sie nach `build_index.py`) oder in den Arbeitsordner des Videos.
> earshot nur, wenn keine echte CC0-Aufnahme passt (video-overlay, Schritt 7b). Nie `earshot llm` / `--yes-upload`.
> Herkunft: github.com/Leonxlnx/earshot `commands/`, Commit 7a7f7c5c, MIT (`.claude/skills/earshot/LICENSE`).


Make this sound with earshot: $ARGUMENTS

1. Pick the file: the folder this project keeps sounds in (for example `public/sounds/` or `assets/audio/`), else
   `sounds/`; a short name from the job (`success.mp3`); `.mp3` for a web project (`.webm` for a loop: an mp3 loop
   has a gap at its seam), `.wav` otherwise, unless the request names a format. If the request asks for variations
   ("three variations of a footstep"), keep the words: one call writes `name_1 .. name_N`. Keep the number of a
   thing a person does in a row as written too: "footsteps on gravel" or "knocking" is played as the action, "a
   footstep" or "a single knock" as one event, "three claps" is one file of three claps, and a length asked with
   an action ("clapping, 4 seconds") is the file's length. For a motion video or an interface do not add words of
   music: without them earshot gives normal sounds, no instrument notes.
2. Call the `make` tool of the earshot MCP server once, with `want` = the request as written and `out` = the absolute
   path. If no earshot MCP server is connected, run `earshot make "REQUEST" -o PATH` instead. No `full=true`,
   `--json` or `--listen`. If `earshot` is not found, say it must be installed first:
   `uv tool install "earshot[mcp] @ git+https://github.com/Leonxlnx/earshot"`.
3. Report the answer as given: the file line (design, length, where its loudest moment is, pitch and voice for a
   tonal sound, loudness, `clean` or what the check found), `also: ...`, a `played: ...` line (one event or the
   action), any `not understood` / `not followed` line, and a line about the length (a cut, the shortest loop, whole
   bars, a counted action that could not fill it). A take that is not `clean` is not usable: make it again with
   another `seed`. If the answer says "earshot makes no ...", the file is only the nearest sound: say so plainly,
   name the starting points it offers, and do not present it as the thing; it can be built from recorded parts with
   `earshot build "REQUEST" -o PATH` (the earshot skill has the loop). Do not say how it sounds beyond what the
   answer says. If the design is a learned one (a real thing such as a footstep, a switch, a door or a drum), say it
   is a new take of a public-domain recording, computed from a model of it (no audio file is shipped or played back).
