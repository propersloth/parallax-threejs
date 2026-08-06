// Shared file-copy logic behind /init's scaffold step (commands/init.md) —
// the scaffold/{lib,scripts,test/visual} -> project copy that seeds
// Parallax's interactive scripts and visual regression harness into a real
// project. Pulled out of init.md's prose into a real, testable function so
// `/init` and scripts/check-scaffold-drift.ts run the exact same logic
// instead of the drift check re-implementing (and potentially disagreeing
// with) whatever init.md's prose currently says.
//
// Copy-if-missing only, matching /init's own contract: never overwrites an
// existing file, so a project that customized a copied script keeps its
// changes on a second /init run.

const SUBTREES = ["lib", "scripts", "test/visual"];

export interface CopyScaffoldResult {
  copied: string[];
  skipped: string[];
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

// True if destRoot/test/visual/scenarios/ already holds real scenario
// files (anything besides .gitkeep) — mirrors the original step 3 carve-out
// so a project's real scenarios never get shadowed by the placeholder.
async function hasRealScenarios(destRoot: string): Promise<boolean> {
  const scenariosDir = `${destRoot}/test/visual/scenarios`;
  if (!(await exists(scenariosDir))) return false;
  for await (const entry of Deno.readDir(scenariosDir)) {
    if (entry.name !== ".gitkeep") return true;
  }
  return false;
}

// Copies scaffoldRoot/{lib,scripts,test/visual} into destRoot, file by
// file, skipping any destination path that already exists. lib/ is walked
// first since scripts/ and test/visual/ both import from it (matches the
// original step ordering — not load-bearing for correctness since every
// file is independently copy-if-missing, but keeps behavior identical to
// what shipped before this refactor).
export async function copyScaffold(
  scaffoldRoot: string,
  destRoot: string,
): Promise<CopyScaffoldResult> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const skipGitkeep = await hasRealScenarios(destRoot);

  for (const subtree of SUBTREES) {
    const srcSubtreeRoot = `${scaffoldRoot}/${subtree}`;
    if (!(await exists(srcSubtreeRoot))) continue;

    for await (const srcPath of walk(srcSubtreeRoot)) {
      const relPath = srcPath.slice(srcSubtreeRoot.length + 1);
      if (skipGitkeep && relPath === "scenarios/.gitkeep") continue;

      const destPath = `${destRoot}/${subtree}/${relPath}`;
      if (await exists(destPath)) {
        skipped.push(destPath);
        continue;
      }

      const destDir = destPath.slice(0, destPath.lastIndexOf("/"));
      await Deno.mkdir(destDir, { recursive: true });
      await Deno.copyFile(srcPath, destPath);
      copied.push(destPath);
    }
  }

  return { copied, skipped };
}
