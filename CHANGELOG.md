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
  project, replacing what was a manual multi-step copy (see
  UAT-RUNBOOK.md Phase 2).
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

### Known limitations at time of writing
- Real-hardware UAT (2026-07-31, Raspberry Pi 5, against `ceres`, a real
  npm-based three.js prototype) found 13 findings, 4 fixed live during
  the run; 2 more (#8, #12) fixed post-run, 7 still open — see
  UAT-RUNBOOK.md's Sign-off section and
  `aidlc-docs/construction/build-and-test/uat-release-blockers.md` for
  full detail. Highest-severity open findings, all needing real code
  fixes before 1.0.0:
  - `/checkpoint`, `/sweep`, `/replay`, `/diff-checkpoints` cannot
    attach to the browser at all — `live-scene.ts`'s Playwright
    `connectOverCDP` assumption doesn't match how `chrome-devtools-mcp`
    actually launches Chrome (`--remote-debugging-pipe`, no CDP TCP
    port).
  - The visual regression suite (`deno task visual:run`) is broken for
    any target project that already has its own `node_modules/` (i.e.
    most real npm-based three.js projects, `ceres` included) — Deno
    routes its `npm:pixelmatch`/`npm:pngjs` imports through that local
    `node_modules/` instead of Deno's own cache, and neither package is
    there.
  - `check-shader-bindings.ts` produced a 28/28 false-positive rate on
    its first real-world run — it doesn't recognize the
    `onBeforeCompile` + `shader.uniforms.X = ...` binding idiom, only
    literal `uniforms: {...}` object literals.

## Prior to [Unreleased]

Development up to this point happened iteratively within a single
working history, not independently tagged — this changelog begins
tracking meaningfully at the first real release.
