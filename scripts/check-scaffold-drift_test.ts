import { assertEquals } from "@std/assert";
import { checkScaffoldDrift } from "./check-scaffold-drift.ts";

async function makeScaffold(): Promise<string> {
  const root = await Deno.makeTempDir();
  await Deno.mkdir(`${root}/lib`, { recursive: true });
  await Deno.mkdir(`${root}/scripts`, { recursive: true });
  await Deno.mkdir(`${root}/test/visual/scenarios`, { recursive: true });
  await Deno.writeTextFile(`${root}/lib/renderer-info.ts`, "// lib file\n");
  await Deno.writeTextFile(`${root}/scripts/checkpoint.ts`, "// script\n");
  await Deno.writeTextFile(`${root}/test/visual/scenarios/.gitkeep`, "");
  return root;
}

Deno.test("checkScaffoldDrift reports no differences when the example matches a fresh copy exactly", async () => {
  const scaffoldRoot = await makeScaffold();
  const exampleRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${exampleRoot}/lib`, { recursive: true });
  await Deno.mkdir(`${exampleRoot}/scripts`, { recursive: true });
  await Deno.mkdir(`${exampleRoot}/test/visual/scenarios`, {
    recursive: true,
  });
  await Deno.writeTextFile(
    `${exampleRoot}/lib/renderer-info.ts`,
    "// lib file\n",
  );
  await Deno.writeTextFile(
    `${exampleRoot}/scripts/checkpoint.ts`,
    "// script\n",
  );
  // Real scenario file instead of .gitkeep — legitimately excluded from
  // the diff, not a difference.
  await Deno.writeTextFile(
    `${exampleRoot}/test/visual/scenarios/my-scenario.json`,
    "{}",
  );

  assertEquals(await checkScaffoldDrift(scaffoldRoot, exampleRoot), []);
});

Deno.test("checkScaffoldDrift reports a MISSING file the scaffold would produce", async () => {
  const scaffoldRoot = await makeScaffold();
  const exampleRoot = await Deno.makeTempDir();
  // Nothing copied into exampleRoot at all.

  const differences = await checkScaffoldDrift(scaffoldRoot, exampleRoot);

  assertEquals(
    differences.some((d) =>
      d.includes("MISSING") && d.includes("lib/renderer-info.ts")
    ),
    true,
  );
});

Deno.test("checkScaffoldDrift reports a CONTENT MISMATCH when the example's copy has diverged", async () => {
  const scaffoldRoot = await makeScaffold();
  const exampleRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${exampleRoot}/lib`, { recursive: true });
  await Deno.mkdir(`${exampleRoot}/scripts`, { recursive: true });
  await Deno.writeTextFile(
    `${exampleRoot}/lib/renderer-info.ts`,
    "// this has drifted from scaffold/\n",
  );
  await Deno.writeTextFile(
    `${exampleRoot}/scripts/checkpoint.ts`,
    "// script\n",
  );

  const differences = await checkScaffoldDrift(scaffoldRoot, exampleRoot);

  assertEquals(
    differences.some((d) =>
      d.includes("CONTENT MISMATCH") && d.includes("lib/renderer-info.ts")
    ),
    true,
  );
});

Deno.test("checkScaffoldDrift reports an EXTRA file under a managed subtree that scaffold/ doesn't produce", async () => {
  const scaffoldRoot = await makeScaffold();
  const exampleRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${exampleRoot}/lib`, { recursive: true });
  await Deno.mkdir(`${exampleRoot}/scripts`, { recursive: true });
  await Deno.writeTextFile(
    `${exampleRoot}/lib/renderer-info.ts`,
    "// lib file\n",
  );
  await Deno.writeTextFile(
    `${exampleRoot}/scripts/checkpoint.ts`,
    "// script\n",
  );
  await Deno.writeTextFile(
    `${exampleRoot}/scripts/leftover-from-an-old-scaffold.ts`,
    "// stale\n",
  );

  const differences = await checkScaffoldDrift(scaffoldRoot, exampleRoot);

  assertEquals(
    differences.some((d) =>
      d.includes("EXTRA") &&
      d.includes("scripts/leftover-from-an-old-scaffold.ts")
    ),
    true,
  );
});

Deno.test("checkScaffoldDrift ignores project-root files outside the managed subtrees", async () => {
  const scaffoldRoot = await makeScaffold();
  const exampleRoot = await Deno.makeTempDir();
  await Deno.mkdir(`${exampleRoot}/lib`, { recursive: true });
  await Deno.mkdir(`${exampleRoot}/scripts`, { recursive: true });
  await Deno.writeTextFile(
    `${exampleRoot}/lib/renderer-info.ts`,
    "// lib file\n",
  );
  await Deno.writeTextFile(
    `${exampleRoot}/scripts/checkpoint.ts`,
    "// script\n",
  );
  // Real project files /init doesn't fully generate — must not appear as
  // "EXTRA".
  await Deno.writeTextFile(`${exampleRoot}/index.html`, "<html></html>");
  await Deno.writeTextFile(`${exampleRoot}/deno.json`, "{}");

  assertEquals(await checkScaffoldDrift(scaffoldRoot, exampleRoot), []);
});
