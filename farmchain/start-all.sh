#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  FarmChain — Start All Services
#  Opens 6 terminal tabs, one per task.
#  Requires a terminal that supports `gnome-terminal`,
#  `xterm`, or macOS `osascript`. Falls back to bg jobs.
# ─────────────────────────────────────────────────────────

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Detect terminal emulator ────────────────────────────
open_tab() {
  local title="$1"
  local dir="$2"
  local cmd="$3"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS – uses Terminal.app
    osascript -e "
      tell application \"Terminal\"
        activate
        do script \"echo -ne '\\\\033]0;${title}\\\\007' && cd '${dir}' && ${cmd}\"
      end tell"

  elif command -v gnome-terminal &>/dev/null; then
    gnome-terminal --tab --title="$title" -- bash -c "cd '${dir}' && ${cmd}; exec bash"

  elif command -v xterm &>/dev/null; then
    xterm -T "$title" -e "cd '${dir}' && ${cmd}; exec bash" &

  elif command -v wt.exe &>/dev/null; then
    # Windows Terminal (WSL / Git Bash)
    wt.exe new-tab --title "$title" -d "$dir" bash -c "$cmd"

  else
    # Fallback: run in background
    echo "  ▸ [$title] running in background …"
    (cd "$dir" && eval "$cmd") &
  fi
}

echo ""
echo "🌾  FarmChain — Launching all services …"
echo "─────────────────────────────────────────"

# ── Tab 1 — Hardhat Local Node (port 8545) ──────────────
open_tab \
  "Blockchain · Node" \
  "${ROOT_DIR}/blockchain" \
  "npx hardhat node"

# ── Tab 2 — Deploy Contracts ────────────────────────────
open_tab \
  "Blockchain · Deploy" \
  "${ROOT_DIR}/blockchain" \
  "sleep 5 && npx hardhat run scripts/deploy.js --network localhost"

# ── Tab 3 — AI Service (port 8000) ──────────────────────
open_tab \
  "AI Service · 8000" \
  "${ROOT_DIR}/ai-service" \
  "uvicorn main:app --port 8000 --reload"

# ── Tab 4 — Backend (port 3001) ─────────────────────────
open_tab \
  "Backend · 3001" \
  "${ROOT_DIR}/backend" \
  "npm run dev"

# ── Tab 5 — Frontend (port 5173) ────────────────────────
open_tab \
  "Frontend · 5173" \
  "${ROOT_DIR}/frontend" \
  "npm run dev"

# ── Tab 6 — Demo Seed (run this LAST) ───────────────────
open_tab \
  "Backend · Seed (LAST)" \
  "${ROOT_DIR}/backend" \
  "sleep 12 && echo '⏳ Waiting for services …' && node src/scripts/demo-seed.js"

echo ""
echo "✅  All 6 tabs launched."
echo ""
echo "   1. Blockchain · Node          →  http://localhost:8545"
echo "   2. Blockchain · Deploy        →  (runs once after node starts)"
echo "   3. AI Service                 →  http://localhost:8000"
echo "   4. Backend                    →  http://localhost:3001"
echo "   5. Frontend                   →  http://localhost:5173"
echo "   6. Demo Seed                  →  (runs LAST, after services ready)"
echo ""
