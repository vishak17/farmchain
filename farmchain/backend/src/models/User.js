const mongoose = require('mongoose');
const { ethers } = require('ethers');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['FARMER','TRANSPORTER','MIDDLEMAN','RETAILER','CONSUMER','ADMIN','PANEL_MEMBER'], 
    required: true 
  },
  walletAddress: { type: String },
  walletPrivateKey: { type: String },
  farmerId: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // ── Wallet Auth (MetaMask / WalletConnect) ─────────────────
  // The user's EXTERNAL wallet address they control (e.g. MetaMask).
  // Sparse + unique: once set, this address is permanently bound to this role.
  externalWalletAddress: { 
    type: String, 
    lowercase: true, 
    sparse: true,
    unique: true 
  },
  // Timestamp when the role was locked via wallet auth — immutable after first set
  roleLockedAt: { type: Date }
});

UserSchema.methods.generateWallet = function() {
  const wallet = ethers.Wallet.createRandom();
  this.walletAddress = wallet.address;
  this.walletPrivateKey = wallet.privateKey;
};

UserSchema.pre('save', async function() {
  if (!this.walletAddress) {
    this.generateWallet();
  }
});

module.exports = mongoose.model('User', UserSchema);
