// Owns a persistent, dedicated Chromium tab for Parallax's interactive
// commands (checkpoint/sweep/replay/diff-checkpoints) — launched once,
// left running across invocations, and reused by every subsequent call.
// That persistence *is* the "shared sight" this plugin is built around:
// the human watches this one window; every command drives the same tab
// instead of a fresh, isolated browser per invocation.
//
// Why this isn't "attach to whatever tab is already open" (UAT finding
// #9 — the original design, confirmed broken two independent ways):
//   - threejs-devtools-mcp's bridge proxy (BRIDGE_PORT, historically also
//     defaulted to 9222) is a custom WebSocket bridge for its own MCP
//     tools, not a CDP endpoint — curling its /json/version proxies
//     straight through to the dev server and returns ordinary page HTML,
//     not a CDP version manifest.
//   - In its default (non-Puppeteer) mode, threejs-devtools-mcp opens the
//     browser via a plain OS `open`/`xdg-open` call — no debug port of
//     any kind. chrome-devtools-mcp launches its own Chrome via
//     --remote-debugging-pipe — a stdio pipe, not a TCP port either.
//     Neither is reachable via connectOverCDP, regardless of port number.
// Parallax's own BRIDGE_PORT now defaults to 9223, not 9222 — deliberately
// distinct from threejs-devtools-mcp's bridge default so the two can run
// at the same time without one refusing to bind the other's port.
//
// Other real prerequisites — this does not work unconditionally:
//   - The page must expose `window.scene` pointing at the live THREE.Scene.
//     This is a widely-used three.js debugging convention (several
//     existing three.js devtools extensions document this same
//     expectation) — not something invented here, but also not automatic.
//     If your prototype doesn't do `window.scene = scene` somewhere, the
//     object-resolution functions below have nothing to resolve against.
//   - Object lookup is by `.name` via `scene.getObjectByName()` — a real,
//     documented Object3D method — so objects you want to script against
//     need a `.name` set. This is the same "name your objects" convention
//     threejs-devtools-mcp's own README already recommends.
//
// Headed by default so a human can actually watch it — that's the point.
// Set PARALLAX_HEADLESS=true to run headless instead (CI, no display).
//
// Console capture limitation: a listener attached here only sees messages
// emitted AFTER attachment — no historical scrollback. For full console
// history, chrome-devtools-mcp's own console tool remains the more
// complete source; treat this as a lightweight supplement, not a
// replacement.

import { chromium, type Page } from "playwright";

const DEFAULT_BRIDGE_PORT = "9223";
const DEFAULT_DEV_PORT = "3000";

async function isCdpReachable(port: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/json/version`);
    if (!res.ok) return false;
    // Guard against a non-CDP HTTP server answering 200 on this path too
    // (e.g. an SPA dev server's catch-all route, or threejs-devtools-mcp's
    // bridge proxying the request straight through) — only trust it if
    // the body actually looks like a CDP version manifest.
    const body = await res.json().catch(() => null);
    return typeof body?.webSocketDebuggerUrl === "string";
  } catch {
    return false;
  }
}

async function waitForCdpReady(port: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isCdpReachable(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for Parallax's Chromium to ` +
      `open a CDP port at :${port}. Check for a stray Chrome process ` +
      `already holding that port, or set BRIDGE_PORT to an unused one.`,
  );
}

// Spawned as a raw OS process (not via chromium.launch()) and explicitly
// detached — Playwright's own launch() keeps a handle open that blocks
// the calling Deno process from exiting, and kills the browser on that
// exit, which would defeat the whole point of a persistent shared tab.
async function launchPersistentChromium(
  port: string,
  devPort: string,
): Promise<void> {
  const executablePath = chromium.executablePath();
  const userDataDir = `${Deno.cwd()}/.parallax/chrome-profile`;
  const headless = Deno.env.get("PARALLAX_HEADLESS") === "true";

  const command = new Deno.Command(executablePath, {
    args: [
      `--remote-debugging-port=${port}`,
      ...(headless ? ["--headless=new"] : []),
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      `http://localhost:${devPort}`,
    ],
    stdin: "null",
    stdout: "null",
    stderr: "null",
  });
  const child = command.spawn();
  child.unref();
  await waitForCdpReady(port);
}

export async function attachToLiveScene(): Promise<
  { browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>; page: Page }
> {
  // Read per-call, not at module scope — this must reflect the env vars
  // at call time (tests set them right before calling), not whatever they
  // were when this module first loaded.
  const bridgePort = Deno.env.get("BRIDGE_PORT") ?? DEFAULT_BRIDGE_PORT;
  const devPort = Deno.env.get("DEV_PORT") ?? DEFAULT_DEV_PORT;

  if (!(await isCdpReachable(bridgePort))) {
    await launchPersistentChromium(bridgePort, devPort);
  }

  const browser = await chromium.connectOverCDP(
    `http://localhost:${bridgePort}`,
  );
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error(
      `No browser context found at :${bridgePort} even after launching ` +
        `Parallax's own Chromium there — this shouldn't happen; please ` +
        `report it.`,
    );
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    throw new Error(`Browser is open at :${bridgePort} but has no pages.`);
  }
  // Assumes the first page is the one being debugged. If multiple tabs are
  // open this could attach to the wrong one — worth adding a URL filter if
  // that becomes a real problem in practice, not assumed away here.
  return { browser, page: pages[0] };
}

// Minimal shape of a three.js Object3D as seen from the browser side —
// just the fields getSceneSummary actually reads. Not the real THREE
// types since this callback is serialized and run in-page, without
// three.js's own type declarations available to Deno's checker.
interface Object3DLike {
  name: string;
  type: string;
  position?: { x: number; y: number; z: number };
  visible: boolean;
  material?: { type: string };
  traverse(callback: (obj: Object3DLike) => void): void;
  getObjectByName(name: string): Object3DLike | undefined;
  [key: string]: unknown;
}

export async function getSceneSummary(page: Page) {
  return await page.evaluate(() => {
    // @ts-ignore - browser global
    const scene = globalThis.scene as Object3DLike | undefined;
    if (!scene) {
      throw new Error(
        "window.scene is not defined on this page. This script requires " +
          "the prototype to expose window.scene = scene somewhere — see " +
          "the prerequisites note in scripts/lib/live-scene.ts.",
      );
    }
    const objects: Array<Record<string, unknown>> = [];
    scene.traverse((obj) => {
      objects.push({
        name: obj.name || "(unnamed)",
        type: obj.type,
        position: obj.position
          ? [obj.position.x, obj.position.y, obj.position.z]
          : undefined,
        visible: obj.visible,
        materialType: obj.material?.type,
      });
    });
    return objects;
  });
}

export async function getProperty(
  page: Page,
  objectName: string,
  path: string,
) {
  return await page.evaluate(
    ({ objectName, path }) => {
      // @ts-ignore - browser global
      const scene = globalThis.scene as Object3DLike | undefined;
      if (!scene) throw new Error("window.scene is not defined on this page.");
      const target = scene.getObjectByName(objectName);
      if (!target) {
        throw new Error(`No object named "${objectName}" found in the scene.`);
      }
      let obj: unknown = target;
      for (const part of path.split(".")) {
        obj = (obj as Record<string, unknown> | undefined)?.[part];
      }
      return obj;
    },
    { objectName, path },
  );
}

export async function setProperty(
  page: Page,
  objectName: string,
  path: string,
  value: unknown,
) {
  await page.evaluate(
    ({ objectName, path, value }) => {
      // @ts-ignore - browser global
      const scene = globalThis.scene as Object3DLike | undefined;
      if (!scene) throw new Error("window.scene is not defined on this page.");
      const target = scene.getObjectByName(objectName);
      if (!target) {
        throw new Error(`No object named "${objectName}" found in the scene.`);
      }
      const parts = path.split(".");
      let obj = target as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]] as Record<string, unknown>;
      }
      obj[parts[parts.length - 1]] = value;
    },
    { objectName, path, value },
  );
}

export function collectConsoleMessages(page: Page): string[] {
  const messages: string[] = [];
  page.on("console", (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  return messages; // caller reads this array after the relevant window closes
}
