/**
 * explorerConfig.js
 * All on-chain contract addresses + minimal event ABIs for the Blockchain Explorer.
 * Source of truth for the explorer — no backend calls needed.
 *
 * Addresses come from:
 *   blockchain/deployed-addresses.json        (original 6-contract suite)
 *   blockchain/deployed-addresses-chronicle.json  (FarmChainRegistry + ProduceBatch)
 */

export const RPC_URL  = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
export const CHAIN_ID = 31337;

// ── Deployed addresses ─────────────────────────────────────────────────────
export const ADDRESSES = {
  FRSEngine:        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  FarmerRegistry:   '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  BatchRegistry:    '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  DisputeEngine:    '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  SubsidyEngine:    '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  FundingContracts: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  // Chronicle (NFT custody layer)
  FarmChainRegistry: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
  ProduceBatch:      '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
};

// ── Minimal event ABIs (read-only — no function calls needed) ─────────────
export const ABIS = {
  BatchRegistry: [
    'event BatchCreated(string batchId, address indexed farmer, string produceType, uint256 originWeight)',
    'event CustodyTransferred(string batchId, address indexed node, uint256 newFRS, string grade)',
    'event AnomalyFlagged(string batchId, string anomalyType)',
    'event FreshnessDegraded(string batchId, uint256 legDropBasisPoints, address indexed responsibleNode)',
    'event BatchDisputed(string batchId, uint256 disputeId)',
    'event BatchExpired(string batchId)',
    // View functions used by explorer
    'function getBatch(string batchId) view returns (tuple(string batchId, address farmerWallet, string produceType, uint8 category, uint256 originWeightGrams, uint256 originCount, string originGPS, uint256 harvestTimestamp, uint256 pdeeTimestamp, uint256 currentFRS, string currentGrade, string currentLabel, bool isDisputed, bool isExpired, uint256 custodyCount))',
    'function getCustodyChain(string batchId) view returns (tuple(address nodeWallet, string nodeName, uint256 timestamp, uint256 weightGrams, uint256 frsBasisPoints, uint8 seal, string ipfsVisualHash, string gpsLocation, uint8 nodeType, string grade, string label)[])',
    'function getAllActiveBatches() view returns (string[])',
    'function allBatchIds(uint256) view returns (string)',
  ],
  FarmerRegistry: [
    'event FarmerRegistered(uint256 indexed id, address indexed wallet, string name, string village)',
    'event FarmerVerified(address indexed wallet)',
    'event FarmerBlacklisted(address indexed wallet)',
    'event ReputationUpdated(address indexed wallet, uint256 newScore)',
    'event InsurancePoolUpdated(address indexed wallet, uint256 newBalance)',
  ],
  FarmChainRegistry: [
    'event ParticipantRegistered(address indexed walletAddress, uint8 role, bytes32 locationHash)',
    'event ParticipantVerified(address indexed walletAddress)',
    'function isRegistered(address) view returns (bool)',
    'function isVerifiedParticipant(address) view returns (bool)',
    'function getParticipantRole(address) view returns (uint8)',
    'function participants(address) view returns (address walletAddress, uint8 role, bytes32 locationHash, bool isVerified)',
  ],
  ProduceBatch: [
    'event BatchMinted(uint256 indexed batchId, address indexed initialOwner)',
    'event CustodyTransferInitiated(uint256 indexed batchId, address indexed sender, address indexed receiver)',
    'event CustodyAccepted(uint256 indexed batchId, address indexed newOwner, uint256 timestamp)',
    'event BatchSold(uint256 indexed batchId, address indexed retailer)',
    'function totalBatches() view returns (uint256)',
    'function batches(uint256) view returns (uint256 batchId, address currentOwner, uint256 wOrigin, uint256 nItems, string produceType, uint256 harvestDate)',
    'function batchStates(uint256) view returns (uint8)',
    'function getBatchTransitHistory(uint256 batchId) view returns (bytes32[])',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function pendingReceivers(uint256) view returns (address)',
  ],
};

// ── Role labels for FarmChainRegistry uint8 role ─────────────────────────
export const CHAIN_ROLES = {
  0: 'FARMER',
  1: 'LOGISTICS',
  2: 'AGGREGATOR',
  3: 'RETAILER',
};

// ── Batch state labels for ProduceBatch uint8 state ───────────────────────
export const BATCH_STATES = {
  0: { label: 'HARVESTED',      color: 'farm-green'  },
  1: { label: 'IN_TRANSIT',     color: 'farm-blue'   },
  2: { label: 'AGGREGATED',     color: 'farm-amber'  },
  3: { label: 'RETAIL_ARRIVED', color: 'farm-purple' },
  4: { label: 'SOLD',           color: 'farm-muted'  },
};

// ── Method signature → human label ────────────────────────────────────────
export const METHOD_LABELS = {
  '0x': 'Transfer (ETH)',
  BatchCreated:              'mintBatch / createBatch',
  CustodyTransferred:        'recordCustodyTransfer',
  BatchMinted:               'mintBatch (NFT)',
  CustodyTransferInitiated:  'transferCustody',
  CustodyAccepted:           'acceptCustody',
  BatchSold:                 'markAsSold',
  FarmerRegistered:          'registerFarmer',
  ParticipantRegistered:     'registerParticipant',
  ParticipantVerified:       'verifyParticipant',
  AnomalyFlagged:            'FRS Anomaly ⚠',
  FreshnessDegraded:         'FRS Degraded 📉',
};

export const shortAddr = (addr) =>
  addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : '—';
