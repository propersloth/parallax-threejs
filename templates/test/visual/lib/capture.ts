// Requires the Playwright browser binaries to be installed once:
//   deno run -A npm:playwright install chromium
import { chromium } from "playwright";
import type { Scenario } from "./types.ts";

export async function captureScenario(
  baseUrl: string,
  scenario: Scenario,
): Promise<Record<string, Uint8Array>> {
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

  await browser.close();
  return shots;
}
