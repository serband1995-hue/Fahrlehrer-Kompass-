# Herkunft real-sound

- Quelle: https://github.com/Leonxlnx/earshot, Ordner `skills/real-sound`
- Fester Stand: Commit `7a7f7c5c70d4a763a1eca4b3666af7c77e313f97` (Release 1.0.0), übernommen am 26.11.2026, unverändert bis auf den Block „Kompass-Regel“ oben in `SKILL.md`.
- Lizenz: MIT (Leon Lin), `LICENSE` daneben.
- Werkzeug dazu: `pip install "earshot @ git+https://github.com/Leonxlnx/earshot@7a7f7c5c70d4a763a1eca4b3666af7c77e313f97"`
  (über `scripts/video-overlay/sfx_setup.sh`). **Nicht von PyPI**: der Name „earshot“ gehört dort einem anderen Projekt.
- Netz: `earshot llm` lädt Ton zu Google Gemini hoch (nur mit GEMINI_API_KEY **und** `--yes-upload` **und** Paket `requests`). Achtung: der Proxy dieser Umgebung macht einen Platzhalter-Schlüssel echt, deshalb löscht `sfx_setup.sh` die Schlüssel-Variablen und meldet `requests` im venv als Fehler.
  **Bei uns verboten** (siehe video-overlay, Schritt Soundeffekte). Die Hör-Modelle (Extra „listen“, mit PyTorch)
  kommen von huggingface.co und sind bei uns nicht installiert.
