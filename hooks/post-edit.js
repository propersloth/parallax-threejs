#!/usr/bin/env node
// Reads the PostToolUse event JSON from stdin, and if the edited file is
// rendering-relevant, leaves a marker for Claude to act on next turn (see
// commands/checkpoint.md). Deliberately narrow-scoped per AGENTS.md §5 —
// this should only fire for files that can affect the rendered scene, not
// every save in the repo.
//
// Limitation: a PostToolUse command hook is a shell process, not the agent
// — it cannot call MCP tools itself. This writes a marker only; the actual
// checkpoint capture still happens through Claude reading that marker.
//
// The actual render-relevance decision lives in render-relevant.mjs — kept
// separate specifically so it's unit-testable (see render-relevant_test.ts)
// without needing to mock stdin or touch the filesystem.

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", async () => {
  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.exit(0); // malformed input — fail open, don't block the tool call
  }

  const path = event?.tool_input?.file_path ?? "";
  const { isRenderRelevant } = await import("./render-relevant.mjs");
  if (!isRenderRelevant(path)) {
    process.exit(0); // not rendering-relevant — no-op
  }

  const fs = require("fs");
  const root = process.env.CLAUDE_PLUGIN_ROOT || ".";
  const dir = `${root}/.parallax`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    `${dir}/pending-checkpoint`,
    JSON.stringify({ path, timestamp: new Date().toISOString() }),
  );
  process.exit(0);
});
