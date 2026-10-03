#!/bin/bash
# render.sh NAME [dpi]  → r/NAME/s-NNN.jpg
cd "$(dirname "$0")"
N=${1:-abend}; mkdir -p r/$N && rm -f r/$N/*
# eigenes LibreOffice-Profil je Deck: mehrere Renders können gleichzeitig laufen
timeout 900 soffice -env:UserInstallation=file:///tmp/lo_prof_$N --headless --convert-to pdf --outdir r/$N $N.pptx >/dev/null 2>&1
pdftoppm -r ${2:-60} -jpeg r/$N/$N.pdf r/$N/s
ls r/$N/*.jpg | wc -l
