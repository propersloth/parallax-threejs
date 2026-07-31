#!/usr/bin/env sh
# macOS/Linux. Windows: use setup-spector.ps1 instead — POSIX shell
# doesn't run natively there. Both do the same thing; setup.ts picks the
# right one automatically based on platform.
#
# Clones and builds Spector.js's MCP server into a fixed, deterministic
# location so .mcp.json can reference it without a manual path edit.
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="$PLUGIN_ROOT/vendor/spector"

if [ -d "$VENDOR_DIR" ]; then
  echo "Spector already vendored at $VENDOR_DIR — skipping clone."
else
  git clone --depth 1 https://github.com/BabylonJS/Spector.js.git "$VENDOR_DIR"
fi

cd "$VENDOR_DIR/mcp"
npm install
npm run build

echo "Spector MCP built at $VENDOR_DIR/mcp/dist/index.js"
