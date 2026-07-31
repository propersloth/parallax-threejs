# Recommended dependencies

Distinct from `docs/RECOMMENDED-SKILLS.md`: these are actual runtime
libraries your *project* would depend on, not Claude Code skills. A
skill teaches Claude how to use a library; it doesn't make the library
exist in your project. Neither category is bundled with Parallax itself
— the core debug loop doesn't need any of this.

## The WebGL options menu

Everything below is **the WebGL menu** — curated for `WebGLRenderer`,
matching Parallax's current scope (AGENTS.md). It's the only menu that
exists today. The plan is to add a sibling menu per render engine
(WebGPU most likely next) one at a time as bandwidth allows — each
getting the same level of research and curation as this one, not folded
into a single undifferentiated list. Until a WebGPU menu (or others)
exist, nothing here should be assumed to apply there.

Researched at time of writing (see `scripts/setup.ts`'s interactive
picker) — this space moves; re-verify before trusting these as
permanently current, especially the physics section.

### Physics

- **[Rapier](https://rapier.rs/)** (`@dimforge/rapier3d`) — **recommended
  default.** Rust/WASM, SIMD-accelerated, 2-5x faster than 2024 releases,
  deterministic, full CCD and joint support. Three.js's own manual now
  ships a `RapierPhysics` addon wrapper for quick starts. Requires async
  WASM init (`await RAPIER.init()`).
- **[Jolt Physics](https://github.com/jrouwe/JoltPhysics.js)**
  (`jolt-physics`) — the engine behind Horizon Forbidden West, ported to
  WASM. More features than Rapier (soft bodies, cloth, vehicle
  controllers), actively maintained. Three.js's manual also ships a
  `JoltPhysics` addon wrapper. Worth it specifically if you need those
  extra features; otherwise Rapier is simpler to reach for.
- **cannon-es** — the previous default recommendation for "simple
  prototyping." **As of writing, three.js's own manual flags it as no
  longer actively maintained** (no commits in a couple years). Still
  works, pure JS with no WASM init step, but going in with eyes open —
  this is a real, confirmed downgrade from where it stood a year or two
  ago, not a style preference.

### Animation / tweening

- **[GSAP](https://gsap.com/)** — **recommended default** for property/
  camera/scene tweening. Industry standard, fully free since v3.13 (no
  more paid plugin tier), integrates directly (`gsap.to(object.position, {...})`).
- **[Theatre.js](https://www.theatrejs.com/)** — different tool for a
  different workflow: a visual timeline editor for animating a three.js
  scene, not a code-driven tweening library. Worth it specifically if you
  or a collaborator want to hand-key animation visually rather than in
  code.
- **Tween.js** — minimal-footprint alternative if GSAP feels like too
  much dependency for what you need; fewer features, smaller.
- Note: three.js's built-in `AnimationMixer` remains the right tool for
  GLTF/skeletal/keyframe animation specifically — none of the above
  replace it, they're for property tweening and scene-level sequencing.

### Postprocessing

- **[pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)** —
  **recommended default.** More effects and better performance
  characteristics than the built-in `EffectComposer`, actively
  maintained.
- **Legacy `EffectComposer`** (`three/examples/jsm/postprocessing`) —
  still works, no extra dependency, but confirmed less capable than
  pmndrs' library.

Not listed as an option above because it doesn't work in this project's
scope: three.js r183+ also shipped a `RenderPipeline` (formerly named
`PostProcessing`) — a node-based, WebGPU-native replacement for
`EffectComposer`. It requires `WebGPURenderer`, which isn't part of the
WebGL menu. Not a choice here — it belongs to a future WebGPU menu, not
this one.

### Audio

- **[Howler.js](https://howlerjs.com/)** — the standard choice for
  general web audio (sprites, fades, spatial panning) when you want more
  than three.js's built-in audio offers.
- **`THREE.PositionalAudio`** (built-in) — sufficient for basic
  scene-attached spatial audio without an extra dependency; reach for
  Howler when you need more control over mixing/sprites/fades than the
  built-in gives you.

## Installing any of these

`scripts/setup.ts`'s interactive picker offers to run `deno add npm:<package>`
for whichever you select, directly in your project's `deno.json`. You can
also just run that command yourself for anything not listed here.
