/**
 * solana.js — Solana devnet utility service
 *
 * Extracted from farm-chain-chronicles-main/src/lib/solana.ts.
 * Provides lightweight Solana Memo Program transactions for logging
 * supply-chain events on Solana Devnet without a custom program.
 *
 * Use Cases:
 *  - Parallel blockchain audit trail alongside the primary EVM contracts
 *  - Immutable, timestamped event logs on Solana Devnet
 *  - Demo / hackathon dual-chain proof of concept
 *
 * Prerequisites (install in frontend):
 *   npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-phantom
 *
 * Usage example:
 *   import { trackProduce, getExplorerUrl } from '../services/solana';
 *   const sig = await trackProduce(publicKey, sendTransaction, { crop: 'tomato', weight: 5000, location: 'Tumkur' });
 *   console.log('Explorer:', getExplorerUrl(sig));
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from '@solana/web3.js';

// ── Solana Memo Program (official, always available on all clusters) ───────
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ── Devnet connection (confirmed commitment) ───────────────────────────────
export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a Transaction that writes a JSON memo to Solana.
 * @param {PublicKey} payer    - Wallet public key (signer)
 * @param {string}    type     - Event type string, e.g. "REGISTER_FARMER"
 * @param {object}    data     - Arbitrary JSON payload
 * @returns {Transaction}
 */
function buildMemoTx(payer, type, data) {
  const payload = JSON.stringify({ type, ...data, ts: Date.now() });

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys:      [{ pubkey: payer, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data:      Buffer.from(payload),
    })
  );

  return tx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a farmer registration event on Solana Devnet.
 * @param {PublicKey} payer
 * @param {Function}  sendTransaction  - From useWallet() hook
 * @param {string}    farmerName
 * @returns {Promise<string>} Transaction signature
 */
export async function registerFarmer(payer, sendTransaction, farmerName) {
  const tx  = buildMemoTx(payer, 'REGISTER_FARMER', { name: farmerName });
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

/**
 * Log a retailer registration event on Solana Devnet.
 * @param {PublicKey} payer
 * @param {Function}  sendTransaction
 * @param {string}    retailerName
 * @returns {Promise<string>} Transaction signature
 */
export async function registerRetailer(payer, sendTransaction, retailerName) {
  const tx  = buildMemoTx(payer, 'REGISTER_RETAILER', { name: retailerName });
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

/**
 * Log a produce tracking event on Solana Devnet.
 * @param {PublicKey} payer
 * @param {Function}  sendTransaction
 * @param {{ crop: string, weight: number, location: string }} produceData
 * @returns {Promise<string>} Transaction signature
 */
export async function trackProduce(payer, sendTransaction, produceData) {
  const tx  = buildMemoTx(payer, 'TRACK_PRODUCE', produceData);
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

/**
 * Log a custody transfer event on Solana Devnet.
 * @param {PublicKey} payer
 * @param {Function}  sendTransaction
 * @param {{ batchId: string, from: string, to: string, frs: number }} custodyData
 * @returns {Promise<string>} Transaction signature
 */
export async function logCustodyTransfer(payer, sendTransaction, custodyData) {
  const tx  = buildMemoTx(payer, 'CUSTODY_TRANSFER', custodyData);
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

/**
 * Log a batch mint event on Solana Devnet.
 * @param {PublicKey} payer
 * @param {Function}  sendTransaction
 * @param {{ batchId: string, produceType: string, weightGrams: number }} batchData
 * @returns {Promise<string>} Transaction signature
 */
export async function logBatchMint(payer, sendTransaction, batchData) {
  const tx  = buildMemoTx(payer, 'BATCH_MINT', batchData);
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

/**
 * Get Solana Devnet explorer URL for a transaction.
 * @param {string} signature
 * @returns {string}
 */
export function getExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

/**
 * Get Solscan URL (alternative explorer) for a transaction.
 * @param {string} signature
 * @returns {string}
 */
export function getSolscanUrl(signature) {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export default {
  connection,
  registerFarmer,
  registerRetailer,
  trackProduce,
  logCustodyTransfer,
  logBatchMint,
  getExplorerUrl,
  getSolscanUrl,
};
