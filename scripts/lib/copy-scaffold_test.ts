import { assert, assertEquals } from "@std/assert";
import { copyScaffold } from "./copy-scaffold.ts";

// Builds a minimal scaffold/ tree under a fresh temp dir and returns its
// path — real filesystem I/O, not mocked, since copyScaffold's whole job
// is file-copy semantics that a mock would just assume correct.
async function makeScaffold(): Promise<string> {
  const root = await Deno.makeTempDir();
  await Deno.mkdir(`${root}/lib`, { recursive: true });
  await Deno.mkdir(`${root}/scripts`, { recursive: true });
  await Deno.mkdir(`${root}/test/visual/scenarios`, { recursive: true });
  await Deno.writeTextFile(`${root}/lib/renderer-info.ts`, "// lib file\n");
  await Deno.writeTextFile(`${root}/scripts/checkpoint.ts`, "// script\n");
  await Deno.writeTextFile(
    `${root}/test/visual/scenarios/.gitkeep`,
    "",
  );
  return root;
}

Deno.test("copyScaffold copies every file into an empty destination", async () => {
  const scaffoldRoot = await makeScaffold();
  const destRoot = await Deno.makeTempDir();

  const result = await copyScaffold(scaffoldRoot, destRoot);

  assertEquals(result.skipped, []);
  assertEquals(result.copied.length, 3);
  assertEquals(
    await Deno.readTextFile(`${destRoot}/lib/renderer-info.ts`),
    "// lib file\n",
  );
  assert(await Deno.stat(`${destRoot}/scripts/checkpoint.ts`));
  assert(
    await Deno.stat(`${destRoot}/test/visual/scenarios/.gitkeep`),
  );
});

Deno.test("copyScaffold skips a destination file that already exists, without overwriting it", async () => {
  const scaffoldRoot = await makeScaffold();
  const destRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${destRoot}/lib`, { recursive: true });
  await Deno.writeTextFile(
    `${destRoot}/lib/renderer-info.ts`,
    "// customized by the project\n",
  );

  const result = await copyScaffold(scaffoldRoot, destRoot);

  assertEquals(result.skipped, [`${destRoot}/lib/renderer-info.ts`]);
  assertEquals(
    await Deno.readTextFile(`${destRoot}/lib/renderer-info.ts`),
    "// customized by the project\n",
  );
});

Deno.test("copyScaffold does not copy scenarios/.gitkeep when the project already has real scenario files", async () => {
  const scaffoldRoot = await makeScaffold();
  const destRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${destRoot}/test/visual/scenarios`, { recursive: true });
  await Deno.writeTextFile(
    `${destRoot}/test/visual/scenarios/my-real-scenario.json`,
    "{}",
  );

  const result = await copyScaffold(scaffoldRoot, destRoot);

  assertEquals(
    result.copied.includes(`${destRoot}/test/visual/scenarios/.gitkeep`),
    false,
  );
  await assertNotExists(`${destRoot}/test/visual/scenarios/.gitkeep`);
});

async function assertNotExists(path: string) {
  try {
    await Deno.stat(path);
    throw new Error(`expected ${path} not to exist`);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
}
