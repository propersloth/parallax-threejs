# record/

Maintainer-only tooling for producing Parallax's own demo videos — **not shipped
in the npm package**. Deliberately absent from `package.json`'s `files`
allowlist, the same exclusion pattern already used for `vendor/`. If you
installed Parallax as a plugin, nothing here is relevant to you or present in
what you installed.

## `demo.ts`

```
deno run --allow-all record/demo.ts <scenario-name> [--pipeline <name>]
```

Loads a real `Scenario` — the exact same declarative format `/replay` and the
SHA-indexed regression suite already use (`templates/test/visual/lib/types.ts`),
not a separate demo-specific step vocabulary — from whichever
`examples/*/test/visual/scenarios/` directory has a matching name. Drives it via
the shared `runSteps()` helper (`templates/test/visual/lib/capture.ts`) inside a
Playwright video-recording context, then applies a named `ffmpeg` pipeline
preset from `record/pipelines/` to produce web-shareable `.mp4`/`.gif` output.

**Scenarios** live next to the example project they belong to —
`examples/teapot-demo/test/visual/scenarios/checkpoint-diff.json` is the first
one, and doubles as a real regression scenario `/replay` could run against the
teapot demo, not a demo-only artifact.

**Pipelines** (`record/pipelines/*.json`) are reusable ffmpeg presets, applied
by name at record time — not tied to any one scenario. `default` (mp4 + gif, the
settings this tool was built and verified against) covers the common case; add
more presets here as different venues need different treatment (e.g. a shorter,
gif-only, captioned preset for Discord/Twitter) without touching scenario files
at all.

**Prerequisite**: `ffmpeg` must be on `PATH`. Not bundled, not a project
dependency the way Playwright is — confirmed present on the maintainer's own
machine before this tool was built; if you're running this elsewhere, install it
yourself first.

**What it does NOT do yet**: this is deliberately not a Parallax command — no
`commands/*.md`, no `AGENTS.md` routing entry, no `/demo` slash command. It's
architected to be the natural backend for one (script name already matches the
intended command name, same pairing convention `/checkpoint`↔`checkpoint.ts` and
`/replay`↔`replay.ts` already use), but promoting it into a real shipped command
is its own explicitly-deferred backlog item — not built until separately
approved. See `aidlc-docs/inception/` (cycle 2) for the full design record.

Output goes to `.record-output/` (gitignored) — `raw/` for Playwright's `.webm`
captures, `videos/` for the final `.mp4`/`.gif` pair.
