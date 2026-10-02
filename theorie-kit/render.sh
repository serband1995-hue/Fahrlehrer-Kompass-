#!/bin/bash
cd "$(dirname "$0")"
mkdir -p r && find r -name '*.jpg' -delete; find r -name '*.pdf' -delete
timeout 400 soffice --headless --convert-to pdf --outdir r x910.pptx >/dev/null 2>&1
pdftoppm -r ${1:-60} -jpeg r/x910.pdf r/s
ls r/*.jpg | wc -l
