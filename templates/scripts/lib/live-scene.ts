// Connects to the SAME browser tab the human and Claude are already
// looking at, via CDP — deliberately not a fresh, isolated browser. The
// entire point of this plugin is shared sight; a script that quietly
// launched its own hidden browser would defeat that without anyone
// noticing until the numbers stopped making sense.
//
// Real prerequisites — this does not work unconditionally:
//   - threejs-devtools-mcp's bridge proxy must already be running and
//     reachable at BRIDGE_PORT (default 9222, per its own advanced.md).
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
// Console capture limitation: a listener attached here only sees messages
// emitted AFTER attachment — no historical scrollback. For full console
// history, chrome-devtools-mcp's own console tool remains the more
// complete source; treat this as a lightweight supplement, not a
// replacement.

import { chromium, type Page } from "playwright";

const BRIDGE_PORT = Deno.env.get("BRIDGE_PORT") ?? "9222";

export async function attachToLiveScene(): Promise<
  { browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>; page: Page }
> {
  const browser = await chromium.connectOverCDP(
    `http://localhost:${BRIDGE_PORT}`,
  );
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error(
      `No browser context found at :${BRIDGE_PORT} — is the dev server ` +
        `and threejs-devtools-mcp's bridge actually running? This script ` +
        `attaches to an existing session, it does not start one.`,
    );
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    throw new Error(`Browser is open at :${BRIDGE_PORT} but has no pages.`);
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
