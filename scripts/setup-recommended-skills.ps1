# Windows PowerShell equivalent of setup-recommended-skills.sh.
#
# Run this from your actual project root — not from inside this plugin's
# own repo. These skills are deliberately not bundled with the plugin
# itself; see docs/RECOMMENDED-SKILLS.md for why.
#
# Idempotent: skips anything already present rather than re-fetching.
#
# Deliberately installs project-scoped (no -g / --global) — see
# docs/RECOMMENDED-SKILLS.md for the currently-open upstream issue with
# global installs and Claude Code's Skill tool.
#
# Deliberately does NOT pass -y (skip-confirmation) — third-party skills
# run with full agent permissions; review before install is worth the
# extra keypress.
$ErrorActionPreference = "Stop"

Write-Host "== General three.js knowledge (cloudai-x/threejs-skills) =="
if (Test-Path ".claude\skills\threejs-fundamentals") {
    Write-Host "Already installed — skipping."
} else {
    npx skills add cloudai-x/threejs-skills
}

Write-Host ""
Write-Host "== WebGL debugging / error-handling: not auto-installed =="
Write-Host "No single candidate is endorsed here — see docs/RECOMMENDED-SKILLS.md"
Write-Host "and pick one yourself. One confirmed-installable option:"
Write-Host "  npx skills add majidmanzarpour/threejs-game-skills --skill threejs-debug-profiler"
Write-Host "(the three-best-practices candidate's exact installable source wasn't"
Write-Host "confirmed when this script was written — verify before using it)"

Write-Host ""
Write-Host "== Physics: only if your project actually needs it =="
$hasPhysics = $false
foreach ($manifest in @("package.json", "deno.json")) {
    if (Test-Path $manifest) {
        $content = Get-Content $manifest -Raw
        if ($content -match "cannon-es|@dimforge/rapier") { $hasPhysics = $true }
    }
}
if ($hasPhysics) {
    Write-Host "Physics dependency detected — consider adding a physics-integration"
    Write-Host "skill; see docs/RECOMMENDED-SKILLS.md for candidates."
} else {
    Write-Host "No physics dependency detected — skipping, nothing to do here."
}
