# Contributing

## One-time setup

```bash
git config core.hooksPath .githooks
```

Enables the pre-commit hook (`.githooks/pre-commit`) — a local mirror of
CI's Lane 1 job, so formatting/lint/test problems surface before you
commit rather than in a remote CI run. Not automatic; git doesn't
discover hooks outside `.git/hooks/` without this.

## Branch flow

Feature branches → PR → merge to `main` on approval. Don't push directly
to `main` — branch protection should be preventing this anyway once it's
configured on the live repo (see the separate repo setup/hardening
runbook).

## Before opening a PR

Run what CI runs, locally, first (or just rely on the pre-commit hook
from the one-time setup above — it runs the same things):

```bash
deno check scripts/*.ts
deno fmt --check scripts/ hooks/ templates/
deno lint scripts/ hooks/ templates/
deno run --allow-read scripts/validate-config-syntax.ts
deno test --allow-run=git --allow-read --allow-write --ignore=templates/test/visual/lib/capture_test.ts,templates/scripts/lib/live-scene_test.ts scripts/ hooks/ templates/
```

Also worth a manual `claude --plugin-dir .` session to sanity-check
anything you changed actually behaves as expected — CI's type/schema
checks catch structural problems, not behavioral ones.

If you're instead testing via `claude plugin install`/`claude plugin
update` against a local path (rather than `--plugin-dir .`), know that
`update` won't pick up your edits: local-path-sourced plugins are cached
per-version, and `update` treats an unchanged version number as already
up to date regardless of what actually changed on disk. A full
uninstall + reinstall is the only way to force a refresh (UAT finding
#3). `--plugin-dir .` doesn't have this problem — prefer it for
iterative local testing.

## Testing model — two lanes, on purpose

- **Lane 1** (`ci.yml`'s `test` job, runs on every PR): fast, pure-logic
  tests plus `git.ts` (subprocess-based but no browser, so it's cheap
  enough to stay here). Kept deliberately cheap — this needs to be
  something you're not annoyed to wait on for every push.
- **Lane 2** (`extended-tests.yml`, runs on push to `main`, a schedule,
  and manual dispatch — **not** on PRs): anything needing a real browser
  spin-up (`capture_test.ts`, `live-scene_test.ts`). Deliberately kept
  out of the PR loop so it doesn't tax every commit; it reports back on
  its own cadence instead.

If you add a new test that needs a browser, it goes in Lane 2 — add it to
`extended-tests.yml`'s test command *and* to Lane 1's `--ignore` list in
both `ci.yml` and `release.yml`. Miss one side of that and it either
slows down every PR or silently never runs anywhere.

## Versioning — you don't need to touch this

`plugin.json`'s version bumps automatically:

- **Patch** (`x.x.N`) — automatic, on every merge to `main`. Nothing to
  do for this.
- **Minor/major** (`x.N.x` / `N.x.x`) — a manually triggered release, at
  the maintainer's discretion, via `release.yml`'s workflow dispatch.

Don't hand-edit the `version` field in a PR — it gets overwritten by the
next automated bump regardless.

## Skill content

Only `skills/qa-visual-test-harness/SKILL.md` ships by default — it
documents this plugin's own regression suite specifically, so it's fair
game for PRs like any other original content (keep it in sync if
`test/visual/`'s mechanics change).

General three.js/WebGL knowledge skills are deliberately not vendored
into this repo — see `docs/RECOMMENDED-SKILLS.md`. Don't add a new
vendored skill bundle in a PR; if you think a specific bundle is worth
recommending, that's a PR to the recommendations doc, not new content
under `skills/`.

## What a good PR here looks like

- Touches one thing, not several unrelated things.
- If it changes behavior described in `AGENTS.md`, updates `AGENTS.md` in
  the same PR — the instruction file and the actual behavior drifting
  apart is worse than either being momentarily incomplete.
- Keeps the existing "explain why, not just what" style — `AGENTS.md`
  consistently justifies its rules rather than stating bare imperatives;
  new content should match that, not default to unexplained MUSTs.
- If something is genuinely untested (no real hardware available to
  verify against), says so directly rather than presenting it with
  unearned confidence — this project flags unverified assumptions
  explicitly throughout rather than glossing over them, and new
  contributions should keep doing that.
