# Notes for Claude

**Always reply to Serban in German**: simple, short, no jargon. He works on his phone.

## Memory: Obsidian vault
Serban's long-term memory lives in the private repo `serband1995-hue/obsidian-vault`.
- **Run `/vault` at the start of every session.** It loads his profile, binding working rules and this project's overview (~6k tokens instead of re-reading code or old chats).
- If the vault is missing: `add_repo` (owner `serband1995-hue`, repo `obsidian-vault`, access `push`), clone to `/home/user/obsidian-vault`, then `/vault`.
- Read only the notes the task needs (start from the index). Never the whole vault.
- Code beats vault: verify the real code before changing it; fix the vault if it is outdated.
- End of a larger task, or when Serban says "Vault aktualisieren": follow `CLAUDE.md` in the vault (session log, update notes, push to vault `main`).
- New task = new session: suggest it when a session gets long and the next task is unrelated.

## Project
Fahrlehrer-Kompass: PWA for driving instructors, plain HTML/CSS/JS (no build, almost everything in `index.html`), Supabase project `oectrvkjunntzsggyhxv`, GitHub Pages. Also hosts the live quiz "Lernzielkontrolle" (`quiz*.html`, `quiz-fragen.js`). Details: vault `Projekte/Fahrlehrer-Kompass.md`.
- Work on a branch, ship via pull request.
- Bump `APP_VERSION` (`index.html`) and `CACHE_VERSION` (`sw.js`) with every release.
- Before every merge run the review team `/pruefen` (two bug hunters, one design critic, Opus judge in `.claude/agents/`); merge only after the judge says „abgenommen“.
- Before shipping run `bash scripts/release-check.sh` (versions bumped, no secrets) and `NODE_PATH=$(npm root -g) node scripts/handy-test.mjs` (pages at 360/412 px, portrait and landscape).
- End of a session or "Vault aktualisieren": run `/vault-abschluss`.
- Video with captions/pictures/cinematic look: run `/video-overlay` (tools in `scripts/video-overlay/`).
- Never write to the Fahr-Akademie Supabase project (`fxgljvhpikjcejhghgbp`) from here.

## Agent-Team (seit 04.11.2026, Wunsch von Serband)
- Agent-Teams sind in `.claude/settings.json` eingeschaltet (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), Hauptsitzung auf Opus als **Lead**.
- **Regel: Unabhängige Bau-Aufgaben an die Sonnet-Teammitglieder abgeben, damit der Kontext der Hauptsitzung klein bleibt.** Teammitglieder: `team-frontend` (Bildschirme), `team-backend` (Daten, Schnittstellen, Speicherung), `team-integration` (Testdaten, ganzer Ablauf). Dateibereiche stehen in `.claude/agents/team-*.md` und überschneiden sich nicht.
- Schema- und Konfig-Änderungen bleiben beim Lead.
- Besitz, Fortschritt und Abhängigkeiten laufen über die gemeinsame Aufgabenliste; Teammitglieder klären Schnittstellen und Blocker direkt untereinander per Nachricht.
- Opus übernimmt an drei Punkten: **bevor ein Plan feststeht**, **wenn ein Teammitglied blockiert ist**, **bevor etwas „fertig“ heißt** (gesamten Diff ansehen, Ablauf prüfen).
- Team nur bei Aufgaben mit mindestens zwei unabhängigen Teilen. Kleine Aufgaben macht der Lead allein (Teams kosten deutlich mehr Kontingent).
- Bestehende Regeln gelten weiter: Prüf-Team/Richter vor dem Merge, Tests grün, selbst mergen nach Serbands Merge-Regel.
