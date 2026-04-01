// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FarmerRegistry.sol";
import "./BatchRegistry.sol";

/// @title  FundingContracts – Crowd-funded agricultural micro-investment
/// @notice Farmers publish funding requests; investors contribute ETH.
///         After harvest, proceeds are split according to equity percentage.
contract FundingContracts is Ownable, ReentrancyGuard {

    // ─── Types ──────────────────────────────────────────
    enum FundingStatus { OPEN, FUNDED, ACTIVE_SEASON, SETTLED, FAILED }

    struct FundingRequest {
        uint256   id;
        address   farmer;
        string    cropType;
        uint256   landAreaCents;
        uint256   inputRequiredWei;
        uint256   estimatedYieldKg;
        uint8     equityPercent;       // 0–30 max
        uint256   totalFundedWei;
        FundingStatus status;
        uint256   season;
        uint256   createdAt;
        uint256   fundingDeadline;
        address[] investors;
    }

    // ─── State ──────────────────────────────────────────
    mapping(uint256 => FundingRequest) internal _requests;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256[]) public farmerRequests;
    mapping(address => uint256[]) public investorPortfolio;
    uint256 public requestCounter;
    FarmerRegistry public farmerRegistry;
    BatchRegistry  public batchRegistry;

    // ─── Events ─────────────────────────────────────────
    event FundingRequestCreated(uint256 indexed id, address indexed farmer, string cropType, uint256 target);
    event FarmerFunded(uint256 indexed id, address indexed investor, uint256 amount);
    event HarvestSettled(uint256 indexed id, uint256 totalSale, uint256 investorShare);
    event InsuranceClaimPaid(uint256 indexed id, address investor, uint256 amount);

    // ─── Constructor ────────────────────────────────────
    constructor(
        address initialOwner,
        address _farmerRegistry,
        address _batchRegistry
    ) Ownable(initialOwner) {
        farmerRegistry = FarmerRegistry(_farmerRegistry);
        batchRegistry  = BatchRegistry(payable(_batchRegistry));
    }

    // ─── Create Funding Request ─────────────────────────
    function createFundingRequest(
        string memory cropType,
        uint256 landAreaCents,
        uint256 inputRequiredWei,
        uint256 estimatedYieldKg,
        uint8 equityPercent
    ) external returns (uint256 requestId) {
        require(farmerRegistry.registeredFarmers(msg.sender), "Not a registered farmer");
        require(equityPercent <= 30, "Equity percent max 30");
        require(inputRequiredWei > 0, "Input required must be > 0");

        // Prevent fraud: no other OPEN request from this farmer
        uint256[] storage existing = farmerRequests[msg.sender];
        for (uint256 i = 0; i < existing.length; i++) {
            require(
                _requests[existing[i]].status != FundingStatus.OPEN,
                "Already have an open request"
            );
        }

        requestCounter++;
        requestId = requestCounter;

        FundingRequest storage r = _requests[requestId];
        r.id               = requestId;
        r.farmer           = msg.sender;
        r.cropType         = cropType;
        r.landAreaCents    = landAreaCents;
        r.inputRequiredWei = inputRequiredWei;
        r.estimatedYieldKg = estimatedYieldKg;
        r.equityPercent    = equityPercent;
        r.status           = FundingStatus.OPEN;
        r.season           = block.timestamp;
        r.createdAt        = block.timestamp;
        r.fundingDeadline  = block.timestamp + 30 days;

        farmerRequests[msg.sender].push(requestId);

        emit FundingRequestCreated(requestId, msg.sender, cropType, inputRequiredWei);
    }

    // ─── Fund Farmer ────────────────────────────────────
    function fundFarmer(uint256 requestId) external payable nonReentrant {
        FundingRequest storage r = _requests[requestId];
        require(r.status == FundingStatus.OPEN, "Request not open");
        require(block.timestamp <= r.fundingDeadline, "Funding deadline passed");
        require(msg.value > 0, "Must send ETH");

        // Track contribution
        if (contributions[requestId][msg.sender] == 0) {
            r.investors.push(msg.sender);
            investorPortfolio[msg.sender].push(requestId);
        }
        contributions[requestId][msg.sender] += msg.value;
        r.totalFundedWei += msg.value;

        emit FarmerFunded(requestId, msg.sender, msg.value);

        // If fully funded: mark FUNDED and transfer to farmer
        if (r.totalFundedWei >= r.inputRequiredWei) {
            r.status = FundingStatus.FUNDED;
            (bool ok, ) = payable(r.farmer).call{value: r.totalFundedWei}("");
            require(ok, "Transfer to farmer failed");
        }
    }

    // ─── Settle Harvest ─────────────────────────────────
    function settleHarvest(
        uint256 requestId,
        uint256 actualSaleAmountWei
    ) external payable nonReentrant {
        FundingRequest storage r = _requests[requestId];
        require(msg.sender == r.farmer, "Only farmer can settle");
        require(
            r.status == FundingStatus.FUNDED || r.status == FundingStatus.ACTIVE_SEASON,
            "Not in fundable state"
        );
        require(msg.value == actualSaleAmountWei, "Must send exact sale amount");

        uint256 totalInvestorShare = 0;

        for (uint256 i = 0; i < r.investors.length; i++) {
            address investor = r.investors[i];
            uint256 contrib  = contributions[requestId][investor];

            // investorShare = (contrib * equityPercent * saleAmount) / (totalFunded * 100)
            uint256 share = (contrib * r.equityPercent * actualSaleAmountWei)
                            / (r.totalFundedWei * 100);

            totalInvestorShare += share;

            (bool ok, ) = payable(investor).call{value: share}("");
            require(ok, "Investor payout failed");
        }

        r.status = FundingStatus.SETTLED;

        emit HarvestSettled(requestId, actualSaleAmountWei, totalInvestorShare);

        // Return remaining funds to farmer
        uint256 remaining = actualSaleAmountWei - totalInvestorShare;
        if (remaining > 0) {
            (bool ok2, ) = payable(r.farmer).call{value: remaining}("");
            require(ok2, "Farmer refund failed");
        }
    }

    // ─── Views ──────────────────────────────────────────

    function getActiveFundingRequests() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (_requests[i].status == FundingStatus.OPEN) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= requestCounter; i++) {
            if (_requests[i].status == FundingStatus.OPEN) {
                result[idx++] = i;
            }
        }
        return result;
    }

    function getFarmerReliabilityScore(address farmer) external view returns (uint256 score) {
        FarmerRegistry.Farmer memory f = farmerRegistry.getFarmer(farmer);
        score = f.reputationScore; // 0–100
    }

    function requests(uint256 id) external view returns (FundingRequest memory) {
        return _requests[id];
    }

    function getRequest(uint256 id) external view returns (FundingRequest memory) {
        return _requests[id];
    }

    function getContribution(uint256 requestId, address investor) external view returns (uint256) {
        return contributions[requestId][investor];
    }
}
