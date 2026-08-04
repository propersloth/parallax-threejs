// Lane 2 — real browser spin-up (headless Chromium via Playwright).
// Deno.serve() hosts the fixture in-process for the duration of the
// test, so this needs no separate server, no fixture files on disk for
// this one, and no network beyond localhost.
import { assertEquals, assertRejects } from "@std/assert";
import { captureScenario } from "./capture.ts";
import type { Scenario } from "./types.ts";

const FIXTURE_HTML = `<!doctype html>
<html><body>
<canvas id="c" width="200" height="200"></canvas>
<button id="btn" onclick="document.title = 'clicked'">Click me</button>
<div id="target">hello</div>
</body></html>`;

async function withFixtureServer<T>(
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = Deno.serve(
    { port: 0, onListen: () => {} },
    () =>
      new Response(FIXTURE_HTML, { headers: { "content-type": "text/html" } }),
  );
  const port = (server.addr as Deno.NetAddr).port;
  try {
    return await fn(`http://localhost:${port}`);
  } finally {
    await server.shutdown();
  }
}

Deno.test("captureScenario drives waitForSelector, click, evaluate, and keyframe steps", async () => {
  await withFixtureServer(async (baseUrl) => {
    const scenario: Scenario = {
      name: "fixture-test",
      path: "/",
      steps: [
        { action: "waitForSelector", selector: "canvas" },
        { action: "keyframe", name: "initial" },
        { action: "click", selector: "#btn" },
        {
          action: "evaluate",
          script: "window.__clicked = document.title === 'clicked'",
        },
        { action: "keyframe", name: "after-click" },
      ],
    };

    const { shots } = await captureScenario(baseUrl, scenario);
    assertEquals(Object.keys(shots).sort(), ["after-click", "initial"]);
    assertEquals(shots.initial.length > 0, true);
    assertEquals(shots["after-click"].length > 0, true);
  });
});

Deno.test("captureScenario's wait step actually delays execution", async () => {
  await withFixtureServer(async (baseUrl) => {
    const scenario: Scenario = {
      name: "fixture-test",
      path: "/",
      steps: [
        { action: "wait", ms: 100 },
        { action: "keyframe", name: "after-wait" },
      ],
    };
    const start = performance.now();
    const { shots } = await captureScenario(baseUrl, scenario);
    const elapsed = performance.now() - start;
    assertEquals("after-wait" in shots, true);
    assertEquals(elapsed >= 100, true);
  });
});

Deno.test("captureScenario returns memory: null when window.__renderer__ isn't exposed", async () => {
  await withFixtureServer(async (baseUrl) => {
    const scenario: Scenario = {
      name: "fixture-test",
      path: "/",
      steps: [{ action: "keyframe", name: "shot" }],
    };
    const { memory } = await captureScenario(baseUrl, scenario);
    assertEquals(memory, null);
  });
});

Deno.test("captureScenario reads geometry/texture counts when window.__renderer__ is exposed", async () => {
  const html = `<!doctype html>
<html><body>
<canvas id="c" width="200" height="200"></canvas>
<script>
  window.__renderer__ = { info: { memory: { geometries: 3, textures: 2 } } };
</script>
</body></html>`;
  const server = Deno.serve(
    { port: 0, onListen: () => {} },
    () => new Response(html, { headers: { "content-type": "text/html" } }),
  );
  const port = (server.addr as Deno.NetAddr).port;
  try {
    const scenario: Scenario = {
      name: "fixture-test-with-renderer",
      path: "/",
      steps: [{ action: "keyframe", name: "shot" }],
    };
    const { memory } = await captureScenario(
      `http://localhost:${port}`,
      scenario,
    );
    assertEquals(memory, { geometries: 3, textures: 2 });
  } finally {
    await server.shutdown();
  }
});

Deno.test("captureScenario's dragOrbit step throws a clear error when no canvas exists", async () => {
  const server = Deno.serve(
    { port: 0, onListen: () => {} },
    () =>
      new Response("<!doctype html><html><body>no canvas here</body></html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  const port = (server.addr as Deno.NetAddr).port;
  try {
    const scenario: Scenario = {
      name: "no-canvas",
      path: "/",
      steps: [{ action: "dragOrbit", dx: 10, dy: 10 }],
    };
    await assertRejects(
      () => captureScenario(`http://localhost:${port}`, scenario),
      Error,
      "no canvas found for dragOrbit",
    );
  } finally {
    await server.shutdown();
  }
});
