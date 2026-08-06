// Verifies examples/teapot-demo/ still matches what a fresh /init run
// would produce from scaffold/ — the mechanical half of the
// scaffold/example pairing principle
// (aidlc-docs/handoff-directory-reorg.md "The scaffold/example coupling
// principle"): a scaffold that's never actually instantiated and diffed is
// trusting /init's copy step is correct by static reading alone.
//
// Runs copyScaffold() (scripts/lib/copy-scaffold.ts — the same function
// /init itself calls, see commands/init.md step 1) against a fresh temp
// dir, then diffs the result against the committed examples/teapot-demo/
// tree file by file. Any difference — a file /init would produce that's
// missing or different in the example, or a file under the example's
// scaffold-managed subtrees that scaffold/ wouldn't produce — is a hard
// failure with a readable list of what differed, not just an exit code.
//
// Usage: deno run --allow-read --allow-write scripts/check-scaffold-drift.ts
// Also available as `deno task check:scaffold-drift`; wired into CI (see
// .github/workflows/ci.yml) so drift is caught on every push, not just
// when someone remembers to run this locally.
import { copyScaffold } from "./lib/copy-scaffold.ts";

// Subtrees under examples/teapot-demo/ that copyScaffold() actually
// manages — everything else at the example's root (index.html, README.md,
// deno.json, ...) is a real project file /init doesn't fully generate
// (deno.json is *merged into*, not copied — see init.md steps 2-3), out
// of scope for this check.
const MANAGED_PREFIXES = ["lib/", "scripts/", "test/visual/"];

// Paths that are legitimately NOT produced by /init's copy step, so
// excluded from the diff in both directions rather than flagged as
// missing/extra: real scenario files (and the record/-only
// *.overlay.json fixture) are authored after /init runs, not copied by
// it — see aidlc-state.md's note on checkpoint-diff.overlay.json.
const EXCLUDED_PREFIXES = ["test/visual/scenarios/"];

function isExcluded(relPath: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function isManaged(relPath: string): boolean {
  return MANAGED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Returns a list of human-readable difference descriptions — empty means
// exampleRoot matches a fresh scaffoldRoot copy exactly.
export async function checkScaffoldDrift(
  scaffoldRoot: string,
  exampleRoot: string,
): Promise<string[]> {
  const differences: string[] = [];
  const tempDir = await Deno.makeTempDir({ prefix: "scaffold-drift-" });

  try {
    await copyScaffold(scaffoldRoot, tempDir);

    // Everything /init would produce must exist, byte-identical, in the
    // committed example.
    for await (const producedPath of walk(tempDir)) {
      const relPath = producedPath.slice(tempDir.length + 1);
      if (isExcluded(relPath)) continue;

      const examplePath = `${exampleRoot}/${relPath}`;
      if (!(await exists(examplePath))) {
        differences.push(`MISSING in ${exampleRoot}: ${relPath}`);
        continue;
      }
      const [produced, committed] = await Promise.all([
        Deno.readFile(producedPath),
        Deno.readFile(examplePath),
      ]);
      if (!equalBytes(produced, committed)) {
        differences.push(`CONTENT MISMATCH: ${relPath}`);
      }
    }

    // Everything under the example's scaffold-managed subtrees must be
    // something scaffold/ would actually produce — otherwise the example
    // has drifted to include something scaffold/ doesn't (or no longer)
    // offer.
    if (await exists(exampleRoot)) {
      for await (const examplePath of walk(exampleRoot)) {
        const relPath = examplePath.slice(exampleRoot.length + 1);
        if (isExcluded(relPath) || !isManaged(relPath)) continue;
        if (!(await exists(`${tempDir}/${relPath}`))) {
          differences.push(
            `EXTRA in ${exampleRoot} (not produced by ${scaffoldRoot}/): ${relPath}`,
          );
        }
      }
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }

  return differences;
}

if (import.meta.main) {
  const SCAFFOLD_ROOT = "scaffold";
  const EXAMPLE_ROOT = "examples/teapot-demo";

  if (!(await exists(EXAMPLE_ROOT))) {
    console.error(
      `${EXAMPLE_ROOT} doesn't exist — nothing to check drift against.`,
    );
    Deno.exit(1);
  }

  const differences = await checkScaffoldDrift(SCAFFOLD_ROOT, EXAMPLE_ROOT);

  if (differences.length > 0) {
    console.error(
      `${EXAMPLE_ROOT} has drifted from what ${SCAFFOLD_ROOT}/ would ` +
        `produce (${differences.length} difference${
          differences.length === 1 ? "" : "s"
        }):\n`,
    );
    for (const d of differences) console.error(`  - ${d}`);
    console.error(
      `\nRe-run /init against ${EXAMPLE_ROOT}/ (or update ${SCAFFOLD_ROOT}/) ` +
        "and commit the result.",
    );
    Deno.exit(1);
  }

  console.log(
    `${EXAMPLE_ROOT} matches a fresh /init run of ${SCAFFOLD_ROOT}/ — no drift.`,
  );
}
