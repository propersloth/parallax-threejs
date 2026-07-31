# Recommended skills (optional — not shipped)

Parallax's core debugging loop (commands, hooks, agents, MCP servers)
doesn't depend on any general three.js/WebGL knowledge skill being
installed. The one skill that ships in `skills/` —
`qa-visual-test-harness` — documents Parallax's *own* regression suite
specifically; nothing external substitutes for it.

Everything below is genuinely optional, genuinely swappable, and
deliberately not vendored into this repo — these are other people's
projects, actively maintained elsewhere, and different projects will
have different preferences here. Pick what fits, skip what doesn't, or
bring something else entirely.

## Quick setup

```bash
deno run -A <path-to-parallax-threejs-clone>/scripts/setup.ts
```

Interactive — walks through skills, Spector, and the physics/animation/
postprocessing/audio choices in `docs/RECOMMENDED-DEPENDENCIES.md` in one
pass. Run from your actual project root, not the plugin's own repo.

For a non-interactive/CI-friendly install of just the general three.js
skill bundle specifically:

```bash
sh <path-to-parallax-threejs-clone>/scripts/setup-recommended-skills.sh    # macOS/Linux
```
```powershell
<path-to-parallax-threejs-clone>\scripts\setup-recommended-skills.ps1     # Windows
```

Both are idempotent — safe to re-run, skip anything already installed.

> [!TIP]
> Windows may block the `.ps1` with "running scripts is disabled on this
> system" — a default PowerShell execution-policy restriction, not a
> problem with the script itself. Either run
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first, or
> invoke it as `powershell -ExecutionPolicy Bypass -File scripts\setup-recommended-skills.ps1`.
> `setup.ts` already does the latter automatically when it dispatches to
> this script for you.

> [!WARNING]
> Installs project-scoped only (no `-g`/global) — as of writing, global
> `npx skills add -g` installs land in `~/.agents/skills/` and are not
> reliably recognized by Claude Code's Skill tool without a manual
> symlink workaround (a real, currently-open upstream issue). If you
> install anything from this page manually rather than via the script,
> skip `-g` for the same reason.
>
> Also worth remembering: these run with full agent permissions once
> installed — review a skill's source before adding it, same as you
> would any other dependency.

## General three.js knowledge

[cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills) —
10 skills covering fundamentals, geometry, materials, lighting, textures,
shaders, animation, interaction, loaders, postprocessing. Install with:

```bash
npx skills add cloudai-x/threejs-skills
```

Not the only option — any three.js skill bundle that follows the
standard `SKILL.md` convention works the same way. If you already have
one you prefer, use that instead.

## WebGL debugging / error handling

Candidates worth evaluating, not vendored or endorsed as *the* answer:

- `debug-devtools` / `error-handling-recovery` skills from
  [three-best-practices](https://agentskills.me/skill/three-best-practices)
  — WebGL context loss, draw-call/memory diagnosis, shader-compiles-but-
  wrong-output patterns.
- `threejs-debug-profiler` from
  [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
  — an alternative covering similar ground with a different structure.

## Physics

Only relevant if your project actually has a physics dependency — most
three.js prototypes don't. See
[docs/RECOMMENDED-DEPENDENCIES.md](RECOMMENDED-DEPENDENCIES.md) for the
actual library choice (Rapier/Jolt/cannon-es) — that's a separate
decision from the skill. If you do add a physics library, a
`physics-integration` skill covering rigid bodies, colliders, and the
common Vec3/Vector3 conversion mistakes is worth adding too; several
exist in the wild, none bundled here since it's genuinely conditional on
something this repo can't know about your project.

## Wiring a skill in once installed

If you add a general-purpose skill and want AGENTS.md's routing table to
reflect it explicitly (rather than relying on the skill's own
description to trigger it), add a row under §1 pointing at it by name —
see the existing `qa-visual-test-harness` row for the pattern. This is
optional; skills trigger on their own `description` field regardless of
whether AGENTS.md mentions them.
