/**
 * useBlockchain.js — React hook for EVM contract interactions
 *
 * Wraps blockchain.js to provide React state management for:
 *  - Wallet connection (MetaMask or dev wallet)
 *  - FarmChainRegistry + ProduceBatch contract instances
 *  - Transaction helpers
 *
 * Ported & adapted from farm-chain-chronicles-main/src/hooks/use-ethereum.ts
 *
 * Usage:
 *   const { account, connect, registry, produceBatch, mintBatch } = useBlockchain();
 */

import { useState, useCallback, useEffect } from 'react';
import {
  connectMetaMask,
  connectDevWallet,
  getContracts,
  getRegistryContract,
  getBatchContract,
  getContractAddresses,
} from '../services/blockchain';

export function useBlockchain() {
  const [account,      setAccount]      = useState(null);
  const [signer,       setSigner]       = useState(null);
  const [registry,     setRegistry]     = useState(null);
  const [produceBatch, setProduceBatch] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState(null);

  // ── Track MetaMask account changes ────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setSigner(null);
        setRegistry(null);
        setProduceBatch(null);
      } else {
        setAccount(accounts[0]);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }, []);

  // ── Re-initialise contracts when signer changes ──────────────────────────
  useEffect(() => {
    if (!signer) return;
    try {
      const { registry: reg, produceBatch: pb } = getContracts(signer);
      setRegistry(reg);
      setProduceBatch(pb);
    } catch (err) {
      console.warn('[useBlockchain] Could not initialise contracts:', err.message);
    }
  }, [signer]);

  // ── Connect via MetaMask ──────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { account: acc, signer: sig } = await connectMetaMask();
      setAccount(acc);
      setSigner(sig);
    } catch (err) {
      setError(err.message);
      console.error('[useBlockchain] connect error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Connect via dev wallet (Hardhat #0) ──────────────────────────────────
  const connectDev = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { account: acc, signer: sig } = await connectDevWallet();
      setAccount(acc);
      setSigner(sig);
    } catch (err) {
      setError(err.message);
      console.error('[useBlockchain] connectDev error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setRegistry(null);
    setProduceBatch(null);
  }, []);

  // ── High-level contract helpers ───────────────────────────────────────────

  /**
   * Mint a new ProduceBatch NFT.
   * @param {number} weightGrams
   * @param {number} itemCount
   * @param {string} produceType  e.g. "tomato"
   * @returns {Promise<{ txHash: string, batchId: number }>}
   */
  const mintBatch = useCallback(async (weightGrams, itemCount, produceType) => {
    if (!produceBatch) throw new Error('ProduceBatch contract not connected');
    const tx       = await produceBatch.mintBatch(weightGrams, itemCount, produceType);
    const receipt  = await tx.wait();

    // Parse BatchMinted event to get batchId
    const event    = receipt.logs
      .map(log => { try { return produceBatch.interface.parseLog(log); } catch { return null; } })
      .find(e => e?.name === 'BatchMinted');

    const batchId  = event ? Number(event.args.batchId) : null;
    return { txHash: receipt.hash, batchId };
  }, [produceBatch]);

  /**
   * Initiate a custody transfer.
   * @param {number} batchId
   * @param {string} receiverAddress  Must be registered in FarmChainRegistry
   * @returns {Promise<string>} txHash
   */
  const transferCustody = useCallback(async (batchId, receiverAddress) => {
    if (!produceBatch) throw new Error('ProduceBatch contract not connected');
    const tx      = await produceBatch.transferCustody(batchId, receiverAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }, [produceBatch]);

  /**
   * Accept a pending custody transfer.
   * @param {number} batchId
   * @param {string} arrivalHash  32-byte hex string (FRS/IPFS hash)
   * @returns {Promise<string>} txHash
   */
  const acceptCustody = useCallback(async (batchId, arrivalHash) => {
    if (!produceBatch) throw new Error('ProduceBatch contract not connected');
    const hash32  = arrivalHash.startsWith('0x') ? arrivalHash : '0x' + arrivalHash;
    const padded  = hash32.padEnd(66, '0'); // pad to bytes32
    const tx      = await produceBatch.acceptCustody(batchId, padded);
    const receipt = await tx.wait();
    return receipt.hash;
  }, [produceBatch]);

  /**
   * Register a supply-chain participant in FarmChainRegistry.
   * Role: 0=FARMER, 1=LOGISTICS, 2=AGGREGATOR, 3=RETAILER
   * @param {string} walletAddress
   * @param {0|1|2|3} role
   * @param {string} locationName  Gets keccak256-hashed on chain
   * @returns {Promise<string>} txHash
   */
  const registerParticipant = useCallback(async (walletAddress, role, locationName) => {
    if (!registry) throw new Error('FarmChainRegistry contract not connected');
    const { ethers } = await import('ethers');
    const locationHash = ethers.encodeBytes32String(locationName.slice(0, 31));
    const tx           = await registry.registerParticipant(walletAddress, role, locationHash);
    const receipt      = await tx.wait();
    return receipt.hash;
  }, [registry]);

  /**
   * Verify a participant (requires VERIFIER_ROLE or DEFAULT_ADMIN_ROLE).
   * @param {string} walletAddress
   * @returns {Promise<string>} txHash
   */
  const verifyParticipant = useCallback(async (walletAddress) => {
    if (!registry) throw new Error('FarmChainRegistry contract not connected');
    const tx      = await registry.verifyParticipant(walletAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }, [registry]);

  // ── Read-only helpers (no connected signer required) ─────────────────────

  const isVerified = useCallback(async (address) => {
    const reg = getRegistryContract();
    if (!reg) return false;
    return reg.isVerifiedParticipant(address);
  }, []);

  const getBatchInfo = useCallback(async (batchId) => {
    const pb = getBatchContract();
    if (!pb) return null;
    const [batch, state] = await Promise.all([
      pb.batches(batchId),
      pb.batchStates(batchId),
    ]);
    return {
      batchId:     Number(batch.batchId),
      owner:       batch.currentOwner,
      weightGrams: Number(batch.wOrigin),
      itemCount:   Number(batch.nItems),
      produceType: batch.produceType,
      harvestDate: new Date(Number(batch.harvestDate) * 1000),
      state:       ['HARVESTED', 'IN_TRANSIT', 'AGGREGATED', 'RETAIL_ARRIVED', 'SOLD'][state] ?? 'UNKNOWN',
    };
  }, []);

  return {
    // State
    account,
    isConnecting,
    isConnected: !!account,
    error,
    // Contracts (raw ethers.Contract instances)
    registry,
    produceBatch,
    // Connection
    connect,
    connectDev,
    disconnect,
    // Write helpers
    mintBatch,
    transferCustody,
    acceptCustody,
    registerParticipant,
    verifyParticipant,
    // Read helpers
    isVerified,
    getBatchInfo,
    // Metadata
    addresses: getContractAddresses(),
  };
}

export default useBlockchain;
