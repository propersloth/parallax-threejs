# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`bump-patch.yml` auto-increments the patch version on every merge to
`main` — not every one of those merges gets its own entry here; this file
tracks changes at release granularity (`release.yml`'s manual minor/major
cuts), not every commit.

## [Unreleased]

Tracking toward the 1.0.0 release. Update this section with real UAT
results before cutting the tag — see the UAT runbook.

### Added
- `/memcheck` command and an AGENTS.md §1 routing row so `visual-debugger`
  reaches for threejs-devtools-mcp's `dispose_check`/`memory_stats` on a
  leak/GC-pressure symptom automatically — previously bundled but unrouted.
  `/checkpoint`/`/diff` gain an optional geometry/texture memory
  field (requires exposing `window.__renderer__ = renderer`, same
  opt-in convention as `/sync-view`'s `window.__THREE_CAMERA__`), and the
  SHA-indexed regression suite gains an opt-in per-scenario
  `memoryThreshold`, gated similarly to the existing pixel-diff threshold
  (auto-accepted below threshold, `pending-review` above it, promoted via
  `deno task visual:accept <scenario> memory`) — geometries and textures
  are checked independently against it, not summed, so a leak in one
  can't hide behind disposal in the other. `memory` as a keyframe name
  is reserved and rejected outright if a scenario tries to reuse it. See
  `aidlc-docs/inception/`/`aidlc-docs/construction/unit-1-memcheck-routing/`
  for the full design record.
- `/checkpoint`/`/diff` gain an optional perf snapshot/delta (draw calls,
  triangles, points, lines, from `WebGLRenderer.info.render`) alongside
  the memory field Unit 1 added — same `window.__renderer__` opt-in, same
  graceful-absence handling for checkpoints that predate this. These are
  CPU-side submission *counts*, not a timing/rate measurement, so
  AGENTS.md §7a's Raspberry Pi caveat (which is specifically about
  FPS/frame-timing being unreliable there) does not apply to them.
  `templates/lib/renderer-memory.ts` (Unit 1) is renamed
  `templates/lib/renderer-info.ts` to reflect covering `WebGLRenderer.info`
  more broadly now — a template-repo-only rename, `/init` never
  overwrites so no existing scaffolded project is affected. See
  `aidlc-docs/construction/unit-2-perf-memory-diff/` for the full design
  record.
- `/sweep` and `deno task visual:run` now run via the Bash tool's
  `run_in_background: true` (AGENTS.md §5) instead of blocking the
  conversation — `/sweep` always, since every sweep is a
  reload+screenshot per step; `visual:run` when running the full suite
  or 2+ named scenarios, staying synchronous for a single named
  scenario (the quick spot-check case). Claude tells the human it's
  running, then reports the result once notified, for both. Doesn't
  change what's visible in the browser tab — only Claude's own wait is
  removed, not the human's "shared sight" into what's happening.
  Deliberately does not apply to `scenario-author`'s `deno task replay` validation
  step, which needs its result immediately to decide whether a scenario
  reproduces cleanly. Pure instruction/behavior change — no script code
  changed. See `aidlc-docs/construction/unit-3-background-mode/` for the
  full design record.
- Documented `threejs-devtools-mcp`'s bundled `gltf_to_r3f` tool as
  explicitly out of scope — it's a third-party dependency's own React
  Three Fiber code-generation feature, not something Parallax added, and
  its presence on the server was a quiet contradiction of this plugin's
  stated "vanilla three.js only, no React Three Fiber" scope (AGENTS.md's
  opening paragraph). AGENTS.md now names it explicitly and instructs
  against using it, rather than leaving the inconsistency unaddressed.
- **WebGPU options menu** in `docs/RECOMMENDED-DEPENDENCIES.md`, sibling
  to the existing WebGL menu — physics (Rapier/Jolt/cannon-es) and
  animation/tweening (GSAP/Theatre.js/Tween.js) carry over unchanged
  (renderer-agnostic), audio too, but postprocessing does not:
  `WebGPURenderer` doesn't support the legacy `EffectComposer` pass
  system at all. New recommended default there is three.js's own
  `RenderPipeline` (node-based, TSL, ships with three.js, zero extra
  dependency), with pmndrs/postprocessing v7+ as an alternative (verify
  individual effects against `WebGPURenderer` rather than assuming full
  parity with its WebGL-era coverage). `scripts/setup.ts`'s messaging
  updated to stop implying the WebGPU menu doesn't exist yet — it exists,
  just isn't wired into the interactive picker.
- **`/export-report` command** for exportable HTML session reports —
  renders the most recent persisted `/diff` result (before/after/overlay
  screenshots, console diff, scene-graph counts, memory/perf deltas when
  present) as one self-contained HTML file with images embedded as
  base64 `data:` URIs, so it opens and reads correctly outside the chat
  session entirely. `/diff`'s underlying script now also persists each
  comparison to `.parallax/diffs/<timestamp>-<label>.json` (previously
  fully ephemeral, printed to stdout only) so there's something durable
  for `/export-report` to render from without recomputing anything.
  Rendering logic lives in a new pure, testable `templates/scripts/lib/
  report.ts` (Lane 1 tests), mirroring the `memory-gate.ts` extraction
  pattern from PR #30's review. See
  `aidlc-docs/construction/unit-6-export-report/` for the full design
  record.
- **`/ship-check` command** — a deliberate, on-demand pre-ship pass:
  Lighthouse accessibility/SEO/best-practices/agentic-browsing (desktop
  and mobile) plus a Core Web Vitals trace, with a plain-language verdict
  on what's actually blocking vs. a nice-to-have. Pure MCP-tool
  orchestration (`lighthouse_audit`, `performance_start_trace`/
  `analyze_insight`) — no new `templates/scripts/*.ts`, since
  chrome-devtools-mcp already provides everything this needs as
  first-class tools. Deliberately does not touch `AGENTS.md`'s routing
  table (on-demand only, not automatic) or the `/checkpoint`→`/diff`
  bundle (a different kind of signal — page-load/markup audit, not
  scene-state-over-time). The Core Web Vitals half is explicitly
  reported as advisory-not-diagnostic on the Pi 5 deployment path, per
  §7a's existing caveat about chrome-devtools-mcp's timing numbers on
  that hardware. See
  `aidlc-docs/construction/unit-8-lighthouse-ship-readiness/` for the
  full design record.
- **Touch/mobile interaction support in `/replay`** — a scenario's
  optional `device` field (viewport, `isMobile`, `hasTouch`,
  `deviceScaleFactor`) makes its existing `click`/`dragOrbit` steps
  dispatch via real touch input instead of mouse, no separate
  touch-flavored step verbs to author. Taps use Playwright's own
  `page.tap()`; drags use CDP's `Input.dispatchTouchEvent` directly
  (`Touchscreen` has no drag/swipe primitive). Not built on
  `chrome-devtools-mcp`'s `emulate` tool despite FR-7's original wording
  — `/replay` and the SHA-indexed regression suite share one isolated
  headless Playwright browser (`captureScenario()`), which `emulate` (a
  live-shared-tab tool) can't reach and CI can't spin up the same way.
  Every existing scenario with no `device` field is unaffected — desktop,
  mouse input, exactly as before. See
  `aidlc-docs/construction/unit-7-touch-mobile-replay/` for the full
  design record, including an empirically-confirmed finding: Chromium
  coalesces intermediate touchmove samples regardless of dispatch timing,
  but a drag gesture's final position is always correct regardless.
- **WebXR dependency menu** (sibling to the WebGL and WebGPU menus in
  `docs/RECOMMENDED-DEPENDENCIES.md`) — controller/hand tracking ships
  built into three.js itself (no third-party pick needed);
  physics/animation/audio carry over unchanged from the other menus;
  postprocessing deliberately has **no** recommended default, unlike
  every other section in the document — `EffectComposer` has
  long-standing reports of breaking entirely inside a WebXR session, and
  `RenderPipeline`'s own WebXR work is still an open draft PR against
  three.js, not shipped. Leads with a browser/device support reality
  check (Safari WebXR is visionOS-only, no iOS/iPadOS at all; Firefox has
  no WebXR support after discontinuing Firefox Reality) since that's a
  much more fragmented picture than the WebGPU menu's "~95% coverage."
  Explicitly excludes `@react-three/xr` (React Three Fiber-based, outside
  this plugin's scope regardless of quality). `scripts/setup.ts`'s scope
  note updated to mention both sibling menus, not just WebGPU. See
  `aidlc-docs/construction/unit-9-webxr-menu/` for the full design
  record.
- Documented the `parallax-threejs-stable` SSH-clone-only installer
  failure (`git@github.com: Permission denied`) and its workaround in
  README's troubleshooting section — not fixable from this repo (Claude
  Code's own installer behavior), but the workaround wasn't written down
  anywhere before this (closes #17's documentation half).
- PR labeling established as an actual habit, not just a documented
  categorization scheme nobody follows: `CONTRIBUTING.md` now says PRs
  should carry a label, and every previously-unlabeled merged PR in this
  repo's history was labeled retroactively (closes #18).
- `SECURITY.md` and `.github/release.yml` (categorizes `--generate-notes`
  output by PR label — only pays off once PRs actually carry those labels,
  which isn't an established habit yet).
- `bugs` and `engines` fields in `package.json`.
- `npm publish --provenance` — the registry now shows a verified
  "Provenance" badge, attesting the published tarball was built by this
  exact GitHub Actions run from this exact commit.
- npm-based plugin distribution: `package.json`, `npm publish` support, and
  the `parallax-threejs-npm` marketplace entry (installs/updates via the npm
  registry instead of this git repo), alongside the existing git-based
  `parallax-threejs` entry.
- Three-mode release pipeline in `release.yml` — `next` (fresh pre-release,
  published under npm's `next` dist-tag, GitHub Release marked prerelease),
  `promote` (relabel an already-published `next` build as stable — no
  rebuild, no republish, no new version number), and `direct-stable` (cut
  straight to stable for low-risk changes, skipping the pre-release cycle).
  See `docs/RELEASE-PROCESS.md` for the full worked walkthrough.
- CI now caches Deno's npm/jsr dependency downloads and Playwright's
  Chromium binary across jobs and runs, instead of re-fetching both from
  scratch every time.
- `.vscode/` workspace configuration — recommended extensions, Deno as
  the TS/JS formatter, one-click tasks mirroring every CI check, and a
  Chrome-attach debug config wired to the same `BRIDGE_PORT`
  `live-scene.ts` already uses.
- `.gitattributes`, `.editorconfig`, `.githooks/pre-commit` (opt-in via
  `git config core.hooksPath .githooks`), `deno lint` in CI, and
  `scripts/validate-config-syntax.ts` — closing a real gap: no linting,
  no client-side check, and no automated config-syntax check existed
  before this.
- `extended-tests.yml` (Lane 2) — browser-based tests for `live-scene.ts`
  and `capture.ts` against in-memory fixtures. Runs on push/schedule, not
  PRs — see CONTRIBUTING.md's "Testing model."
- Lane 1 unit tests (`ci.yml`'s `test` job) — pure-logic coverage for
  `check-shader-bindings.ts`, `manifest.ts`, `diff.ts`, `git.ts`, and the
  extracted `hooks/render-relevant.mjs` predicate. CI ran no behavioral
  tests at all before this, only type-checking and formatting.
- Windows PowerShell equivalents for the two setup scripts that were
  macOS/Linux-only; `setup.ts` dispatches by platform automatically.
  `setup-pi.sh` stays Linux-only by definition.
- `/init` command + `templates/` — idempotent scaffolding for a real
  project, replacing what was a manual multi-step copy (see the
  maintainer's local UAT runbook, Phase 2).
- Core 1.0.0 feature set: four-evidence-channel correlated debugging
  (AGENTS.md §2); three subagents with distinct roles (`shader-reviewer`,
  `visual-debugger`, `scenario-author`); SHA-indexed visual regression
  suite; interactive commands (`/checkpoint`, `/diff`, `/sweep`,
  `/replay`, `/sync-view`); GLSL LSP integration; Spector MCP for
  GL-state debugging; AI-DLC compatibility (AGENTS.md §8); Raspberry Pi 5
  deployment path; OKF-conformant frontmatter; and CI (type-checking,
  formatting, schema validation, CodeQL, Dependabot, dist-purity).

### Changed
- Pivoted to a standalone plugin — no separate example/demo repo
  dependency; `/init`/`templates/` handle real-project scaffolding
  instead.
- Pivoted skill distribution — only `qa-visual-test-harness` ships by
  default; general three.js/WebGL knowledge skills are optional, not
  vendored (see `docs/RECOMMENDED-SKILLS.md`).
- `bump-patch.yml`'s Actions-tab display name shortened to "Auto-bump".
- `release.yml`'s `npm publish` step (used by `next`/`direct-stable`) now
  authenticates via npm Trusted Publishing (OIDC) instead of an
  `NPM_TOKEN` secret — npm's own tightened 2FA-for-publishing policy made
  a working CI token impractical (granular access tokens' "bypass 2FA"
  option isn't reliably obtainable as of this writing). `promote`'s `npm
  dist-tag add` step has no OIDC equivalent available (npm has no
  timeline for it) and now degrades gracefully instead: it tries with
  whatever token exists, and on failure prints the exact command to run
  manually rather than blocking the rest of `promote` (which doesn't need
  npm auth). See `docs/RELEASE-PROCESS.md`'s Safety Notes for the full
  story.

### Removed
- The custom dist zip attached to every GitHub Release — neither real
  install path (git-based marketplace clone, npm registry) ever read it;
  GitHub's own auto-attached source archive links are unaffected.

### Security
- Every third-party GitHub Action across all workflows is now pinned to a
  full commit SHA (with a `# vX.Y.Z` comment for readability — Dependabot
  still tracks and updates these) instead of a mutable version tag, per
  standard supply-chain hardening practice (OpenSSF Scorecard's
  "Pinned-Dependencies" check).

### Fixed
- `release.yml` had three bugs that would have failed the very first live
  run of the release pipeline, all found by actually running it rather than
  by review alone: Lane 1's `deno test` path order didn't match the fix
  already present in `ci.yml` (the `--ignore` glob silently stopped
  matching, crashing on an unrelated Playwright import); Lane 2 and the
  plugin/marketplace schema-validation steps were each missing a required
  flag (`--allow-all`, `-c ajv-formats`) that their `ci.yml`/`extended-tests.yml`
  counterparts already carried; and the version-bump commit pushed with the
  default `GITHUB_TOKEN`, which branch protection rejects outright (`main`
  requires PRs) — needed the same `BUMP_PAT` `bump-patch.yml` already used.
- Removed a redundant CodeQL `push` trigger: with `main` PR-gated, every
  merge was being scanned twice (once on the PR, again on the resulting
  merge commit) for no added coverage.
- The `.mcp.json` template — copied verbatim into every project by `/init`
  step 6, and what the README's "wires up automatically" install claim
  refers to — didn't pass `--headless` to `chrome-devtools-mcp` or
  `playwright-mcp`, so a real Chrome window opened unprompted at the start
  of any session using this plugin. `/init` never overwrites an existing
  `.mcp.json`, so this only fixes fresh scaffolds going forward; see the
  new README troubleshooting entry for how to fix a project that already
  has the old template copied in. `examples/raspberry-pi/mcp.json` is
  intentionally left headed — AGENTS.md §7a documents why headless
  rendering isn't reliable on that hardware. `/init` step 6 now actively
  checks for Pi hardware (`/proc/device-tree/model`, falling back to
  `uname -a`) and copies the Pi template instead of silently defaulting
  new Pi users into the now-headless default — found by testing this fix
  on the maintainer's own Pi 5 dev machine, which would otherwise have
  been silently misconfigured by its own bugfix.
- The previous fix for the unprompted-Chrome-window bug only covered
  `chrome-devtools-mcp` and `playwright-mcp`; `threejs-devtools-mcp` is a
  third, unrelated server in the same `.mcp.json` template that opens a
  visible browser at `localhost:9222` via a plain OS `xdg-open` call, not
  a Puppeteer launch — `--headless` in `args` does nothing to it, so it
  kept popping a window even on a freshly-scaffolded, already-"fixed"
  project. Found by the window reappearing on the maintainer's own
  machine right after cutting the release that shipped the first fix.
  Added `"HEADLESS": "true"` to its `env` block instead (its own
  documented mechanism for this) and updated the README troubleshooting
  entry to cover all three servers. `examples/raspberry-pi/mcp.json` is
  intentionally left headed on all three, unchanged.

### Known limitations at time of writing
- **A package's very first npm publish sets `latest` too, regardless of
  `--tag`** — confirmed directly against the registry on this project's
  actual first release: `npm publish --tag next` for `0.3.27` (this
  package's first publish ever) also set `latest` to `0.3.27`, since npm
  needs some version to serve a bare `npm install` from and there was no
  prior history to leave alone. This only happens once, on a true first
  publish — every `next` cut after that leaves `latest` alone as intended.
  See `docs/RELEASE-PROCESS.md`'s Step 0 for the corrected explanation
  (this superseded an earlier, incorrect version of this note that assumed
  `latest` wouldn't exist until `promote`).
- Real-hardware UAT (2026-07-31, Raspberry Pi 5, against `ceres`, a real
  npm-based three.js prototype) found 13 findings — all now resolved.
  4 fixed live during the run, 8 more fixed post-run (#8, #9, #10, #11,
  #12, #13, plus docs fixes #2/#3/#5/#6), and 1 (#7,
  `typescript-language-server` failing to initialize against real
  projects) conclusively triaged as a Claude Code core LSP-rooting
  behavior outside this plugin's control, documented in README.md's
  Troubleshooting rather than coded around. See
  `aidlc-docs/construction/build-and-test/uat-release-blockers.md` for
  full detail. No known release blockers remain.

## Prior to [Unreleased]

Development up to this point happened iteratively within a single
working history, not independently tagged — this changelog begins
tracking meaningfully at the first real release.
