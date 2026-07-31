---
type: Slash Command
description: Compare current state against the last checkpoint for this label
---

1. Run `deno task diff-checkpoints -- <label>` from the project root (or with no label for the most recent checkpoint overall). This finds the prior checkpoint, captures a fresh one, and returns a structured diff (pixel diff ratio, new console messages, scene object counts) — the mechanical comparison is the script's job, not something to redo by hand.
2. Interpret the result: is the pixel diff ratio meaningful given what changed? Do the new console messages explain it? This judgment stays yours.
3. Report only what changed. If nothing changed and something was expected to, say so explicitly — that's often the more useful finding.
4. Do not declare the result "fine" yourself if a diff was found — per AGENTS.md §4, present it and let the human make the accept call.
5. If `aidlc-docs/` exists at the project root, see AGENTS.md §8 — an accepted or rejected diff is an auditable event under AI-DLC.
