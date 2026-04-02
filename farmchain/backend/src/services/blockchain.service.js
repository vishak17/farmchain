const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const contractsPath = path.resolve(__dirname, '../../config/contracts.json');
const chroniclePath = path.resolve(__dirname, '../../config/chronicle-contracts.json');
const abisDir      = path.resolve(__dirname, '../../config/abis');

let addresses = {};
try {
  if (fs.existsSync(contractsPath)) {
    addresses = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
  }
} catch (err) {
  console.warn("contracts.json not found or invalid. Ensure you run the deploy script first.");
}

let chronicleAddresses = {};
try {
  if (fs.existsSync(chroniclePath)) {
    chronicleAddresses = JSON.parse(fs.readFileSync(chroniclePath, 'utf8'));
  }
} catch (err) {
  console.warn("chronicle-contracts.json not found. Run deploy-chronicle.js first.");
}

const getAbi = (contractName) => {
  try {
    const abiPath = path.join(abisDir, `${contractName}.json`);
    if (fs.existsSync(abiPath)) {
      return JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
    }
  } catch (err) {
    console.warn(`ABI for ${contractName} not found.`);
  }
  return [];
};

const ABIs = {
  FarmerRegistry:   getAbi('FarmerRegistry'),
  BatchRegistry:    getAbi('BatchRegistry'),
  DisputeEngine:    getAbi('DisputeEngine'),
  SubsidyEngine:    getAbi('SubsidyEngine'),
  FundingContracts: getAbi('FundingContracts'),
  // Chronicle (NFT custody layer)
  FarmChainRegistry: getAbi('FarmChainRegistry'),
  ProduceBatch:      getAbi('ProduceBatch'),
};

// Hardcoded deployer PK matching Hardhat account #0 for automated system execution
const DEPLOYER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC || 'http://127.0.0.1:8545');
  }

  // ─── Helpers ──────────────────────────────────────────

  getProvider() {
    return this.provider;
  }

  getSigner(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
  }

  getDeployerSigner() {
    return new ethers.Wallet(DEPLOYER_PK, this.provider);
  }

  getContract(contractName, signer) {
    if (!addresses[contractName]) {
      throw new Error(`Address for ${contractName} not found in contracts.json`);
    }
    return new ethers.Contract(addresses[contractName], ABIs[contractName], signer || this.provider);
  }

  getChronicleContract(contractName, signer) {
    const addr = chronicleAddresses[contractName];
    if (!addr) throw new Error(`Chronicle address for ${contractName} not found. Run deploy-chronicle.js first.`);
    return new ethers.Contract(addr, ABIs[contractName], signer || this.provider);
  }

  // ── FarmChainRegistry (Chronicle) ────────────────────────────────

  /**
   * Register + verify a participant in FarmChainRegistry.
   * Called by the backend after a successful wallet-login for FARMER / MIDDLEMAN / RETAILER.
   * Deployer (admin) signs both txs on behalf of the new user.
   *
   * @param {string} walletAddress  The MetaMask wallet to register
   * @param {0|1|2|3} chainRole    0=FARMER,1=LOGISTICS,2=AGGREGATOR,3=RETAILER
   */
  async registerOnChronicleRegistry(walletAddress, chainRole) {
    const signer   = this.getDeployerSigner();
    const registry = this.getChronicleContract('FarmChainRegistry', signer);

    // Check if already registered to avoid revert
    const alreadyRegistered = await registry.isRegistered(walletAddress);
    if (alreadyRegistered) {
      const alreadyVerified = await registry.isVerifiedParticipant(walletAddress);
      if (!alreadyVerified) await (await registry.verifyParticipant(walletAddress)).wait();
      return { alreadyRegistered: true };
    }

    const locationHash = ethers.encodeBytes32String('WALLET_AUTH');
    const tx1 = await registry.registerParticipant(walletAddress, chainRole, locationHash);
    await tx1.wait();

    const tx2 = await registry.verifyParticipant(walletAddress);
    const receipt = await tx2.wait();

    return { txHash: receipt.hash, chainRole };
  }

  handleError(error) {
    if (error.reason) {
      throw new Error(error.reason);
    }
    if (error.message && error.message.includes('revert')) {
      // Regex to extract the reason string from ethers revert error
      const match = error.message.match(/revert(?:ed with reason string)?\s['"]?(.*?)['"]?(?:$|\\n)/i);
      if (match && match[1]) {
        throw new Error(match[1]);
      }
      throw new Error("Transaction reverted");
    }
    throw error;
  }

  // ─── Farmer Registry ──────────────────────────────────

  async registerFarmer(userData, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('FarmerRegistry', signer);
      
      const { name, village, state, gpsLocation, incomeTier, landHoldingsCents, produceCategories } = userData;
      
      const tx = await contract.registerFarmer(
        name, village, state, gpsLocation, incomeTier, landHoldingsCents, produceCategories
      );
      const receipt = await tx.wait();
      
      const event = receipt.logs.map(log => {
        try { return contract.interface.parseLog(log); } catch (e) { return null; }
      }).find(e => e && e.name === 'FarmerRegistered');
      
      return { 
        txHash: receipt.hash, 
        farmerId: event ? Number(event.args.id) : null,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Batch Registry ───────────────────────────────────

  async createBatch(batchData, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('BatchRegistry', signer);
      
      const { produceType, category, originWeightGrams, originCount, originGPS, ipfsVisualHash, nodeName } = batchData;
      
      const tx = await contract.createBatch(
        produceType, category, originWeightGrams, originCount, originGPS, ipfsVisualHash, nodeName
      );
      const receipt = await tx.wait();
      
      const event = receipt.logs.map(log => {
        try { return contract.interface.parseLog(log); } catch (e) { return null; }
      }).find(e => e && e.name === 'BatchCreated');
      
      return { 
        txHash: receipt.hash, 
        batchId: event ? event.args.batchId : null,
        pdeeTimestamp: event ? new Date(Number(event.args.pdeeTimestamp) * 1000) : null
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async recordCustodyTransfer(params, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('BatchRegistry', signer);
      
      const { batchId, currentWeightGrams, nodeType, sealStatus, ipfsVisualHash, nodeName, gpsLocation } = params;
      
      const tx = await contract.recordCustodyTransfer(
        batchId, currentWeightGrams, ipfsVisualHash, gpsLocation, nodeName, nodeType, sealStatus
      );
      const receipt = await tx.wait();
      
      let newFRS = null, grade = null, label = null;
      const alerts = [];
      
      receipt.logs.forEach(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'CustodyTransferred') {
            newFRS = Number(parsed.args.newFRS);
            grade = parsed.args.grade;
            label = parsed.args.label;
          }
          if (parsed && parsed.name === 'FreshnessDegraded') {
            alerts.push({
              message: "Freshness Degraded Algorithmically",
              oldFRS: Number(parsed.args.oldFRS),
              newFRS: Number(parsed.args.newFRS)
            });
          }
          if (parsed && parsed.name === 'AnomalyFlagged') {
            alerts.push({ message: "Anomaly Flagged", reason: parsed.args.reason });
          }
        } catch (e) {}
      });
      
      return { txHash: receipt.hash, newFRS, grade, label, alerts };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBatch(batchId) {
    try {
      const contract = this.getContract('BatchRegistry', this.provider);
      const batch = await contract.getBatch(batchId);
      
      return {
        batchId: batch.batchId,
        farmerWallet: batch.farmerWallet,
        produceType: batch.produceType,
        category: Number(batch.category),
        originWeightGrams: Number(batch.originWeightGrams),
        originCount: Number(batch.originCount),
        originGPS: batch.originGPS,
        harvestTimestamp: new Date(Number(batch.harvestTimestamp) * 1000).toISOString(),
        pdeeTimestamp: new Date(Number(batch.pdeeTimestamp) * 1000).toISOString(),
        currentFRS: Number(batch.currentFRS),
        currentGrade: batch.currentGrade,
        currentLabel: batch.currentLabel,
        isDisputed: batch.isDisputed,
        isExpired: batch.isExpired,
        custodyCount: Number(batch.custodyCount)
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCustodyChain(batchId) {
    try {
      const contract = this.getContract('BatchRegistry', this.provider);
      const chain = await contract.getCustodyChain(batchId);
      
      return chain.map(c => ({
        nodeWallet: c.nodeWallet,
        nodeName: c.nodeName,
        timestamp: new Date(Number(c.timestamp) * 1000).toISOString(),
        weightGrams: Number(c.weightGrams),
        frsBasisPoints: Number(c.frsBasisPoints),
        seal: Number(c.seal),
        ipfsVisualHash: c.ipfsVisualHash,
        gpsLocation: c.gpsLocation,
        nodeType: Number(c.nodeType),
        grade: c.grade,
        label: c.label
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getNetworkInventory(produceType) {
    try {
      const contract = this.getContract('BatchRegistry', this.provider);
      const [totalWeight, activeCount] = await contract.getNetworkInventory(produceType);
      
      return {
        totalWeightGrams: Number(totalWeight),
        activeBatchCount: Number(activeCount)
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAllActiveBatches() {
    try {
      const contract = this.getContract('BatchRegistry', this.provider);
      return await contract.getAllActiveBatches();
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Dispute Engine ───────────────────────────────────

  async createDispute(batchId, respondent, disputeType, systemEvidence, recommendation) {
    try {
      // System auto-creates disputes using the deployer signer
      const signer = this.getDeployerSigner();
      const contract = this.getContract('DisputeEngine', signer);
      
      const evidenceStr = typeof systemEvidence === 'string' ? systemEvidence : JSON.stringify(systemEvidence);
      const recommendationStr = typeof recommendation === 'string' ? recommendation : JSON.stringify(recommendation);
      
      const tx = await contract.createDispute(batchId, respondent, disputeType, evidenceStr, recommendationStr);
      const receipt = await tx.wait();
      
      const event = receipt.logs.map(log => {
        try { return contract.interface.parseLog(log); } catch (e) { return null; }
      }).find(e => e && e.name === 'DisputeRaised');
      
      return { 
        disputeId: event ? Number(event.args.disputeId) : null,
        txHash: receipt.hash 
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async submitEvidence(disputeId, ipfsHash, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('DisputeEngine', signer);
      
      const tx = await contract.submitEvidence(disputeId, ipfsHash);
      const receipt = await tx.wait();
      
      return { txHash: receipt.hash };
    } catch (error) {
      this.handleError(error);
    }
  }

  async castVote(disputeId, vote, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('DisputeEngine', signer);
      
      const tx = await contract.castVote(disputeId, vote);
      const receipt = await tx.wait();
      
      return { txHash: receipt.hash };
    } catch (error) {
      this.handleError(error);
    }
  }

  async resolveDispute(disputeId) {
    try {
      const signer = this.getDeployerSigner();
      const contract = this.getContract('DisputeEngine', signer);
      
      const tx = await contract.resolveDispute(disputeId);
      const receipt = await tx.wait();
      
      const event = receipt.logs.map(log => {
        try { return contract.interface.parseLog(log); } catch (e) { return null; }
      }).find(e => e && e.name === 'DisputeResolved');
      
      let verdict = null;
      if (event) {
        // Assume vote enumerator: 1 = GUILTY, 2 = INNOCENT (as per typical contract rules)
        verdict = Number(event.args.verdict) === 1 ? 'GUILTY' : 'INNOCENT';
      }

      return { txHash: receipt.hash, verdict };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Subsidy Engine ───────────────────────────────────

  async getSubsidyQueue() {
    try {
      const contract = this.getContract('SubsidyEngine', this.provider);
      const [addresses, scores] = await contract.getPriorityQueue();
      
      const queue = addresses.map((addr, i) => ({
        address: addr,
        score: Number(scores[i])
      }));
      
      return queue.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.handleError(error);
    }
  }

  async processSubsidyDisbursements(batchSize) {
    try {
      const signer = this.getDeployerSigner();
      const contract = this.getContract('SubsidyEngine', signer);
      
      const tx = await contract.processDisbursements(batchSize);
      const receipt = await tx.wait();
      
      let processed = 0;
      receipt.logs.forEach(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'SubsidyDisbursed') processed++;
        } catch (e) {}
      });

      return { txHash: receipt.hash, processed };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Funding Contracts ────────────────────────────────

  async createFundingRequest(requestData, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('FundingContracts', signer);
      
      const { cropType, landAreaCents, inputRequiredWei, estimatedYieldKg, equityPercent } = requestData;
      
      const tx = await contract.createFundingRequest(
        cropType, landAreaCents, inputRequiredWei, estimatedYieldKg, equityPercent
      );
      const receipt = await tx.wait();
      
      const event = receipt.logs.map(log => {
        try { return contract.interface.parseLog(log); } catch (e) { return null; }
      }).find(e => e && e.name === 'FundingRequestCreated');
      
      return { 
        requestId: event ? Number(event.args.id) : null,
        txHash: receipt.hash 
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async fundFarmer(requestId, amountWei, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('FundingContracts', signer);
      
      const tx = await contract.fundFarmer(requestId, { value: amountWei });
      const receipt = await tx.wait();
      
      return { txHash: receipt.hash };
    } catch (error) {
      this.handleError(error);
    }
  }

  async settleHarvest(requestId, saleAmountWei, privateKey) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract('FundingContracts', signer);
      
      const tx = await contract.settleHarvest(requestId, saleAmountWei, { value: saleAmountWei });
      const receipt = await tx.wait();
      
      return { txHash: receipt.hash };
    } catch (error) {
      this.handleError(error);
    }
  }
}

module.exports = new BlockchainService();
