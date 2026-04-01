// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FRSEngine.sol";
import "./FarmerRegistry.sol";

/// @title  BatchRegistry – Core supply-chain batch tracking
contract BatchRegistry is Ownable {
    using FRSEngine for *;

    FarmerRegistry public farmerRegistry;

    enum NodeType   { FARM, MIDDLEMAN, DEPOT, RETAILER }
    enum SealStatus { INTACT, BROKEN, FLAGGED }

    struct CustodyRecord {
        address    nodeWallet;
        string     nodeName;
        uint256    timestamp;
        uint256    weightGrams;
        uint256    frsBasisPoints;
        SealStatus seal;
        string     ipfsVisualHash;
        string     gpsLocation;
        NodeType   nodeType;
        string     grade;
        string     label;
    }

    struct Batch {
        string          batchId;
        address         farmerWallet;
        string          produceType;
        ProduceCategory category;
        uint256         originWeightGrams;
        uint256         originCount;
        string          originGPS;
        uint256         harvestTimestamp;
        uint256         pdeeTimestamp;
        uint256         currentFRS;
        CustodyRecord[] custodyChain;
        bool            isDisputed;
        bool            isExpired;
        bool            isSettled;
        bool            anomalyFlagged;
        uint256         disputeId;
    }

    // ─── State ──────────────────────────────────────────
    mapping(string => Batch) internal _batches;
    mapping(address => string[]) public farmerBatches;
    mapping(string => uint256[]) public produceTypeTotalWeight;
    string[]  public allBatchIds;
    uint256   private _batchCounter;
    address   public disputeEngineAddress;
    mapping(address => bool) public blacklistedNodes;

    // ─── Events ─────────────────────────────────────────
    event BatchCreated(string indexed batchId, address indexed farmer, string produceType, uint256 originWeight);
    event CustodyTransferred(string indexed batchId, address indexed node, uint256 newFRS, string grade);
    event FreshnessDegraded(string indexed batchId, uint256 legDropBasisPoints, address responsibleNode);
    event AnomalyFlagged(string indexed batchId, string anomalyType);
    event BatchExpired(string indexed batchId);
    event BatchDisputed(string indexed batchId, uint256 disputeId);

    // ─── Constructor ────────────────────────────────────
    constructor(address initialOwner, address _farmerRegistry) Ownable(initialOwner) {
        farmerRegistry = FarmerRegistry(_farmerRegistry);
    }

    // ─── Helpers ────────────────────────────────────────
    function _zeroPad(uint256 value, uint256 width) internal pure returns (string memory) {
        bytes memory result = new bytes(width);
        for (uint256 i = width; i > 0; i--) {
            result[i - 1] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(result);
    }

    function generateBatchId() internal returns (string memory) {
        _batchCounter++;
        return string(abi.encodePacked("BATCH-KA-2024-", _zeroPad(_batchCounter, 5)));
    }

    // ─── Create Batch ───────────────────────────────────
    function createBatch(
        string memory produceType,
        ProduceCategory category,
        uint256 originWeightGrams,
        uint256 originCount,
        string memory originGPS,
        string memory ipfsVisualHash,
        string memory nodeName
    ) external returns (string memory batchId) {
        require(farmerRegistry.registeredFarmers(msg.sender), "Not a registered farmer");
        require(!blacklistedNodes[msg.sender], "Node is blacklisted");
        require(originWeightGrams > 0, "Weight must be positive");
        require(originCount > 0, "Count must be positive");

        batchId = generateBatchId();
        Batch storage b = _batches[batchId];
        b.batchId           = batchId;
        b.farmerWallet      = msg.sender;
        b.produceType       = produceType;
        b.category          = category;
        b.originWeightGrams = originWeightGrams;
        b.originCount       = originCount;
        b.originGPS         = originGPS;
        b.harvestTimestamp   = block.timestamp;
        b.currentFRS        = 10000;
        b.pdeeTimestamp      = block.timestamp +
            (FRSEngine.computePDEE(category, 10000, 24) * 1 hours);

        {
            CustodyRecord storage r = b.custodyChain.push();
            r.nodeWallet     = msg.sender;
            r.nodeName       = nodeName;
            r.timestamp      = block.timestamp;
            r.weightGrams    = originWeightGrams;
            r.frsBasisPoints = 10000;
            r.seal           = SealStatus.INTACT;
            r.ipfsVisualHash = ipfsVisualHash;
            r.gpsLocation    = originGPS;
            r.nodeType       = NodeType.FARM;
            r.grade          = "A+";
            r.label          = "Premium";
        }

        farmerBatches[msg.sender].push(batchId);
        allBatchIds.push(batchId);
        farmerRegistry.incrementBatchCount(msg.sender);
        emit BatchCreated(batchId, msg.sender, produceType, originWeightGrams);
    }

    // ─── Internal: grade + anomaly checks (split to avoid stack-too-deep) ──
    function _processTransferChecks(
        string memory batchId,
        Batch storage b,
        uint256 newFRS,
        SealStatus sealStatus
    ) internal returns (string memory grade, string memory label) {
        bool shouldDispute;
        {
            string memory action;
            (grade, label, action, shouldDispute) = FRSEngine.getGrade(newFRS, b.category);
        }

        if (shouldDispute) {
            b.isDisputed = true;
        }

        uint256 prevFRS = b.currentFRS;
        if (prevFRS > newFRS && (prevFRS - newFRS) > 300) {
            emit FreshnessDegraded(batchId, prevFRS - newFRS, msg.sender);
        }
        if (newFRS > prevFRS) {
            b.anomalyFlagged = true;
            emit AnomalyFlagged(batchId, "PRESERVATIVE_SUSPECTED");
        }
        if (sealStatus == SealStatus.BROKEN) {
            emit AnomalyFlagged(batchId, "BROKEN_SEAL");
        }
        if (block.timestamp > b.pdeeTimestamp) {
            b.isExpired = true;
            emit BatchExpired(batchId);
        }
    }

    // ─── Record Custody Transfer ────────────────────────
    function recordCustodyTransfer(
        string memory batchId,
        uint256 newWeightGrams,
        string memory ipfsVisualHash,
        string memory gpsLocation,
        string memory nodeName,
        NodeType nodeType,
        SealStatus sealStatus
    ) external payable returns (uint256 newFRS) {
        Batch storage b = _batches[batchId];
        require(b.farmerWallet != address(0), "Batch not found");
        require(!blacklistedNodes[msg.sender], "Node is blacklisted");
        require(!b.isExpired, "Batch has expired");

        newFRS = FRSEngine.calculateFRS(b.originWeightGrams, newWeightGrams);

        (string memory grade, string memory label) =
            _processTransferChecks(batchId, b, newFRS, sealStatus);

        {
            CustodyRecord storage r = b.custodyChain.push();
            r.nodeWallet     = msg.sender;
            r.nodeName       = nodeName;
            r.timestamp      = block.timestamp;
            r.weightGrams    = newWeightGrams;
            r.frsBasisPoints = newFRS;
            r.seal           = sealStatus;
            r.ipfsVisualHash = ipfsVisualHash;
            r.gpsLocation    = gpsLocation;
            r.nodeType       = nodeType;
            r.grade          = grade;
            r.label          = label;
        }

        b.currentFRS = newFRS;
        emit CustodyTransferred(batchId, msg.sender, newFRS, grade);

        if (msg.value > 0) {
            farmerRegistry.creditInsurancePool(b.farmerWallet, msg.value / 10);
        }
    }

    // ─── Getters ────────────────────────────────────────

    function batches(string memory batchId) external view returns (Batch memory) {
        return _batches[batchId];
    }

    function getBatch(string memory batchId) external view returns (Batch memory) {
        return _batches[batchId];
    }

    function getCustodyChain(string memory batchId) external view returns (CustodyRecord[] memory) {
        return _batches[batchId].custodyChain;
    }

    function getBatchesByFarmer(address farmer) external view returns (string[] memory) {
        return farmerBatches[farmer];
    }

    function getNetworkInventory(
        string memory produceType
    ) external view returns (uint256 totalWeightGrams, uint256 activeBatchCount) {
        bytes32 targetHash = keccak256(abi.encodePacked(produceType));
        for (uint256 i = 0; i < allBatchIds.length; i++) {
            Batch storage b = _batches[allBatchIds[i]];
            if (!b.isExpired && !b.isSettled &&
                keccak256(abi.encodePacked(b.produceType)) == targetHash)
            {
                uint256 len = b.custodyChain.length;
                totalWeightGrams += (len > 0)
                    ? b.custodyChain[len - 1].weightGrams
                    : b.originWeightGrams;
                activeBatchCount++;
            }
        }
    }

    function getAllActiveBatches() external view returns (string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allBatchIds.length; i++) {
            Batch storage b = _batches[allBatchIds[i]];
            if (!b.isExpired && !b.isSettled) count++;
        }
        string[] memory result = new string[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < allBatchIds.length; i++) {
            Batch storage b = _batches[allBatchIds[i]];
            if (!b.isExpired && !b.isSettled) {
                result[idx++] = allBatchIds[i];
            }
        }
        return result;
    }

    // ─── Admin ──────────────────────────────────────────

    function blacklistNode(address node) external onlyOwner {
        blacklistedNodes[node] = true;
    }

    function setDisputeEngineAddress(address addr) external onlyOwner {
        disputeEngineAddress = addr;
    }

    function markDisputed(string memory batchId, uint256 _disputeId) external {
        require(msg.sender == disputeEngineAddress, "Only DisputeEngine");
        Batch storage b = _batches[batchId];
        require(b.farmerWallet != address(0), "Batch not found");
        b.isDisputed = true;
        b.disputeId  = _disputeId;
        emit BatchDisputed(batchId, _disputeId);
    }
}
