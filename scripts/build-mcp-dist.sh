#!/usr/bin/env sh
# First-pass scaffold for the standalone MCP dist variant — a naive
# exclusion-copy, not the real MCP server implementation. The actual
# self-managed browser lifecycle (per the brainstorm: option 1, own
# Playwright instance instead of CDP-attaching to a Claude-Code-orchestrated
# tab) and a real package.json for npm publishing are still a future
# engagement. This exists now specifically so dist-purity has something
# concrete to check in CI — packaging correctness can be verified before
# the server logic itself is built.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist/parallax-threejs-mcp"

rm -rf "$DIST"
mkdir -p "$DIST"

# Copy everything, then strip what has no MCP equivalent — see the
# brainstorm's "no MCP equivalent at all" list: subagents, hooks, skills,
# slash commands, LSP config, and the Claude Code plugin manifest itself.
cp -r "$ROOT"/. "$DIST"/
rm -rf \
  "$DIST/agents" \
  "$DIST/hooks" \
  "$DIST/skills" \
  "$DIST/commands" \
  "$DIST/.claude-plugin" \
  "$DIST/.lsp.json" \
  "$DIST/dist" \
  "$DIST/.git"

echo "Built $DIST — exclusion-copy only, not yet a real MCP server package."
echo "Still needed for a real release: its own package.json, self-managed"
echo "Playwright browser lifecycle in scripts/lib/live-scene.ts (currently"
echo "assumes a Claude-Code-orchestrated shared tab), and an npm publish step."
