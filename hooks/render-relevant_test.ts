import { assertEquals } from "@std/assert";
import { isRenderRelevant } from "./render-relevant.mjs";

Deno.test("render-relevant extension + render-relevant dir -> true", () => {
  assertEquals(isRenderRelevant("src/materials/basic.ts"), true);
  assertEquals(isRenderRelevant("shaders/fog.frag"), true);
  assertEquals(isRenderRelevant("scene/setup.js"), true);
});

Deno.test("render-relevant extension + non-render dir -> false", () => {
  assertEquals(isRenderRelevant("src/utils/math.ts"), false);
});

Deno.test("non-render extension + render dir -> false", () => {
  assertEquals(isRenderRelevant("materials/README.md"), false);
});

Deno.test("neither -> false", () => {
  assertEquals(isRenderRelevant("README.md"), false);
});

Deno.test("empty path -> false, not a crash", () => {
  assertEquals(isRenderRelevant(""), false);
});
