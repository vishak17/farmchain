/**
 * FarmChain Demo Seed Script
 * ─────────────────────────────────────────────────────
 * Seeds MongoDB with users, batches, disputes, and evidence
 * then runs integration tests against the running API server.
 *
 * Usage: node src/scripts/demo-seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConnect = require('../config/db');
const User = require('../models/User');
const OffChainBatch = require('../models/OffChainBatch');
const DisputeEvidence = require('../models/DisputeEvidence');
const blockchainService = require('../services/blockchain.service');

// ══════════════════════════════════════════════════════════
// Hardhat default signers — private keys are deterministic
// ══════════════════════════════════════════════════════════
const HARDHAT_KEYS = {
  deployer:    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // signers[0]
  raju:        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // signers[1]
  meena:       '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // signers[2]
  suresh:      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // signers[3]
  anitha:      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // signers[4]
  middleman1:  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // signers[5]
  retailer1:   '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // signers[6]
  consumer1:   '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // signers[7]
  admin:       '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // signers[8]
  panel1:      '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6', // signers[9]
};

function walletAddress(pk) {
  return new ethers.Wallet(pk).address;
}

// ══════════════════════════════════════════════════════════
// 1. USER SEED DATA (9 users)
// ══════════════════════════════════════════════════════════
const SEED_USERS = [
  { email: 'raju@farm.com',         role: 'FARMER',       name: 'Raju Kumar',          pk: HARDHAT_KEYS.raju },
  { email: 'meena@farm.com',        role: 'FARMER',       name: 'Meena Devi',          pk: HARDHAT_KEYS.meena },
  { email: 'suresh@farm.com',       role: 'FARMER',       name: 'Suresh Patil',        pk: HARDHAT_KEYS.suresh },
  { email: 'anitha@farm.com',       role: 'FARMER',       name: 'Anitha Reddy',        pk: HARDHAT_KEYS.anitha },
  { email: 'middleman1@trade.com',  role: 'MIDDLEMAN',    name: 'Karnataka Traders MM', pk: HARDHAT_KEYS.middleman1 },
  { email: 'retailer1@shop.com',    role: 'RETAILER',     name: 'Delhi Fruits Store',  pk: HARDHAT_KEYS.retailer1 },
  { email: 'consumer1@user.com',    role: 'CONSUMER',     name: 'Priya Sharma',        pk: HARDHAT_KEYS.consumer1 },
  { email: 'admin@farmchain.com',   role: 'ADMIN',        name: 'FarmChain Admin',     pk: HARDHAT_KEYS.admin },
  { email: 'panel1@farmchain.com',  role: 'PANEL_MEMBER', name: 'Panel Member 1',      pk: HARDHAT_KEYS.panel1 },
];

// ══════════════════════════════════════════════════════════
// 2. BATCH SEED DATA (8 batches, various grades/states)
// ══════════════════════════════════════════════════════════
function buildSyntheticBatches(blockchainBatchIds) {
  const rajuWallet = walletAddress(HARDHAT_KEYS.raju);
  const meenaWallet = walletAddress(HARDHAT_KEYS.meena);
  const sureshWallet = walletAddress(HARDHAT_KEYS.suresh);
  const anithaWallet = walletAddress(HARDHAT_KEYS.anitha);

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600000);
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000);

  // Use blockchain IDs for first 3, generate rest
  const bid = (i) => {
    if (i < blockchainBatchIds.length) return blockchainBatchIds[i];
    return `BATCH-KA-2024-${String(i + 1).padStart(5, '0')}`;
  };

  return [
    // ── 2 batches: Grade A+ (FRS 99-100), Raju, tomato + mango ────
    {
      batchId: bid(0),
      farmerWallet: rajuWallet,
      farmerName: 'Raju Kumar',
      produceType: 'tomato',
      category: 'STANDARD',
      currentFRS: 99.5,
      currentGrade: 'A+',
      originWeightGrams: 10000,
      custodyChainLength: 3,
      harvestTimestamp: hoursAgo(8),
      pdeeTimestamp: hoursAgo(4),
      lastUpdated: hoursAgo(1),
      tags: ['verified', 'blockchain-synced']
    },
    {
      batchId: bid(1),
      farmerWallet: rajuWallet,
      farmerName: 'Raju Kumar',
      produceType: 'mango',
      category: 'STANDARD',
      currentFRS: 100,
      currentGrade: 'A+',
      originWeightGrams: 15000,
      custodyChainLength: 2,
      harvestTimestamp: hoursAgo(6),
      pdeeTimestamp: hoursAgo(2),
      lastUpdated: hoursAgo(1),
      tags: ['verified', 'blockchain-synced']
    },

    // ── 2 batches: Grade B (FRS 90-94), in transit, mango + spinach ─
    {
      batchId: bid(2),
      farmerWallet: meenaWallet,
      farmerName: 'Meena Devi',
      produceType: 'mango',
      category: 'STANDARD',
      currentFRS: 93.2,
      currentGrade: 'B',
      originWeightGrams: 8000,
      custodyChainLength: 4,
      harvestTimestamp: daysAgo(1),
      pdeeTimestamp: hoursAgo(12),
      lastUpdated: hoursAgo(2),
      tags: ['in-transit', 'blockchain-synced']
    },
    {
      batchId: bid(3),
      farmerWallet: meenaWallet,
      farmerName: 'Meena Devi',
      produceType: 'spinach',
      category: 'HIGH_SENSITIVITY',
      currentFRS: 91.0,
      currentGrade: 'B',
      originWeightGrams: 5000,
      custodyChainLength: 3,
      harvestTimestamp: daysAgo(1),
      pdeeTimestamp: hoursAgo(18),
      lastUpdated: hoursAgo(3),
      tags: ['in-transit', 'cold-chain']
    },

    // ── 1 batch: Grade C (FRS 86-89), anomalyFlagged, spinach ───────
    {
      batchId: bid(4),
      farmerWallet: anithaWallet,
      farmerName: 'Anitha Reddy',
      produceType: 'spinach',
      category: 'HIGH_SENSITIVITY',
      currentFRS: 87.3,
      currentGrade: 'C',
      originWeightGrams: 3000,
      anomalyFlagged: true,
      custodyChainLength: 5,
      harvestTimestamp: daysAgo(2),
      pdeeTimestamp: daysAgo(1),
      lastUpdated: hoursAgo(4),
      tags: ['anomaly', 'weight-mismatch-detected']
    },

    // ── 1 batch: isDisputed, Grade C, tomato ────────────────────────
    {
      batchId: bid(5),
      farmerWallet: rajuWallet,
      farmerName: 'Raju Kumar',
      produceType: 'tomato',
      category: 'STANDARD',
      currentFRS: 88.1,
      currentGrade: 'C',
      originWeightGrams: 12000,
      isDisputed: true,
      custodyChainLength: 4,
      harvestTimestamp: daysAgo(3),
      pdeeTimestamp: daysAgo(2),
      lastUpdated: hoursAgo(6),
      tags: ['disputed', 'under-review']
    },

    // ── 1 batch: isExpired, Grade D, lettuce ────────────────────────
    {
      batchId: bid(6),
      farmerWallet: anithaWallet,
      farmerName: 'Anitha Reddy',
      produceType: 'lettuce',
      category: 'HIGH_SENSITIVITY',
      currentFRS: 62.0,
      currentGrade: 'D',
      originWeightGrams: 2000,
      isExpired: true,
      custodyChainLength: 6,
      harvestTimestamp: daysAgo(5),
      pdeeTimestamp: daysAgo(4),
      lastUpdated: daysAgo(1),
      tags: ['expired', 'pdee-exceeded']
    },

    // ── 1 batch: fresh A+, onion, Suresh ────────────────────────────
    {
      batchId: bid(7),
      farmerWallet: sureshWallet,
      farmerName: 'Suresh Patil',
      produceType: 'onion',
      category: 'HIGH_TOLERANCE',
      currentFRS: 99.8,
      currentGrade: 'A+',
      originWeightGrams: 20000,
      custodyChainLength: 1,
      harvestTimestamp: hoursAgo(2),
      pdeeTimestamp: hoursAgo(0),
      lastUpdated: new Date(),
      tags: ['freshly-registered', 'origin']
    },
  ];
}

// ══════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════
async function runSeed() {
  console.log('\n');
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║   🌾  FARMCHAIN DEMO SEED — Starting...          ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log('');

  // ─── Connect to MongoDB ───────────────────────────────
  const connectMongo = typeof dbConnect === 'function' ? dbConnect : require('../config/db');
  if (typeof connectMongo === 'function') await connectMongo();
  console.log('  ✅ MongoDB connected.\n');

  // ─── Step 1: Seed Users (upsert) ─────────────────────
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('farmchain123', salt);

  let usersCreated = 0;
  let usersUpdated = 0;

  for (const u of SEED_USERS) {
    const walletAddr = walletAddress(u.pk);

    const existing = await User.findOne({ email: u.email });
    if (existing) {
      // Update wallet and role if user already exists
      existing.walletAddress = walletAddr;
      existing.walletPrivateKey = u.pk;
      existing.role = u.role;
      existing.name = u.name;
      existing.passwordHash = passwordHash;
      await existing.save();
      usersUpdated++;
    } else {
      const user = new User({
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        walletAddress: walletAddr,
        walletPrivateKey: u.pk
      });
      await user.save();
      usersCreated++;
    }
    console.log(`  👤 ${existing ? 'Updated' : 'Created'}: ${u.name.padEnd(22)} ${u.role.padEnd(14)} ${walletAddr.slice(0, 10)}…`);
  }
  console.log(`\n  📊 Users: ${usersCreated} created, ${usersUpdated} updated (${usersCreated + usersUpdated} total)\n`);

  // ─── Step 2: Fetch blockchain batches ─────────────────
  let blockchainBatchIds = [];
  let blockchainSynced = 0;
  try {
    const activeBatches = await blockchainService.getAllActiveBatches();
    if (activeBatches && activeBatches.length > 0) {
      blockchainBatchIds = activeBatches.slice(0, 3); // Take first 3
      blockchainSynced = blockchainBatchIds.length;
      console.log(`  ⛓️  Found ${activeBatches.length} on-chain batches. Syncing first ${blockchainSynced}.`);
    } else {
      console.log('  ⚠️  No on-chain batches found. Using generated IDs for all batches.');
    }
  } catch (err) {
    console.log(`  ⚠️  Blockchain unavailable (${err.message}). Using generated IDs.`);
  }

  // ─── Step 3: Seed OffChainBatch documents ─────────────
  const batches = buildSyntheticBatches(blockchainBatchIds);

  // Clear existing batches to avoid duplicate key errors
  await OffChainBatch.deleteMany({});

  let batchesInserted = 0;
  for (const b of batches) {
    await OffChainBatch.create(b);
    const gradeEmoji = { 'A+': '🟢', 'A': '🟢', 'B': '🟡', 'C': '🟠', 'D': '🔴' }[b.currentGrade] || '⚪';
    const flags = [];
    if (b.isDisputed) flags.push('⚖️ DISPUTED');
    if (b.isExpired) flags.push('💀 EXPIRED');
    if (b.anomalyFlagged) flags.push('🚨 ANOMALY');
    const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
    console.log(`  📦 ${b.batchId.padEnd(24)} ${b.produceType.padEnd(10)} FRS ${String(b.currentFRS).padEnd(6)} ${gradeEmoji} ${b.currentGrade}${flagStr}`);
    batchesInserted++;
  }
  console.log(`\n  📊 Batches: ${batchesInserted} inserted (${blockchainSynced} from blockchain)\n`);

  // ─── Step 4: Seed DisputeEvidence ─────────────────────
  const disputedBatch = batches.find(b => b.isDisputed);
  await DisputeEvidence.deleteMany({});

  let evidenceCount = 0;
  if (disputedBatch) {
    const middlemanWallet = walletAddress(HARDHAT_KEYS.middleman1);
    const retailerWallet = walletAddress(HARDHAT_KEYS.retailer1);

    await DisputeEvidence.create({
      disputeId: 1,
      batchId: disputedBatch.batchId,
      submittedBy: middlemanWallet,
      submitterRole: 'MIDDLEMAN',
      evidenceType: 'STATEMENT',
      description: 'Produce was intact at pickup. Temperature log attached.',
      ipfsHash: 'QmEvidence001',
      fileUrl: 'https://ipfs.io/ipfs/QmEvidence001',
      submittedAt: new Date(Date.now() - 86400000)
    });
    evidenceCount++;

    await DisputeEvidence.create({
      disputeId: 1,
      batchId: disputedBatch.batchId,
      submittedBy: retailerWallet,
      submitterRole: 'RETAILER',
      evidenceType: 'PHOTO',
      description: 'Photo showing damaged seal on arrival.',
      ipfsHash: 'QmEvidence002',
      fileUrl: 'https://ipfs.io/ipfs/QmEvidence002',
      submittedAt: new Date(Date.now() - 43200000)
    });
    evidenceCount++;

    console.log(`  🗂️  Evidence 1: STATEMENT by Middleman → ${disputedBatch.batchId}`);
    console.log(`  🗂️  Evidence 2: PHOTO by Retailer     → ${disputedBatch.batchId}`);
    console.log(`\n  📊 Dispute evidence: ${evidenceCount} records inserted\n`);
  }

  // ─── Step 5: Summary Table ────────────────────────────
  const totalUsers = usersCreated + usersUpdated;
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║   🌾 FARMCHAIN DEMO SEED COMPLETE                    ║');
  console.log('  ╠═══════════════════════════════════════════════════════╣');
  console.log(`  ║   Users created/updated:  ${String(totalUsers).padEnd(28)}║`);
  console.log(`  ║   Batches in MongoDB:     ${String(batchesInserted).padEnd(3)} (${blockchainSynced} from blockchain)       ║`);
  console.log(`  ║   Disputes seeded:        ${String(disputedBatch ? 1 : 0).padEnd(28)}║`);
  console.log(`  ║   Evidence records:        ${String(evidenceCount).padEnd(27)}║`);
  console.log('  ║   Subsidy pool:           10 ETH                      ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log('');

  // ─── Step 6: Integration Tests ────────────────────────
  await runIntegrationTests(batches);

  // ─── Done ─────────────────────────────────────────────
  await mongoose.disconnect();
  process.exit(0);
}

// ══════════════════════════════════════════════════════════
// INTEGRATION TEST SUITE
// ══════════════════════════════════════════════════════════
async function runIntegrationTests(batches) {
  const API = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}/api`;
  const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │  🧪 INTEGRATION TEST SUITE                  │');
  console.log('  └─────────────────────────────────────────────┘');
  console.log(`  Target API: ${API}`);
  console.log(`  Target AI:  ${AI_URL}\n`);

  const results = [];
  let token = null;

  // ── Test A: POST /auth/login ──────────────────────────
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'admin@farmchain.com',
      password: 'farmchain123'
    }, { timeout: 5000 });
    token = res.data.token || res.data.data?.token;
    results.push({ name: 'POST /auth/login', pass: !!token, detail: token ? `Token: ${token.slice(0, 20)}…` : 'No token returned' });
  } catch (err) {
    results.push({ name: 'POST /auth/login', pass: false, detail: err.code === 'ECONNREFUSED' ? 'Server not running' : (err.response?.data?.message || err.message) });
  }

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Test B: GET /admin/dashboard ──────────────────────
  try {
    const res = await axios.get(`${API}/admin/dashboard`, { headers: authHeaders, timeout: 5000 });
    const hasData = res.data && (res.data.activeBatches !== undefined || res.data.data);
    results.push({ name: 'GET /admin/dashboard', pass: hasData, detail: hasData ? 'Dashboard stats returned' : 'Empty response' });
  } catch (err) {
    results.push({ name: 'GET /admin/dashboard', pass: false, detail: err.response?.data?.message || err.message });
  }

  // ── Test C: GET /batch/network/inventory ──────────────
  try {
    const res = await axios.get(`${API}/batch/network/inventory?produce=tomato`, { headers: authHeaders, timeout: 5000 });
    const weight = res.data?.totalWeightGrams || res.data?.data?.totalWeightGrams || 0;
    results.push({ name: 'GET /batch/network/inventory', pass: weight > 0, detail: `Total weight: ${weight}g` });
  } catch (err) {
    results.push({ name: 'GET /batch/network/inventory', pass: false, detail: err.response?.data?.message || err.message });
  }

  // ── Test D: GET /consumer/trace/:batchId ──────────────
  const traceBatchId = batches[0]?.batchId || 'BATCH-KA-2024-00001';
  try {
    const res = await axios.get(`${API}/consumer/trace/${traceBatchId}`, { headers: authHeaders, timeout: 5000 });
    const hasCustody = res.data?.custodyChain || res.data?.data?.custodyChain || res.data?.batch;
    results.push({ name: `GET /consumer/trace/${traceBatchId}`, pass: !!hasCustody, detail: hasCustody ? 'Custody chain returned' : 'No chain data' });
  } catch (err) {
    results.push({ name: `GET /consumer/trace/${traceBatchId}`, pass: false, detail: err.response?.data?.message || err.message });
  }

  // ── Test E: POST /analyze (AI Service) ────────────────
  try {
    const res = await axios.post(`${AI_URL}/analyze`, {
      batchId: traceBatchId,
      produceType: 'tomato',
      readings: [{ weight: 10000, temp: 25, humidity: 80, timestamp: new Date().toISOString() }]
    }, { timeout: 5000 });
    results.push({ name: 'POST AI /analyze', pass: res.status === 200, detail: `AI responded with status ${res.status}` });
  } catch (err) {
    results.push({ name: 'POST AI /analyze', pass: false, detail: err.code === 'ECONNREFUSED' ? 'AI service not running' : (err.response?.data?.detail || err.message) });
  }

  // ── Test F: GET /subsidy/queue ────────────────────────
  try {
    const res = await axios.get(`${API}/subsidy/queue`, { headers: authHeaders, timeout: 5000 });
    const queue = res.data?.queue || res.data?.data || res.data;
    const isSorted = Array.isArray(queue) && queue.length > 0;
    results.push({ name: 'GET /subsidy/queue', pass: isSorted, detail: isSorted ? `${queue.length} farmers in queue` : 'Empty queue' });
  } catch (err) {
    results.push({ name: 'GET /subsidy/queue', pass: false, detail: err.response?.data?.message || err.message });
  }

  // ── Print Results ─────────────────────────────────────
  console.log('  ┌───────────────────────────────────────────────────────────────────────┐');
  console.log('  │  Test                                Result    Detail                 │');
  console.log('  ├───────────────────────────────────────────────────────────────────────┤');

  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    if (r.pass) passed++; else failed++;
    const name = r.name.padEnd(36);
    const det = (r.detail || '').substring(0, 30);
    console.log(`  │  ${name} ${status}   ${det.padEnd(24)}│`);
  }

  console.log('  └───────────────────────────────────────────────────────────────────────┘');
  console.log(`\n  Summary: ${passed}/${results.length} passed, ${failed} failed.`);

  if (failed > 0) {
    console.log('  ⚠️  Some tests failed. Ensure the backend server and AI service are running.');
  } else {
    console.log('  🎉 All integration tests passed!');
  }
  console.log('');
}

// ══════════════════════════════════════════════════════════
// EXECUTE
// ══════════════════════════════════════════════════════════
runSeed().catch(err => {
  console.error('\n  ❌ SEED FAILED:', err.message);
  console.error(err);
  process.exit(1);
});
