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
  steps: Step[];
}

export interface HistoryEntry {
  sha: string;
  timestamp: string;
  diffFromPrev: number | null;
  status: "baseline" | "auto-accepted" | "accepted" | "pending-review";
}

export interface Manifest {
  scenario: string;
  keyframes: Record<string, { history: HistoryEntry[] }>;
}
