// Usage: deno run --allow-read check-shader-bindings.ts <shader.glsl-or-.js/.ts>...
// Static analysis for shader-reviewer's steps 1-3 (binding agreement,
// unused declarations, vertex/fragment agreement). No browser, no MCP —
// pure text parsing, which is why this is a script rather than something
// the agent re-derives by reading raw source each time: exact name/type
// matching is mechanical, and a parser won't miss a mismatch the way a
// text read plausibly could at scale.
//
// This is intentionally a first pass with regex-based parsing, not a real
// GLSL/JS parser — it will miss anything wrapped in preprocessor macros,
// computed uniform names, or non-literal object keys. Report findings as
// "likely" rather than certain, and the agent's step 4 (live cross-check)
// remains the authority when this static pass and reality disagree.

export interface Declaration {
  name: string;
  type: string;
  line: number;
}

// Strips /* block */ and // line comments before parsing, so a
// commented-out declaration or reference doesn't get treated as real —
// without this, removing the line-start anchor below (to fix the
// same-line-multiple-declarations bug) would make commented-out code
// match too, which the old anchored version accidentally avoided. Block
// comments are replaced with just their newlines (not removed outright)
// so line numbers stay accurate. Doesn't understand string literals, so
// a `//` inside a string would be (harmlessly, for this tool's purposes)
// treated as a comment start — an accepted limitation of a first-pass
// regex parser, not a real tokenizer, consistent with the rest of this
// file's approach.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ""))
    .replace(/\/\/.*$/gm, "");
}

export function parseGLSLDeclarations(
  src: string,
  kind: "uniform" | "attribute" | "varying" | "in" | "out",
): Declaration[] {
  // No longer anchored to the start of a line (`^\s*`) — that silently
  // dropped a second declaration sharing a line with a first, semicolon
  // and all (e.g. `uniform sampler2D uPolarColorN; uniform sampler2D
  // uPolarNormalN;`, a real pattern from ceres's body.glsl). `\b` still
  // requires `kind` to be a whole word, not a substring of a longer
  // identifier.
  const cleaned = stripComments(src);
  const re = new RegExp(`\\b${kind}\\s+(\\w+)\\s+(\\w+)\\s*;`, "g");
  const results: Declaration[] = [];
  let m;
  while ((m = re.exec(cleaned))) {
    const line = cleaned.slice(0, m.index).split("\n").length;
    results.push({ type: m[1], name: m[2], line });
  }
  return results;
}

export function findUniformUsage(glslSrc: string, name: string): boolean {
  // Crude but adequate: does the name appear anywhere else in the file
  // besides its own declaration line? Doesn't distinguish "used in a
  // string" from "used in code" — a real parser would, this doesn't.
  const cleaned = stripComments(glslSrc);
  const occurrences =
    (cleaned.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
  return occurrences > 1;
}

export function parseJSUniformKeys(jsSrc: string): string[] {
  const cleaned = stripComments(jsSrc);
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    if (!seen.has(name)) {
      seen.add(name);
      keys.push(name);
    }
  };

  // Pattern 1: a literal `uniforms: { ... }` object literal — the common
  // ShaderMaterial constructor argument. Only handles literal key names,
  // not computed properties or spread — flagged in the header comment
  // above.
  const literalMatch = cleaned.match(/uniforms\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (literalMatch) {
    const keyRe = /^\s*(\w+)\s*:/gm;
    let m;
    while ((m = keyRe.exec(literalMatch[1]))) add(m[1]);
  }

  // Pattern 2: the `onBeforeCompile(shader) { shader.uniforms.uX = ...; }`
  // idiom — equally common in real projects (e.g. ceres's own scene.js)
  // but invisible to the literal-object check above, since it's a
  // runtime assignment onto an existing object, not an object literal.
  const assignRe = /\.uniforms\.(\w+)\s*=/g;
  let m;
  while ((m = assignRe.exec(cleaned))) add(m[1]);

  return keys;
}

// three.js auto-injects these into every shader program's prefix — never
// bound from a JS uniforms object, so flagging them as "no matching key"
// is a false positive regardless of the two parser gaps fixed above.
// Sourced directly from three.js's own WebGLProgram.js (the vertex- and
// fragment-shader prefix construction, both stages combined), not
// guessed — a real, empirical false-positive class discovered by running
// this tool against ceres's actual shaders even after those two fixes.
const THREE_BUILTIN_UNIFORMS = new Set([
  "modelMatrix",
  "modelViewMatrix",
  "projectionMatrix",
  "viewMatrix",
  "normalMatrix",
  "cameraPosition",
  "isOrthographic",
]);

// Extracted from main() so the binding-agreement logic (including the
// three.js-builtin allowlist above) is directly unit-testable without
// spawning the CLI against real files.
export function checkUniformBindings(
  glslSrc: string,
  jsSrc: string,
): string[] {
  const findings: string[] = [];

  const glslUniforms = parseGLSLDeclarations(glslSrc, "uniform");
  const jsUniformKeys = new Set(parseJSUniformKeys(jsSrc));

  for (const u of glslUniforms) {
    if (!jsUniformKeys.has(u.name) && !THREE_BUILTIN_UNIFORMS.has(u.name)) {
      findings.push(
        `BUG-LIKELY: GLSL declares uniform "${u.name}" (${u.type}) at line ${u.line}, no matching key found in JS uniforms object.`,
      );
    }
    if (!findUniformUsage(glslSrc, u.name)) {
      findings.push(
        `CLEANLINESS: uniform "${u.name}" declared but never referenced elsewhere in the GLSL.`,
      );
    }
  }
  for (const key of jsUniformKeys) {
    if (!glslUniforms.some((u) => u.name === key)) {
      findings.push(
        `CLEANLINESS: JS uniforms object sets "${key}", no matching GLSL uniform declaration found.`,
      );
    }
  }

  return findings;
}

async function main() {
  const files = Deno.args;
  if (files.length === 0) {
    console.error("usage: check-shader-bindings.ts <file>...");
    Deno.exit(1);
  }

  let vertSrc = "";
  let fragSrc = "";
  let jsSrc = "";
  for (const f of files) {
    const content = await Deno.readTextFile(f);
    if (/\.(vert|vs)$/.test(f)) vertSrc += content + "\n";
    else if (/\.(frag|fs)$/.test(f)) fragSrc += content + "\n";
    else if (/\.glsl$/.test(f)) {
      // Ambiguous — a combined .glsl file could be either stage. Treat as
      // both for the uniform check (which doesn't care about stage), but
      // skip it for the varying check below, which needs to know which
      // stage it's looking at to mean anything.
      vertSrc += content + "\n";
      fragSrc += content + "\n";
    } else jsSrc += content + "\n";
  }
  const glslSrc = vertSrc + fragSrc;

  const findings: string[] = checkUniformBindings(glslSrc, jsSrc);

  // Vertex/fragment varying agreement — only meaningful if we actually got
  // distinct vertex and fragment sources (not just two .glsl files treated
  // as both, which can't distinguish direction of data flow).
  if (vertSrc && fragSrc && vertSrc !== fragSrc) {
    const outVarying = [
      ...parseGLSLDeclarations(vertSrc, "varying"),
      ...parseGLSLDeclarations(vertSrc, "out"),
    ];
    const inVarying = [
      ...parseGLSLDeclarations(fragSrc, "varying"),
      ...parseGLSLDeclarations(fragSrc, "in"),
    ];
    for (const v of outVarying) {
      const match = inVarying.find((i) => i.name === v.name);
      if (!match) {
        findings.push(
          `BUG-LIKELY: vertex shader writes varying "${v.name}" (${v.type}) at line ${v.line}, fragment shader never declares it.`,
        );
      } else if (match.type !== v.type) {
        findings.push(
          `BUG-LIKELY: varying "${v.name}" type mismatch — vertex declares ${v.type}, fragment declares ${match.type}.`,
        );
      }
    }
    for (const v of inVarying) {
      if (!outVarying.some((o) => o.name === v.name)) {
        findings.push(
          `CLEANLINESS: fragment shader declares varying "${v.name}" (${v.type}), vertex shader never writes it — will read undefined/garbage.`,
        );
      }
    }
  } else if (files.some((f) => /\.glsl$/.test(f))) {
    findings.push(
      "NOTE: .glsl file(s) provided without a clear vertex/fragment split — varying agreement check skipped, provide separate .vert/.frag files (or .vs/.fs) to enable it.",
    );
  }

  if (findings.length === 0) {
    console.log(
      "No binding mismatches or unused declarations found by static analysis.",
    );
  } else {
    findings.forEach((f) => console.log(f));
  }
}

if (import.meta.main) {
  await main();
}
