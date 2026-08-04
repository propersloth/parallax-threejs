// Shared by both scripts/ (checkpoint.ts, the interactive path) and
// test/visual/lib/ (capture.ts, the regression-suite path) — lives here
// rather than in either directory's own lib/ so the two don't end up
// importing across each other (PR #30 review finding #4: scripts/ and
// test/visual/lib/ were already coupled one direction via diff.ts;
// adding this the other way would have made them mutually dependent).
import type { Page } from "playwright";

// Minimal shape of WebGLRenderer.info.memory — the built-in three.js
// counters a leak actually shows up in (a geometry/texture count that
// climbs and never comes back down). Deliberately not dispose_check/
// memory_stats (threejs-devtools-mcp): those are MCP-bridged tools
// neither caller has access to outside a live chat session — see
// aidlc-docs/construction/unit-1-memcheck-routing/nfr-requirements/
// tech-stack-decisions.md, Decision 1.
export interface RendererMemory {
  geometries: number;
  textures: number;
}

// Optional, not a hard prerequisite like window.scene — returns null
// rather than throwing when window.__renderer__ isn't exposed, so every
// caller degrades gracefully (a checkpoint without a memory field, a
// scenario that never registers a memory expectation) instead of
// breaking existing setups that predate this.
export async function getRendererMemorySummary(
  page: Page,
): Promise<RendererMemory | null> {
  return await page.evaluate(() => {
    // @ts-ignore - browser global, optional prerequisite
    const renderer = globalThis.__renderer__ as
      | { info?: { memory?: RendererMemory } }
      | undefined;
    return renderer?.info?.memory ?? null;
  });
}
