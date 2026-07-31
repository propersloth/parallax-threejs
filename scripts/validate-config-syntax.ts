// Validates every .json/.yml/.yaml file in the repo actually parses —
// catches broken config syntax before it reaches a human, CI's schema
// step (which only checks two specific files), or a tool that assumes
// valid config. jsr:@std/yaml rather than pulling in Python, matching
// this project's existing all-Deno toolchain.
import { parse as parseYaml } from "jsr:@std/yaml";

const EXCLUDE = new Set([".git", "node_modules", "vendor", "dist", ".parallax", ".vscode"]);
// .vscode/*.json is excluded deliberately, not an oversight: VS Code's own
// config files are JSONC (comments allowed) by convention, which strict
// JSON.parse() below would reject even though they're valid for VS Code.

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    if (EXCLUDE.has(entry.name)) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) yield* walk(path);
    else yield path;
  }
}

let failed = false;
let checked = 0;

for await (const path of walk(".")) {
  if (path.endsWith(".json")) {
    checked++;
    try {
      JSON.parse(await Deno.readTextFile(path));
    } catch (e) {
      console.error(`BROKEN JSON: ${path} — ${(e as Error).message}`);
      failed = true;
    }
  } else if (path.endsWith(".yml") || path.endsWith(".yaml")) {
    checked++;
    try {
      parseYaml(await Deno.readTextFile(path));
    } catch (e) {
      console.error(`BROKEN YAML: ${path} — ${(e as Error).message}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(`\n${checked} files checked, one or more broken.`);
  Deno.exit(1);
} else {
  console.log(`All ${checked} JSON/YAML files parse correctly.`);
}
