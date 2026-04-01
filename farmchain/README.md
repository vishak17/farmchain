# 🌾 FarmChain — Monorepo

FarmChain is a blockchain-powered agricultural supply chain platform combining smart contracts, a REST API backend, AI-driven analytics, and a modern web frontend.

---

## Services

| Service        | Directory      | Port   | Description                          |
| -------------- | -------------- | ------ | ------------------------------------ |
| **Blockchain** | `blockchain/`  | `8545` | Hardhat local node & smart contracts |
| **Backend**    | `backend/`     | `3001` | Node.js / Express REST API           |
| **AI Service** | `ai-service/`  | `8000` | Python FastAPI ML service            |
| **Frontend**   | `frontend/`    | `5173` | Vite + React web application         |

---

## Quick Start

```bash
# Make the helper script executable (Linux / macOS)
chmod +x start-all.sh

# Launch every service in separate terminal tabs
./start-all.sh
```

See each service's own `README.md` for detailed setup instructions.
