# Parallax

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/propersloth/parallax-threejs/actions/workflows/ci.yml/badge.svg)](https://github.com/propersloth/parallax-threejs/actions/workflows/ci.yml)
[![CodeQL](https://github.com/propersloth/parallax-threejs/actions/workflows/codeql.yml/badge.svg)](https://github.com/propersloth/parallax-threejs/actions/workflows/codeql.yml)

> Shared-sight debugging for vanilla three.js / GLSL prototypes debugged
> mostly by eye.

Most existing tooling in this space either generates shader code via chat,
or does generic browser automation with no three.js awareness. Parallax
does neither — it fuses four evidence channels (live scene graph, browser
console/perf, raw GL state, and pixels) into one correlated diagnostic
loop, plus a SHA-indexed visual regression suite, so debugging a rendered
scene stops depending entirely on eyeballing screenshots.

## What's actually different here

- **Correlated diagnosis, not screenshot guessing.** Before proposing a
  fix, the core rule (AGENTS.md §2) is to gather evidence from at least two
  of {scene graph, console, pixels} — a screenshot-only diagnosis is
  treated as a guess, not a finding.
- **Three specialized subagents with genuinely distinct jobs**, not three
  flavors of the same thing: `shader-reviewer` catches binding mismatches
  *before* anything runs, `visual-debugger` diagnoses runtime symptoms,
  `scenario-author` turns confirmed fixes into permanent regression
  coverage.
- **A real visual regression suite** — screenshots indexed by git SHA,
  gated on significant diffs, never auto-accepted (a human has to sign off
  on every accepted change).
- **AI-DLC aware** (AGENTS.md §8) — if your project runs under AWS's AI-DLC
  three-phase workflow, this plugin participates in its audit trail rather
  than operating as an unrelated, silent side process.

## Install

```
/plugin marketplace add propersloth/parallax-threejs
/plugin install parallax-threejs
```

(or point Claude Code at this repo directly per the
[plugin marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces)
if you're not using a hosted marketplace)

## Usage example

Once installed, with your dev server running and `window.scene` exposed:

```
/checkpoint before-fix
```

Captures the current scene graph, console output, and a screenshot as one
labeled unit under `.parallax/checkpoints/`. Make a change, then:

```
/diff before-fix
```

Reports what actually changed — pixel diff ratio, any new console errors,
scene graph deltas — instead of you eyeballing two screenshots side by
side. Nothing gets auto-accepted; you decide whether the diff is the fix
working or a regression.

## Prerequisites

- A vanilla three.js project (no React Three Fiber — see AGENTS.md §0 for
  why the scope is deliberately narrow)
- Your prototype must expose `window.scene = scene` for the interactive
  debug scripts (`/checkpoint`, `/sweep`) to resolve anything — a
  widely-used three.js debugging convention, not something invented here,
  but not automatic either
- For `/sync-view`: also expose `window.__THREE_CAMERA__ = camera`.
  threejs-devtools-mcp's bridge only finds the camera two ways — this
  global, or traversing the scene graph for the first object with
  `.isCamera` set — and a camera that's never added as a scene child
  (an ordinary, valid three.js pattern) is invisible to the traversal
  fallback. Without this global, `/sync-view` fails with "No camera
  found in scene" even though the scene and camera are both perfectly
  valid (confirmed against threejs-devtools-mcp@0.2.1's actual bridge
  source — UAT finding #10)
- Node.js and Deno on your system PATH:

  ```bash
  # Deno — macOS/Linux
  curl -fsSL https://deno.land/install.sh | sh
  ```
  ```powershell
  # Deno — Windows
  irm https://deno.land/install.ps1 | iex
  ```

  Node.js: install from [nodejs.org](https://nodejs.org) or your
  platform's package manager (`brew install node`, `apt install nodejs`,
  the Windows installer) — needed for the `npx`-based MCP servers
  regardless of OS.

## What's here vs. what you bring

This repo is the plugin only — the four MCP servers it configures
(chrome-devtools-mcp, threejs-devtools-mcp, playwright-mcp, Spector) are
external dependencies fetched at install/setup time, not vendored.
`scripts/setup-spector.sh` handles Spector's one-time clone-and-build step.

Run `/init` in your actual three.js project to scaffold the interactive
debug scripts and visual regression harness into it — idempotent, only
adds what's missing. See `commands/init.md` for exactly what it does.

Skills: only `qa-visual-test-harness` ships by default — it documents
this plugin's own regression suite, which nothing external can
substitute for. General three.js/WebGL knowledge is deliberately not
bundled; see [docs/RECOMMENDED-SKILLS.md](docs/RECOMMENDED-SKILLS.md) for
optional additions, or bring whatever skill bundle you already prefer.

## Full behavioral spec

`AGENTS.md` at the repo root is the complete instruction set Claude reads
when this plugin is active — routing rules, the evidence-correlation
discipline, the AI-DLC integration, all of it. This README is the human
quick-start; AGENTS.md is the actual spec.

## Markdown conventions

This repo's markdown files follow [OKF](https://okf.md/spec) (Open
Knowledge Format) where it applies — a minimal YAML-frontmatter
convention, not a heavy schema. Concretely:

- **Exempt entirely**: `AGENTS.md` (the spec's own stated position —
  behavior instructions are a different layer from knowledge, not
  something OKF covers) and `README.md` files throughout this repo
  (navigation/meta docs, same bucket).
- **`type` field added** to existing frontmatter, no other structure
  changed: `agents/*.md` → `type: Agent Definition`, `commands/*.md` →
  `type: Slash Command`, `skills/*/SKILL.md` → `type: Skill`.
- **Vendored content, if you add any, is exempt.** If you install an
  optional skill bundle per `docs/RECOMMENDED-SKILLS.md`, don't retrofit
  this repo's OKF conventions onto it — content pulled from an external
  source you don't curate doesn't get our frontmatter policy imposed on
  it. (This repo itself no longer ships any vendored skill content, so
  this only applies to what you add yourself.)

This is deliberately the conformance floor, not a full OKF bundle — no
`index.md`, no `log.md`; git history and this plugin's release notes
already cover what those would duplicate.

## Troubleshooting

- **GLSL/LSP diagnostics not appearing** — check `/plugin` → Errors for a
  missing-binary message before assuming `.lsp.json` is misconfigured;
  `shader_language_server` has to be on PATH separately.
- **`/checkpoint` or `/sweep` errors resolving an object** — your
  prototype needs `window.scene = scene` exposed somewhere; nothing in
  `scripts/` can resolve anything without it.
- **Spector tools not available** — run `scripts/setup-spector.sh` once;
  it's vendored (cloned + built), not npm-installable, so it doesn't
  happen automatically on plugin install.
- **Performance numbers look wrong on Raspberry Pi** — read AGENTS.md
  §7a before trusting FPS/timing output on that hardware specifically;
  it's a documented hardware limitation, not a bug in this plugin.

## License

MIT — see LICENSE.
