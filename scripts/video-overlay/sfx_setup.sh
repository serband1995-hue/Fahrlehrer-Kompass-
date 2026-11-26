#!/usr/bin/env bash
# Richtet die Soundeffekt-Werkzeuge ein (einmal pro Sitzung, Grundinstallation ohne PyTorch, ca. 1-2 Min.).
# Aufruf (aus dem Repo-Ordner):  source scripts/video-overlay/sfx_setup.sh
#   setzt $SFX_PY (Python mit earshot), $REAL_SFX (Skill-Ordner real-sfx), $SFX_BIB (lokale CC0-Bibliothek)
EARSHOT_COMMIT=7a7f7c5c70d4a763a1eca4b3666af7c77e313f97
UISFX_VERSION=0.4.0
SFX_VENV="${SFX_VENV:-$HOME/.venvs/sfx}"
export REAL_SFX="$(pwd)/.claude/skills/real-sfx"
export SFX_BIB="${SFX_BIB:-$HOME/sfx-bibliothek}"
ok=1
command -v ffmpeg >/dev/null || { echo "FEHLT: ffmpeg"; ok=0; }
[ -d "$REAL_SFX" ] || { echo "FEHLT: $REAL_SFX (aus dem Kompass-Repo-Ordner aufrufen)"; ok=0; }
if [ ! -x "$SFX_VENV/bin/python" ]; then python3 -m venv "$SFX_VENV" || ok=0; fi
if ! "$SFX_VENV/bin/python" -c "import earshot" 2>/dev/null; then
  # nur von GitHub mit festem Commit, NIE von PyPI (dort ist "earshot" ein anderes Projekt)
  "$SFX_VENV/bin/pip" install -q "earshot @ git+https://github.com/Leonxlnx/earshot@$EARSHOT_COMMIT" 2>&1 | tail -1 || ok=0
fi
export SFX_PY="$SFX_VENV/bin/python"
# den Befehl `earshot` dauerhaft auffindbar machen (gilt auch in späteren Shell-Aufrufen dieser Sitzung)
for d in /usr/local/bin "$HOME/.local/bin"; do
  if [ -w "$d" ] || mkdir -p "$d" 2>/dev/null && [ -w "$d" ]; then ln -sf "$SFX_VENV/bin/earshot" "$d/earshot"; break; fi
done
mkdir -p "$SFX_BIB/openverse/earshot"
"$SFX_PY" -c "import earshot; print('earshot ok', earshot.__version__ if hasattr(earshot,'__version__') else '')" || ok=0
if [ ! -f "$REAL_SFX/vendor/node_modules/uisfx/manifest.json" ]; then
  if command -v npm >/dev/null; then
    npm install "uisfx@$UISFX_VERSION" --prefix "$REAL_SFX/vendor" --no-save --no-audit --no-fund --silent >/dev/null 2>&1 \
      && echo "uisfx $UISFX_VERSION ok (CC0)" || { echo "FEHLT: uisfx (npm)"; ok=0; }
  else echo "FEHLT: npm (für uisfx-UI-Klänge)"; ok=0; fi
fi
mkdir -p "$SFX_BIB/openverse"
# config.json im Repo zeigt auf /root/sfx-bibliothek/openverse (Cloud-Sitzung). Anderer Ort: lokale Kopie der Config.
if [ "$SFX_BIB/openverse" != "/root/sfx-bibliothek/openverse" ]; then
  sed "s#/root/sfx-bibliothek/openverse#$SFX_BIB/openverse#" "$REAL_SFX/config.json" > "$SFX_BIB/real-sfx-config.json"
  export REAL_SFX_CONFIG="$SFX_BIB/real-sfx-config.json"
fi
[ "$ok" = 1 ] && echo "Bereit. \$SFX_PY=$SFX_PY  \$REAL_SFX=$REAL_SFX  \$SFX_BIB=$SFX_BIB" || echo "Nicht alles bereit, siehe oben."
