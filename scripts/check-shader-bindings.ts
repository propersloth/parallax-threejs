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

export function parseGLSLDeclarations(
  src: string,
  kind: "uniform" | "attribute" | "varying" | "in" | "out",
): Declaration[] {
  const re = new RegExp(`^\\s*${kind}\\s+(\\w+)\\s+(\\w+)\\s*;`, "gm");
  const results: Declaration[] = [];
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    results.push({ type: m[1], name: m[2], line });
  }
  return results;
}

export function findUniformUsage(glslSrc: string, name: string): boolean {
  // Crude but adequate: does the name appear anywhere else in the file
  // besides its own declaration line? Doesn't distinguish "used in a
  // comment" from "used in code" — a real parser would, this doesn't.
  const occurrences =
    (glslSrc.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
  return occurrences > 1;
}

export function parseJSUniformKeys(jsSrc: string): string[] {
  // Looks for a `uniforms: { ... }` object literal and extracts its
  // top-level keys. Only handles literal key names, not computed
  // properties or spread — flagged in the header comment above.
  const match = jsSrc.match(/uniforms\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (!match) return [];
  const body = match[1];
  const keyRe = /^\s*(\w+)\s*:/gm;
  const keys: string[] = [];
  let m;
  while ((m = keyRe.exec(body))) keys.push(m[1]);
  return keys;
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

  const findings: string[] = [];

  const glslUniforms = parseGLSLDeclarations(glslSrc, "uniform");
  const jsUniformKeys = new Set(parseJSUniformKeys(jsSrc));

  for (const u of glslUniforms) {
    if (!jsUniformKeys.has(u.name)) {
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
