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
- Never write to the Fahr-Akademie Supabase project (`fxgljvhpikjcejhghgbp`) from here.
