export type Step =
  | { action: "wait"; ms: number }
  | { action: "waitForSelector"; selector: string }
  | { action: "click"; selector: string }
  | { action: "dragOrbit"; dx: number; dy: number }
  | { action: "evaluate"; script: string }
  | { action: "keyframe"; name: string };

export interface Scenario {
  name: string;
  path: string;
  threshold?: number; // fraction of changed pixels, 0-1. Overrides the global default.
  // Max allowed increase in combined geometries+textures count vs. the
  // last accepted baseline. Unset means no memory check runs for this
  // scenario — not a zero-tolerance default. See scenario-author.md §3a.
  memoryThreshold?: number;
  steps: Step[];
}

export interface HistoryEntry {
  sha: string;
  timestamp: string;
  diffFromPrev: number | null;
  status: "baseline" | "auto-accepted" | "accepted" | "pending-review";
  // Absolute measurement at this entry — memory entries need this to
  // diff the *next* run against without a stored artifact (pixel
  // entries don't: the accepted PNG file on disk already serves that
  // purpose, so this stays undefined for keyframe history).
  value?: number;
}

export interface Manifest {
  scenario: string;
  keyframes: Record<string, { history: HistoryEntry[] }>;
  // Scenario-level, not per-keyframe: renderer memory is a whole-scene
  // cumulative signal, not something that varies meaningfully shot to
  // shot within one run. Absent entirely for scenarios with no
  // memoryThreshold set — same HistoryEntry shape as keyframes, gated
  // the same way (see run.ts), so `diffFromPrev` here is a count delta
  // rather than a pixel ratio.
  memory?: { history: HistoryEntry[] };
}
