// Interactive setup for a project using the Parallax plugin. Run from
// your PROJECT root (not this plugin's own repo):
//
//   deno run -A <path-to-parallax-threejs-clone>/scripts/setup.ts
//
// Requires Deno already installed — on a fresh Raspberry Pi with nothing
// set up yet, run scripts/setup-pi.sh first (it bootstraps Deno itself,
// then hands off to this script automatically as its last step). On a
// machine that already has Deno, this runs standalone — this script
// itself is cross-platform (Windows/macOS/Linux) since Deno is, but it
// dispatches to setup-spector.sh (macOS/Linux) or .ps1 (Windows)
// depending on Deno.build.os, since those are POSIX-shell/PowerShell
// respectively, not Deno.
//
// Uses @clack/prompts via Deno's npm: interop — same pattern already
// used throughout this project (npm:playwright, npm:pngjs), no new
// toolchain requirement.
import * as p from "@clack/prompts";

function checkCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled.");
    Deno.exit(0);
  }
  return value as T;
}

async function run(cmd: string, args: string[]) {
  const command = new Deno.Command(cmd, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { success } = await command.output();
  return success;
}

// Windows can't run .sh scripts natively (no POSIX shell without WSL/Git
// Bash) and macOS/Linux don't have a native PowerShell — pick the
// platform's own script rather than assuming one interpreter everywhere.
function platformScript(baseName: string): [string, string[]] {
  if (Deno.build.os === "windows") {
    return ["powershell", [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      `scripts/${baseName}.ps1`,
    ]];
  }
  return ["sh", [`scripts/${baseName}.sh`]];
}

p.intro("Parallax — project setup");
p.note(
  "This is the WebGL options menu — the only one that exists today.\nOther render engines (WebGPU most likely next) get their own menu\nlater, one at a time, as bandwidth allows.",
  "Scope",
);

// --- Spector (GL-state debugging) ---
const wantSpector = checkCancel(
  await p.confirm({
    message:
      "Set up Spector for GL-state-level debugging? (clones + builds, one-time)",
    initialValue: false,
  }),
);
if (wantSpector) {
  const s = p.spinner();
  s.start("Running scripts/setup-spector.sh");
  const ok = await run(...platformScript("setup-spector"));
  s.stop(ok ? "Spector ready." : "Spector setup failed — check output above.");
}

// --- General three.js knowledge skill ---
const wantThreejsSkill = checkCancel(
  await p.confirm({
    message:
      "Install general three.js knowledge skill (cloudai-x/threejs-skills)?",
    initialValue: true,
  }),
);
if (wantThreejsSkill) {
  try {
    await Deno.stat(".claude/skills/threejs-fundamentals");
    p.note("Already installed — skipping.", "three.js skill");
  } catch {
    const s = p.spinner();
    s.start("npx skills add cloudai-x/threejs-skills");
    const ok = await run("npx", ["skills", "add", "cloudai-x/threejs-skills"]);
    s.stop(ok ? "Installed." : "Install failed — check output above.");
  }
}

p.note(
  "No single candidate is endorsed for WebGL debugging/error-handling —\nsee docs/RECOMMENDED-SKILLS.md and pick one yourself.",
  "Debugging skill",
);

// --- Physics ---
const physics = checkCancel(
  await p.select({
    message: "Physics engine?",
    options: [
      { value: "none", label: "Skip — no physics needed" },
      {
        value: "@dimforge/rapier3d",
        label: "Rapier — recommended default",
        hint: "fastest, WASM, actively maintained",
      },
      {
        value: "jolt-physics",
        label: "Jolt Physics",
        hint: "more features (soft bodies, vehicles), actively maintained",
      },
      {
        value: "cannon-es",
        label: "cannon-es",
        hint: "⚠ simplest API, but no longer actively maintained",
      },
    ],
  }),
);

// --- Animation / tweening ---
const animation = checkCancel(
  await p.select({
    message:
      "Animation / tweening library? (AnimationMixer for GLTF/skeletal stays separate regardless)",
    options: [
      { value: "none", label: "Skip — AnimationMixer / hand-rolled only" },
      {
        value: "gsap",
        label: "GSAP — recommended default",
        hint: "industry standard, fully free since v3.13",
      },
      {
        value: "@theatre/core",
        label: "Theatre.js",
        hint: "visual timeline editor, different workflow than code tweening",
      },
      {
        value: "@tweenjs/tween.js",
        label: "Tween.js",
        hint: "minimal footprint, fewer features",
      },
    ],
  }),
);

// --- Postprocessing ---
const postprocessing = checkCancel(
  await p.select({
    message: "Postprocessing library?",
    options: [
      { value: "none", label: "Skip — built-in EffectComposer only" },
      {
        value: "postprocessing",
        label: "pmndrs/postprocessing — recommended default for WebGL",
        hint: "more effects, actively maintained",
      },
    ],
  }),
);
p.note(
  "Not on the WebGL menu: three.js r183+'s RenderPipeline (formerly\nPostProcessing) requires WebGPURenderer — belongs to a future\nWebGPU menu, not this one. See docs/RECOMMENDED-DEPENDENCIES.md.",
  "Postprocessing",
);

// --- Audio ---
const audio = checkCancel(
  await p.select({
    message: "Audio library?",
    options: [
      { value: "none", label: "Skip — THREE.PositionalAudio (built-in) only" },
      {
        value: "howler",
        label: "Howler.js",
        hint: "sprites, fades, more mixing control",
      },
    ],
  }),
);

const toInstall = [physics, animation, postprocessing, audio].filter((v) =>
  v !== "none"
) as string[];

if (toInstall.length > 0) {
  const confirmed = checkCancel(
    await p.confirm({
      message: `Run "deno add npm:${toInstall.join('", "npm:')}"?`,
      initialValue: true,
    }),
  );
  if (confirmed) {
    const s = p.spinner();
    s.start(
      `Adding ${toInstall.length} dependenc${
        toInstall.length === 1 ? "y" : "ies"
      }`,
    );
    const ok = await run("deno", [
      "add",
      ...toInstall.map((pkg) => `npm:${pkg}`),
    ]);
    s.stop(
      ok
        ? "Added to deno.json."
        : "Failed — check output above, may need manual `deno add`.",
    );
  }
} else {
  p.note("Nothing selected — skipping dependency install.", "Dependencies");
}

p.outro(
  "Done. See docs/RECOMMENDED-SKILLS.md and docs/RECOMMENDED-DEPENDENCIES.md for anything skipped here.",
);
