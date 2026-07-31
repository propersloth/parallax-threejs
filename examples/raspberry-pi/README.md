# Raspberry Pi 5 variant

The plugin's default `.mcp.json` is cross-platform and assumes nothing
about your OS or display setup. If you're running on a Pi 5 headlessly
over SSH but want a real, visible Chrome window on the Pi's own monitor
(the setup this plugin was originally built against), use `mcp.json` in
this folder instead — copy it over your project's `.mcp.json`, then:

1. Log into the Pi's desktop directly (not over SSH) and run
   `echo $DISPLAY; echo $XAUTHORITY` to get your real values.
2. Replace `REPLACE_WITH_YOUR_DISPLAY_VALUE` and
   `REPLACE_WITH_YOUR_XAUTHORITY_PATH` with those — they're specific to
   your machine and session, never assume a prior example's values are
   still correct for yours.

See `scripts/setup-pi.sh` for the rest of the Pi bootstrap (Chrome ARM64,
Deno, Rust/cargo, `shader_language_server`, vendoring Spector), and
AGENTS.md §7a for why performance numbers on this hardware aren't
trustworthy regardless of this config.
