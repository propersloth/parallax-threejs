# templates/

Not user-facing documentation — this is the source of truth `/init`
(`commands/init.md`) copies from when scaffolding Parallax's interactive scripts
and visual regression harness into a real project.

If you're editing the interactive scripts or the visual regression harness, edit
them here — this is the one canonical copy in the plugin.

`deno-tasks.json` is a fragment, not a full `deno.json` — `/init` merges its
entries into whatever `deno.json` already exists at the destination project,
rather than overwriting the whole file (which would clobber project-specific
tasks).

Test files (`*_test.ts`) live alongside the source they test and get scaffolded
by `/init` along with everything else — no special-casing needed. See
CONTRIBUTING.md's "Testing model" section for the Lane 1/ Lane 2 split and what
to update when adding a new browser-dependent test.
