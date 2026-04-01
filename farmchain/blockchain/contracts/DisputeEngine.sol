// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BatchRegistry.sol";
import "./FarmerRegistry.sol";

/// @title  DisputeEngine – Decentralised dispute resolution for FarmChain
contract DisputeEngine is AccessControl {

    bytes32 public constant PANEL_ROLE     = keccak256("PANEL_ROLE");
    bytes32 public constant INITIATOR_ROLE = keccak256("INITIATOR_ROLE");

    // ─── Types ──────────────────────────────────────────
    enum DisputeStatus { OPEN, EVIDENCE_PHASE, VOTING, RESOLVED_GUILTY, RESOLVED_INNOCENT }
    enum DisputeType   { LOW_FRS, BROKEN_SEAL, COUNT_DISCREPANCY, CONSUMER_REPORT }

    struct DisputeVote {
        address voter;
        uint8   vote;      // 1 = guilty, 2 = innocent
        uint256 timestamp;
    }

    struct Dispute {
        uint256        id;
        string         batchId;
        address        initiator;
        address        respondent;
        DisputeType    disputeType;
        string         systemEvidence;
        string         submittedEvidence;
        uint256        createdAt;
        uint256        evidenceDeadline;
        DisputeStatus  status;
        DisputeVote[]  votes;
        uint256        guiltyVotes;
        uint256        innocentVotes;
        bool           resolved;
        uint256        compensationWei;
        string         systemRecommendation;
    }

    // ─── State ──────────────────────────────────────────
    mapping(uint256 => Dispute) internal _disputes;
    mapping(string  => uint256) public batchToDisputeId;
    uint256 public disputeCounter;
    uint256 public disputeFundWei;
    BatchRegistry  public batchRegistry;
    FarmerRegistry public farmerRegistry;

    // ─── Events ─────────────────────────────────────────
    event DisputeCreated(uint256 indexed id, string batchId, address respondent, DisputeType dtype);
    event EvidenceSubmitted(uint256 indexed id, address submitter, string ipfsHash);
    event VoteCast(uint256 indexed id, address voter, uint8 vote);
    event DisputeResolved(uint256 indexed id, bool guilty, address respondent);
    event CompensationDisbursed(uint256 indexed id, address recipient, uint256 amount);

    // ─── Constructor ────────────────────────────────────
    constructor(
        address admin,
        address _batchRegistry,
        address _farmerRegistry
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PANEL_ROLE, admin);
        _grantRole(INITIATOR_ROLE, admin);

        batchRegistry  = BatchRegistry(payable(_batchRegistry));
        farmerRegistry = FarmerRegistry(_farmerRegistry);
    }

    // ─── Create Dispute ─────────────────────────────────
    function createDispute(
        string memory batchId,
        address respondent,
        DisputeType dtype,
        string memory systemEvidence,
        string memory systemRecommendation
    ) external returns (uint256 disputeId) {
        require(
            hasRole(INITIATOR_ROLE, msg.sender) || msg.sender == address(batchRegistry),
            "Not authorised to create disputes"
        );

        disputeCounter++;
        disputeId = disputeCounter;

        Dispute storage d    = _disputes[disputeId];
        d.id                 = disputeId;
        d.batchId            = batchId;
        d.initiator          = msg.sender;
        d.respondent         = respondent;
        d.disputeType        = dtype;
        d.systemEvidence     = systemEvidence;
        d.systemRecommendation = systemRecommendation;
        d.createdAt          = block.timestamp;
        d.evidenceDeadline   = block.timestamp + 48 hours;
        d.status             = DisputeStatus.EVIDENCE_PHASE;

        batchToDisputeId[batchId] = disputeId;
        batchRegistry.markDisputed(batchId, disputeId);

        emit DisputeCreated(disputeId, batchId, respondent, dtype);
    }

    // ─── Submit Evidence ────────────────────────────────
    function submitEvidence(uint256 disputeId, string memory ipfsHash) external {
        Dispute storage d = _disputes[disputeId];
        require(block.timestamp <= d.evidenceDeadline, "Evidence deadline passed");
        require(d.status == DisputeStatus.EVIDENCE_PHASE, "Not in evidence phase");

        d.submittedEvidence = ipfsHash;
        d.status = DisputeStatus.VOTING;

        emit EvidenceSubmitted(disputeId, msg.sender, ipfsHash);
    }

    // ─── Cast Vote ──────────────────────────────────────
    function castVote(uint256 disputeId, uint8 vote) external onlyRole(PANEL_ROLE) {
        Dispute storage d = _disputes[disputeId];
        require(d.status == DisputeStatus.VOTING, "Not in voting phase");
        require(vote == 1 || vote == 2, "Vote must be 1 (guilty) or 2 (innocent)");

        d.votes.push(DisputeVote({
            voter:     msg.sender,
            vote:      vote,
            timestamp: block.timestamp
        }));

        if (vote == 1) d.guiltyVotes++;
        else           d.innocentVotes++;

        emit VoteCast(disputeId, msg.sender, vote);
    }

    // ─── Resolve Dispute ────────────────────────────────
    function resolveDispute(uint256 disputeId) external {
        Dispute storage d = _disputes[disputeId];
        require(!d.resolved, "Already resolved");
        require(
            block.timestamp > d.evidenceDeadline || d.votes.length >= 3,
            "Cannot resolve yet"
        );

        bool guilty = d.guiltyVotes > d.innocentVotes;
        d.resolved = true;

        if (guilty) {
            d.status = DisputeStatus.RESOLVED_GUILTY;
            farmerRegistry.updateReputation(d.respondent, -15);
            emit DisputeResolved(disputeId, true, d.respondent);

            if (disputeFundWei >= 0.1 ether) {
                uint256 comp = 0.1 ether;
                disputeFundWei -= comp;
                d.compensationWei = comp;
                (bool ok, ) = payable(d.initiator).call{value: comp}("");
                require(ok, "Compensation transfer failed");
                emit CompensationDisbursed(disputeId, d.initiator, comp);
            }
        } else {
            d.status = DisputeStatus.RESOLVED_INNOCENT;
            emit DisputeResolved(disputeId, false, d.respondent);
        }
    }

    // ─── Fund Management ────────────────────────────────
    function depositToFund() external payable {
        disputeFundWei += msg.value;
    }

    // ─── Getters (split to avoid stack-too-deep) ────────

    /// @notice Core dispute info (identity, parties, evidence).
    function getDisputeCore(uint256 id) external view returns (
        uint256        _id,
        string  memory batchId,
        address        initiator,
        address        respondent,
        DisputeType    disputeType,
        string  memory systemEvidence,
        string  memory submittedEvidence,
        string  memory systemRecommendation
    ) {
        Dispute storage d = _disputes[id];
        return (
            d.id, d.batchId, d.initiator, d.respondent,
            d.disputeType, d.systemEvidence, d.submittedEvidence,
            d.systemRecommendation
        );
    }

    /// @notice Dispute status, timing, votes, and resolution.
    function getDisputeStatus(uint256 id) external view returns (
        uint256        createdAt,
        uint256        evidenceDeadline,
        DisputeStatus  status,
        uint256        guiltyVotes,
        uint256        innocentVotes,
        bool           resolved,
        uint256        compensationWei
    ) {
        Dispute storage d = _disputes[id];
        return (
            d.createdAt, d.evidenceDeadline, d.status,
            d.guiltyVotes, d.innocentVotes, d.resolved,
            d.compensationWei
        );
    }

    function getDisputeVotes(uint256 id) external view returns (DisputeVote[] memory) {
        return _disputes[id].votes;
    }

    function getOpenDisputes() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= disputeCounter; i++) {
            if (!_disputes[i].resolved) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= disputeCounter; i++) {
            if (!_disputes[i].resolved) {
                result[idx++] = i;
            }
        }
        return result;
    }

    receive() external payable {
        disputeFundWei += msg.value;
    }
}
