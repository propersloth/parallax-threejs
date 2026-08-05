---
type: Slash Command
description: Replay a previously recorded interaction macro
---

Arguments: $ARGUMENTS — the scenario name, matching a file under `test/visual/scenarios/*.json`.

1. If a matching scenario file exists, run `deno task replay -- <scenario-name>` from the project root. This reuses the exact same `captureScenario()` code path the regression suite runs — don't re-drive the interaction by hand through raw playwright-mcp calls, since that risks "replay" and "the regression suite" behaving subtly differently for what's supposed to be the identical scenario.
2. Note this launches its own browser (matching how the regression suite already works), not the shared tab the human is watching. If the actual intent is to replay something visibly in the shared tab, say so — that's a different operation than what this script does.
3. If no matching scenario file exists, ask whether to record a new one now (walk through the interaction once, capturing each action) rather than guessing what "the usual orbit" means.
4. After replay, offer to run `/checkpoint` if the person's intent was to inspect the resulting state rather than just re-run the motion.

For touch/mobile behavior specifically: a scenario's optional `device`
field (viewport + `isMobile`/`hasTouch`) makes its existing `click`/
`dragOrbit` steps dispatch via real touch input instead of mouse — same
step vocabulary, no separate touch-flavored scenario authoring. If asked
to check touch/mobile behavior and no `device`-enabled scenario exists
yet, that's a new scenario to record (see `agents/scenario-author.md`),
not something this command can retrofit onto an existing desktop one.
