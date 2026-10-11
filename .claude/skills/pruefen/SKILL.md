---
name: pruefen
description: Prüf-Team für jede Änderung am Fahrlehrer-Kompass, bevor sie live geht - zwei Fehlersucher (Daten, Bedienung), ein Design-Kritiker, danach der Richter (Opus) für die Abnahme. Use before every merge/release of the Kompass, and whenever Serband says „prüfen“, „Prüf-Team“, „Richter“ or „abnehmen“.
---

# Prüf-Team (🗣 Serband, 11.10.2026)

„Drei Agenten: einer ist Design-Kritiker und sucht Design-Verbesserungen, die anderen suchen Fehler. Opus – das stärkste System – entscheidet am Ende als Richter, ob alles abgenommen wird.“

Die Agenten liegen in `.claude/agents/`: `fehlersucher-daten`, `fehlersucher-bedienung`, `design-kritiker` (Sonnet) und `richter` (Opus).

## Ablauf (verbindlich vor jedem Merge)

1. **Vorher selbst:** Änderung auf einem Branch fertig, alle Tests grün (`NODE_PATH=$(npm root -g) node scripts/<name>-test.mjs` für alle `scripts/*-test.mjs`, `node scripts/rechnen-test.mjs`, `bash scripts/release-check.sh`), Stand gepusht. Diff ablegen: `git diff origin/main > /tmp/claude-0/pruefen/aenderung.diff`.
2. **Die drei gleichzeitig starten** (ein Aufruf mit drei Agenten, im Hintergrund), mit Branch, Diff-Pfad, Ziel der Änderung in 2–3 Sätzen und dem, was schon bekannt/gewollt ist:
   - `fehlersucher-daten`
   - `fehlersucher-bedienung`
   - `design-kritiker` (nur wenn die Änderung etwas Sichtbares betrifft; sonst weglassen und das dem Richter sagen)
3. **Funde selbst prüfen und reparieren:** echte Fehler beheben, Design-**Muss**-Punkte umsetzen, **Kann**-Punkte sammeln. Tests erneut grün, pushen, Diff neu ablegen.
4. **Richter** (`richter`, Opus) mit: Diff-Pfad, Ziel, den drei Berichten (Kurzfassung) und was repariert wurde bzw. bewusst nicht (mit Grund).
5. Urteil:
   - „abgenommen“ → Pull Request, Merge (wenn Serband das Bauen freigegeben hat).
   - „abgenommen nach Reparatur von …“ → reparieren, Tests grün, dem Richter die Reparaturen zur **Nachprüfung** schicken (SendMessage an denselben Richter), erst nach „abgenommen“ mergen.
   - „nicht abgenommen“ → nicht mergen, Serband kurz sagen warum.
6. **Bericht an Serband** (kurz, ohne Fachwörter): was geprüft wurde, wie viele Funde, Urteil des Richters, offene Kann-Vorschläge des Design-Kritikers (höchstens 3).

Regeln: Die Agenten ändern nie selbst. Ihre Skripte/Bilder liegen nur unter `/tmp/claude-0/pruefen/`, nie im Repo. Keine Schülerdaten, keine Geheimnisse.
