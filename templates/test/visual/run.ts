import { captureScenario } from "./lib/capture.ts";
import { diffPngs } from "./lib/diff.ts";
import {
  keyframeDir,
  lastAccepted,
  loadManifest,
  saveManifest,
} from "./lib/manifest.ts";
import { currentSha, isDirty } from "./lib/git.ts";
import type { Scenario } from "./lib/types.ts";

const DEFAULT_THRESHOLD = 0.02; // 2% of pixels
const BASE_URL = Deno.env.get("VISUAL_TEST_BASE_URL") ??
  "http://localhost:3000";

async function loadScenarios(names: string[]): Promise<Scenario[]> {
  const all: Scenario[] = [];
  for await (const e of Deno.readDir("test/visual/scenarios")) {
    if (!e.name.endsWith(".json")) continue;
    const s: Scenario = JSON.parse(
      await Deno.readTextFile(`test/visual/scenarios/${e.name}`),
    );
    if (names.length === 0 || names.includes(s.name)) all.push(s);
  }
  return all;
}

async function cmdRun(names: string[]) {
  if (await isDirty()) {
    console.warn(
      "⚠ working tree is dirty — commit first, or this SHA won't mean anything later.",
    );
  }
  const sha = await currentSha();
  const timestamp = new Date().toISOString();
  let anyPending = false;

  for (const scenario of await loadScenarios(names)) {
    const threshold = scenario.threshold ?? DEFAULT_THRESHOLD;
    console.log(
      `\n▶ ${scenario.name} (threshold ${(threshold * 100).toFixed(1)}%)`,
    );
    const shots = await captureScenario(BASE_URL, scenario);
    const manifest = await loadManifest(scenario.name);

    for (const [keyframe, png] of Object.entries(shots)) {
      manifest.keyframes[keyframe] ??= { history: [] };
      const prior = lastAccepted(manifest, keyframe);
      const dir = keyframeDir(scenario.name, keyframe);
      await Deno.mkdir(dir, { recursive: true });

      if (!prior) {
        await Deno.writeFile(`${dir}/${sha}.png`, png);
        manifest.keyframes[keyframe].history.push({
          sha,
          timestamp,
          diffFromPrev: null,
          status: "baseline",
        });
        console.log(`  ${keyframe}: no prior baseline — recorded as baseline`);
        continue;
      }

      const priorPng = await Deno.readFile(`${dir}/${prior.sha}.png`);
      const { ratio, diffPng } = diffPngs(priorPng, png);

      if (ratio > threshold) {
        await Deno.writeFile(`${dir}/pending-${sha}.png`, png);
        await Deno.writeFile(`${dir}/pending-${sha}.diff.png`, diffPng);
        manifest.keyframes[keyframe].history.push({
          sha,
          timestamp,
          diffFromPrev: ratio,
          status: "pending-review",
        });
        console.log(
          `  ${keyframe}: ⚠ ${
            (ratio * 100).toFixed(2)
          }% changed vs ${prior.sha} — pending review`,
        );
        anyPending = true;
      } else {
        await Deno.writeFile(`${dir}/${sha}.png`, png);
        manifest.keyframes[keyframe].history.push({
          sha,
          timestamp,
          diffFromPrev: ratio,
          status: "auto-accepted",
        });
        console.log(
          `  ${keyframe}: ${
            (ratio * 100).toFixed(3)
          }% changed — within threshold, auto-accepted`,
        );
      }
    }
    await saveManifest(manifest);
  }

  if (anyPending) {
    console.log(
      "\nReview the pending-*.diff.png files, then:  deno task visual:accept <scenario> <keyframe>",
    );
    Deno.exit(1);
  }
}

async function cmdAccept(scenario: string, keyframe: string) {
  const manifest = await loadManifest(scenario);
  const pending = manifest.keyframes[keyframe]?.history.at(-1);
  if (!pending || pending.status !== "pending-review") {
    console.error(`no pending entry for ${scenario}/${keyframe}`);
    Deno.exit(1);
  }
  const dir = keyframeDir(scenario, keyframe);
  await Deno.rename(
    `${dir}/pending-${pending.sha}.png`,
    `${dir}/${pending.sha}.png`,
  );
  await Deno.remove(`${dir}/pending-${pending.sha}.diff.png`);
  pending.status = "accepted";
  await saveManifest(manifest);
  console.log(
    `accepted ${scenario}/${keyframe} @ ${pending.sha} as new baseline`,
  );
}

// Plain positional args — no flag parsing, so scenario/keyframe names
// that look numeric (e.g. "orbit-360") aren't silently coerced.
const [cmd, ...rest] = Deno.args;
if (cmd === "run") await cmdRun(rest);
else if (cmd === "accept") await cmdAccept(rest[0], rest[1]);
else console.log("usage: run [scenario...] | accept <scenario> <keyframe>");
