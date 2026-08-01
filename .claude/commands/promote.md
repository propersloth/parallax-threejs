---
description: Promote the currently-published npm `next` build to stable, via release.yml's promote mode
allowed-tools: Bash(gh workflow run:*), Bash(gh run list:*), Bash(gh run watch:*), Bash(npm view:*)
---

`promote` has no bump-size axis — it never rebuilds or republishes, it just
relabels an already-published `next` build as `latest`. So the only thing
this command needs to determine is *which version*, not how much to bump.

1. Determine the version currently published under npm's `next` dist-tag:

       npm view @propersloth/parallax-threejs dist-tags.next

   If this is empty, stop and tell the user there's no `next` release to
   promote — don't guess a version or fall back to anything else.

2. State the exact version you're about to promote and confirm with the
   user before running anything. Unlike `/next-patch`/`/next-minor`
   (npm `next` tag, prerelease-marked, `latest` untouched), promote moves
   npm's `latest` pointer and un-marks the GitHub Release as a
   prerelease — this is what real `npm install` users receive by default,
   so don't fire it without an explicit go-ahead.

3. Once confirmed, run:

       gh workflow run release.yml -f mode=promote -f promote_version=<version>

4. Poll `gh run list --workflow=release.yml --limit 1 --json databaseId,status` until the new run appears, and take its `databaseId`.
5. Watch it: `gh run watch <databaseId> --interval 10 --exit-status`.
6. Report the outcome plainly — if it failed, show which step failed and the relevant log excerpt (`gh run view <databaseId> --log-failed`), don't just say "it failed."
