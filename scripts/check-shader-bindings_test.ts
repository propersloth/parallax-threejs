import { assertEquals } from "@std/assert";
import {
  findUniformUsage,
  parseGLSLDeclarations,
  parseJSUniformKeys,
} from "./check-shader-bindings.ts";

Deno.test("parseGLSLDeclarations finds a single uniform with correct name/type/line", () => {
  const src = "precision mediump float;\nuniform float uTime;\nvoid main() {}";
  const result = parseGLSLDeclarations(src, "uniform");
  assertEquals(result, [{ type: "float", name: "uTime", line: 2 }]);
});

Deno.test("parseGLSLDeclarations finds multiple declarations of the same kind", () => {
  const src = "uniform vec3 uColor;\nuniform float uOpacity;\n";
  const result = parseGLSLDeclarations(src, "uniform");
  assertEquals(result.map((d) => d.name), ["uColor", "uOpacity"]);
});

Deno.test("parseGLSLDeclarations returns empty array when nothing matches", () => {
  const src = "void main() { gl_FragColor = vec4(1.0); }";
  assertEquals(parseGLSLDeclarations(src, "uniform"), []);
});

Deno.test("parseGLSLDeclarations doesn't cross-match different declaration kinds", () => {
  const src = "attribute vec3 aPosition;\nuniform float uTime;\n";
  assertEquals(parseGLSLDeclarations(src, "varying"), []);
});

Deno.test("findUniformUsage: true when the name appears more than once", () => {
  const src = "uniform float uTime;\nvoid main() { float t = uTime * 2.0; }";
  assertEquals(findUniformUsage(src, "uTime"), true);
});

Deno.test("findUniformUsage: false when the name only appears in its own declaration", () => {
  const src =
    "uniform float uUnused;\nvoid main() { gl_FragColor = vec4(1.0); }";
  assertEquals(findUniformUsage(src, "uUnused"), false);
});

Deno.test("parseJSUniformKeys extracts literal keys from a uniforms object", () => {
  const src = `
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color() }
  }
});`;
  assertEquals(parseJSUniformKeys(src), ["uTime", "uColor"]);
});

Deno.test("parseJSUniformKeys returns empty array when there's no uniforms object", () => {
  const src = "const foo = { bar: 1 };";
  assertEquals(parseJSUniformKeys(src), []);
});
