const blockchainService = require('../services/blockchain.service');
const sensorSim = require('./SensorSimulator');
const OffChainBatch = require('../models/OffChainBatch');

// Hardhat deployer PK for tests where simulation requires a valid signer
const DEPLOYER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

class NetworkSimulator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.tickCount = 0;
    this.activeBatches = [];  // { batchId, routeIndex, currentWaypoint, hoursSinceHarvest, produceType, originWeight }
    this.wsClients = new Set();  // WebSocket clients to broadcast to
  }

  setWsClients(clients) { this.wsClients = clients; }

  broadcast(event, data) {
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    this.wsClients.forEach(ws => {
      if (ws.readyState === 1) ws.send(payload);  // OPEN = 1
    });
  }

  async loadActiveBatches() {
    try {
      const batchIds = await blockchainService.getAllActiveBatches();
      // For each batchId, get details and build simulation state
      for (const batchId of batchIds.slice(0, 10)) {  // max 10 for demo
        const batch = await blockchainService.getBatch(batchId);
        if (!batch || batch.isExpired || batch.isSettled) continue;
        const routeIndex = Math.floor(Math.random() * 4);
        const waypoint = batch.custodyCount ? batch.custodyCount : 1;
        this.activeBatches.push({
          batchId,
          routeIndex,
          currentWaypoint: waypoint,
          hoursSinceHarvest: 2 + waypoint * 3,
          produceType: batch.produceType || 'tomato',
          originWeightGrams: parseInt(batch.originWeightGrams) || 10000,
          category: batch.category || 0,
          farmerWallet: batch.farmerWallet
        });
      }
      console.log(`[NetworkSimulator] Loaded ${this.activeBatches.length} batches for simulation`);
    } catch (err) {
      console.error('[NetworkSimulator] Failed to load batches:', err.message);
    }
  }

  async tick() {
    this.tickCount++;
    if (this.activeBatches.length === 0) return;
    
    // Advance one random batch per tick
    const idx = this.tickCount % this.activeBatches.length;
    const batchSim = this.activeBatches[idx];
    
    if (!batchSim) return;
    
    batchSim.currentWaypoint++;
    batchSim.hoursSinceHarvest += 3;
    
    // Determine node type from waypoint
    const nodeTypes = [0, 1, 2, 3]; // FARM, MIDDLEMAN, DEPOT, RETAILER
    const nodeType = Math.min(batchSim.currentWaypoint, 3);
    
    try {
      const payload = sensorSim.generateIoTPayload(
        batchSim.batchId,
        nodeType,
        batchSim.produceType,
        batchSim.originWeightGrams,
        batchSim.hoursSinceHarvest,
        batchSim.routeIndex,
        batchSim.currentWaypoint
      );
      
      // Use deployer's signer for simulation (in prod each node has their own key)
      const result = await blockchainService.recordCustodyTransfer({
        batchId: batchSim.batchId,
        currentWeightGrams: payload.weightGrams, // Adjusted payload key to map correctly with the deployed service
        ipfsVisualHash: `QmSim${Date.now()}`,
        gpsLocation: payload.gpsLocation,
        nodeName: payload.locationName,
        nodeType: nodeType,
        sealStatus: payload.tamperDetected ? 1 : 0  // 0=INTACT, 1=BROKEN
      }, DEPLOYER_PK);  // Using Deployer PK instead of null to prevent ethers.Wallet instantiation crashes
      
      // Update MongoDB cache
      await OffChainBatch.findOneAndUpdate(
        { batchId: batchSim.batchId },
        { 
          currentFRS: result.newFRS / 100,
          currentGrade: result.grade,
          custodyChainLength: batchSim.currentWaypoint + 1,
          lastUpdated: new Date(),
          isDisputed: result.alerts && result.alerts.length > 0
        }
      );
      
      // Broadcast to WebSocket clients
      this.broadcast('CUSTODY_TRANSFER', {
        batchId: batchSim.batchId,
        newFRS: result.newFRS / 100,
        grade: result.grade,
        location: payload.locationName,
        gps: payload.gpsLocation,
        nodeType,
        alerts: result.alerts || []
      });
      
      if (result.alerts && result.alerts.length > 0) {
        this.broadcast('FRS_ALERT', { batchId: batchSim.batchId, alerts: result.alerts });
      }
      
      console.log(`[NetworkSimulator] Tick ${this.tickCount}: ${batchSim.batchId} → FRS ${result.newFRS/100}% (${result.grade})`);
      
      // If batch reaches retailer (waypoint 3), mark as settled after one more tick
      if (batchSim.currentWaypoint >= 3) {
        this.activeBatches.splice(idx, 1);  // remove from simulation
      }
      
    } catch (err) {
      console.error(`[NetworkSimulator] Tick error for ${batchSim.batchId}:`, err.message);
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NetworkSimulator] Transit simulation active');
    await this.loadActiveBatches();
    this.intervalId = setInterval(() => this.tick(), 30000);  // every 30 seconds
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    console.log('[NetworkSimulator] Stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeBatches: this.activeBatches.length,
      tickCount: this.tickCount
    };
  }
}

module.exports = new NetworkSimulator();
