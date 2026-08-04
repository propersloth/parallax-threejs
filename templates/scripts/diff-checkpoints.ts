// Usage: deno task diff-checkpoints -- [label]
// Mechanical half of /diff: finds the most recent checkpoint matching
// `label`, runs a fresh one, and diffs both (scene JSON, console, pixels).
// Does NOT decide what the diff *means* or write the human-readable
// report — that's still the agent's job per diff.md steps 4-6.
import { diffPngs } from "../test/visual/lib/diff.ts";

const label = Deno.args[0];
const dir = ".parallax/checkpoints";

async function findLatest(matchLabel?: string): Promise<string | null> {
  const entries: string[] = [];
  for await (const e of Deno.readDir(dir)) {
    if (
      e.name.endsWith(".json") &&
      (!matchLabel || e.name.includes(`-${matchLabel}.json`))
    ) {
      entries.push(e.name);
    }
  }
  entries.sort(); // ISO timestamps in the filename sort chronologically
  return entries.length ? entries[entries.length - 1] : null;
}

const priorName = await findLatest(label);
if (!priorName) {
  console.log(
    `No prior checkpoint found${
      label ? ` for label "${label}"` : ""
    } — nothing to diff against.`,
  );
  Deno.exit(0);
}

// Run a fresh checkpoint via the same script diff.md's step 2 already calls.
const fresh = await new Deno.Command("deno", {
  args: [
    "run",
    "--allow-net",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "scripts/checkpoint.ts",
    label ?? "diff-current",
  ],
}).output();
if (!fresh.success) {
  console.error(
    "checkpoint.ts failed while capturing the fresh state for comparison.",
  );
  Deno.exit(1);
}

const priorBase = priorName.replace(/\.json$/, "");
const priorData = JSON.parse(await Deno.readTextFile(`${dir}/${priorName}`));
const priorPng = await Deno.readFile(`${dir}/${priorBase}.png`);

const freshName = await findLatest(label);
const freshBase = freshName!.replace(/\.json$/, "");
const freshData = JSON.parse(await Deno.readTextFile(`${dir}/${freshName}`));
const freshPng = await Deno.readFile(`${dir}/${freshBase}.png`);

const { ratio } = diffPngs(priorPng, freshPng);

const newConsoleMessages = freshData.console.filter((m: string) =>
  !priorData.console.includes(m)
);

// Both sides need a memory field for a delta to mean anything — an older
// checkpoint predating this feature, or a project that's never exposed
// window.__renderer__, simply omits `memory` here rather than reporting
// a misleading delta against a missing baseline.
const memory = (priorData.memory && freshData.memory)
  ? {
    geometriesDelta: freshData.memory.geometries - priorData.memory.geometries,
    texturesDelta: freshData.memory.textures - priorData.memory.textures,
  }
  : null;

// Same graceful-absence handling as memory above — an older checkpoint
// predating Unit 2 simply omits `perf` here.
const perf = (priorData.perf && freshData.perf)
  ? {
    callsDelta: freshData.perf.calls - priorData.perf.calls,
    trianglesDelta: freshData.perf.triangles - priorData.perf.triangles,
    pointsDelta: freshData.perf.points - priorData.perf.points,
    linesDelta: freshData.perf.lines - priorData.perf.lines,
  }
  : null;

console.log(JSON.stringify(
  {
    compared: { prior: priorBase, fresh: freshBase },
    pixelDiffRatio: ratio,
    newConsoleMessages,
    sceneObjectCountPrior: priorData.scene.length,
    sceneObjectCountFresh: freshData.scene.length,
    memory,
    perf,
  },
  null,
  2,
));
