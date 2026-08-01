# templates/

Not user-facing documentation — this is the source of truth `/init`
(`commands/init.md`) copies from when scaffolding Parallax's interactive scripts
and visual regression harness into a real project.

If you're editing the interactive scripts or the visual regression harness, edit
them here — this is the one canonical copy in the plugin.

`deno-tasks.json` and `deno-config.json` are fragments, not a full `deno.json` —
`/init` merges their entries into whatever `deno.json` already exists at the
destination project, rather than overwriting the whole file (which would clobber
project-specific tasks). `deno-tasks.json` supplies the `tasks` object;
`deno-config.json` supplies `nodeModulesDir` and `imports` — the latter is what
stops a target project's own `node_modules/` from shadowing the
`playwright`/`pixelmatch`/`pngjs`/`@std/assert` bare specifiers these scripts
import (UAT finding #13).

Test files (`*_test.ts`) live alongside the source they test and get scaffolded
by `/init` along with everything else — no special-casing needed. See
CONTRIBUTING.md's "Testing model" section for the Lane 1/ Lane 2 split and what
to update when adding a new browser-dependent test.
