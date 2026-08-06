// The backend for a future /demo command (Unit 3, explicitly deferred
// backlog per aidlc-docs cycle 2) -- not wired up as a real command
// yet. Maintainer-only, NOT shipped in the npm package (see
// scripts/record/README.md for why).
//
// Produces Parallax's own demo videos: loads a real Scenario (the exact
// same declarative format /replay and the regression suite already
// use, not a separate demo-specific step vocabulary), drives it via
// the shared runSteps() helper inside a Playwright video-recording
// context, then applies a named ffmpeg pipeline preset to produce
// web-shareable .mp4/.gif output.
//
// If the scenario has a paired <name>.overlay.json sidecar, this also
// runs the REAL /checkpoint and /diff commands (scaffold/scripts/
// checkpoint.ts, diff-checkpoints.ts) against a separate throwaway
// browser driving the same steps, and burns the actual persisted
// DiffRecord's values into the video as a mono-text overlay -- real
// plugin output, not fabricated numbers, per the user's explicit
// request.
//
// Usage: deno run --allow-all scripts/record/demo.ts <scenario-name> [--pipeline <name>]

import { chromium } from "playwright";
import { runSteps } from "../../scaffold/test/visual/lib/capture.ts";
import type { Scenario, Step } from "../../scaffold/test/visual/lib/types.ts";

interface DemoPipeline {
  name: string;
  formats: { mp4: boolean; gif: boolean };
  mp4?: { scale: string; crf: number; preset: string };
  gif?: { fps: number; scale: string };
}

// Declares a real /checkpoint -> /diff pass against the scenario's own
// steps, split three ways -- deliberately reuses the scenario's own
// step array rather than duplicating it.
interface DiffOverlaySpec {
  diffLabel: string;
  // steps[0:contentReadyStepIndex] is load/settle waiting -- trimmed
  // entirely from the output (kills CDN-load dead time and the white
  // pre-navigation flash Playwright's recordVideo captures before the
  // page paints, confirmed empirically to be a real, visible frame).
  // steps[contentReadyStepIndex:actionStepIndex] is the "before" hold.
  // steps[actionStepIndex:] is the action /diff is meant to catch.
  contentReadyStepIndex: number;
  actionStepIndex: number;
}

interface DiffRecordSubset {
  pixelDiffRatio: number;
  newConsoleMessages: string[];
  sceneObjectCountPrior: number;
  sceneObjectCountFresh: number;
  memory: { geometriesDelta: number; texturesDelta: number } | null;
  perf: {
    callsDelta: number;
    trianglesDelta: number;
    pointsDelta: number;
    linesDelta: number;
  } | null;
}

// --- Parse args ---------------------------------------------------------
const args = Deno.args;
const scenarioName = args[0];
if (!scenarioName || scenarioName.startsWith("--")) {
  console.error(
    "usage: scripts/record/demo.ts <scenario-name> [--pipeline <name>]",
  );
  Deno.exit(1);
}
const pipelineFlagIdx = args.indexOf("--pipeline");
const pipelineName = pipelineFlagIdx !== -1
  ? args[pipelineFlagIdx + 1]
  : "default";

// --- Locate the scenario (+ optional overlay sidecar) -------------------
// Searches every example project's own test/visual/scenarios/ -- mirrors
// a real Parallax-scaffolded project's layout, one pool per example
// project, rather than a single global scenario namespace.
async function findScenario(name: string): Promise<
  {
    scenario: Scenario;
    exampleDir: string;
    overlay: DiffOverlaySpec | null;
  }
> {
  const matches: { exampleDir: string; scenarioPath: string }[] = [];
  for await (const entry of Deno.readDir("examples")) {
    if (!entry.isDirectory) continue;
    const candidate =
      `examples/${entry.name}/test/visual/scenarios/${name}.json`;
    try {
      await Deno.stat(candidate);
      matches.push({
        exampleDir: `examples/${entry.name}`,
        scenarioPath: candidate,
      });
    } catch {
      // not present in this example project, keep looking
    }
  }
  if (matches.length === 0) {
    throw new Error(
      `no scenario named "${name}" found under any examples/*/test/visual/scenarios/`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `scenario name "${name}" is ambiguous -- found in: ${
        matches.map((m) => m.exampleDir).join(", ")
      }`,
    );
  }
  const { exampleDir, scenarioPath } = matches[0];
  const scenario: Scenario = JSON.parse(
    await Deno.readTextFile(scenarioPath),
  );

  let overlay: DiffOverlaySpec | null = null;
  const overlayPath = scenarioPath.replace(/\.json$/, ".overlay.json");
  try {
    overlay = JSON.parse(await Deno.readTextFile(overlayPath));
  } catch {
    // no overlay sidecar -- this scenario just won't get one, not an error
  }

  return { scenario, exampleDir, overlay };
}

const { scenario, exampleDir, overlay } = await findScenario(scenarioName);

// --- Load the pipeline preset -------------------------------------------
const pipelinePath = `record/pipelines/${pipelineName}.json`;
let pipeline: DemoPipeline;
try {
  pipeline = JSON.parse(await Deno.readTextFile(pipelinePath));
} catch {
  throw new Error(
    `no pipeline preset named "${pipelineName}" at ${pipelinePath}`,
  );
}

const rawDir = "scripts/record/.output/raw";
const outDir = "scripts/record/.output/videos";
await Deno.mkdir(rawDir, { recursive: true });
await Deno.mkdir(outDir, { recursive: true });

// --- Local file server for the example project, managed end to end -----
const PORT = "8199";
const server = new Deno.Command("deno", {
  args: [
    "run",
    "--allow-net",
    "--allow-read",
    "jsr:@std/http/file-server",
    exampleDir,
    "--port",
    PORT,
  ],
  stdout: "null",
  stderr: "null",
}).spawn();

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        await res.body?.cancel();
        return;
      }
      await res.body?.cancel();
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`local file server on :${PORT} never became ready`);
}

async function runFfmpeg(args: string[]): Promise<void> {
  const cmd = new Deno.Command("ffmpeg", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { success, stderr } = await cmd.output();
  if (!success) {
    console.error(new TextDecoder().decode(stderr));
    throw new Error(`ffmpeg failed: ${args.join(" ")}`);
  }
}

// Runs a real Parallax script (checkpoint.ts, diff-checkpoints.ts) from
// within scaffold/ -- matching how these scripts expect to run inside
// a real scaffolded project, not this repo's own root.
async function runDeno(scriptArgs: string[]): Promise<void> {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-all", ...scriptArgs],
    cwd: "scaffold",
    stdout: "piped",
    stderr: "piped",
  });
  const { success, stderr } = await cmd.output();
  if (!success) {
    throw new Error(
      `deno ${scriptArgs.join(" ")} failed: ${
        new TextDecoder().decode(stderr)
      }`,
    );
  }
}

// --- Runs the REAL /checkpoint -> /diff commands against a throwaway,
// CDP-exposed browser (separate from the one being video-recorded, per
// the design decision recorded in aidlc-docs: authentic real-command
// output without the added risk of sharing one CDP session between
// Playwright's own recordVideo and an externally-attached script).
// Replays the scenario's own setup/action step split so the diff
// reflects exactly the same interaction the video shows. -----------------
async function captureRealDiffRecord(
  sceneUrl: string,
  setupSteps: Step[],
  actionSteps: Step[],
  hasTouch: boolean,
  label: string,
): Promise<
  { record: DiffRecordSubset; recordPath: string; reportPath: string }
> {
  const CDP_PORT = "9223"; // matches scaffold/scripts/lib/live-scene.ts's BRIDGE_PORT default
  const profileDir = await Deno.makeTempDir();
  const chromeProc = new Deno.Command("chromium", {
    args: [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profileDir}`,
      "--no-sandbox",
      "--window-size=1280,800",
      sceneUrl,
    ],
    stdout: "null",
    stderr: "null",
  }).spawn();

  try {
    const deadline = Date.now() + 15000;
    let cdpReady = false;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`http://localhost:${CDP_PORT}/json/version`);
        await res.body?.cancel();
        if (res.ok) {
          cdpReady = true;
          break;
        }
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!cdpReady) {
      throw new Error(
        `throwaway browser's CDP port :${CDP_PORT} never became ready`,
      );
    }

    // Run setup steps on the throwaway browser, matching the recording's
    // own pacing, before the "before" checkpoint -- so it reflects a
    // settled scene, not a mid-load one.
    {
      const throwawayBrowser = await chromium.connectOverCDP(
        `http://localhost:${CDP_PORT}`,
      );
      const throwawayPage = throwawayBrowser.contexts()[0].pages()[0];
      await runSteps(throwawayPage, setupSteps, hasTouch);
      await throwawayBrowser.close(); // disconnect only, browser stays alive
    }

    await runDeno(["scripts/checkpoint.ts", label]);

    {
      const throwawayBrowser = await chromium.connectOverCDP(
        `http://localhost:${CDP_PORT}`,
      );
      const throwawayPage = throwawayBrowser.contexts()[0].pages()[0];
      await runSteps(throwawayPage, actionSteps, hasTouch);
      await throwawayBrowser.close();
    }

    await runDeno(["scripts/diff-checkpoints.ts", label]);

    const diffsDir = "scaffold/.parallax/diffs";
    const entries: string[] = [];
    for await (const e of Deno.readDir(diffsDir)) {
      if (e.name.endsWith(`-${label}.json`)) entries.push(e.name);
    }
    entries.sort();
    const latest = entries[entries.length - 1];
    const record: DiffRecordSubset = JSON.parse(
      await Deno.readTextFile(`${diffsDir}/${latest}`),
    );
    // User-facing path, as it'd appear in a real project -- strips the
    // "scaffold/" prefix, which only reflects where *this* throwaway
    // capture happened to run from, not something meaningful to show a
    // viewer of the demo.
    const recordPath = `.parallax/diffs/${latest}`;

    // Real /export-report pass, same throwaway working dir -- it reads
    // the diff JSON export-report.ts just wrote and finds it the same
    // way that script always does (most recent for the label), not by
    // being told the path directly.
    await runDeno(["scripts/export-report.ts", label]);
    const reportBase = latest.replace(/\.json$/, "");
    const reportPath = `.parallax/reports/${reportBase}.html`;

    await Deno.remove("scaffold/.parallax/checkpoints", { recursive: true })
      .catch(() => {});
    await Deno.remove("scaffold/.parallax/diffs", { recursive: true }).catch(
      () => {},
    );
    await Deno.remove("scaffold/.parallax/reports", { recursive: true })
      .catch(() => {});

    return { record, recordPath, reportPath };
  } finally {
    chromeProc.kill();
    await chromeProc.status;
    await Deno.remove(profileDir, { recursive: true }).catch(() => {});
  }
}

// Cumulative terminal-style command lines (white) -- both stay visible
// once /diff has run, not replaced by it, matching real terminal
// scrollback. Shows the actual commands a viewer would type, not just
// their result, so the overlay reads as "here's the real command
// sequence" rather than implying Parallax itself renders some kind of
// in-app video overlay (it doesn't; this is ffmpeg post-processing of
// real command output). No leading "$" -- these are slash commands typed
// into an agent conversation, not a shell, and the prompt glyph read as
// misleading (and was visual noise) on an earlier viewing.
// Label is deliberately not shown -- both /checkpoint and /diff take it
// as an optional argument (see commands/checkpoint.md, commands/diff.md),
// and showing this scenario's internal "before" tag read as an implied
// "after" counterpart that was never coming, which confused an earlier
// viewing. The commands run for real with a label internally (still
// needed to pair this checkpoint/diff/report with each other), just not
// displayed.
function buildCommandLines(recordPath: string): string[] {
  return [
    `/checkpoint`,
    `/diff`,
    `  -> ${recordPath}`,
  ];
}

// /export-report is its own trailing block, below the diff data it
// reports on -- matches the real sequence (you only export *after*
// you've seen a diff worth exporting), not grouped in with the
// /checkpoint -> /diff commands that produce the diff itself.
function buildExportLines(reportPath: string): string[] {
  return [
    `/export-report`,
    `  -> ${reportPath}`,
  ];
}

// Compact, git-diff-style data lines (green, "+"-prefixed) -- only
// fields this scenario's own action actually moves. Deliberately
// scenario-chosen (examples/teapot-demo's "spawn temp mesh" action, not
// a lighting-only change) so every one of these is a real, nonzero
// delta worth featuring -- padding the card with permanently-zero
// fields (as an earlier version of this scenario did) doesn't
// demonstrate anything and dilutes the ones that matter. "console" is
// only included when there's something to show, same reasoning.
function buildDiffLines(record: DiffRecordSubset): string[] {
  const pct = (record.pixelDiffRatio * 100).toFixed(1);
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const lines = [
    `+ pixels    ${pct}%`,
    `+ objects   ${record.sceneObjectCountPrior} -> ${record.sceneObjectCountFresh}`,
  ];
  if (record.memory) {
    lines.push(
      `+ memory    geom ${fmt(record.memory.geometriesDelta)}  tex ${
        fmt(record.memory.texturesDelta)
      }`,
    );
  }
  if (record.perf) {
    lines.push(
      `+ perf      calls ${fmt(record.perf.callsDelta)}  tri ${
        fmt(record.perf.trianglesDelta)
      }`,
    );
  }
  if (record.newConsoleMessages.length > 0) {
    lines.push(`+ console   ${record.newConsoleMessages.length} new`);
  }
  return lines;
}

async function findMonoFont(): Promise<string> {
  const cmd = new Deno.Command("fc-match", {
    args: ["-f", "%{file}", "monospace"],
    stdout: "piped",
  });
  const { success, stdout } = await cmd.output();
  const path = new TextDecoder().decode(stdout).trim();
  if (!success || !path) {
    throw new Error(
      "no monospace font found via fc-match -- install fontconfig, or hardcode a font path here",
    );
  }
  return path;
}

const baseUrl = `http://localhost:${PORT}`;
const sceneUrl = new URL(scenario.path, baseUrl).toString();

try {
  await waitForServer(sceneUrl);

  // --- Record -----------------------------------------------------
  const viewport = scenario.device?.viewport ?? { width: 1280, height: 800 };
  const hasTouch = scenario.device?.hasTouch ?? false;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    isMobile: scenario.device?.isMobile,
    hasTouch: scenario.device?.hasTouch,
    deviceScaleFactor: scenario.device?.deviceScaleFactor,
    recordVideo: { dir: rawDir, size: viewport },
  });
  const page = await context.newPage();
  const recordingStart = Date.now();
  await page.goto(sceneUrl);

  let contentStartSec: number | null = null;
  let actionStartSec: number | null = null;
  if (overlay) {
    await runSteps(
      page,
      scenario.steps.slice(0, overlay.contentReadyStepIndex),
      hasTouch,
    );
    contentStartSec = (Date.now() - recordingStart) / 1000;
    await runSteps(
      page,
      scenario.steps.slice(
        overlay.contentReadyStepIndex,
        overlay.actionStepIndex,
      ),
      hasTouch,
    );
    // Marked *after* the action step resolves, not before it -- confirmed
    // via real frame extraction that page.click()'s actionability-check +
    // dispatch overhead is not negligible under this scene's continuous
    // WebGL render loop (~1s observed), so marking the timestamp right
    // before the click (as an earlier version did) made the overlay's
    // phase-2/diff gate switch a full second before the spawned mesh was
    // actually visible on screen. actionStepIndex is assumed to name
    // exactly one step -- the action itself -- per the overlay sidecar's
    // own contract.
    await runSteps(
      page,
      scenario.steps.slice(
        overlay.actionStepIndex,
        overlay.actionStepIndex + 1,
      ),
      hasTouch,
    );
    actionStartSec = (Date.now() - recordingStart) / 1000;
    await runSteps(
      page,
      scenario.steps.slice(overlay.actionStepIndex + 1),
      hasTouch,
    );
  } else {
    await runSteps(page, scenario.steps, hasTouch);
  }

  const video = page.video();
  await context.close(); // finalizes the .webm
  await browser.close();

  if (!video) {
    throw new Error(
      "no video was recorded -- recordVideo may not have been configured correctly",
    );
  }
  const rawPath = await video.path();
  console.log(`raw recording: ${rawPath}`);

  // --- Real /checkpoint -> /diff pass + overlay burn-in, if declared -----
  let sourcePath = rawPath;
  if (overlay && contentStartSec !== null && actionStartSec !== null) {
    console.log(
      `running real /checkpoint -> /diff -> /export-report for the overlay (label "${overlay.diffLabel}")...`,
    );
    const { record, recordPath, reportPath } = await captureRealDiffRecord(
      sceneUrl,
      scenario.steps.slice(0, overlay.actionStepIndex),
      scenario.steps.slice(overlay.actionStepIndex),
      hasTouch,
      overlay.diffLabel,
    );
    console.log("real DiffRecord:", JSON.stringify(record));
    console.log(`real DiffRecord persisted at: ${recordPath}`);
    console.log(`real report rendered at: ${reportPath}`);

    // Trimmed relative to contentStartSec (see below), not the original
    // recording -- input seeking (-ss before -i) resets the output's
    // own timeline to 0 at the trim point, confirmed against ffmpeg's
    // documented behavior, so every enable='...' time below is relative
    // to the trimmed clip, not the pre-trim one.
    const adjustedActionStartSec = actionStartSec - contentStartSec;

    const commandLines = buildCommandLines(recordPath);
    const diffLines = buildDiffLines(record);
    const exportLines = buildExportLines(reportPath);

    // Fixed box, sized once for the largest content it will ever show
    // (commands + diff lines + export lines) -- per explicit request, the
    // panel does not resize as content is added, and overlapping the
    // scene is fine. Character-width/line-height are approximations
    // for a typical monospace font at this size; visually verified via
    // real frame extraction (see aidlc-docs build-and-test summary),
    // not assumed correct from the math alone.
    const FONT_SIZE = 20;
    const LINE_SPACING = 6;
    const CHAR_WIDTH = FONT_SIZE * 0.62;
    const LINE_HEIGHT = FONT_SIZE + LINE_SPACING;
    const PAD = 14;
    const SECTION_GAP = 8;

    const allLines = [...commandLines, ...diffLines, ...exportLines];
    const maxLineLen = Math.max(...allLines.map((l) => l.length));
    const boxWidth = Math.ceil(maxLineLen * CHAR_WIDTH) + PAD * 2;
    const boxHeight = Math.ceil(
      commandLines.length * LINE_HEIGHT + SECTION_GAP +
        diffLines.length * LINE_HEIGHT + SECTION_GAP +
        exportLines.length * LINE_HEIGHT,
    ) + PAD * 2;

    const viewportW = viewport.width;
    const viewportH = viewport.height;
    const boxX = viewportW - boxWidth - 40;
    const boxY = viewportH - boxHeight - 40;
    const textX = boxX + PAD;
    const commandsY = boxY + PAD;
    const diffY = commandsY + commandLines.length * LINE_HEIGHT + SECTION_GAP;
    const exportY = diffY + diffLines.length * LINE_HEIGHT + SECTION_GAP;

    const commandsPhase1Path = `${rawDir}/${scenario.name}-cmds-1.txt`;
    await Deno.writeTextFile(commandsPhase1Path, commandLines[0]);
    const commandsPhase2Path = `${rawDir}/${scenario.name}-cmds-2.txt`;
    await Deno.writeTextFile(commandsPhase2Path, commandLines.join("\n"));
    const diffPath = `${rawDir}/${scenario.name}-diff.txt`;
    await Deno.writeTextFile(diffPath, diffLines.join("\n"));
    const exportPath = `${rawDir}/${scenario.name}-export.txt`;
    await Deno.writeTextFile(exportPath, exportLines.join("\n"));

    const fontPath = await findMonoFont();
    const overlaidPath = `${rawDir}/${scenario.name}-overlaid.mp4`;
    await runFfmpeg([
      "-y",
      // Input seeking, before -i: trims the CDN-load dead time and the
      // white pre-navigation flash Playwright's recordVideo captures
      // before the page paints (confirmed as a real, visible frame,
      // not assumed) -- one fix for both the pacing and the flash.
      "-ss",
      String(contentStartSec),
      "-i",
      rawPath,
      "-vf",
      // Fixed-size background box, drawn once, independent of which
      // text layer is currently active -- drawtext's own box=1 sizes
      // to *that call's* text, which would make the panel resize as
      // content is added; drawbox doesn't have that coupling.
      `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=${boxHeight}:color=black@0.6:t=fill,` +
      // expansion=none is load-bearing, not decorative -- confirmed
      // empirically: without it, drawtext treats "%" (from "5.2%")
      // as a text-expansion directive ("Stray % near ..."), which
      // silently drops the whole draw instead of erroring loudly.
      `drawtext=fontfile=${fontPath}:textfile=${commandsPhase1Path}:expansion=none:` +
      `fontsize=${FONT_SIZE}:fontcolor=white:x=${textX}:y=${commandsY}:` +
      `enable='between(t,0,${adjustedActionStartSec})',` +
      `drawtext=fontfile=${fontPath}:textfile=${commandsPhase2Path}:expansion=none:` +
      `fontsize=${FONT_SIZE}:fontcolor=white:line_spacing=${LINE_SPACING}:` +
      `x=${textX}:y=${commandsY}:enable='gte(t,${adjustedActionStartSec})',` +
      `drawtext=fontfile=${fontPath}:textfile=${diffPath}:expansion=none:` +
      `fontsize=${FONT_SIZE}:fontcolor=0x4ade80:line_spacing=${LINE_SPACING}:` +
      `x=${textX}:y=${diffY}:enable='gte(t,${adjustedActionStartSec})',` +
      `drawtext=fontfile=${fontPath}:textfile=${exportPath}:expansion=none:` +
      `fontsize=${FONT_SIZE}:fontcolor=white:line_spacing=${LINE_SPACING}:` +
      `x=${textX}:y=${exportY}:enable='gte(t,${adjustedActionStartSec})'`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      overlaidPath,
    ]);
    sourcePath = overlaidPath;
  }

  // --- Apply the pipeline via ffmpeg -------------------------------
  const outputBase = `${outDir}/${scenario.name}`;

  if (pipeline.formats.mp4) {
    const opts = pipeline.mp4 ?? { scale: "1280:-2", crf: 20, preset: "slow" };
    const mp4Path = `${outputBase}.mp4`;
    await runFfmpeg([
      "-y",
      "-i",
      sourcePath,
      "-vf",
      `scale=${opts.scale}`,
      "-c:v",
      "libx264",
      "-preset",
      opts.preset,
      "-crf",
      String(opts.crf),
      "-pix_fmt",
      "yuv420p",
      mp4Path,
    ]);
    console.log(`mp4: ${mp4Path}`);
  }

  if (pipeline.formats.gif) {
    const opts = pipeline.gif ?? { fps: 15, scale: "800:-2" };
    const gifPath = `${outputBase}.gif`;
    const palettePath = `${outputBase}-palette.png`;
    await runFfmpeg([
      "-y",
      "-i",
      sourcePath,
      "-vf",
      `fps=${opts.fps},scale=${opts.scale}:flags=lanczos,palettegen`,
      palettePath,
    ]);
    await runFfmpeg([
      "-y",
      "-i",
      sourcePath,
      "-i",
      palettePath,
      "-filter_complex",
      `fps=${opts.fps},scale=${opts.scale}:flags=lanczos[x];[x][1:v]paletteuse`,
      gifPath,
    ]);
    await Deno.remove(palettePath);
    console.log(`gif: ${gifPath}`);
  }
} finally {
  server.kill();
  await server.status;
}
