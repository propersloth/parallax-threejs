#!/usr/bin/env sh
# One-time bootstrap for running Parallax on a Raspberry Pi 5 (Raspberry Pi
# OS, Debian-based, ARM64). Installs raw toolchain (Chrome, Node, Deno,
# Rust), then hands off to scripts/setup.ts for everything that can be
# done interactively (Spector, skills, dependencies) once Deno exists.
# DISPLAY/XAUTHORITY and the .mcp.json copy genuinely can't be scripted —
# see the manual steps printed partway through.
set -e

echo "== Chrome (native ARM64 build, unofficial/undocumented as of writing) =="
if ! command -v google-chrome-stable >/dev/null 2>&1; then
  TMP_DEB=$(mktemp --suffix=.deb)
  curl -fsSL "https://dl.google.com/linux/direct/google-chrome-stable_current_arm64.deb" -o "$TMP_DEB"
  sudo apt install -y "$TMP_DEB"
  rm -f "$TMP_DEB"
else
  echo "google-chrome-stable already installed — skipping."
fi

echo "== Node.js (via NodeSource, for Claude Code + npx-based MCP servers) =="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "node already installed ($(node --version)) — skipping."
fi

echo "== Deno (for Parallax's interactive scripts and visual regression suite) =="
if ! command -v deno >/dev/null 2>&1; then
  curl -fsSL https://deno.land/install.sh | sh
else
  echo "deno already installed — skipping."
fi

echo "== Rust/cargo + shader_language_server (GLSL LSP) =="
if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y
  . "$HOME/.cargo/env"
fi
if ! command -v shader-language-server >/dev/null 2>&1; then
  cargo install shader_language_server
else
  echo "shader-language-server already installed — skipping."
fi

echo ""
echo "Raw toolchain bootstrap done."
echo ""
echo "Two things genuinely can't be automated — do these first:"
echo "1. Copy the Pi-specific MCP config over your project's default one:"
echo "     cp examples/raspberry-pi/mcp.json .mcp.json"
echo "   (the plugin's default .mcp.json is cross-platform and doesn't"
echo "   assume a Pi, so this step is what actually makes it Pi-ready)"
echo "2. Log into the Pi's desktop session directly (not SSH) and run:"
echo "     echo \$DISPLAY; echo \$XAUTHORITY"
echo "   Put those values into the copied .mcp.json, replacing"
echo "   REPLACE_WITH_YOUR_DISPLAY_VALUE and REPLACE_WITH_YOUR_XAUTHORITY_PATH."
echo "   Typical values are ':0' and '/home/<you>/.Xauthority', but confirm"
echo "   on your actual session rather than assuming."
echo ""
echo "Everything else (Spector, skills, physics/animation/postprocessing/"
echo "audio dependencies) is now interactive — Deno is bootstrapped, so:"
echo ""
read -p "Run the interactive setup now? [Y/n] " RUN_INTERACTIVE
RUN_INTERACTIVE=${RUN_INTERACTIVE:-Y}
if [ "$RUN_INTERACTIVE" = "Y" ] || [ "$RUN_INTERACTIVE" = "y" ]; then
  . "$HOME/.deno/env" 2>/dev/null || true
  deno run -A "$(dirname "$0")/setup.ts"
else
  echo "Skipped — run it later with: deno run -A scripts/setup.ts"
fi

echo ""
echo "Still manual after that:"
echo "- Install typescript-lsp and python-lsp official plugins (see README)."
echo "- /plugin install parallax-threejs, then restart Claude Code."
