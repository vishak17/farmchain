const express = require('express');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const User = require('../models/User');

const router = express.Router();

router.get('/trace/:batchId', asyncHandler(async (req, res) => {
  const batch = await blockchainService.getBatch(req.params.batchId);
  const chain = await blockchainService.getCustodyChain(req.params.batchId);
  
  // Enrich pipeline (attach profile nodes to on-chain signatures)
  for (let record of chain) {
    const u = await User.findOne({ walletAddress: record.nodeWallet });
    if (u) record.nodeUser = u.name;
  }

  res.json({ batch, chain });
}));

router.post('/report/:batchId', authenticate, requireRole('CONSUMER'), asyncHandler(async (req, res) => {
  const { issueType, description, purchaseDate } = req.body;
  // Enum 3 maps to CONSUMER_REPORT in DisputeEngine on-chain
  const tx = await blockchainService.createDispute(
    req.params.batchId, 
    "0x0000000000000000000000000000000000000000", 
    3, 
    JSON.stringify({ issueType, description, purchaseDate })
  );
  
  res.json({ reportId: tx.disputeId, message: "Report filed successfully", tx });
}));

router.get('/funding/marketplace', optionalAuth, asyncHandler(async (req, res) => {
  // Temporary proxy response (usually scanned through The Graph indexer)
  res.json([{ requestId: 1, crop: "Tomato", target: 50000, farmer: "Raju Kumar" }]);
}));

router.post('/funding/:requestId/invest', authenticate, requireRole('CONSUMER'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const tx = await blockchainService.fundFarmer(req.params.requestId, req.body.amountWei, user.walletPrivateKey);
  res.json({ txHash: tx.txHash, contribution: req.body.amountWei, equityPercent: 10 });
}));

module.exports = router;
