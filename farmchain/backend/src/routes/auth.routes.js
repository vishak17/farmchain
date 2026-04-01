const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash -walletPrivateKey');
  res.json(user);
}));

module.exports = router;
