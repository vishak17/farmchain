// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FarmerRegistry.sol";

/// @title  SubsidyEngine – Priority-based subsidy disbursement
contract SubsidyEngine is Ownable {

    FarmerRegistry public farmerRegistry;
    uint256 public poolBalance;

    struct DisbursementRecord {
        address farmer;
        uint256 amount;
        uint256 timestamp;
        string  source;
        uint256 priorityScore;
    }

    mapping(address => uint256) public totalReceived;
    mapping(address => uint256) public lastDisbursementTimestamp;
    DisbursementRecord[] public disbursementHistory;
    uint256 public disbursementPerFarmer;

    // ─── Events ─────────────────────────────────────────
    event SubsidyDeposited(address depositor, uint256 amount, string source);
    event SubsidyQueued(address farmer, uint256 priorityScore);
    event SubsidyDisbursed(address farmer, uint256 amount, uint256 priorityScore);

    // ─── Constructor ────────────────────────────────────
    constructor(
        address initialOwner,
        address _farmerRegistry
    ) Ownable(initialOwner) {
        farmerRegistry = FarmerRegistry(_farmerRegistry);
        disbursementPerFarmer = 0.01 ether;
    }

    // ─── Deposit ────────────────────────────────────────
    function depositSubsidy(string memory source) external payable onlyOwner {
        poolBalance += msg.value;
        emit SubsidyDeposited(msg.sender, msg.value, source);
    }

    // ─── Process Disbursements ──────────────────────────
    function processDisbursements(uint256 batchSize) external onlyOwner {
        address[] memory allFarmers = farmerRegistry.getAllFarmers();
        uint256 len = allFarmers.length;
        if (len == 0) return;

        // Build (address, score) pairs
        address[] memory addrs  = new address[](len);
        uint256[] memory scores = new uint256[](len);
        uint256 eligible = 0;

        for (uint256 i = 0; i < len; i++) {
            FarmerRegistry.Farmer memory f = farmerRegistry.getFarmer(allFarmers[i]);
            if (f.isVerified && !f.isBlacklisted) {
                addrs[eligible]  = allFarmers[i];
                scores[eligible] = farmerRegistry.calculateSubsidyPriority(allFarmers[i]);
                eligible++;
            }
        }

        if (eligible == 0) return;

        // Bubble-sort top `batchSize` entries (descending by score)
        uint256 limit = batchSize < eligible ? batchSize : eligible;
        for (uint256 i = 0; i < limit; i++) {
            for (uint256 j = i + 1; j < eligible; j++) {
                if (scores[j] > scores[i]) {
                    // swap scores
                    (scores[i], scores[j]) = (scores[j], scores[i]);
                    // swap addresses
                    (addrs[i], addrs[j])   = (addrs[j], addrs[i]);
                }
            }
        }

        // Disburse to top `limit` farmers
        for (uint256 i = 0; i < limit; i++) {
            if (poolBalance < disbursementPerFarmer) break;

            address farmer = addrs[i];
            uint256 score  = scores[i];

            poolBalance -= disbursementPerFarmer;
            totalReceived[farmer] += disbursementPerFarmer;
            lastDisbursementTimestamp[farmer] = block.timestamp;

            disbursementHistory.push(DisbursementRecord({
                farmer:        farmer,
                amount:        disbursementPerFarmer,
                timestamp:     block.timestamp,
                source:        "priority-queue",
                priorityScore: score
            }));

            (bool ok, ) = payable(farmer).call{value: disbursementPerFarmer}("");
            require(ok, "Transfer failed");

            emit SubsidyDisbursed(farmer, disbursementPerFarmer, score);
        }
    }

    // ─── Priority Queue View ────────────────────────────
    function getPriorityQueue()
        external
        view
        returns (address[] memory farmers, uint256[] memory scores)
    {
        address[] memory allFarmers = farmerRegistry.getAllFarmers();
        uint256 len = allFarmers.length;

        farmers = new address[](len);
        scores  = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            farmers[i] = allFarmers[i];
            scores[i]  = farmerRegistry.calculateSubsidyPriority(allFarmers[i]);
        }

        // Bubble-sort descending
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                if (scores[j] > scores[i]) {
                    (scores[i], scores[j])   = (scores[j], scores[i]);
                    (farmers[i], farmers[j]) = (farmers[j], farmers[i]);
                }
            }
        }
    }

    // ─── Getters ────────────────────────────────────────
    function getDisbursementHistory()
        external
        view
        returns (DisbursementRecord[] memory)
    {
        return disbursementHistory;
    }

    function setDisbursementAmount(uint256 amount) external onlyOwner {
        disbursementPerFarmer = amount;
    }

    receive() external payable {
        poolBalance += msg.value;
    }
}
