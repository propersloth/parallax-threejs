# Parallax — Final UAT Runbook

Run this against your real prototype, on the Pi, in VSCode with the Claude
Code extension. This is the first time most of this stack runs on real
hardware — treat failures as findings, not surprises. Check off each item;
log anything that fails in the sign-off table at the end rather than
stopping to fix it mid-run, unless it blocks a later phase.

---

## Phase 0 — Environment sanity

- [ ] VSCode (with Claude Code extension) is running **on the Pi itself**
      — either locally at the Pi's desktop, or via Remote-SSH *into* the
      Pi with the extension host running there.

- [ ] Confirm `$DISPLAY`/`$XAUTHORITY` resolve in that terminal:

  ```bash
  echo $DISPLAY
  echo $XAUTHORITY
  ```

  These must match what's in `.mcp.json` (`examples/raspberry-pi/mcp.json`
  once copied over — see Phase 1).

- [ ] Confirm toolchain versions:

  ```bash
  node --version
  deno --version
  cargo --version
  google-chrome-stable --version
  shader-language-server --version
  ```

> [!WARNING]
> If Remote-SSH is in play, `$DISPLAY` can silently come back empty even
> though the terminal looks normal — that's the exact failure mode this
> whole headful config was built to avoid. If any check in this phase
> fails, stop here. Everything downstream assumes this baseline.

---

## Phase 1 — Install the plugin

- [ ] Clone the plugin:

  ```bash
  git clone https://github.com/propersloth/parallax-threejs.git
  ```

- [ ] Run the bootstrap script:

  ```bash
  sh parallax-threejs/scripts/setup-pi.sh
  ```

- [ ] Copy the Pi-specific MCP config over the default:

  ```bash
  cp parallax-threejs/examples/raspberry-pi/mcp.json .mcp.json
  ```

- [ ] Edit `.mcp.json` and fill in the real `DISPLAY`/`XAUTHORITY` values
      from Phase 0, replacing `REPLACE_WITH_YOUR_DISPLAY_VALUE` and
      `REPLACE_WITH_YOUR_XAUTHORITY_PATH`.

- [ ] Install the official LSP plugins:

  ```
  /plugin install typescript-lsp@claude-plugins-official
  /plugin install pyright-lsp@claude-plugins-official
  ```

- [ ] Install Parallax itself, then restart:

  ```
  /plugin install parallax-threejs
  ```

- [ ] Validate the plugin structure:

  ```bash
  claude plugin validate . --strict
  ```

> [!IMPORTANT]
> If validation fails, that's a real UAT finding — log it in the sign-off
> table rather than silently working around it.

---

## Phase 2 — Wire into your real prototype

> [!IMPORTANT]
> This phase has never been walked through before — `/init` itself is
> new. If anything in the whole UAT run is going to surface a genuine
> gap, it's most likely here.

- [ ] From your real project, run:

  ```
  /init
  ```

  This scaffolds `scripts/`, `test/visual/`, merges the required
  `deno.json` tasks, and copies `.mcp.json` if you don't have one yet —
  see `commands/init.md` for exactly what it does and its idempotency
  rules. Read its summary output carefully: anything reported as a
  conflict needs your manual attention, not automatic resolution.

- [ ] Add this somewhere in your prototype's setup code — nothing in
      `scripts/` resolves anything without it:

  ```js
  window.scene = scene;
  ```

---

## Phase 3 — Start the dev server and confirm the browser opens

- [ ] Start your project's dev server (command depends on your setup).

- [ ] In Claude Code, ask:

  > take a screenshot of the current page

  Confirm a **real, visible Chrome window opens on the Pi's monitor** —
  not headless, not a crash.

> [!WARNING]
> Leave that browser tab open for the rest of this run. Closing it breaks
> the WebSocket bridge every subsequent phase depends on.

---

## Phase 4 — MCP server smoke tests

- [ ] **chrome-devtools-mcp** — ask:

  > take a screenshot

  Expect an image back.

- [ ] **threejs-devtools-mcp** — ask:

  > show me the scene tree

  Expect actual objects from your prototype, not an error about a missing
  devtools hook.

- [ ] **playwright-mcp** — ask:

  > click on [something in your UI]

  Confirm the click actually registers in the visible browser window.

- [ ] **spector** — only if you've run `scripts/setup-spector.sh`. Ask
      something that matches AGENTS.md §1's routing condition, e.g.:

  > the material looks right per the scene graph but the render is still
  > wrong

> [!TIP]
> Spector is conditional by design (§1/§6) — if it doesn't fire on a
> generic question, that's correct behavior, not a bug.

---

## Phase 5 — LSP verification

- [ ] Open a `.ts`/`.js` file — confirm inline diagnostics/go-to-definition
      work.
- [ ] Open a `.py` file, if your project has one — same check.
- [ ] Open a `.frag` or `.vert` file — confirm GLSL diagnostics appear.

> [!TIP]
> If GLSL diagnostics don't appear, check `/plugin` → Errors for a
> missing-binary message before assuming the `.lsp.json` config itself is
> wrong.

---

## Phase 6 — Command-by-command test

- [ ] Capture a checkpoint:

  ```
  /checkpoint smoke-test
  ```

  Confirm `.parallax/checkpoints/<timestamp>-smoke-test.json` and `.png`
  were written:

  ```bash
  ls .parallax/checkpoints/
  ```

- [ ] Make a small visible change to your scene, then:

  ```
  /diff smoke-test
  ```

  Confirm it reports a pixel diff ratio and any new console messages.

- [ ] Sweep a real property from your scene:

  ```
  /sweep <ObjectName> <property> <min> <max> <steps>
  ```

  Confirm a contact sheet PNG + sidecar JSON land under
  `.parallax/sweeps/`.

- [ ] Set a specific camera view:

  ```
  /sync-view
  ```

  Confirm it reports the applied position back in one line.

- [ ] Skip `/replay` for now — Phase 9 gives you a real scenario to
      replay against.

---

## Phase 7 — Agent test

- [ ] Trigger **visual-debugger** — ask about something looking wrong,
      real or contrived. Confirm it correlates at least two evidence
      sources (per AGENTS.md §2) before proposing a cause, rather than
      just describing the screenshot.

- [ ] Trigger **shader-reviewer** — edit or ask for review of a shader
      file before running it. Confirm it actually invokes
      `scripts/check-shader-bindings.ts` rather than reading the files by
      eye.

- [ ] Trigger **scenario-author** — after a `/diff` worth protecting long
      term, ask it to write a regression scenario. Confirm it runs
      `deno task replay` to validate before declaring the scenario done,
      per its own step 4.

---

## Phase 8 — Hook test

- [ ] Edit a file under a `materials/`, `shaders/`, `lighting/`,
      `scene/`, or `geometry/` path.

- [ ] Confirm the marker appeared:

  ```bash
  cat .parallax/pending-checkpoint
  ```

- [ ] Run `/checkpoint` again and confirm it picks up and clears that
      marker.

---

## Phase 9 — Visual regression suite, for real

- [ ] Write one real scenario for your actual prototype in
      `test/visual/scenarios/` (steps + at least one keyframe).

- [ ] Record the first baseline:

  ```bash
  deno task visual:run
  ```

  First run should record a baseline — no prior checkpoint to diff
  against yet.

- [ ] Make a small visible change, then run again:

  ```bash
  deno task visual:run
  ```

  Confirm it reports a diff and gates on `pending-review` rather than
  silently passing.

- [ ] Accept the change:

  ```bash
  deno task visual:accept <scenario> <keyframe>
  ```

- [ ] Now try replay against the scenario you just wrote:

  ```
  /replay <scenario-name>
  ```

---

## Sign-off

Run 2026-07-31, Raspberry Pi 5, against a real prototype (`ceres`, an
npm/esbuild-based vanilla three.js project — chosen deliberately since
it's the common case, not a Deno-based or greenfield project built for
this plugin). Findings below are numbered and referenced from the table;
severity reflects real-world blast radius, not just whether the checkbox
passed.

| Phase | Result | Notes |
|---|---|---|
| 0 — Environment | ☑ Pass (after fixes) | Chrome and cargo/`shader-language-server` were missing entirely; installed manually — `setup-pi.sh` itself was never run beforehand, so this is expected first-run friction, not a script bug. |
| 1 — Install | ☑ Pass (after fixes) | See #1, #2, #3. |
| 2 — Wire into real project | ☑ Pass (after fix) | See #4. |
| 3 — Browser opens | ☑ Pass | Real visible Chrome window on the Pi's display, confirmed via screenshot + console + DOM query. |
| 4 — MCP smoke tests | ☑ Pass | All four servers (chrome-devtools-mcp, threejs-devtools-mcp, playwright-mcp, spector) work. Minor: threejs-devtools-mcp's bridge has a connection race on first page load ("scene not found yet") that resolves on one clean reload — not blocking. |
| 5 — LSP | ☒ Fail | See #5, #6, #7. |
| 6 — Commands | ☒ Fail | See #8, #9, #10. `/sync-view` untested end-to-end due to #10. |
| 7 — Agents | ☑ Pass (with findings) | `visual-debugger` passed cleanly — correlated 4 evidence channels, correct diagnosis, first real validation of the plugin's core value prop. `shader-reviewer` ran successfully against a real project for the first time but see #11 for script accuracy issues. `scenario-author` not independently run — it calls `deno task replay` internally, which would hit #9. |
| 8 — Hook | ☒ Fail | See #12. |
| 9 — Regression suite | ☒ Fail | See #13, blocks before even reaching #9's CDP issue. |

**Overall**: ☐ Ship ☑ Fix findings first

### Findings

**Fixed live during this run** (environment/setup gaps, not plugin code):
1. No `.claude-plugin/marketplace.json` existed anywhere in the repo — the README's own `/plugin marketplace add propersloth/parallax-threejs` instruction cannot work without one. Added `.claude-plugin/marketplace.json` (marketplace name `propersloth`, single plugin entry with `"source": "./"`).
2. `UAT-RUNBOOK.md` Phase 1 says to install a plugin named `python-lsp` from `claude-plugins-official` — no such plugin exists there. The actual name is `pyright-lsp`. Doc bug, not yet corrected in the runbook text itself.
3. Editing the plugin's own `.mcp.json` after `claude plugin install` doesn't take effect via `claude plugin update` — local-path-sourced plugins are cached per-version, and `update` treats "same version" as "already latest" even though the underlying files changed. Needed a full uninstall+reinstall to pick up the edit. Worth a note in CONTRIBUTING.md for anyone iterating on the plugin locally.
4. `ceres` (the real prototype) didn't expose `window.scene` anywhere — confirmed via runtime inspection (`typeof window.scene === 'undefined'`, no `THREE`-like global, nothing reachable). Added the one-line `window.scene = scene;` to `ceres/src/scene.js` per README's documented prerequisite (this is a fix to the test subject, not the plugin, but confirms the prerequisite is real and easy to miss silently).

**Still open — need real fixes in the plugin:**

5. **GLSL LSP** — `shader-language-server` built fine via `cargo install`, but this session's process PATH never included `~/.cargo/bin` even after a full restart, because whatever launches `claude` here execs it directly rather than through a login/interactive shell, so `.bashrc`/`.profile` never source `$HOME/.cargo/env`. Environment-specific, not a plugin bug, but the Troubleshooting section could mention "verify PATH in the actual Claude Code process, not just your shell" more explicitly.
6. **TS/JS LSP, part 1** — the official `typescript-lsp` plugin ships no binary; its own README requires a separate `npm install -g typescript-language-server typescript`. Not mentioned in Parallax's own docs/prerequisites.
7. **TS/JS LSP, part 2** — even with both installed globally, `typescript-language-server` fails to initialize with *"Could not find a valid TypeScript installation"* against real projects that do have `typescript` as a local dependency (reproduced against an unrelated project, `hermes-workspace`, where `require.resolve('typescript')` succeeds directly but the LSP still fails). Looks like a Claude Code ↔ `typescript-language-server` integration bug outside this plugin's control, but it blocks Phase 5 regardless.
8. **`deno-tasks.json` missing `--allow-sys`** — every interactive script that imports `npm:playwright` (`checkpoint.ts`, `sweep-param.ts`, `replay.ts`, `diff-checkpoints.ts`) fails immediately with `NotCapable: Requires sys access to "homedir"` before doing anything else, because Playwright's own init calls `os.homedir()`. Simple, high-value fix: add `--allow-sys` to those task definitions.
9. **`/checkpoint`, `/sweep`, `/replay`, `/diff-checkpoints` cannot attach to the browser at all** — `live-scene.ts` assumes `Playwright.chromium.connectOverCDP('http://localhost:<BRIDGE_PORT>')` can reach "the same browser tab the human and Claude are already looking at" via threejs-devtools-mcp's bridge proxy. Confirmed wrong two independent ways: (a) that proxy doesn't speak CDP — `curl http://localhost:<port>/json/version` returns the injected bridge-script HTML, not a CDP version manifest; (b) `chrome-devtools-mcp` launches Chrome with `--remote-debugging-pipe` (confirmed via the live process's actual command line), meaning there is no CDP TCP port open at all for Playwright to connect to, regardless of which port is guessed. This is an architectural mismatch, not a config typo — needs either Parallax launching its own CDP-port'd Chrome instance, or `live-scene.ts` reusing chrome-devtools-mcp's actual connection some other way.
10. **`/sync-view`** (routes through threejs-devtools-mcp only, so unaffected by #9) still fails — `camera_details`/`set_camera` report "No camera found in scene" because threejs-devtools-mcp's bridge only discovers the camera via scene-graph traversal or an undocumented `window.__THREE_CAMERA__` global. `ceres`'s camera is a completely ordinary, valid three.js pattern (`new THREE.PerspectiveCamera(...)`, never added as a scene child) — README documents only the `window.scene` convention, not `window.__THREE_CAMERA__`.
11. **`check-shader-bindings.ts` false-positive rate: 28/28 on first real-world run.** Against `ceres`'s actual shaders, every flagged "BUG-LIKELY" uniform was manually verified to be correctly bound — the script's `parseJSUniformKeys()` only recognizes literal `uniforms: { ... }` object literals, not the equally common `onBeforeCompile` + `shader.uniforms.uX = ...` idiom `ceres` (and presumably many real projects) actually uses. Separately, `parseGLSLDeclarations`'s line-anchored regex silently drops the second declaration when two appear on one semicolon-separated line (`uPolarNormalN`/`uPolarNormalS` were never checked in either direction, no error). Real, reproducible parser gaps — first time this script has run against a non-template-fixture project.
12. **Hook writes to the wrong project.** `hooks/post-edit.js` writes `.parallax/pending-checkpoint` under `${CLAUDE_PLUGIN_ROOT}` — the plugin's own installed/dev directory — not the project actually being edited. Confirmed live: editing `ceres/src/shaders/body.glsl` wrote the marker to `/home/sloth/Work/parallax-threejs/.parallax/pending-checkpoint`. In a normal (non-local-dev) install, `CLAUDE_PLUGIN_ROOT` points at a shared, version-pinned plugin cache path — every project using the plugin would collide on the same marker file, and it would silently relocate (losing any pending marker) on every plugin version bump. Needs the project root (`process.cwd()` or an equivalent project-scoped env var), not the plugin root.
13. **Visual regression suite is broken for any npm-based target project.** `test/visual/lib/diff.ts` imports `npm:pixelmatch` and `npm:pngjs`. In `ceres` (an ordinary npm/esbuild project with its own `node_modules/`), Deno auto-detects that local `node_modules/` and routes npm-specifier resolution through it instead of Deno's own npm cache — and neither package is installed there, so `deno task visual:run` fails before doing anything else (`Could not find a matching package for 'npm:pixelmatch' in the node_modules directory`). `parallax-threejs` itself has no `node_modules/` at all, which is why its own test suite never surfaces this. `/init`'s `deno.json` scaffolding doesn't declare these as imports or set `"nodeModulesDir"`, so this will reproduce in essentially any real-world npm-based three.js project — arguably higher-impact than #9 since it blocks even before the CDP problem.

### Recommendation

Not ready to ship 1.0.0. Findings #8, #9, #12, and #13 are the priority
fixes — between them they block every interactive command and the
entire visual regression suite for a normal npm-based target project,
which is the common case this plugin needs to work for. #11 undermines
trust in `shader-reviewer`'s primary tool. #5–#7 and #1–#3 are real but
lower-severity (environment/doc gaps rather than broken core features).
