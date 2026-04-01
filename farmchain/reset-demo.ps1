# ═══════════════════════════════════════════════════════════
#  FarmChain — Nuclear Reset + Fresh Start
#  Drops DB, kills all services, restarts everything clean
#  Usage: .\reset-demo.ps1
# ═══════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  [WARNING] NUCLEAR RESET - Wiping everything..." -ForegroundColor Red
Write-Host ""

# Step 1: Stop all services
& "$ROOT\stop-demo.ps1"

# Step 2: Drop MongoDB database
Write-Host "  [*] Dropping farmchain database..." -ForegroundColor Red
Push-Location "$ROOT\backend"
node -e "require('mongoose').connect('mongodb://localhost:27017/farmchain').then(c=>c.connection.db.dropDatabase()).then(()=>{console.log('  [OK] Database dropped');process.exit(0)}).catch(e=>{console.log('  [SKIPPED] DB drop skipped:',e.message);process.exit(0)})"
Pop-Location

Write-Host ""
Write-Host "  [*] Starting fresh..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Step 3: Launch everything
& "$ROOT\start-demo.ps1"
