#!/usr/bin/env bash
# Richtet die Video-Werkzeuge in einer frischen Sitzung ein (einmal pro Sitzung, etwa 1 Minute).
# Aufruf:  source scripts/video-overlay/setup.sh      -> setzt $VO_PY (Python mit allen Paketen)
VENV="${VO_VENV:-$HOME/.venvs/video-overlay}"
ok=1
command -v ffmpeg >/dev/null || { echo "FEHLT: ffmpeg"; ok=0; }
ffmpeg -hide_banner -filters 2>/dev/null | grep -q " ass " || { echo "FEHLT: ffmpeg mit libass (Untertitel-Filter)"; ok=0; }
if [ ! -x "$VENV/bin/python" ]; then python3 -m venv "$VENV" || ok=0; fi
if ! "$VENV/bin/python" -c "import faster_whisper, PIL" 2>/dev/null; then
  "$VENV/bin/pip" install -q faster-whisper pillow 2>&1 | tail -1 || ok=0
fi
export VO_PY="$VENV/bin/python"
"$VO_PY" -c "import faster_whisper, PIL; print('Pakete ok')" || ok=0
command -v node >/dev/null && NODE_PATH="$(npm root -g)" node -e "require('playwright')" 2>/dev/null && echo "Playwright ok (Lernszenen)" || echo "Hinweis: Playwright fehlt, nur nötig für record_scene.mjs"
[ "$ok" = 1 ] && echo "Bereit. Python: \$VO_PY=$VO_PY" || echo "Nicht alles bereit, siehe Meldungen oben."
