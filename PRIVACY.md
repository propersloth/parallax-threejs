# Privacy Policy

Parallax doesn't collect, store, or transmit any data.

Every tool it uses — screenshot capture, console access, GL state inspection,
scene graph reads, checkpoint/diff snapshots — runs locally against your own
dev server, inside your own Claude Code session. Nothing is sent to Sean
O'Donnell, to any third-party service, or anywhere off your machine.

## What this plugin has access to

- Your local three.js dev server, via `window.scene` (and optionally
  `window.__THREE_CAMERA__`) — a convention you opt into, not something
  Parallax discovers or reaches out to on its own.
- Your browser, via the MCP servers it configures (chrome-devtools-mcp,
  threejs-devtools-mcp, playwright-mcp, spector) — screenshots, console
  output, and GL state, all read locally and handed directly to Claude
  within your session.

## What it does not do

- No analytics, telemetry, or usage tracking of any kind.
- No network calls to any server operated by Sean O'Donnell or Parallax.
- No accounts, no sign-in, nothing to opt out of because there's nothing
  collected in the first place.

Confirmed by inspection, not just asserted: this repo has zero runtime
dependencies and no outbound network calls beyond legitimate install-time
references (GitHub, the npm registry, Deno, Node.js).

## Questions

Open an issue at
[github.com/propersloth/parallax-threejs](https://github.com/propersloth/parallax-threejs/issues).
