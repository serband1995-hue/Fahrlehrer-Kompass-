---
name: pruefen
description: Prüf-Team für jede Änderung am Fahrlehrer-Kompass, bevor sie live geht - zwei Fehlersucher (Daten, Bedienung), ein Design-Kritiker, danach der Richter (Fable, R558) für die Abnahme. Use before every merge/release of the Kompass, and whenever Serband says „prüfen“, „Prüf-Team“, „Richter“ or „abnehmen“.
---

# Prüf-Team (🗣 Serband, 11.10.2026)

„Drei Agenten: einer ist Design-Kritiker und sucht Design-Verbesserungen, die anderen suchen Fehler. Opus – das stärkste System – entscheidet am Ende als Richter, ob alles abgenommen wird.“ Seit 21.11.2026 ist der Richter Fable (R558: „Fable soll alles kontrollieren.“).

Die Agenten liegen in `.claude/agents/`: `fehlersucher-daten`, `fehlersucher-bedienung`, `pruefer-buero`, `design-kritiker` (Sonnet) und `richter` (Fable, Regel R558).

🗣 Zusatz 11.10.2026: App und Büro-Seite (PC) müssen immer zusammenpassen – deshalb prüft `pruefer-buero` jede Änderung an der Fahrlehrer-App mit.

🗣 Zusatz 21.11.2026 („sorge dafür, dass solche Fehler nicht nochmal vorkommen“): Jelena (Leitung und Fahrlehrerin) bekam die falsche Ansicht und fand keinen Weg, Schüler anzulegen – kein Test hatte die Rolle Leitung durchgespielt. Deshalb gilt die **Rollen-Matrix**:
- Rollen: Fahrlehrer · Fahrlehrer ohne App · Leitung · Leitung, die selbst fährt (`faehrt_selbst`) · Büro ohne PIN-Recht · Büro mit PIN-Recht · Super-Admin.
- Im Auftrag an jeden Prüfer steht, welche Rollen die Änderung berührt. `fehlersucher-bedienung` spielt die Änderung **in jeder berührten Rolle** durch (Startansicht, Schüler anlegen, Termin anlegen, Knöpfe sichtbar oder bewusst nicht).
- `scripts/rollen-test.mjs` muss grün sein (läuft auch in der GitHub-Prüfung). Neue rollenabhängige Funktion → den Rollen-Test um sie erweitern, bevor sie „fertig“ heißt.
- Pflichtfrage im Auftrag an Prüfer und Richter: **„Welche neuen Zustände kann eine Person nach dieser Änderung haben (neue Rolle, neues Kennzeichen, gelöscht, umgestuft), und was sieht sie dann beim Start?“**
- Rechte-Änderungen: `supabase/schema/rechte-abzug.sql` (Abzug der Zugriffsregeln und Trigger) mit der Migration neu ziehen, damit Prüfer ohne Datenbank-Zugang sie lesen können.
- Gemergt wird erst, wenn auch die GitHub-Prüfung (beide Jobs, auch „Rollen und Zugänge (Browser)“) grün ist.

## Ablauf (verbindlich vor jedem Merge)

1. **Vorher selbst:** Änderung auf einem Branch fertig, alle Tests grün (`NODE_PATH=$(npm root -g) node scripts/<name>-test.mjs` für alle `scripts/*-test.mjs`, `node scripts/rechnen-test.mjs`, `bash scripts/release-check.sh`), Stand gepusht. Diff ablegen: `git diff origin/main > /tmp/claude-0/pruefen/aenderung.diff`.
2. **Die vier gleichzeitig starten** (ein Aufruf mit vier Agenten, im Hintergrund), mit Branch, Diff-Pfad, Ziel der Änderung in 2–3 Sätzen und dem, was schon bekannt/gewollt ist:
   - `fehlersucher-daten`
   - `fehlersucher-bedienung`
   - `pruefer-buero` (App ↔ Büro-Seite: gleiche Daten, Büro-Knöpfe kommen an, nichts Benötigtes entfernt)
   - `design-kritiker` (nur wenn die Änderung etwas Sichtbares betrifft; sonst weglassen und das dem Richter sagen)
3. **Funde selbst prüfen und reparieren:** echte Fehler beheben, Design-**Muss**-Punkte umsetzen, **Kann**-Punkte sammeln. Tests erneut grün, pushen, Diff neu ablegen.
4. **Richter** (`richter`, Fable – R558: ohne Fable „abgenommen“ kein Merge) mit: Diff-Pfad, Ziel, den vier Berichten (Kurzfassung) und was repariert wurde bzw. bewusst nicht (mit Grund).
5. Urteil:
   - „abgenommen“ → Pull Request, Merge (wenn Serband das Bauen freigegeben hat).
   - „abgenommen nach Reparatur von …“ → reparieren, Tests grün, dem Richter die Reparaturen zur **Nachprüfung** schicken (SendMessage an denselben Richter), erst nach „abgenommen“ mergen.
   - „nicht abgenommen“ → nicht mergen, Serband kurz sagen warum.
6. **Bericht an Serband** (kurz, ohne Fachwörter): was geprüft wurde, wie viele Funde, Urteil des Richters, offene Kann-Vorschläge des Design-Kritikers (höchstens 3).

Regeln: Die Agenten ändern nie selbst. Ihre Skripte/Bilder liegen nur unter `/tmp/claude-0/pruefen/`, nie im Repo. Keine Schülerdaten, keine Geheimnisse.
