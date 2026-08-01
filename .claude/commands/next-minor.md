---
description: Cut a next (pre-release) build with a minor version bump, via release.yml
allowed-tools: Bash(gh workflow run:*), Bash(gh run list:*), Bash(gh run watch:*)
---

Trigger a `next` release with a minor bump:

    gh workflow run release.yml -f mode=next -f bump_type=minor

Then:
1. Poll `gh run list --workflow=release.yml --limit 1 --json databaseId,status` until the new run appears (it can take a few seconds to register), and take its `databaseId`.
2. Watch it: `gh run watch <databaseId> --interval 10 --exit-status`.
3. Report the outcome plainly — if it failed, show which step failed and the relevant log excerpt (`gh run view <databaseId> --log-failed`), don't just say "it failed."

This publishes to npm's `next` dist-tag and marks the GitHub Release as a prerelease — `latest` is untouched, so this is safe to run without confirming first.
