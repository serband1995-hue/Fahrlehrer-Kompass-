#!/usr/bin/env bash
# Versions-Wächter: vor dem Ausliefern aufrufen.
# Prüft: 1) APP_VERSION und CACHE_VERSION wurden gegenüber origin/main erhöht,
#        2) keine geheimen Schlüssel im Code (auch in supabase/**/*.ts und *.sql), 3) keine Schülerdaten-Muster.
# Aufruf:  bash scripts/release-check.sh
set -u
cd "$(dirname "$0")/.."
fehler=0
BASIS="${BASIS:-origin/main}"

git rev-parse --verify -q "$BASIS" >/dev/null || git fetch -q origin main 2>/dev/null

app_neu=$(grep -oP 'const APP_VERSION\s*=\s*"\K[^"]+' index.html | head -1)
cache_neu=$(grep -oP 'const CACHE_VERSION\s*=\s*"\K[^"]+' sw.js | head -1)
app_alt=$(git show "$BASIS:index.html" 2>/dev/null | grep -oP 'const APP_VERSION\s*=\s*"\K[^"]+' | head -1)
cache_alt=$(git show "$BASIS:sw.js" 2>/dev/null | grep -oP 'const CACHE_VERSION\s*=\s*"\K[^"]+' | head -1)

echo "APP_VERSION    : ${app_alt:-?} -> ${app_neu:-?}"
echo "CACHE_VERSION  : ${cache_alt:-?} -> ${cache_neu:-?}"

# Nur prüfen, wenn sich ausgelieferte Dateien geändert haben (nicht bei reinen Skript-, Workflow- oder Doku-Änderungen).
geaendert=$(git diff --name-only "$BASIS"...HEAD -- . ':!scripts' ':!.claude' ':!.github' ':!CLAUDE.md' 2>/dev/null; git diff --name-only -- . ':!scripts' ':!.claude' ':!.github' ':!CLAUDE.md')
if [ -n "$geaendert" ]; then
  # Höher, nicht nur anders (W13, 24.11.2026): eine zurückgehende Nummer (z. B. nach dem Einmischen von main) ist ein Fehler.
  # sort -V vergleicht 2026.11.24.10 > 2026.11.24.9 und kompass-v110 > kompass-v109 richtig.
  hoeher() { [ -z "$1" ] || { [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" = "$2" ]; }; }
  hoeher "$app_alt" "$app_neu" || { echo "FEHLER: APP_VERSION nicht erhöht ($app_neu ist nicht höher als $app_alt auf main)."; fehler=1; }
  hoeher "$cache_alt" "$cache_neu" || { echo "FEHLER: CACHE_VERSION nicht erhöht ($cache_neu ist nicht höher als $cache_alt auf main)."; fehler=1; }
  # K11 (22.11.2026): Jedes Update steht im Zeitstrahl „Neuigkeiten“ – oberster Eintrag in neuigkeiten.js = APP_VERSION.
  neu_oben=$(grep -oP '^\s*\{ *version:\s*"\K[^"]+' neuigkeiten.js 2>/dev/null | head -1)
  [ "$neu_oben" = "$app_neu" ] || { echo "FEHLER: neuigkeiten.js – oberster Eintrag (${neu_oben:-keiner}) ist nicht APP_VERSION ($app_neu). Eintrag in einfachen Worten oben ergänzen."; fehler=1; }
else
  echo "Keine ausgelieferten Dateien geändert: Versionsprüfung übersprungen."
fi

# Geheimnisse: Der öffentliche Supabase-anon-Schlüssel (SUPA_KEY) ist erlaubt, alles andere nicht.
# Das Wort service_role allein ist in SQL (Rechtevergabe) und in Server-Funktionen (*.ts) kein Geheimnis; dort zählen
# nur echte Schlüssel-Muster (Dienst-Schlüssel als JWT, sb_secret_, fest eingetragene Schlüssel).
ECHT='sk_live_|sk-ant-|sb_secret_[A-Za-z0-9_]{8,}|c2VydmljZV9yb2xl|NlcnZpY2Vfcm9sZ|zZXJ2aWNlX3JvbG|BEGIN (RSA |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(ELEVENLABS_API_KEY|SERVICE_ROLE_KEY|SERVICE_KEY|BRIDGE_SECRET|bridge_secret|RESEND_API_KEY)\s*[:=]\s*["'\''][A-Za-z0-9_.\-]{16,}'
treffer=$( { grep -rnIE "service_role|$ECHT" --include='*.html' --include='*.js' --include='*.mjs' --include='*.json' --include='*.md' . 2>/dev/null;
             grep -rnIE "$ECHT" --include='*.sql' --include='*.ts' . 2>/dev/null; } | grep -v '^./scripts/release-check.sh' || true)
if [ -n "$treffer" ]; then echo "FEHLER: möglicher Geheimschlüssel:"; echo "$treffer" | head -5; fehler=1; fi

# Schülerdaten: grobe Muster (E-Mail-Adressen außer eigener, Telefonnummern).
mails=$(grep -rnIoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' --include='*.html' --include='*.js' --include='*.sql' --include='*.ts' . 2>/dev/null \
  | grep -viE 'example\.|noreply@|@anthropic\.com|serband' | head -5 || true)
if [ -n "$mails" ]; then echo "HINWEIS: fremde E-Mail-Adressen im Code, bitte prüfen:"; echo "$mails"; fi

# GitHub-Prüfung: Ist eine Workflow-Datei kein gültiges YAML, läuft die Prüfung GAR NICHT – und niemand merkt es
# (21.11.2026: Doppelpunkt in einem Schritt-Namen). Deshalb hier jede Datei lesen.
if command -v python3 >/dev/null 2>&1 && python3 -c "import yaml" 2>/dev/null; then
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    if ! python3 -c "import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); assert isinstance(d,dict) and d.get('jobs'), 'keine jobs'" "$wf" 2>/tmp/yaml-fehler.txt; then
      echo "FEHLER: $wf ist ungültig, die GitHub-Prüfung würde nicht laufen:"; tail -2 /tmp/yaml-fehler.txt; fehler=1
    fi
  done
else
  echo "HINWEIS: python3/yaml fehlt, Workflow-Dateien nicht geprüft."
fi

[ "$fehler" -eq 0 ] && echo "Release-Check: in Ordnung." || echo "Release-Check: FEHLER, nicht ausliefern."
exit "$fehler"
