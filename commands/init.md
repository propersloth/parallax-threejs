---
type: Slash Command
description: Scaffold Parallax's interactive debug scripts and visual regression harness into the current project. Idempotent — only adds what's missing, never overwrites, flags conflicts instead of resolving them silently.
---

Run this once per project, the first time Parallax's interactive
commands (`/checkpoint`, `/sweep`, `/diff`, `/replay`) or the visual
regression suite are needed here. Source of truth is
`${CLAUDE_PLUGIN_ROOT}/scaffold/` — see `scaffold/README.md` for why
these files live there and not hand-duplicated per project.

1. **Copy the scaffold**: run
   `deno run --allow-read --allow-write ${CLAUDE_PLUGIN_ROOT}/scripts/copy-scaffold.ts ${CLAUDE_PLUGIN_ROOT}/scaffold .`
   — copies `lib/` (shared code — the renderer memory/perf reads —
   copied first since `scripts/` and `test/visual/` both import from
   it), `scripts/`, and `test/visual/` into the project, file by file,
   **only where the destination path doesn't already exist**. An
   existing file is left alone, not overwritten — someone may have
   customized it — and comes back in the printed result's `skipped`
   list rather than `copied`. `test/visual/scenarios/.gitkeep` is
   skipped automatically if `./test/visual/scenarios/` already has real
   scenario files in it. Parse the printed `{copied, skipped}` JSON for
   step 5's summary. (This is the same `copyScaffold()` that
   `scripts/check-scaffold-drift.ts` uses to keep `examples/teapot-demo/`
   honest against this file — see that script's header if you're
   changing scaffold-copy behavior.)
2. **`deno.json` tasks**: read
   `${CLAUDE_PLUGIN_ROOT}/scaffold/deno-tasks.json` and merge its
   entries into `./deno.json`'s `tasks` object — create `./deno.json` if
   it doesn't exist yet. For any task name that already exists in the
   project with a *different* command than the template's, don't
   overwrite it — report the conflict and let the human decide.
3. **`deno.json` npm resolution**: read
   `${CLAUDE_PLUGIN_ROOT}/scaffold/deno-config.json` and merge its
   `nodeModulesDir` and `imports` entries into `./deno.json` the same way
   — same conflict rule as step 2. This is required, not optional: if the
   target project has its own `node_modules/` (any normal npm-based
   three.js project), Deno auto-detects it and routes the scripts'
   `playwright`/`pixelmatch`/`pngjs`/`@std/assert` bare specifiers through
   that local `node_modules/` instead of Deno's own npm cache, where
   they're never installed — `deno task visual:run` and the other
   interactive tasks fail immediately with `Could not find a matching
   package for 'npm:pixelmatch'...` (UAT finding #13). Setting
   `"nodeModulesDir": "none"` disables that auto-detection; the `imports`
   entries are what actually let the bare specifiers resolve at all.
4. **`.mcp.json`**: if `./.mcp.json` doesn't exist yet, first check for
   Raspberry Pi hardware — `cat /proc/device-tree/model 2>/dev/null`
   (look for "Raspberry Pi" in the output) is the decisive check on
   Linux; fall back to `uname -a` (`bcm2712`/`rpi` in the kernel string)
   if the device-tree path isn't readable. The two templates default to
   opposite rendering modes for a real hardware reason, not a style
   choice: `${CLAUDE_PLUGIN_ROOT}/.mcp.json` runs `chrome-devtools-mcp`
   and `playwright-mcp` **headless**, right for the common desktop/laptop
   case; `${CLAUDE_PLUGIN_ROOT}/scaffold/variants/raspberry-pi/mcp.json` runs them
   **headed** against the Pi's own display on purpose, because
   headless/software-rendering WebGL is documented as unreliable on Pi 5
   even with GPU flags set correctly (see `AGENTS.md` §7a). Copy
   whichever template the check confirms, and say which one and why in
   the summary (step 5) — don't apply the Pi template silently. If the
   check is inconclusive (non-Linux, containerized, `/proc/device-tree`
   unreadable) and the person hasn't already said what hardware this is,
   ask before picking a default rather than guessing. If a `.mcp.json`
   already exists, don't touch it; report that it exists and point at
   both source files for manual merging, flagging the Pi caveat if the
   hardware check found one.
5. **Report a summary**: what was added, what already existed and was
   skipped, and any conflicts that need manual attention — in that order,
   so conflicts are the last (most actionable) thing the person reads.
6. Remind the person about the `window.scene = scene` prerequisite (see
   README.md) — nothing copied in step 1 resolves anything without it.

This command doesn't install recommended skills or dependencies — that's
`scripts/setup.ts` / `/plugin` skill install, a separate concern from
scaffolding the tooling itself. Fine to suggest running that next, after
this completes.
