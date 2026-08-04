// Requires the Playwright browser binaries to be installed once:
//   deno run -A npm:playwright install chromium
import { chromium } from "playwright";
import type { RendererMemory } from "../../../scripts/lib/live-scene.ts";
import { getRendererMemorySummary } from "../../../scripts/lib/live-scene.ts";
import type { Scenario } from "./types.ts";

export interface CaptureResult {
  shots: Record<string, Uint8Array>;
  // Read once, after all steps complete — a whole-scene cumulative
  // count, not something meaningfully captured per-keyframe. null when
  // window.__renderer__ isn't exposed (optional prerequisite, same as
  // checkpoint.ts's use of the same helper).
  memory: RendererMemory | null;
}

export async function captureScenario(
  baseUrl: string,
  scenario: Scenario,
): Promise<CaptureResult> {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const shots: Record<string, Uint8Array> = {};

  await page.goto(new URL(scenario.path, baseUrl).toString());

  for (const step of scenario.steps) {
    switch (step.action) {
      case "wait":
        await page.waitForTimeout(step.ms);
        break;
      case "waitForSelector":
        await page.waitForSelector(step.selector);
        break;
      case "click":
        await page.click(step.selector);
        break;
      case "dragOrbit": {
        const box = await (await page.$("canvas"))?.boundingBox();
        if (!box) throw new Error("no canvas found for dragOrbit");
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + step.dx, cy + step.dy, { steps: 10 });
        await page.mouse.up();
        break;
      }
      case "evaluate":
        await page.evaluate(step.script);
        break;
      case "keyframe":
        shots[step.name] = await page.screenshot();
        break;
    }
  }

  const memory = await getRendererMemorySummary(page);
  await browser.close();
  return { shots, memory };
}
