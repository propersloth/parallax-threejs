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
