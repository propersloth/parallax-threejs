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
  /plugin install python-lsp@claude-plugins-official
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

| Phase | Result | Notes |
|---|---|---|
| 0 — Environment | ☐ Pass ☐ Fail | |
| 1 — Install | ☐ Pass ☐ Fail | |
| 2 — Wire into real project | ☐ Pass ☐ Fail | |
| 3 — Browser opens | ☐ Pass ☐ Fail | |
| 4 — MCP smoke tests | ☐ Pass ☐ Fail | |
| 5 — LSP | ☐ Pass ☐ Fail | |
| 6 — Commands | ☐ Pass ☐ Fail | |
| 7 — Agents | ☐ Pass ☐ Fail | |
| 8 — Hook | ☐ Pass ☐ Fail | |
| 9 — Regression suite | ☐ Pass ☐ Fail | |

**Overall**: ☐ Ship ☐ Fix findings first
