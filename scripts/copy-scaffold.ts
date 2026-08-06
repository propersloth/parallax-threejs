// CLI entry for copyScaffold() (scripts/lib/copy-scaffold.ts) — what /init
// (commands/init.md) actually runs for its scaffold-copy step, so that
// logic lives in one real, testable place instead of being restated as
// prose the prompt could drift from. Also the exact function
// scripts/check-scaffold-drift.ts imports directly to verify examples/
// teapot-demo/ still matches what a fresh /init run would produce.
//
// Usage:
//   deno run --allow-read --allow-write scripts/copy-scaffold.ts <scaffoldRoot> <destRoot>
//
// Prints a {copied, skipped} JSON result to stdout for /init to report in
// its summary step.
import { copyScaffold } from "./lib/copy-scaffold.ts";

const [scaffoldRoot, destRoot] = Deno.args;
if (!scaffoldRoot || !destRoot) {
  console.error(
    "Usage: deno run --allow-read --allow-write scripts/copy-scaffold.ts <scaffoldRoot> <destRoot>",
  );
  Deno.exit(1);
}

const result = await copyScaffold(scaffoldRoot, destRoot);
console.log(JSON.stringify(result, null, 2));
