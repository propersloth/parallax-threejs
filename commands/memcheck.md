---
type: Slash Command
description: On-demand check for undisposed geometries, textures, and materials
---

Arguments: $ARGUMENTS — optional target object name (same convention as `/sweep`'s object argument); no argument checks the whole scene.

1. Call threejs-devtools-mcp's `dispose_check` and `memory_stats` tools directly (scoped to the named object if given). This command exists specifically to reach these two tools on demand, without waiting for AGENTS.md §1's routing row to trigger off an actual symptom.
2. Report findings with the same channel-citation discipline as AGENTS.md §2 — e.g. "12 geometries retained with no scene reference, per dispose_check" — not a raw tool dump.
3. If this reveals a genuine leak (not a false positive from a legitimately long-lived pooled resource), suggest a `/checkpoint` to capture the state before investigating further. Once fixed and confirmed, flag it as a scenario-author candidate (per AGENTS.md §1a) — a memory expectation can be captured in a scenario the same way a pixel expectation already is.

Prerequisite: same as `/checkpoint` — the prototype must expose `window.scene = scene`. No additional prerequisite beyond that; `dispose_check`/`memory_stats` are threejs-devtools-mcp tools, already bundled with the plugin — this command doesn't call into `scripts/` at all.
