/**
 * walletAuth.js — MetaMask wallet authentication service
 *
 * Provides connectAndSignIn(role) which:
 *  1. Connects to MetaMask (requests accounts)
 *  2. Checks if this address is already registered with a different role (early warning)
 *  3. Has the user sign a timestamped challenge message (proves key ownership)
 *  4. Sends { walletAddress, role, message, signature } to POST /auth/wallet-login
 *  5. Returns { token, user } — same shape as regular login, works with authStore.setAuth()
 *
 * Role lock guarantee:
 *  - Once an address is registered with a role, the backend REJECTS any future
 *    wallet-login call that uses the same address with a different role.
 *  - The FarmChainRegistry smart contract also records the binding on-chain.
 */

import api from './api';

// ─── Internal helpers ────────────────────────────────────────────────────────

function assertMetaMask() {
  if (!window.ethereum) {
    throw new Error(
      'No Ethereum wallet detected. Please install MetaMask (metamask.io) and refresh.'
    );
  }
}

/**
 * Request MetaMask to switch to the Hardhat local network.
 * Silently succeeds if the user is already on the right chain.
 */
async function ensureLocalNetwork() {
  const CHAIN_ID_HEX = '0x7A69'; // 31337

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      // Chain not added yet — add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: 'FarmChain Localnet',
          rpcUrls: ['http://127.0.0.1:8545'],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        }],
      });
    } else if (err.code !== 4001) {
      // 4001 = user rejected switch, we continue anyway on whatever chain they're on
      console.warn('[walletAuth] Chain switch warning:', err.message);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether a wallet address is already registered and which role it's locked to.
 * Call this BEFORE asking for a signature to give fast user feedback.
 *
 * @param {string} address   Ethereum address (checksummed or lowercase)
 * @returns {{ registered: boolean, role?: string, lockedAt?: string }}
 */
export async function checkWalletRegistration(address) {
  try {
    const { data } = await api.get(`/auth/wallet-check?address=${address.toLowerCase()}`);
    return data;
  } catch {
    return { registered: false };
  }
}

/**
 * Connect MetaMask, sign a challenge, and log in (or register) with the given role.
 *
 * @param {'FARMER'|'CONSUMER'|'RETAILER'|'MIDDLEMAN'|'ADMIN'} role
 * @returns {Promise<{ token: string, user: object }>}
 * @throws Error describing why the connection failed
 */
export async function connectAndSignIn(role) {
  assertMetaMask();

  // ── Step 1: Connect wallet ──────────────────────────────────────────────
  await ensureLocalNetwork();

  let accounts;
  try {
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (err) {
    if (err.code === 4001) throw new Error('Wallet connection rejected by user.');
    throw err;
  }

  const walletAddress = accounts[0];
  if (!walletAddress) throw new Error('No account returned from wallet.');

  // ── Step 2: Early role-lock check (no signature needed yet) ────────────
  const existing = await checkWalletRegistration(walletAddress);
  if (existing.registered && existing.role !== role) {
    throw new Error(
      `This wallet is permanently bound to the role "${existing.role}". ` +
      `You cannot log in as ${role} with this address.`
    );
  }

  // ── Step 3: Sign challenge message ─────────────────────────────────────
  // Timestamped nonce prevents replay attacks (backend enforces 5-min window)
  const message = `FarmChain wallet login nonce:${Date.now()}\nRole: ${role}\nAddress: ${walletAddress}`;

  let signature;
  try {
    signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    });
  } catch (err) {
    if (err.code === 4001) throw new Error('Signature rejected. Login cancelled.');
    throw err;
  }

  // ── Step 4: Authenticate with backend ──────────────────────────────────
  const { data } = await api.post('/auth/wallet-login', {
    walletAddress,
    role,
    message,
    signature,
  });

  return data; // { token, user: { id, name, role, walletAddress, roleLockedAt } }
}

/**
 * Get the currently connected MetaMask account without prompting.
 * Returns null if MetaMask is not installed or no account is connected.
 */
export async function getConnectedAccount() {
  if (!window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch {
    return null;
  }
}

export default { connectAndSignIn, checkWalletRegistration, getConnectedAccount };
