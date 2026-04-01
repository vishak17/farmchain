# ═══════════════════════════════════════════════════════════
#  FarmChain — One-Click Demo Launcher (Windows PowerShell)
#  Run from: farmchain\ directory
#  Usage: .\start-demo.ps1
# ═══════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  =======================================================" -ForegroundColor Green
Write-Host "      FARMCHAIN - Demo Launcher                          " -ForegroundColor Green
Write-Host "  =======================================================" -ForegroundColor Green
Write-Host ""

# ─── Helper: wait for a port to be ready ─────────────────
function Wait-ForPort {
    param([int]$Port, [string]$Name, [int]$TimeoutSeconds = 60)
    Write-Host "  Waiting for $Name (port $Port)..." -NoNewline -ForegroundColor Yellow
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", $Port)
            $tcp.Close()
            Write-Host " OK!" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
    }
    Write-Host " FAILED Timeout!" -ForegroundColor Red
    return $false
}

# ─── Helper: check if port is already in use ─────────────
function Test-Port {
    param([int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $Port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════
# STEP 1: Start Hardhat Node (port 8545)
# ═══════════════════════════════════════════════════════════
if (Test-Port 8545) {
    Write-Host "  [OK] Hardhat node already running on :8545" -ForegroundColor Green
} else {
    Write-Host "  [*] Starting Hardhat node..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\blockchain'; Write-Host '[HARDHAT NODE]' -ForegroundColor Green; npx hardhat node" -WindowStyle Normal
    Wait-ForPort -Port 8545 -Name "Hardhat" -TimeoutSeconds 30
}

# ═══════════════════════════════════════════════════════════
# STEP 2: Deploy Smart Contracts (one-time, in THIS terminal)
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  [*] Deploying smart contracts..." -ForegroundColor Cyan
Push-Location "$ROOT\blockchain"
npx hardhat run scripts/deploy.js --network localhost
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAILED] Deploy failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  [OK] Contracts deployed!" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# STEP 3: Start AI Service (port 8000)
# ═══════════════════════════════════════════════════════════
Write-Host ""
if (Test-Port 8000) {
    Write-Host "  [OK] AI service already running on :8000" -ForegroundColor Green
} else {
    Write-Host "  [*] Starting AI service..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\ai-service'; Write-Host '[AI SERVICE]' -ForegroundColor Magenta; uvicorn main:app --port 8000 --reload" -WindowStyle Normal
    Wait-ForPort -Port 8000 -Name "AI Service" -TimeoutSeconds 30
}

# ═══════════════════════════════════════════════════════════
# STEP 4: Start Backend (port 3001)
# ═══════════════════════════════════════════════════════════
Write-Host ""
if (Test-Port 3001) {
    Write-Host "  [OK] Backend already running on :3001" -ForegroundColor Green
} else {
    Write-Host "  [*] Starting backend server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\backend'; Write-Host '[BACKEND SERVER]' -ForegroundColor Blue; npm run dev" -WindowStyle Normal
    Wait-ForPort -Port 3001 -Name "Backend" -TimeoutSeconds 30
}

# ═══════════════════════════════════════════════════════════
# STEP 5: Run Demo Seed (one-time, in THIS terminal)
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  [*] Running demo seed..." -ForegroundColor Cyan
Start-Sleep -Seconds 3  # Give backend a moment to fully initialize
Push-Location "$ROOT\backend"
node src/scripts/demo-seed.js
Pop-Location
Write-Host "  [OK] Demo data seeded!" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# STEP 6: Start Frontend (port 5173)
# ═══════════════════════════════════════════════════════════
Write-Host ""
if (Test-Port 5173) {
    Write-Host "  [OK] Frontend already running on :5173" -ForegroundColor Green
} else {
    Write-Host "  [*] Starting frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; Write-Host '[FRONTEND]' -ForegroundColor Yellow; npm run dev" -WindowStyle Normal
    Wait-ForPort -Port 5173 -Name "Frontend" -TimeoutSeconds 30
}

# ═══════════════════════════════════════════════════════════
# STEP 7: Open browser
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  [*] Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

# ═══════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  =======================================================" -ForegroundColor Green
Write-Host "      FARMCHAIN DEMO IS LIVE!                            " -ForegroundColor Green
Write-Host "  =======================================================" -ForegroundColor Green
Write-Host "                                                         " -ForegroundColor Green
Write-Host "   Blockchain:  http://localhost:8545                    " -ForegroundColor Green
Write-Host "   AI Service:  http://localhost:8000                    " -ForegroundColor Green
Write-Host "   Backend:     http://localhost:3001                    " -ForegroundColor Green
Write-Host "   Frontend:    http://localhost:5173  <- OPEN THIS      " -ForegroundColor Green
Write-Host "                                                         " -ForegroundColor Green
Write-Host "   Admin login: admin@farmchain.com / farmchain123       " -ForegroundColor Green
Write-Host "   Farmer:      raju@farm.com / farmchain123             " -ForegroundColor Green
Write-Host "   Consumer:    consumer1@user.com / farmchain123        " -ForegroundColor Green
Write-Host "                                                         " -ForegroundColor Green
Write-Host "  =======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To stop everything: .\stop-demo.ps1" -ForegroundColor DarkGray
Write-Host ""
