---
date: 2026-05-12
operation: graphify-install + obsidian-network-seed
git_head_before: c1255735
snapshot: Deploy/snapshot-20260512-222943/
---

# Graphify install + Obsidian network seed

## What changed

1. `AGENTS.md` — graphify section inserted **above** the `BEGIN:nextjs-agent-rules` block (so /graphify is registered ahead of the main Next.js agent rules).
2. `.codex/hooks.json` — new file. `graphify codex install` registered a PreToolUse hook that runs `graphify hook-check` before every Bash call (auto-rebuild trigger).
3. `graphify-out/` — built via `graphify update .` (AST-only, free): 169 nodes, 242 edges, 25 communities. Contains `graph.json`, `graph.html`, `GRAPH_REPORT.md`, `manifest.json`, `cache/`.
4. `notes/` — 25 community pages + `index.md` + `Home.md`, generated from `graphify-out/graph.json` via `Deploy/build_wiki.py`. Obsidian-discoverable (vault already configured at `.obsidian/`).
5. `Deploy/build_wiki.py` — re-runnable script that rebuilds `notes/` from the current `graph.json`.
6. `Deploy/snapshot-20260512-222943/` — pre-change snapshot of all top-level project files (excluding node_modules, .next, .git).

## How to roll back

```powershell
# Restore the pre-change tree (does NOT touch node_modules, .next, .git):
$src = "C:\Users\osama.alahmad\Desktop\Osama.aifinxa.io\Deploy\snapshot-20260512-222943"
$dst = "C:\Users\osama.alahmad\Desktop\Osama.aifinxa.io"
Get-ChildItem -Path $src -Force | ForEach-Object { Copy-Item $_.FullName $dst -Recurse -Force }
# Then remove the new artifacts:
Remove-Item -Recurse -Force "$dst\graphify-out","$dst\notes","$dst\.codex"
```

Or simpler: `git restore AGENTS.md` and `git clean -fd graphify-out notes .codex` (after staging anything you actually want to keep).

## Outstanding

- Persistent PATH entry for `C:\Users\osama.alahmad\AppData\Local\Programs\Python\Python312\Scripts` was blocked by the auto-mode classifier. `graphify` still works in this session only because PowerShell's `Get-Command` resolved the .exe directly. New shells will need either the full path or the PATH addition.
- Semantic extraction (LLM-powered) was skipped — corpus was code-only, no `GEMINI_API_KEY`/`OPENAI_API_KEY`/`CLAUDE_API_KEY` env vars set. To enrich: set one of those keys and run `graphify extract . --backend <name>`.
