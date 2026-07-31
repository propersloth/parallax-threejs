import type { Manifest, HistoryEntry } from "./types.ts";

const ROOT = ".parallax/visual-history";
const manifestPath = (scenario: string) => `${ROOT}/${scenario}/manifest.json`;

export async function loadManifest(scenario: string): Promise<Manifest> {
  try {
    return JSON.parse(await Deno.readTextFile(manifestPath(scenario)));
  } catch {
    return { scenario, keyframes: {} };
  }
}

export async function saveManifest(m: Manifest) {
  await Deno.mkdir(`${ROOT}/${m.scenario}`, { recursive: true });
  await Deno.writeTextFile(manifestPath(m.scenario), JSON.stringify(m, null, 2));
}

export function lastAccepted(m: Manifest, keyframe: string): HistoryEntry | null {
  const hist = m.keyframes[keyframe]?.history ?? [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].status !== "pending-review") return hist[i];
  }
  return null;
}

export const keyframeDir = (scenario: string, keyframe: string) =>
  `${ROOT}/${scenario}/${keyframe}`;
