const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const blockchainService = require('../services/blockchain.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['FARMER','TRANSPORTER','MIDDLEMAN','RETAILER','CONSUMER','ADMIN','PANEL_MEMBER'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role, village, state } = req.body;

  let user = await User.findOne({ email });
  if (user) return res.status(400).json({ error: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  user = new User({ name, email, passwordHash, role, village, state });
  user.generateWallet(); 
  await user.save();

  if (role === 'FARMER') {
    try {
      const tx = await blockchainService.registerFarmer({
        name,
        village: village || 'Unknown',
        state: state || 'Unknown',
        gpsLocation: '0.0,0.0',
        incomeTier: 1,
        landHoldingsCents: 100,
        produceCategories: ['STANDARD']
      }, user.walletPrivateKey); // Sign transaction with user's auto-generated wallet
      
      user.farmerId = tx.farmerId;
      await user.save();
    } catch (err) {
      console.warn(`[Blockchain] Failed to register farmer on-chain: ${err.message}. User created locally.`);
    }
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, walletAddress: user.walletAddress }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  res.status(201).json({ token, user: { id: user._id, name, email, role, walletAddress: user.walletAddress } });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user._id, role: user.role, walletAddress: user.walletAddress }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  res.json({ token, user: { id: user._id, name: user.name, email, role: user.role, walletAddress: user.walletAddress } });
}));

// ── Wallet-based auth (MetaMask / WalletConnect) ─────────────────────────

/**
 * GET /auth/wallet-check?address=0x...
 * Quick lookup: tell the frontend whether this address is already registered
 * and which role it's locked to, so the UI can warn before asking for a signature.
 */
router.get('/wallet-check', asyncHandler(async (req, res) => {
  const address = (req.query.address || '').toLowerCase();
  if (!address) return res.status(400).json({ error: 'address query param required' });

  const user = await User.findOne({ externalWalletAddress: address }).select('role roleLockedAt name');
  if (!user) return res.json({ registered: false });

  res.json({
    registered: true,
    role: user.role,
    name: user.name,
    lockedAt: user.roleLockedAt
  });
}));

/**
 * POST /auth/wallet-login
 * Body: { walletAddress, role, message, signature }
 *
 * Flow:
 *  1. Verify signature — proves caller controls the private key for walletAddress
 *  2. If address already in DB → enforce role lock (cannot change roles)
 *  3. If new address → create user, register on FarmChainRegistry if applicable
 *  4. Return JWT
 */
router.post('/wallet-login', [
  body('walletAddress').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('role').isIn(['FARMER','CONSUMER','RETAILER','MIDDLEMAN','ADMIN','PANEL_MEMBER']).withMessage('Invalid role'),
  body('message').notEmpty().withMessage('Challenge message required'),
  body('signature').notEmpty().withMessage('Signature required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { walletAddress, role, message, signature } = req.body;

  // ── 1. Verify signature ───────────────────────────────────────────────────
  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch {
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Signature does not match wallet address. Connection rejected.' });
  }

  // ── 2. Check message freshness (prevent replay attacks) ──────────────────
  // Message format: "FarmChain login nonce:{timestamp}"
  const tsMatch = message.match(/nonce:(\d+)/);
  if (tsMatch) {
    const ts = parseInt(tsMatch[1], 10);
    if (Date.now() - ts > 5 * 60 * 1000) { // 5 min window
      return res.status(401).json({ error: 'Login challenge expired. Please try again.' });
    }
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // ── 3. Find or create user ────────────────────────────────────────────────
  let user = await User.findOne({ externalWalletAddress: normalizedAddress });

  if (user) {
    // ── ROLE LOCK: address already bound, reject if role mismatch ────────
    if (user.role !== role) {
      return res.status(403).json({
        error: `This wallet address is permanently bound to the role: ${user.role}. Roles cannot be changed once assigned.`,
        boundRole: user.role,
        lockedAt: user.roleLockedAt
      });
    }
    // Existing user — just re-issue JWT (no DB changes needed)
  } else {
    // ── NEW: create user account linked to this wallet ─────────────────
    const shortAddr = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
    const displayName = `${role.charAt(0) + role.slice(1).toLowerCase()} ${shortAddr}`;

    user = new User({
      name: displayName,
      email: `${normalizedAddress}@wallet.farmchain`,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 12), // random unusable password
      role,
      externalWalletAddress: normalizedAddress,
      walletAddress: walletAddress, // store their actual MetaMask address
      roleLockedAt: new Date(),
    });
    await user.save();

    // ── Register on FarmChainRegistry for supply-chain roles ───────────
    // FARMER=0, LOGISTICS=1, AGGREGATOR=2, RETAILER=3
    const roleToChainRole = { FARMER: 0, MIDDLEMAN: 1, RETAILER: 3 };
    if (roleToChainRole[role] !== undefined) {
      try {
        await blockchainService.registerOnChronicleRegistry(
          walletAddress,
          roleToChainRole[role]
        );
        console.log(`[WalletAuth] Registered ${walletAddress} as ${role} on FarmChainRegistry`);
      } catch (err) {
        // Non-fatal: user is created in DB; on-chain registration failed
        console.warn(`[WalletAuth] On-chain registry failed for ${walletAddress}: ${err.message}`);
      }
    }
  }

  // ── 4. Issue JWT ─────────────────────────────────────────────────────────
  const token = jwt.sign(
    { id: user._id, role: user.role, walletAddress: normalizedAddress },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      walletAddress: normalizedAddress,
      roleLockedAt: user.roleLockedAt
    }
  });
}));

module.exports = router;
