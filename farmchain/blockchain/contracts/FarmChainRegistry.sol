// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FarmChainRegistry
 * @notice Registers and verifies supply-chain participants (farmers, logistics, aggregators, retailers).
 *         ProduceBatch.sol depends on this contract to gate minting and custody transfers.
 * @dev Extracted from farm-chain-chronicles-main and integrated into FarmChain v2 blockchain layer.
 */
contract FarmChainRegistry is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum Role { FARMER, LOGISTICS, AGGREGATOR, RETAILER }

    struct Participant {
        address walletAddress;
        Role role;
        bytes32 locationHash;
        bool isVerified;
    }

    mapping(address => Participant) public participants;
    mapping(address => bool) public isRegistered;

    event ParticipantRegistered(address indexed walletAddress, Role role, bytes32 locationHash);
    event ParticipantVerified(address indexed walletAddress);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function registerParticipant(address _walletAddress, Role _role, bytes32 _locationHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!isRegistered[_walletAddress], "FarmChainRegistry: Participant already registered");
        
        participants[_walletAddress] = Participant({
            walletAddress: _walletAddress,
            role: _role,
            locationHash: _locationHash,
            isVerified: false
        });
        isRegistered[_walletAddress] = true;

        emit ParticipantRegistered(_walletAddress, _role, _locationHash);
    }

    function verifyParticipant(address _walletAddress) external onlyRole(VERIFIER_ROLE) {
        require(isRegistered[_walletAddress], "FarmChainRegistry: Participant not registered");
        require(!participants[_walletAddress].isVerified, "FarmChainRegistry: Already verified");

        participants[_walletAddress].isVerified = true;
        emit ParticipantVerified(_walletAddress);
    }

    function isVerifiedParticipant(address _address) public view returns (bool) {
        return isRegistered[_address] && participants[_address].isVerified;
    }

    function getParticipantRole(address _address) public view returns (Role) {
        require(isRegistered[_address], "FarmChainRegistry: Participant not registered");
        return participants[_address].role;
    }
}
