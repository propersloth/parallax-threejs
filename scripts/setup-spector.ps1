# Windows PowerShell equivalent of setup-spector.sh — same logic, same
# deterministic vendor path, so .mcp.json's reference to it doesn't need
# to differ by platform. See setup-spector.sh's comments for the "why" of
# vendoring at all; this file just mirrors its mechanics for PowerShell.
$ErrorActionPreference = "Stop"

$PluginRoot = Split-Path -Parent $PSScriptRoot
$VendorDir = Join-Path $PluginRoot "vendor\spector"

if (Test-Path $VendorDir) {
    Write-Host "Spector already vendored at $VendorDir — skipping clone."
} else {
    git clone --depth 1 https://github.com/BabylonJS/Spector.js.git $VendorDir
}

Push-Location (Join-Path $VendorDir "mcp")
npm install
npm run build
Pop-Location

Write-Host "Spector MCP built at $VendorDir\mcp\dist\index.js"
