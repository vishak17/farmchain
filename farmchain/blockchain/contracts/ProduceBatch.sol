// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./FarmChainRegistry.sol";

/**
 * @title ProduceBatch
 * @notice ERC-721 NFT representing a physical produce batch. Each token = one batch.
 *         Custody transfers require a dual-signature flow (sender initiates, receiver accepts).
 *         Batch state advances automatically based on the receiver's role in FarmChainRegistry.
 *
 * @dev Extracted from farm-chain-chronicles-main and integrated into FarmChain v2.
 *      Works alongside the existing BatchRegistry.sol — this contract provides the NFT ownership
 *      layer while BatchRegistry.sol handles off-chain FRS metadata and supply-chain records.
 *
 *      Lifecycle:
 *        HARVESTED → (LOGISTICS accepts) → IN_TRANSIT
 *                 → (AGGREGATOR accepts) → AGGREGATED
 *                 → (RETAILER accepts)   → RETAIL_ARRIVED
 *                 → markAsSold()         → SOLD
 */
contract ProduceBatch is ERC721 {
    FarmChainRegistry public registry;

    enum BatchState { HARVESTED, IN_TRANSIT, AGGREGATED, RETAIL_ARRIVED, SOLD }

    struct Batch {
        uint256 batchId;
        address currentOwner;
        uint256 wOrigin;         // Original weight in grams
        uint256 nItems;          // Count of items
        string produceType;
        uint256 harvestDate;     // block.timestamp at mint
        bytes32[] transitHistory; // IPFS/FRS hashes appended at each custody acceptance
    }

    mapping(uint256 => Batch) public batches;
    mapping(uint256 => BatchState) public batchStates;
    mapping(uint256 => address) public pendingReceivers; // batchId → next custodian

    uint256 private _currentBatchId;

    event BatchMinted(uint256 indexed batchId, address indexed initialOwner);
    event CustodyTransferInitiated(uint256 indexed batchId, address indexed sender, address indexed receiver);
    event CustodyAccepted(uint256 indexed batchId, address indexed newOwner, uint256 timestamp);
    event BatchSold(uint256 indexed batchId, address indexed retailer);

    constructor(address _registryAddress) ERC721("ProduceBatch", "PBT") {
        require(_registryAddress != address(0), "ProduceBatch: Invalid registry address");
        registry = FarmChainRegistry(_registryAddress);
    }

    // ── Block standard ERC-721 transfers to enforce dual-signature custody ──

    function transferFrom(address, address, uint256) public virtual override {
        revert("ProduceBatch: Use transferCustody + acceptCustody");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override {
        revert("ProduceBatch: Use transferCustody + acceptCustody");
    }

    // ── Core lifecycle functions ──────────────────────────────────────────────

    /**
     * @notice Mint a new batch NFT. Caller must be a verified FARMER in FarmChainRegistry.
     * @param _wOrigin Weight of batch in grams
     * @param _nItems  Number of individual items in the batch
     * @param _produceType  e.g. "tomato", "mango"
     */
    function mintBatch(uint256 _wOrigin, uint256 _nItems, string memory _produceType) external {
        require(registry.isVerifiedParticipant(msg.sender), "ProduceBatch: Only verified participants can mint");
        require(
            registry.getParticipantRole(msg.sender) == FarmChainRegistry.Role.FARMER,
            "ProduceBatch: Only FARMERs can mint"
        );

        uint256 newBatchId = ++_currentBatchId;

        bytes32[] memory initialHistory = new bytes32[](0);

        batches[newBatchId] = Batch({
            batchId:        newBatchId,
            currentOwner:   msg.sender,
            wOrigin:        _wOrigin,
            nItems:         _nItems,
            produceType:    _produceType,
            harvestDate:    block.timestamp,
            transitHistory: initialHistory
        });

        batchStates[newBatchId] = BatchState.HARVESTED;

        _safeMint(msg.sender, newBatchId);
        emit BatchMinted(newBatchId, msg.sender);
    }

    /**
     * @notice Step 1 of custody handover: current token owner nominates next custodian.
     * @param batchId          Token ID to transfer
     * @param receiverAddress  Must be a verified participant in FarmChainRegistry
     */
    function transferCustody(uint256 batchId, address receiverAddress) external {
        require(ownerOf(batchId) == msg.sender, "ProduceBatch: Not the token owner");
        require(
            registry.isVerifiedParticipant(receiverAddress),
            "ProduceBatch: Receiver is not a verified participant"
        );
        require(batchStates[batchId] != BatchState.SOLD, "ProduceBatch: Batch already sold");

        pendingReceivers[batchId] = receiverAddress;
        emit CustodyTransferInitiated(batchId, msg.sender, receiverAddress);
    }

    /**
     * @notice Step 2: Nominated receiver confirms arrival and assumes custody.
     * @param batchId     Token ID
     * @param arrivalFRS  32-byte hash representing arrival scan data (IPFS CID or FRS snapshot)
     */
    function acceptCustody(uint256 batchId, bytes32 arrivalFRS) external {
        require(pendingReceivers[batchId] == msg.sender, "ProduceBatch: Not the pending receiver");

        delete pendingReceivers[batchId];

        FarmChainRegistry.Role receiverRole = registry.getParticipantRole(msg.sender);

        // Advance batch state based on new custodian's role
        if (receiverRole == FarmChainRegistry.Role.LOGISTICS) {
            batchStates[batchId] = BatchState.IN_TRANSIT;
        } else if (receiverRole == FarmChainRegistry.Role.AGGREGATOR) {
            batchStates[batchId] = BatchState.AGGREGATED;
        } else if (receiverRole == FarmChainRegistry.Role.RETAILER) {
            batchStates[batchId] = BatchState.RETAIL_ARRIVED;
        }

        batches[batchId].currentOwner = msg.sender;
        batches[batchId].transitHistory.push(arrivalFRS);

        address previousOwner = ownerOf(batchId);
        _transfer(previousOwner, msg.sender, batchId);

        emit CustodyAccepted(batchId, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a batch as sold to end consumer. Only the RETAILER who owns the token can call this.
     */
    function markAsSold(uint256 batchId) external {
        require(ownerOf(batchId) == msg.sender, "ProduceBatch: Not the owner");
        require(
            registry.getParticipantRole(msg.sender) == FarmChainRegistry.Role.RETAILER,
            "ProduceBatch: Only retailers can sell"
        );

        batchStates[batchId] = BatchState.SOLD;
        emit BatchSold(batchId, msg.sender);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getBatchTransitHistory(uint256 batchId) external view returns (bytes32[] memory) {
        return batches[batchId].transitHistory;
    }

    function totalBatches() external view returns (uint256) {
        return _currentBatchId;
    }
}
