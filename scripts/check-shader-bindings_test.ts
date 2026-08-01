import { assertEquals } from "@std/assert";
import {
  checkUniformBindings,
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

// Real pattern from ceres's body.glsl (UAT finding #11) — the old
// line-start-anchored regex silently dropped the second declaration.
Deno.test("parseGLSLDeclarations finds both declarations when two share one semicolon-separated line", () => {
  const src =
    "uniform sampler2D uPolarColorN; uniform sampler2D uPolarNormalN;\n";
  const result = parseGLSLDeclarations(src, "uniform");
  assertEquals(result.map((d) => d.name), ["uPolarColorN", "uPolarNormalN"]);
});

Deno.test("parseGLSLDeclarations ignores a declaration inside a // line comment", () => {
  const src = "// uniform float uOld;\nuniform float uTime;\n";
  const result = parseGLSLDeclarations(src, "uniform");
  assertEquals(result.map((d) => d.name), ["uTime"]);
});

Deno.test("parseGLSLDeclarations keeps line numbers accurate across a /* block */ comment", () => {
  const src = "/* a\nmulti\nline\ncomment */\nuniform float uTime;\n";
  const result = parseGLSLDeclarations(src, "uniform");
  assertEquals(result, [{ type: "float", name: "uTime", line: 5 }]);
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

Deno.test("findUniformUsage: false when the only other appearance is inside a comment", () => {
  const src = "uniform float uTime;\n// float t = uTime * 2.0;\nvoid main() {}";
  assertEquals(findUniformUsage(src, "uTime"), false);
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

// Real pattern from ceres's scene.js (UAT finding #11) — the old version
// only recognized literal `uniforms: { ... }` object literals, missing
// this equally common idiom entirely (0 keys found against real shaders).
Deno.test("parseJSUniformKeys extracts keys from the onBeforeCompile + shader.uniforms.uX idiom", () => {
  const src = `
bodyMat.onBeforeCompile = function (shader) {
  shader.uniforms.uDetailNormal   = detailUniforms.uDetailNormal;
  shader.uniforms.uDetailRepeat   = detailUniforms.uDetailRepeat;
  shader.uniforms.uPolarNormalN = polarCapUniforms.uPolarNormalN;
};`;
  assertEquals(parseJSUniformKeys(src), [
    "uDetailNormal",
    "uDetailRepeat",
    "uPolarNormalN",
  ]);
});

Deno.test("parseJSUniformKeys combines both the literal-object and onBeforeCompile idioms, deduped", () => {
  const src = `
const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } }
});
material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = timeUniform;
  shader.uniforms.uColor = colorUniform;
};`;
  assertEquals(parseJSUniformKeys(src), ["uTime", "uColor"]);
});

Deno.test("parseJSUniformKeys ignores a shader.uniforms assignment inside a comment", () => {
  const src = "// shader.uniforms.uOld = oldUniform;\nconst x = 1;";
  assertEquals(parseJSUniformKeys(src), []);
});

// three.js auto-injects normalMatrix/modelViewMatrix/etc. into every
// shader — a third real false-positive class found by running this tool
// against ceres's actual shaders even after the two fixes above (UAT
// finding #11 named exactly two parser gaps; this is a third, discovered
// empirically, not one of the originally documented two).
Deno.test("checkUniformBindings doesn't flag a three.js builtin uniform even with no matching JS key", () => {
  const glslSrc =
    "uniform mat3 normalMatrix;\nvoid main() { gl_Position = vec4(normalMatrix[0], 1.0); }";
  const findings = checkUniformBindings(glslSrc, "");
  assertEquals(
    findings.some((f) =>
      f.includes("BUG-LIKELY") && f.includes("normalMatrix")
    ),
    false,
  );
});

Deno.test("checkUniformBindings still flags a real unbound uniform that isn't a three.js builtin", () => {
  const glslSrc =
    "uniform float uCustomThing;\nvoid main() { gl_Position = vec4(uCustomThing); }";
  const findings = checkUniformBindings(glslSrc, "");
  assertEquals(
    findings.some((f) =>
      f.includes("BUG-LIKELY") && f.includes("uCustomThing")
    ),
    true,
  );
});

// Regression coverage for the combined real-world case: both fixed
// parser gaps together, against source shaped like ceres's actual files.
Deno.test("checkUniformBindings finds no BUG-LIKELY findings for the onBeforeCompile idiom + same-line declarations", () => {
  const glslSrc =
    "uniform sampler2D uPolarColorN; uniform sampler2D uPolarNormalN;\n" +
    "void main() { gl_FragColor = texture2D(uPolarColorN, vec2(0.0)) + texture2D(uPolarNormalN, vec2(0.0)); }";
  const jsSrc = `
bodyMat.onBeforeCompile = function (shader) {
  shader.uniforms.uPolarColorN = polarCapUniforms.uPolarColorN;
  shader.uniforms.uPolarNormalN = polarCapUniforms.uPolarNormalN;
};`;
  const findings = checkUniformBindings(glslSrc, jsSrc);
  assertEquals(findings.filter((f) => f.startsWith("BUG-LIKELY")), []);
});
