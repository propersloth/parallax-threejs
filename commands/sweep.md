---
type: Slash Command
description: Sweep a parameter across a range and produce a contact sheet
---

Arguments: $ARGUMENTS — the target object and property (e.g. "PointLight intensity"), a range, and a step count. Example: `/sweep PointLight intensity 0.2 to 2.0 in 8 steps`.

1. Parse the object name, property path, range, and step count from $ARGUMENTS. If any are missing or ambiguous, ask — don't guess a range for a parameter you haven't seen the current value of. Note: the object must have a `.name` set and be resolvable via `scene.getObjectByName()` — if you don't know the object's name, check the scene graph via threejs-devtools-mcp first.
2. Run `deno task sweep -- <ObjectName> <property.path> <min> <max> <steps>` from the project root. This handles the entire read→loop(set, wait, screenshot)→composite→restore sequence atomically, including restoring the original value even if something fails partway — don't re-derive this loop through individual tool calls, that's exactly the repeated-round-trip pattern this script exists to replace.
3. The output is a contact sheet PNG plus a sidecar JSON mapping grid position to value (no baked-in text labels on the image itself — read the JSON alongside it). Present both to the human.

Prerequisite: same as `/checkpoint` — the prototype must expose `window.scene = scene`.
