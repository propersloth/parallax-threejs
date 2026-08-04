# Parallax Three.js

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@propersloth/parallax-threejs)](https://www.npmjs.com/package/@propersloth/parallax-threejs)
[![CI](https://github.com/propersloth/parallax-threejs/actions/workflows/ci.yml/badge.svg)](https://github.com/propersloth/parallax-threejs/actions/workflows/ci.yml)
[![CodeQL](https://github.com/propersloth/parallax-threejs/actions/workflows/codeql.yml/badge.svg)](https://github.com/propersloth/parallax-threejs/actions/workflows/codeql.yml)

**Give Claude Code actual eyes on your three.js scene, so it stops guessing and starts diagnosing.**

You're building the three.js project you've always wanted (a portfolio piece, a weird little game, an interactive art thing) mostly by vibe-coding it with Claude. It's going great, right up until something on screen looks *wrong* and you can't say why. So you paste a screenshot. Claude guesses. You try the guess. It doesn't fix it. You paste another screenshot.

That loop isn't your fault. A screenshot is the least informative thing you can debug from: a black object could be an unlit material, a missing texture, a shader error, or the camera clipping through it, and a picture alone can't tell those apart. Parallax gives Claude the same access you'd want if you could see under the hood yourself: the live scene graph, the browser console, raw GPU state, and pixels, correlated together instead of guessed from one alone.

## The stuff you didn't know you were missing

- **"Why is this thing invisible?"** Claude checks the scene graph (materials, transforms, shader compile status), the console (a silently failed texture load, maybe), and the pixels together, then tells you which one actually explains it.
- **"I tweaked one thing and now I'm scared something else broke without me noticing."** Run `/checkpoint` before and `/diff` after. You get a pixel diff, a console diff, and a scene-graph diff — plus, if you've exposed `window.__renderer__`, a memory and perf (draw-call/triangle) delta too — instead of two browser tabs and your own eyeballs.
- **"I'm doing the '0.6... okay, 0.7...' dance with a light color or intensity."** `/sweep` renders the whole range at once as a contact sheet, so you see every option side by side instead of bisecting by hand one slow reload at a time.
- **"I keep manually re-doing the same click-hover-drag just to check something."** `/replay` records the interaction once and reruns it exactly every time, so you're not left wondering if you hovered the same spot as last time.
- **"Two screenshots look different and I can't tell if that's the bug or the camera drifted."** `/sync-view` pins the camera to an exact, named framing, so a comparison is finally comparing the same shot.
- **"My shader compiles fine but looks wrong, and the error console is useless."** The `shader-reviewer` subagent catches uniform and attribute mismatches, plus vertex/fragment drift a syntax checker can't see, before you even hit run.
- **"Memory keeps climbing the longer I leave this running, and I don't know what I forgot to dispose."** `/memcheck` checks for undisposed geometries/textures/materials on demand — and once a leak fix is confirmed, it can carry a memory expectation into the regression suite the same way a visual fix carries a pixel one, so it can't quietly come back.
- **"I want to know my last five fixes didn't quietly wreck the three things I fixed last week."** A git-SHA-indexed visual regression suite flags meaningful changes for your own review. Nothing gets auto-approved behind your back.

Built for solo devs and hobbyists vibe-coding a real three.js/WebGL project with Claude Code. If you're a professional game dev with your own engine and pipeline already, this probably isn't for you. It's scoped tightly and deliberately to vanilla three.js: no React Three Fiber, no framework detection, one stack, done well.

## Install

```
/plugin marketplace add propersloth/parallax-threejs
/plugin install parallax-threejs
```

Prefer installing through npm instead? Same marketplace, different plugin name:

```
/plugin marketplace add propersloth/parallax-threejs
/plugin install parallax-threejs-npm@propersloth
```

Same plugin either way, just updated via the npm registry instead of this git repo directly. Both of these are commands you type directly into a Claude Code session, not a URL to open in a browser.

## Prerequisites

- **A vanilla three.js project.** No React Three Fiber. See the opening of `AGENTS.md` if you're curious why the scope stays this narrow on purpose.
- **Your scene needs to be reachable.** Add `window.scene = scene` somewhere in your setup code. This is how the debug tools find anything at all. It's a common three.js debugging convention, not something Parallax invented, but it won't happen on its own.
- **For `/sync-view` specifically**, also expose `window.__THREE_CAMERA__ = camera`. Without it, camera discovery falls back to scanning the scene graph for the first object with `.isCamera` set, which misses a camera that's constructed but never added as a scene child (an ordinary, valid pattern). If `/sync-view` says "No camera found" even though your scene is fine, this is almost always why.
- **For a memory/dispose snapshot in `/checkpoint`, `/diff`, and the regression suite's optional `memoryThreshold` check, plus a draw-call/triangle/point/line perf snapshot in `/checkpoint`/`/diff`**, also expose `window.__renderer__ = renderer`. This one's optional — everything else works exactly the same without it, both fields are just omitted.
- **Node.js and Deno**, both on your system `PATH`:

  ```bash
  # Deno, macOS/Linux
  curl -fsSL https://deno.land/install.sh | sh
  ```
  ```powershell
  # Deno, Windows
  irm https://deno.land/install.ps1 | iex
  ```

  Node.js: grab it from [nodejs.org](https://nodejs.org) or your platform's package manager (`brew install node`, `apt install nodejs`, the Windows installer). Needed for the `npx`-based tools regardless of OS.

## Try it in 60 seconds

First, one-time setup in your actual project (not this repo):

```
/init
```

This copies the debug scripts and the visual regression harness into your project. Nothing above works without it. Safe to run more than once. It only fills in what's missing and never overwrites your own edits.

Now get your dev server running with `window.scene` exposed, and try:

```
/checkpoint before
```

That's a snapshot of the scene graph, console, and a screenshot, bundled together as one labeled unit. Now go make the change you were going to make anyway. Then:

```
/diff before
```

Instead of squinting at two screenshots, you get a real report: what moved, what didn't, whether any new console errors showed up, and how big the visual difference is. You decide whether that's the fix working or a regression. Parallax never makes that call for you.

That's the whole minimum setup. Two optional add-ons worth knowing about once you're past it:

- **[Recommended skills](docs/RECOMMENDED-SKILLS.md)**: general three.js/WebGL knowledge for Claude, on top of the debugging loop. Not bundled, genuinely optional.
- **[Recommended dependencies](docs/RECOMMENDED-DEPENDENCIES.md)**: a curated pick of physics, animation, and postprocessing libraries, if your project needs any of that.

## Your toolkit

| Command | What it's actually for |
|---|---|
| `/init` | Run this first, once per project. Scaffolds everything below into your actual project. |
| `/checkpoint <label>` | Snapshot the scene graph, console, and a screenshot as one unit before you change anything. |
| `/diff <label>` | Compare right now against that snapshot: pixel diff, console diff, scene-graph diff, one report. |
| `/sweep <object> <property> <range>` | Render every value in a range at once as a contact sheet, instead of testing values one at a time. |
| `/replay <scenario>` | Rerun a recorded interaction (hover, click, drag) exactly, instead of doing it by hand again. |
| `/sync-view <name>` | Snap the camera to an exact, reusable framing so comparisons stay honest. |
| `/memcheck [object]` | On-demand check for undisposed geometries/textures/materials, without waiting for a symptom. |

Behind these, three specialized subagents handle the heavier diagnostic work automatically: `shader-reviewer` catches shader bugs before they ever run, `visual-debugger` correlates all four evidence channels when something's actively wrong, and `scenario-author` turns a confirmed fix into permanent regression coverage. You generally won't call these by name; Claude reaches for the right one based on what you're doing.

## What happens under the hood

Installing the plugin wires up four browser/GPU inspection tools automatically (chrome-devtools-mcp, threejs-devtools-mcp, playwright-mcp, and Spector for raw GL state), so you don't configure any of this by hand. The one exception is Spector, which needs a one-time build step (`scripts/setup-spector.sh`) if you want raw GL-state debugging specifically, since it's cloned and compiled rather than installed like the others. Skip it until you actually need it.

## When something's not working

- **GLSL diagnostics not showing up.** Check `/plugin` → Errors for a missing-binary message first. `shader_language_server` needs to be on your `PATH` separately from the plugin itself. Installed it via `cargo install` and it's still not found? Make sure `~/.cargo/bin` is on `PATH` for the process running Claude, not just your interactive shell. Those can differ.
- **TypeScript diagnostics not showing up.** The official LSP plugin doesn't ship a binary: `npm install -g typescript-language-server typescript`.
- **TypeScript LSP says "Could not find a valid TypeScript installation"** even though `typescript` is right there in your project. This is a Claude Code LSP-rooting quirk (it roots at your session's working directory, not the specific file's project), not a bug in this plugin or in `typescript-language-server` itself. Fix: make sure your session's working directory is the actual TypeScript project you need diagnostics for.
- **`/checkpoint` or `/sweep` can't resolve an object.** You're missing `window.scene = scene`. See Prerequisites above.
- **Spector tools missing.** Run `scripts/setup-spector.sh` once. It's a clone-and-build step, not an npm install, so it doesn't happen automatically.
- **Performance numbers look off on Raspberry Pi.** Read `AGENTS.md` §7a before trusting any FPS/timing number on that hardware specifically. It's a known GPU-pipeline quirk on that platform, not a bug here.

## Want the deep end?

`AGENTS.md` is the complete instruction set Claude reads when this plugin is active: every routing rule, the evidence-correlation discipline behind the debug loop, all of it. This README is the pitch and the quick start; `AGENTS.md` is the real spec. Looking to contribute? See `CONTRIBUTING.md`.

## License

MIT. See [LICENSE](LICENSE).
