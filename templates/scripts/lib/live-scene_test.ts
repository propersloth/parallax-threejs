// Lane 2 — needs a real (headless, throwaway) browser spin-up, so this
// runs in the deferred extended-tests workflow, not on every PR.
//
// getSceneSummary/getProperty/setProperty only need a Page object — they
// don't care whether it came from connectOverCDP or a plain launch, so
// they're tested here against a normally-launched page pointed at the
// fixture. attachToLiveScene() itself (the CDP-connection mechanics) is
// tested separately below, since that's the part actually specific to
// "attach to an existing session."
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { chromium } from "npm:playwright";
import {
  attachToLiveScene,
  collectConsoleMessages,
  getProperty,
  getSceneSummary,
  setProperty,
} from "./live-scene.ts";

const FIXTURE_PATH = new URL("./fixtures/fake-scene.html", import.meta.url).pathname;

Deno.test("getSceneSummary reads objects from window.scene via traverse()", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);

  const summary = await getSceneSummary(page);
  const names = summary.map((o: any) => o.name);
  assertEquals(names.includes("TestLight"), true);
  assertEquals(names.includes("TestMesh"), true);

  const mesh = summary.find((o: any) => o.name === "TestMesh") as any;
  assertEquals(mesh.materialType, "MeshStandardMaterial");

  await browser.close();
});

Deno.test("getProperty resolves a dotted path via getObjectByName", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);

  const intensity = await getProperty(page, "TestLight", "intensity");
  assertEquals(intensity, 0.5);

  const x = await getProperty(page, "TestMesh", "position.x");
  assertEquals(x, 0);

  await browser.close();
});

Deno.test("getProperty throws a clear error for an object that doesn't exist", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);

  await assertRejects(
    () => getProperty(page, "DoesNotExist", "x"),
    Error,
    "No object named",
  );

  await browser.close();
});

Deno.test("setProperty actually mutates the object, readable back via getProperty", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);

  await setProperty(page, "TestLight", "intensity", 2.0);
  assertEquals(await getProperty(page, "TestLight", "intensity"), 2.0);

  await browser.close();
});

Deno.test("collectConsoleMessages captures messages emitted after attachment", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const messages = collectConsoleMessages(page);

  await page.goto(`file://${FIXTURE_PATH}`);
  await page.evaluate(() => console.log("hello from fixture"));
  await page.waitForTimeout(50); // let the console event actually fire

  assertEquals(messages.some((m) => m.includes("hello from fixture")), true);

  await browser.close();
});

Deno.test("attachToLiveScene connects to a real running browser and returns its page", async () => {
  const port = 19222; // fixed test port, distinct from the real 9222 default
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
  const page = await browser.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);

  Deno.env.set("BRIDGE_PORT", String(port));
  const attached = await attachToLiveScene();
  assertEquals(attached.page.url(), `file://${FIXTURE_PATH}`);

  await attached.browser.close();
  Deno.env.delete("BRIDGE_PORT");
});

Deno.test("attachToLiveScene throws a clear error when nothing is listening on the port", async () => {
  Deno.env.set("BRIDGE_PORT", "19223"); // nothing running here
  await assertRejects(() => attachToLiveScene());
  Deno.env.delete("BRIDGE_PORT");
});
