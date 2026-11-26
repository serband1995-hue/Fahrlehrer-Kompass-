# Herkunft real-sfx

- Quelle: https://github.com/Clipwing/skills, Ordner `skills/real-sfx`
- Fester Stand: Commit `edbefcbc3474869e6cc1e8a7ca583b0efd0dab7e` (21.10.2026), unverändert übernommen am 26.11.2026.
- Lizenz Skripte: MIT, laut `README.md` dieses Ordners („Scripts: MIT“, Alexander Korbanov / Clipwing).
  Das Quell-Repo hat keine eigene LICENSE-Datei; der MIT-Text liegt deshalb als `LICENSE` daneben.
- uisfx-Klänge (78 UI-Geräusche): Paket `uisfx@0.4.0` von npm, Code MIT, Klänge CC0 1.0 (Yuki Capital).
  Nicht im Repo eingecheckt: `scripts/video-overlay/sfx_setup.sh` lädt es nach `vendor/` (steht in `.gitignore`).
- Einzige Änderungen gegenüber dem Original: `vendor/node_modules` entfernt, `config.json` zeigt auf die lokale
  CC0-Bibliothek aus `scripts/video-overlay/sfx_openverse.py`, `.gitignore` für lokale Dateien.
- Netz: lädt nur auf Befehl `listen.py install` (yamnet von huggingface.co, ~45 MB) und `hear.py install`
  (Modell + PyTorch CPU, ~3,1 GB, bei uns nicht installiert). `listen_page.py serve` öffnet nur eine lokale Seite
  (127.0.0.1; `--lan` bei uns nicht benutzen). Sonst sendet kein Skript Daten nach außen.
