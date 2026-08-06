# scaffold/

Not user-facing documentation — this is the source of truth `/init`
(`commands/init.md`) copies from when scaffolding Parallax's interactive scripts
and visual regression harness into a real project.

If you're editing the interactive scripts or the visual regression harness, edit
them here — this is the one canonical copy in the plugin.

`lib/` (top-level, distinct from `scripts/lib/` and `test/visual/lib/`) holds
code genuinely shared between the two — `renderer-info.ts`'s memory and perf
reads, used by both `scripts/checkpoint.ts` and `test/visual/lib/capture.ts`. It
exists specifically so `scripts/` and `test/visual/` import from a common,
neutral location instead of reaching into each other's `lib/` directories — see
PR #30's review for why that coupling was worth avoiding once a second instance
of it showed up (the first, `scripts/diff-checkpoints.ts` importing
`test/visual/lib/diff.ts`, predates this and hasn't been touched). The file was
named `renderer-memory.ts` in Unit 1 and renamed once Unit 2 grew it to cover
`WebGLRenderer.info` more broadly than just `.memory`.

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
