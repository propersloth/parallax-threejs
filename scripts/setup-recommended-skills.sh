#!/usr/bin/env sh
# macOS/Linux. Windows: use setup-recommended-skills.ps1 instead — POSIX
# shell doesn't run natively there. Both do the same thing.
#
# Non-interactive alternative to `deno run -A scripts/setup.ts` — same
# three.js skill install, no prompts, safe for CI or scripted use. Prefer
# setup.ts for normal interactive use; use this one specifically when you
# need something scriptable (CI, unattended provisioning).
#
# Installs the recommended optional skill bundle from docs/RECOMMENDED-SKILLS.md
# into the CURRENT project's .claude/skills/.
#
# Run this from your actual three.js project root — not from inside this
# plugin's own repo. These skills are deliberately not bundled with the
# plugin itself; see docs/RECOMMENDED-SKILLS.md for why.
#
# Idempotent: skips anything already present rather than re-fetching.
#
# Deliberately installs project-scoped (no -g / --global). As of writing,
# global installs via `npx skills add -g` land in ~/.agents/skills/ and
# are not reliably recognized by Claude Code's Skill tool without a manual
# symlink workaround — a real, currently-open upstream issue, not a
# preference. Project-scoped installs to ./.claude/skills/ don't have
# this problem.
#
# Deliberately does NOT pass -y (skip-confirmation) — these are third-party
# skills that run with full agent permissions; reviewing what's about to
# install before it does is worth the extra keypress.
set -e

echo "== General three.js knowledge (cloudai-x/threejs-skills) =="
if [ -d ".claude/skills/threejs-fundamentals" ]; then
  echo "Already installed — skipping."
else
  npx skills add cloudai-x/threejs-skills
fi

echo ""
echo "== WebGL debugging / error-handling: not auto-installed =="
echo "No single candidate is endorsed here — see docs/RECOMMENDED-SKILLS.md"
echo "and pick one yourself. One confirmed-installable option:"
echo "  npx skills add majidmanzarpour/threejs-game-skills --skill threejs-debug-profiler"
echo "(the three-best-practices candidate's exact installable source wasn't"
echo "confirmed when this script was written — verify before using it)"

echo ""
echo "== Physics: only if your project actually needs it =="
if grep -rq "cannon-es\|@dimforge/rapier" package.json deno.json 2>/dev/null; then
  echo "Physics dependency detected — consider adding a physics-integration"
  echo "skill; see docs/RECOMMENDED-SKILLS.md for candidates."
else
  echo "No physics dependency detected — skipping, nothing to do here."
fi
