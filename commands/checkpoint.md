---
type: Slash Command
description: Capture scene graph + console + screenshot as one labeled unit
---

Check `.parallax/pending-checkpoint` for a marker left by the post-edit hook — if present, use its `path` field to label this checkpoint, then delete the marker.

1. Run `deno task checkpoint -- <label>` from the project root (label = the pending-checkpoint marker's path, $ARGUMENTS if given, or "unlabeled"). This handles scene graph query, console capture, screenshot, and writing `.parallax/checkpoints/<timestamp>-<label>.json` + `.png` atomically — don't re-derive those steps by hand through individual MCP tool calls.
2. Read the script's output (object count, console message count) and, if useful, open the written JSON for detail.
3. Report a one-line summary: what changed since the last checkpoint for this label, citing which source (scene/console/screenshot) supports each claim (per AGENTS.md §2). This step is yours — the script captures data, it doesn't interpret it.

Arguments: $ARGUMENTS — optional label for this checkpoint.

Prerequisite: the prototype must expose `window.scene = scene` for the script to resolve anything — see `scripts/lib/live-scene.ts` for the full prerequisite list. If that's not set up, fall back to driving threejs-devtools-mcp/chrome-devtools-mcp/playwright-mcp directly as this command originally did.
