---
name: vault
description: Load Serban's Obsidian vault (long-term memory) for Fahrlehrer-Kompass (and the theory lessons / Lernzielkontrolle) - his profile, binding working rules and the project overview. Use at the start of every session, or when context about Serban, past decisions or project history is needed.
allowed-tools: Bash(cat *)
---
Below is the start context from Serban's vault (`/home/user/obsidian-vault`).
If it says VAULT NOT FOUND: call `add_repo` (owner `serband1995-hue`, repo `obsidian-vault`, access `push`), clone it to `/home/user/obsidian-vault`, then run /vault again.

After loading: confirm in one short German sentence that the vault is loaded, then wait for Serban's task. Read further notes only when the task needs them (use the index). Never read the whole vault.

## About Serban
!`cat "/home/user/obsidian-vault/00 Start/Über mich.md" 2>/dev/null || echo "VAULT NOT FOUND"`

## Binding working rules
!`cat "/home/user/obsidian-vault/00 Start/So arbeitet Serban.md" 2>/dev/null || echo "VAULT NOT FOUND"`

## Index
!`cat "/home/user/obsidian-vault/00 Start/Index.md" 2>/dev/null || echo "VAULT NOT FOUND"`

## Project hub
!`cat "/home/user/obsidian-vault/Projekte/Fahrlehrer-Kompass.md" 2>/dev/null || echo "VAULT NOT FOUND"`

## Project overview
!`cat "/home/user/obsidian-vault/Projekte/Fahrlehrer-Kompass/Fahrlehrer-Kompass – Übersicht.md" 2>/dev/null || echo "VAULT NOT FOUND"`
