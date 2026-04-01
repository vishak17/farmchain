// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

// ─── Simple Counter (Counters.sol was removed in OZ v5) ────────
library Counters {
    struct Counter {
        uint256 _value;
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        unchecked {
            counter._value += 1;
        }
    }
}

/// @title  FarmerRegistry – On-chain registry of smallholder farmers
/// @notice Manages farmer profiles, verification, reputation, insurance
///         pools, and subsidy-priority scoring for the FarmChain platform.
contract FarmerRegistry is Ownable {
    using Counters for Counters.Counter;

    // ───────────────────────────── State ─────────────────────────────

    Counters.Counter private _farmerIdCounter;

    struct Farmer {
        uint256 id;
        address wallet;
        string name;
        string village;
        string state;
        string gpsLocation;
        uint8 incomeTier;            // 1 = low, 2 = medium, 3 = high
        uint256 landHoldingsCents;   // land in cents of an acre (50 = 0.5 acres)
        string[] produceCategories;
        bool isVerified;
        bool isBlacklisted;
        uint256 registrationTimestamp;
        uint256 insurancePoolWei;
        uint256 reputationScore;     // starts at 100, max 100
        uint256 totalBatchesCreated;
        uint256 totalDisputesAgainst;
        uint256 totalDisputesGuilty;
    }

    mapping(address => Farmer) private _farmers;
    mapping(uint256 => address) public farmerIdToAddress;
    mapping(address => bool) public registeredFarmers;
    address[] public allFarmerAddresses;

    /// @notice Address of the BatchRegistry contract (authorised caller).
    address public batchRegistryAddress;

    /// @notice Address of the DisputeEngine contract (authorised caller).
    address public disputeEngineAddress;

    // ───────────────────────────── Events ────────────────────────────

    event FarmerRegistered(
        uint256 indexed id,
        address indexed wallet,
        string name,
        string village
    );
    event FarmerVerified(address indexed wallet);
    event InsurancePoolUpdated(address indexed wallet, uint256 newBalance);
    event ReputationUpdated(address indexed wallet, uint256 newScore);
    event FarmerBlacklisted(address indexed wallet);

    // ───────────────────────────── Modifiers ─────────────────────────

    modifier onlyOwnerOrBatchRegistry() {
        require(
            msg.sender == owner() || msg.sender == batchRegistryAddress,
            "Not owner or BatchRegistry"
        );
        _;
    }

    modifier onlyOwnerOrDisputeEngine() {
        require(
            msg.sender == owner() || msg.sender == disputeEngineAddress,
            "Not owner or DisputeEngine"
        );
        _;
    }

    // ───────────────────────────── Constructor ───────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ───────────────────────────── Registration ─────────────────────

    /// @notice Register a new farmer.  Caller becomes the farmer wallet.
    function registerFarmer(
        string memory name,
        string memory village,
        string memory state,
        string memory gpsLocation,
        uint8 incomeTier,
        uint256 landHoldingsCents,
        string[] memory produceCategories
    ) external returns (uint256 farmerId) {
        require(!registeredFarmers[msg.sender], "Farmer already registered");
        require(incomeTier >= 1 && incomeTier <= 3, "Income tier must be 1-3");
        require(bytes(name).length > 0, "Name cannot be empty");

        _farmerIdCounter.increment();
        farmerId = _farmerIdCounter.current();

        Farmer storage f = _farmers[msg.sender];
        f.id                    = farmerId;
        f.wallet                = msg.sender;
        f.name                  = name;
        f.village               = village;
        f.state                 = state;
        f.gpsLocation           = gpsLocation;
        f.incomeTier            = incomeTier;
        f.landHoldingsCents     = landHoldingsCents;
        f.produceCategories     = produceCategories;
        f.isVerified            = false;
        f.isBlacklisted         = false;
        f.registrationTimestamp = block.timestamp;
        f.insurancePoolWei      = 0;
        f.reputationScore       = 100;
        f.totalBatchesCreated   = 0;
        f.totalDisputesAgainst  = 0;
        f.totalDisputesGuilty   = 0;

        farmerIdToAddress[farmerId] = msg.sender;
        registeredFarmers[msg.sender] = true;
        allFarmerAddresses.push(msg.sender);

        emit FarmerRegistered(farmerId, msg.sender, name, village);
    }

    // ───────────────────────────── Verification ─────────────────────

    /// @notice Admin-only: mark a farmer as verified.
    function verifyFarmer(address wallet) external onlyOwner {
        require(registeredFarmers[wallet], "Farmer not registered");
        _farmers[wallet].isVerified = true;
        emit FarmerVerified(wallet);
    }

    // ───────────────────────────── Insurance Pool ───────────────────

    /// @notice Credit the farmer's on-chain insurance pool.
    function creditInsurancePool(
        address wallet,
        uint256 amountWei
    ) external onlyOwnerOrBatchRegistry {
        require(registeredFarmers[wallet], "Farmer not registered");
        _farmers[wallet].insurancePoolWei += amountWei;
        emit InsurancePoolUpdated(wallet, _farmers[wallet].insurancePoolWei);
    }

    // ───────────────────────────── Reputation ───────────────────────

    /// @notice Adjust a farmer's reputation.  Clamped to [0, 100].
    function updateReputation(
        address wallet,
        int8 delta
    ) external onlyOwnerOrDisputeEngine {
        require(registeredFarmers[wallet], "Farmer not registered");

        uint256 current = _farmers[wallet].reputationScore;

        if (delta < 0) {
            uint256 absDelta = uint256(uint8(-delta));
            if (absDelta >= current) {
                _farmers[wallet].reputationScore = 0;
            } else {
                _farmers[wallet].reputationScore = current - absDelta;
            }
        } else {
            uint256 absDelta = uint256(uint8(delta));
            uint256 newScore = current + absDelta;
            if (newScore > 100) {
                _farmers[wallet].reputationScore = 100;
            } else {
                _farmers[wallet].reputationScore = newScore;
            }
        }

        emit ReputationUpdated(wallet, _farmers[wallet].reputationScore);
    }

    // ───────────────────────────── Subsidy Priority ─────────────────

    /// @notice Compute a weighted subsidy-priority score for a farmer.
    /// @return score  Weighted composite (0 – 100).
    function calculateSubsidyPriority(
        address wallet
    ) public view returns (uint256 score) {
        require(registeredFarmers[wallet], "Farmer not registered");

        Farmer storage f = _farmers[wallet];

        // Income tier score
        uint256 incomeTierScore;
        if (f.incomeTier == 1)      incomeTierScore = 100;
        else if (f.incomeTier == 2) incomeTierScore = 50;
        else                        incomeTierScore = 0;

        // Land-holding score
        uint256 landScore;
        if (f.landHoldingsCents <= 100)      landScore = 100;
        else if (f.landHoldingsCents <= 500) landScore = 50;
        else                                 landScore = 10;

        // Activity score
        uint256 activityScore;
        if (f.totalBatchesCreated >= 10)     activityScore = 100;
        else if (f.totalBatchesCreated >= 5) activityScore = 60;
        else if (f.totalBatchesCreated >= 1) activityScore = 30;
        else                                 activityScore = 0;

        // Crop risk score
        uint256 cropRiskScore = 50; // default
        for (uint256 i = 0; i < f.produceCategories.length; i++) {
            bytes32 h = keccak256(abi.encodePacked(f.produceCategories[i]));
            if (
                h == keccak256("spinach") ||
                h == keccak256("lettuce") ||
                h == keccak256("mushroom") ||
                h == keccak256("strawberry")
            ) {
                cropRiskScore = 100;
                break;
            }
        }

        // Weighted composite:
        // 40% income + 25% land + 20% activity + 15% crop risk
        score = (40 * incomeTierScore +
                 25 * landScore +
                 20 * activityScore +
                 15 * cropRiskScore) / 100;
    }

    // ───────────────────────────── Getters ───────────────────────────

    /// @notice Return the full Farmer struct for a wallet.
    function getFarmer(address wallet) external view returns (Farmer memory) {
        return _farmers[wallet];
    }

    /// @notice Return all registered farmer addresses.
    function getAllFarmers() external view returns (address[] memory) {
        return allFarmerAddresses;
    }

    /// @notice Public accessor that mirrors the mapping.
    function farmers(address wallet) external view returns (Farmer memory) {
        return _farmers[wallet];
    }

    // ───────────────────────────── Batch Count ──────────────────────

    /// @notice Increment a farmer's batch count (called by BatchRegistry).
    function incrementBatchCount(
        address wallet
    ) external onlyOwnerOrBatchRegistry {
        require(registeredFarmers[wallet], "Farmer not registered");
        _farmers[wallet].totalBatchesCreated += 1;
    }

    // ───────────────────────────── Admin Setters ────────────────────

    /// @notice Set the authorised BatchRegistry contract address.
    function setBatchRegistryAddress(address addr) external onlyOwner {
        batchRegistryAddress = addr;
    }

    /// @notice Set the authorised DisputeEngine contract address.
    function setDisputeEngineAddress(address addr) external onlyOwner {
        disputeEngineAddress = addr;
    }

    /// @notice Blacklist a farmer.
    function blacklistFarmer(address wallet) external onlyOwner {
        require(registeredFarmers[wallet], "Farmer not registered");
        _farmers[wallet].isBlacklisted = true;
        emit FarmerBlacklisted(wallet);
    }
}
