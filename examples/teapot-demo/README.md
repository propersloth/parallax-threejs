# Teapot demo

A minimal, self-contained three.js scene — no build step, no bundler, one HTML
file loading three.js from a CDN via an import map. Exists for two reasons:

1. **The reference example for setting a project up for Parallax correctly.**
   `index.html` exposes exactly the three globals every Parallax command depends
   on — `window.scene`, `window.__THREE_CAMERA__`, `window.__renderer__` — and
   nothing else. If you're not sure whether your own project is wired up right,
   this is what "right" looks like.
2. **The subject for Parallax's own demo videos and screenshots.** Parallax's
   maintainer previously used a private project (`ceres`) for this, but
   private-project content can't appear in anything public — this scene exists
   so demo material never has to touch that boundary.

## Running it

Open `index.html` directly in a browser, or serve the directory locally (e.g.
`deno run --allow-net --allow-read jsr:@std/http/file-server . --port 3000`) if
the tool you're driving it with needs an `http://` origin rather than `file://`
— several Parallax commands' own tooling has hit that requirement (Lighthouse
audits reject `file://` outright; this scene doesn't have that constraint
itself, but serving it is a safe default).

## What's in the scene, and why

| Element                                       | Demonstrates                                                       |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `teapot` (named mesh, checker texture)        | `getObjectByName()` resolution; a real `TextureLoader` load path   |
| `shaderOrb` (custom `ShaderMaterial`)         | Real GLSL for `shader-reviewer` to actually review                 |
| `keyLight.intensity`                          | A continuous, tunable parameter — `/sweep`'s whole reason to exist |
| OrbitControls (Pointer-Events-based)          | `/sweep`, `/replay`'s `dragOrbit`/touch steps, `/sync-view`        |
| "Break lighting" / "Restore lighting" buttons | An on-demand, visible before/after for `/checkpoint` → `/diff`     |
| "Spawn"/"Dispose temp mesh" buttons           | `/memcheck`, and the memory/perf fields on `/checkpoint`/`/diff`   |

Built deliberately over-complete relative to any single demo — this scene is
meant to serve every future Parallax feature demo, not just the first one it was
built for (checkpoint/diff). See
`aidlc-docs/inception/application-design/component-design.md` in this repo's own
development history for the full design record.

No ceres content, no external asset dependency (the checker texture is generated
procedurally at load time, not fetched from anywhere) — fully offline-capable
once three.js itself is cached.
