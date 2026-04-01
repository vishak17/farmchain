# ═══════════════════════════════════════════════════════════
#  FarmChain — Stop All Services (Windows PowerShell)
#  Usage: .\stop-demo.ps1
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  [*] Stopping FarmChain services..." -ForegroundColor Red
Write-Host ""

# Kill processes on known ports
$ports = @(
    @{Port=8545; Name="Hardhat Node"},
    @{Port=8000; Name="AI Service"},
    @{Port=3001; Name="Backend"},
    @{Port=5173; Name="Frontend"}
)

foreach ($svc in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $svc.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess | Select-Object -First 1
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Stopped $($svc.Name) (port $($svc.Port), PID $pid)" -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING]  Could not stop $($svc.Name) (PID $pid)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [-] $($svc.Name) was not running" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "  [OK] All services stopped." -ForegroundColor Green
Write-Host ""
