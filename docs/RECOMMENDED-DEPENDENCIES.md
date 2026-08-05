# Recommended dependencies

Distinct from `docs/RECOMMENDED-SKILLS.md`: these are actual runtime
libraries your *project* would depend on, not Claude Code skills. A
skill teaches Claude how to use a library; it doesn't make the library
exist in your project. Neither category is bundled with Parallax itself
— the core debug loop doesn't need any of this.

## The WebGL options menu

Everything below is **the WebGL menu** — curated for `WebGLRenderer`,
matching Parallax's current scope (AGENTS.md). Sibling WebGPU and WebXR
menus now exist too (below) — each menu gets its own research and
curation, not folded into a single undifferentiated list. Don't assume a
WebGL-menu pick applies unchanged to `WebGPURenderer` or a WebXR
session; check the relevant menu first.

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

Not listed as an option above because it requires `WebGPURenderer`,
outside this menu's scope: three.js r183+'s `RenderPipeline` (formerly
named `PostProcessing`), a node-based, WebGPU-native replacement for
`EffectComposer`. See the WebGPU menu's own Postprocessing section
below — that future has arrived.

### Audio

- **[Howler.js](https://howlerjs.com/)** — the standard choice for
  general web audio (sprites, fades, spatial panning) when you want more
  than three.js's built-in audio offers.
- **`THREE.PositionalAudio`** (built-in) — sufficient for basic
  scene-attached spatial audio without an extra dependency; reach for
  Howler when you need more control over mixing/sprites/fades than the
  built-in gives you.

## The WebGPU options menu

Everything below is **the WebGPU menu** — curated for `WebGPURenderer`.
Researched fresh for this menu, not inherited from the WebGL menu above
— physics, animation/tweening, and audio turn out to carry over
unchanged (none of them touch the rendering pipeline directly), but
postprocessing does not, and that's the one section worth reading even
if you already know the WebGL menu well.

As of writing, `WebGPURenderer` is production-ready: three.js has
shipped it with zero-config import and automatic `WebGLRenderer`
fallback since r171, and WebGPU itself reached full cross-browser
support (Chrome, Edge, Firefox, Safari including iOS) in early 2026 —
effectively ~95% of users get real WebGPU, the rest fall back
automatically. This isn't an experimental-flag-behind choice anymore.

Researched at time of writing — this space moves at least as fast as
the WebGL menu's own libraries; re-verify before trusting these as
permanently current.

### Physics

Same three options as the WebGL menu — **[Rapier](https://rapier.rs/)**
remains the recommended default, **[Jolt Physics](https://github.com/jrouwe/JoltPhysics.js)**
the feature-richer alternative, cannon-es the same confirmed-unmaintained
caveat applies. Physics computation happens WASM/CPU-side and only syncs
transforms back to three.js objects — it doesn't touch the renderer, so
renderer choice doesn't change the recommendation. Confirmed directly
against three.js's own addon-support tracking: both `RapierPhysics.js`
and `JoltPhysics.js` are marked supported under `WebGPURenderer`.

One narrow caveat, specific to debugging, not physics itself: Rapier's
`RapierHelper` (the debug-visualization wireframe) has a confirmed,
reported issue under `WebGPURenderer` where its mesh doesn't update to
reflect current physics-body positions. Physics itself works correctly;
only that debug overlay is affected.

### Animation / tweening

Same as the WebGL menu, unchanged — **[GSAP](https://gsap.com/)**
remains the recommended default, **[Theatre.js](https://www.theatrejs.com/)**
and Tween.js the same alternatives, three.js's built-in `AnimationMixer`
still the right tool for GLTF/skeletal/keyframe animation specifically.
All of these tween JS object properties or manage keyframe data — none
of it is renderer-pipeline-specific, so there's nothing WebGPU changes
here.

### Postprocessing

This is the section that's actually different from the WebGL menu —
`WebGPURenderer` doesn't support the legacy `EffectComposer` pass system
at all; it ships its own node-based post-processing stack instead.

- **`RenderPipeline`** (three/addons, built into three.js, formerly
  named `PostProcessing` before r183's rename) — **recommended
  default.** Node-based, written in TSL (Three.js Shading Language),
  targets `WebGPURenderer` with automatic `WebGLRenderer` fallback,
  handles tone mapping and resize automatically. Zero extra dependency
  — it ships with three.js itself. Common effects (bloom, outline,
  SSR, and WebGPU-exclusive ones like SSGI) are already ported as node
  classes; some older individual passes (`ShaderPass`, `MaskPass`,
  `BloomPass`) are confirmed **not** being ported at all — their
  node-based replacements are the only path forward for those specific
  effects, not a temporary gap.
- **[pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
  v7+** — has adopted a similar `RenderPipeline`-based architecture with
  `WebGPURenderer` support, worth it if you specifically want pmndrs'
  broader effect catalog. Caveat, not a blocker: not every effect has
  been individually verified against `WebGPURenderer` yet — test the
  specific effects you need rather than assuming full parity with its
  WebGL-era coverage.
- **Legacy `EffectComposer`** — **does not carry over from the WebGL
  menu.** Not a choice here at all; it's built on the pass system
  `WebGPURenderer` doesn't support.

### Audio

Same as the WebGL menu, unchanged — **[Howler.js](https://howlerjs.com/)**
and built-in `THREE.PositionalAudio` both sit on the Web Audio API, which
has no relationship to the rendering backend at all.

## The WebXR options menu

Everything below is **the WebXR menu** — curated for VR/AR sessions on
top of either renderer. Out of scope entirely: `@react-three/xr` — it's
React Three Fiber-based, which this plugin's own scope discipline
excludes regardless of how good the library is (AGENTS.md's "no React
Three Fiber, no second three.js stack path"). Everything here targets
vanilla three.js's own WebXR support.

Researched at time of writing — this space moves fast and unevenly (see
the browser support note below in particular); re-verify before trusting
these as permanently current.

### Browser and device support — read this before picking anything else

Unlike the WebGPU menu's "~95% coverage" story, WebXR support is
genuinely fragmented by browser and device, not just a matter of an
old-browser tail:

- **Chrome**: full support, desktop and Android (including Samsung
  Galaxy XR).
- **Safari**: WebXR ships only on visionOS (Apple Vision Pro), with a
  gaze-and-pinch input model distinct from controller/hand tracking.
  **Not implemented on macOS, iOS, or iPadOS** — an iPhone or iPad
  cannot run a WebXR session in Safari at all, handheld AR included.
- **Firefox**: **no WebXR support**, desktop or Android — Mozilla paused
  the implementation after discontinuing Firefox Reality.
- **Meta Quest Browser**: full support, including passthrough AR, plane
  detection, anchors, and hand tracking.
- **Samsung Internet, Opera**: full support on compatible devices.

Practical consequence: "WebXR-capable" means a real, device-specific
subset of your users, not "everyone except stragglers." Design a
non-XR fallback path as a first-class requirement, not an afterthought —
most of your audience will hit it. Interop 2026 lists WebXR as a
coordination focus area, so cross-browser gaps are actively being
worked but aren't closed yet.

### Controller and hand tracking

No third-party pick needed — this ships with three.js itself, unlike
every other section on this menu.

- **`XRControllerModelFactory`** (`three/addons/webxr/`) — fetches and
  renders a visual model matching the controller the user is actually
  holding. Built in, zero extra dependency.
- **`XRHandModelFactory`** (`three/addons/webxr/`) — same idea for
  hand-tracking input, with three built-in model styles ("spheres",
  "boxes", "mesh"). Hand tracking itself is a device capability (Quest
  supports it via WebXR; whether a given headset/browser combination
  does is part of the fragmentation above, not something this library
  controls).

### Locomotion / teleportation

Also not a third-party-library decision the way physics or animation
are. The standard approach — nest the camera and controllers in a group,
move the group to relocate the player — is demonstrated directly in
three.js's own [`webxr_vr_teleport`](https://threejs.org/examples/webxr_vr_teleport.html)
example, not packaged as an installable addon. A few small community
libraries exist (e.g. `smarthug/teleport`, TeleportVR) if you want a
pre-built version of the same pattern, but none has the kind of
ecosystem weight that makes Rapier or GSAP an easy default pick here —
reading the official example and adapting it is a reasonable, common
path.

### Physics

Same as the WebGL/WebGPU menus, unchanged — **[Rapier](https://rapier.rs/)**
remains the recommended default, **[Jolt Physics](https://github.com/jrouwe/JoltPhysics.js)**
the feature-richer alternative, cannon-es the same confirmed-unmaintained
caveat applies. Nothing about WebXR changes this: physics computation is
WASM/CPU-side and only syncs transforms back to three.js objects — it
doesn't touch the renderer or the XR session either.

### Animation / tweening

Same as the WebGL/WebGPU menus, unchanged — **[GSAP](https://gsap.com/)**
remains the recommended default, **[Theatre.js](https://www.theatrejs.com/)**
and Tween.js the same alternatives, `AnimationMixer` still the right
tool for GLTF/skeletal/keyframe animation. None of this is
renderer-pipeline- or XR-session-specific.

### Postprocessing — no recommended default, deliberately

Every other section on every menu in this document names a recommended
default. This one doesn't, because the honest current state doesn't
support picking one:

- **Legacy `EffectComposer`** has long-standing, still-open reports of
  breaking entirely inside a WebXR session — content that renders fine
  before entering VR/AR renders nothing, or renders only to one eye,
  once the session starts. Not a configuration mistake to work around;
  a structural mismatch between how `EffectComposer` handles render
  targets and how an XR session's stereo rendering works.
- **`RenderPipeline`** (the WebGPU menu's own recommended default) has
  active but **unstable, in-progress** work specifically for WebXR as of
  this writing — "enable single-pass rendering in WebXR" is still an
  open draft PR against three.js's own repo, targeting a future release
  rather than shipped. Don't treat WebGPU's postprocessing recommendation
  as carrying over into an XR session; it doesn't yet.
- **pmndrs/postprocessing** has confirmed, acknowledged effort underway
  toward WebXR support, not a finished story either.

Practical guidance until this settles: keep XR sessions visually simple
(tone mapping and basic material work go a long way) rather than reaching
for full post-processing, or gate postprocessing off entirely while an
XR session is active and re-enable it on exit. Re-check this section
specifically before trusting any "it works now" claim — this is the one
area of the whole document most likely to be stale shortly after
writing.

### Audio

Same as every other menu, unchanged — **[Howler.js](https://howlerjs.com/)**
and built-in `THREE.PositionalAudio` both sit on the Web Audio API, which
has no relationship to the rendering backend or XR session state.
`THREE.AudioListener` follows the active camera automatically, XR or not.

## Installing any of these

`scripts/setup.ts`'s interactive picker currently only offers the WebGL
menu's picks (see its own in-picker note) — the WebGPU and WebXR menus
above aren't wired into it yet. For anything on any menu,
`deno add npm:<package>` directly in your project's `deno.json` works
regardless of whether the picker knows about it.
