---
type: Slash Command
description: Render the last /diff result for a label as a shareable HTML file
---

1. Run `deno task export-report -- <label>` from the project root (or with no label for the most recently diffed label overall). This finds the most recent persisted `/diff` result for that label and renders it — before/after/diff-overlay screenshots, console diff, scene-graph counts, and memory/perf deltas (when present) — to `.parallax/reports/<timestamp>-<label>.html`. It does not run a fresh checkpoint or diff itself.
2. If nothing was found, the script says so and names the label — run `/diff <label>` first, then retry this command.
3. Report the path the script printed. The file is fully self-contained (images embedded as base64 `data:` URIs, no external requests) — it can be opened directly or shared outside the chat session.

Arguments: $ARGUMENTS — optional label to match, same label used with `/checkpoint` and `/diff`.
