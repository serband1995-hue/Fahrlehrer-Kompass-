#!/usr/bin/env bash
# Büro-Handbuch neu erzeugen: erst alle Bilder (Vorführ-Modus, erfundene Daten), dann alle PDFs.
# Aufruf vom Repo-Ordner:  bash docs/buero-handbuch/erzeugen.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node docs/buero-handbuch/bilder.mjs "$@"
node docs/buero-handbuch/bauen.mjs
