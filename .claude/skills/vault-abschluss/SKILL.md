---
name: vault-abschluss
description: Close a session by updating Serban's Obsidian vault (session log, status notes, open points) and pushing it to the vault's main branch. Use when Serban says "Vault aktualisieren", "Sitzung abschließen" or ends a larger task.
allowed-tools: Bash(git *), Bash(ls *), Bash(cat *), Read, Edit, Write
---
Ziel: Die nächste Sitzung soll nach `/vault` wissen, was heute passiert ist, ohne diesen Chat zu lesen.

Vault liegt in `/home/user/obsidian-vault`. Fehlt er: `add_repo` (Owner `serband1995-hue`, Repo `obsidian-vault`, Zugriff `push`), klonen, dann weiter.
Regeln stehen in `CLAUDE.md` des Vaults und `Vorlagen/Notiz-Konventionen.md`. Beides kurz lesen, bevor du schreibst.

## Ablauf
1. **Vorher prüfen:** `git -C /home/user/obsidian-vault fetch origin main` und `git status`. Hat eine andere Sitzung gepusht, erst `git pull --rebase origin main`. Nie eine fremde Änderung überschreiben.
2. **Protokoll:** Neue Datei `Sitzungen/JJJJ-MM-TT Thema.md` nach `Vorlagen/Sitzungsprotokoll.md`. Ist heute schon eines zum selben Thema da, ergänzen statt neu anlegen.
3. **Projekt-Notizen anpassen**, nur was wirklich neu ist:
   - `… – Stand und Offenes` des betroffenen Projekts
   - `… – Entscheidungen` (Datum, Grund, verworfene Alternative)
   - `… – Fallstricke und Fehler`
   - `00 Start/So arbeitet Serban.md`, wenn Serban einen neuen Wunsch oder eine neue Regel gesagt hat
4. **`Wissen/Offene Punkte gesamt.md`:** Erledigtes streichen, Neues eintragen.
5. **`stand:`** im Kopf jeder geänderten Notiz auf das heutige Datum setzen.
6. **Herkunftszeichen** nutzen: ✅ belegt (Code, Datei), 🗣 laut Serban, ❓ unklar. Nichts erfinden.
7. **Vor dem Commit prüfen** (Pflicht):
   - Keine Geheimnisse (API-Keys, Tokens, Passwörter, PINs).
   - Keine Schülerdaten (viele sind minderjährig).
   - Nichts gelöscht, was Serban selbst geschrieben hat.
   - Neue Notizen im Hub und im `Index` verlinkt.
8. **Pushen:** Auf `main` des Vaults (das ist hier erlaubt): `git add -A && git commit && git push origin main`. Bei Netzwerkfehler bis zu 4 Mal mit 2, 4, 8, 16 Sekunden Wartezeit wiederholen.

## Bericht an Serban
Deutsch, einfach, höchstens 5 Sätze: welche Notizen geändert wurden und was als Nächstes offen ist. Kein Fachwort.
