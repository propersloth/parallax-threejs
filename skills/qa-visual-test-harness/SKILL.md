---
name: qa-visual-test-harness
type: Skill
description: How Parallax's own SHA-indexed visual regression suite works — test/visual/'s scenario format, keyframe capture, diff gating, and the accept/reject flow. Use whenever writing a new scenario, interpreting a visual:run result, or explaining why a keyframe is pending-review instead of auto-accepted.
---

# QA: visual regression suite

This describes Parallax's own mechanism, not a generic testing concept —
see AGENTS.md §3 and §4 for the policy context this implements.

## What it actually does

Each scenario (`test/visual/scenarios/*.json`) defines a Playwright step
sequence and one or more named keyframes. `deno task visual:run`:

1. Replays the steps, captures a screenshot at each keyframe.
2. Diffs each keyframe against the last **accepted** screenshot for that
   keyframe — not the immediately prior commit, since not every commit
   touches rendering.
3. Below the scenario's `threshold` (fraction of changed pixels): writes
   the new screenshot as the accepted baseline automatically.
4. At or above threshold: writes it as `pending-<sha>.png` +
   `pending-<sha>.diff.png`, marks the manifest entry `pending-review`,
   and exits non-zero. **Never auto-accepted** — a human runs
   `deno task visual:accept <scenario> <keyframe>` to promote it.

If a scenario also sets `memoryThreshold`, the same run reads a
geometry/texture count from `window.__renderer__.info.memory` once (after
all steps complete) and gates it similarly to a keyframe — with one
difference worth being explicit about: geometries and textures are
checked **independently** against the threshold, not summed first.
Summing them first would let a geometry leak hide behind unrelated
texture disposal in the same run (or vice versa); either one alone
exceeding the threshold is enough to flag `pending-review`, promoted the
same way with `deno task visual:accept <scenario> memory` — `memory` is
a reserved keyframe name for this, and `captureScenario` rejects it
outright if a scenario tries to use it for an actual keyframe. No
`memoryThreshold` set means no memory check runs for that scenario at
all — it's opt-in per scenario, not a new default.

Per AGENTS.md §5, `deno task visual:run` runs in the background when
it's the full suite (no scenario filter) or 2+ named scenarios — each
scenario launches its own browser, so this adds up fast. A single named
scenario stays synchronous, since that's the quick spot-check case and
an immediate result is more useful than a background round-trip for it.

## Writing a new scenario

- One scenario file per distinct visual state worth protecting — steps to
  reach it, keyframe names describing what the frame actually shows
  (`material-after-fix`, not `keyframe1`).
- Set `threshold` deliberately, not by copying the default. A static
  shot can use something like 0.02; camera movement, animation, or
  anything with inherent frame jitter typically needs closer to 0.035 or
  looser — reason from the actual noise floor of what you're capturing,
  not a fixed rule.
- Validate a new scenario by actually running it (`deno task replay`)
  before trusting it in the suite — an unreliable scenario generates
  false-positive `pending-review` noise on every future commit, which is
  worse than no scenario at all.
- Only set `memoryThreshold` when the scenario is specifically protecting
  a confirmed memory/leak fix — see `agents/scenario-author.md` §3a. Most
  scenarios should leave it unset.

## Reading a result

- `auto-accepted` with a nonzero diff ratio is normal — it means the
  change was below threshold, not that nothing changed.
- `pending-review` is a gate, not a failure to fix. The correct response
  is inspecting the `.diff.png`, deciding if the change was intended, and
  either accepting or investigating — never re-running until it happens
  to pass.
- `baseline` (no `diffFromPrev`) means this is the first capture for that
  keyframe — nothing to compare against yet.

## Relationship to the interactive debug loop

This is the deterministic, git-SHA-indexed half of Parallax's testing
story — separate from `/checkpoint`/`/diff`, which are ephemeral,
session-scoped, and not indexed by commit. See AGENTS.md §3 for why these
two systems are kept deliberately distinct rather than treated as
interchangeable.
