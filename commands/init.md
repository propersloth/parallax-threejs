---
type: Slash Command
description: Scaffold Parallax's interactive debug scripts and visual regression harness into the current project. Idempotent — only adds what's missing, never overwrites, flags conflicts instead of resolving them silently.
---

Run this once per project, the first time Parallax's interactive
commands (`/checkpoint`, `/sweep`, `/diff`, `/replay`) or the visual
regression suite are needed here. Source of truth is
`${CLAUDE_PLUGIN_ROOT}/templates/` — see `templates/README.md` for why
these files live there and not hand-duplicated per project.

1. **Shared lib**: for each file under `${CLAUDE_PLUGIN_ROOT}/templates/lib/`,
   copy it to the matching path under `./lib/` **only if that path
   doesn't already exist**. This holds code genuinely shared between the
   scripts and the regression harness (currently the renderer memory/perf
   reads) — copy it first, since steps 2 and 3 both import from it.
2. **Scripts**: for each file under `${CLAUDE_PLUGIN_ROOT}/templates/scripts/`,
   copy it to the matching path under `./scripts/` **only if that path
   doesn't already exist**. If it does exist, leave it alone and report
   it as "already present" rather than silently overwriting — someone
   may have customized it.
3. **Visual regression harness**: same rule, for
   `${CLAUDE_PLUGIN_ROOT}/templates/test/visual/` → `./test/visual/`.
   Don't copy `scenarios/.gitkeep` if `./test/visual/scenarios/` already
   has real scenario files in it.
4. **`deno.json` tasks**: read
   `${CLAUDE_PLUGIN_ROOT}/templates/deno-tasks.json` and merge its
   entries into `./deno.json`'s `tasks` object — create `./deno.json` if
   it doesn't exist yet. For any task name that already exists in the
   project with a *different* command than the template's, don't
   overwrite it — report the conflict and let the human decide.
5. **`deno.json` npm resolution**: read
   `${CLAUDE_PLUGIN_ROOT}/templates/deno-config.json` and merge its
   `nodeModulesDir` and `imports` entries into `./deno.json` the same way
   — same conflict rule as step 4. This is required, not optional: if the
   target project has its own `node_modules/` (any normal npm-based
   three.js project), Deno auto-detects it and routes the scripts'
   `playwright`/`pixelmatch`/`pngjs`/`@std/assert` bare specifiers through
   that local `node_modules/` instead of Deno's own npm cache, where
   they're never installed — `deno task visual:run` and the other
   interactive tasks fail immediately with `Could not find a matching
   package for 'npm:pixelmatch'...` (UAT finding #13). Setting
   `"nodeModulesDir": "none"` disables that auto-detection; the `imports`
   entries are what actually let the bare specifiers resolve at all.
6. **`.mcp.json`**: if `./.mcp.json` doesn't exist yet, copy
   `${CLAUDE_PLUGIN_ROOT}/.mcp.json` (or
   `${CLAUDE_PLUGIN_ROOT}/examples/raspberry-pi/mcp.json` if this is a Pi
   setup — ask if unclear). If one already exists, don't touch it; report
   that it exists and point at the two source files for manual merging.
7. **Report a summary**: what was added, what already existed and was
   skipped, and any conflicts that need manual attention — in that order,
   so conflicts are the last (most actionable) thing the person reads.
8. Remind the person about the `window.scene = scene` prerequisite (see
   README.md) — nothing copied in steps 2-3 resolves anything without it.

This command doesn't install recommended skills or dependencies — that's
`scripts/setup.ts` / `/plugin` skill install, a separate concern from
scaffolding the tooling itself. Fine to suggest running that next, after
this completes.
