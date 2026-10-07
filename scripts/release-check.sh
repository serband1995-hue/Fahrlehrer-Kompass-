#!/usr/bin/env bash
# Versions-Wächter: vor dem Ausliefern aufrufen.
# Prüft: 1) APP_VERSION und CACHE_VERSION wurden gegenüber origin/main erhöht,
#        2) keine geheimen Schlüssel im Code, 3) keine Schülerdaten-Muster.
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

# Nur prüfen, wenn sich ausgelieferte Dateien geändert haben (nicht bei reinen Skript- oder Doku-Änderungen).
geaendert=$(git diff --name-only "$BASIS"...HEAD -- . ':!scripts' ':!.claude' ':!CLAUDE.md' 2>/dev/null; git diff --name-only -- . ':!scripts' ':!.claude' ':!CLAUDE.md')
if [ -n "$geaendert" ]; then
  [ "$app_neu" != "$app_alt" ] || { echo "FEHLER: APP_VERSION nicht erhöht."; fehler=1; }
  [ "$cache_neu" != "$cache_alt" ] || { echo "FEHLER: CACHE_VERSION nicht erhöht."; fehler=1; }
else
  echo "Keine ausgelieferten Dateien geändert: Versionsprüfung übersprungen."
fi

# Geheimnisse: Der öffentliche Supabase-anon-Schlüssel (SUPA_KEY) ist erlaubt, alles andere nicht.
treffer=$(grep -rnIE 'sk_live_|sk-ant-|service_role|BEGIN (RSA |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|ELEVENLABS_API_KEY\s*=\s*["'\'']' \
  --include='*.html' --include='*.js' --include='*.json' --include='*.md' --include='*.sql' . 2>/dev/null | grep -v '^./scripts/release-check.sh' || true)
if [ -n "$treffer" ]; then echo "FEHLER: möglicher Geheimschlüssel:"; echo "$treffer" | head -5; fehler=1; fi

# Schülerdaten: grobe Muster (E-Mail-Adressen außer eigener, Telefonnummern).
mails=$(grep -rnIoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' --include='*.html' --include='*.js' --include='*.sql' . 2>/dev/null \
  | grep -viE 'example\.|noreply@|@anthropic\.com|serband' | head -5 || true)
if [ -n "$mails" ]; then echo "HINWEIS: fremde E-Mail-Adressen im Code, bitte prüfen:"; echo "$mails"; fi

[ "$fehler" -eq 0 ] && echo "Release-Check: in Ordnung." || echo "Release-Check: FEHLER, nicht ausliefern."
exit "$fehler"
