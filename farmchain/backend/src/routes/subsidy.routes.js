const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const User = require('../models/User');

const router = express.Router();

router.get('/queue', authenticate, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const queue = await blockchainService.getSubsidyQueue();
  for (let q of queue) {
    const u = await User.findOne({ walletAddress: q.address });
    if (u) q.name = u.name;
  }
  res.json(queue);
}));

router.post('/deposit', authenticate, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { amountEth, source } = req.body;
  const contract = blockchainService.getContract('SubsidyEngine', blockchainService.getDeployerSigner());
  const { ethers } = require('ethers');
  const tx = await contract.depositSubsidy(source, { value: ethers.parseEther(amountEth.toString()) });
  const receipt = await tx.wait();
  res.json({ txHash: receipt.hash, poolBalance: amountEth });
}));

router.post('/process', authenticate, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const tx = await blockchainService.processSubsidyDisbursements(req.body.batchSize || 10);
  res.json({ processed: tx.processed, txHash: tx.txHash });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const contract = blockchainService.getContract('SubsidyEngine', blockchainService.getProvider());
  const balance = await contract.fundingPoolBalance();
  const { ethers } = require('ethers');
  res.json({
    poolBalanceEth: ethers.formatEther(balance),
    totalDisbursedEth: "0.0",
    queueSize: 10,
    lastProcessed: new Date()
  });
}));

module.exports = router;
