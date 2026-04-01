const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const OffChainBatch = require('../models/OffChainBatch');
const netSim = require('../simulators/NetworkSimulator');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  const totalBatches = await OffChainBatch.countDocuments();
  const inv = await blockchainService.getNetworkInventory('tomato');
  res.json({
    totalBatches,
    frsDistribution: { A: 10, B: 5, C: 2 },
    activeDisputesCount: 1,
    subsidyPool: '10.0 ETH', 
    networkInventory: { tomato: inv }
  });
}));

router.get('/bad-actors', asyncHandler(async (req, res) => {
  res.json([]);
}));

router.post('/blacklist', asyncHandler(async (req, res) => {
  // Use FarmerRegistry contract to globally block nodes based on walletAddress
  const contract = blockchainService.getContract('FarmerRegistry', blockchainService.getDeployerSigner());
  const tx = await contract.blacklistFarmer(req.body.walletAddress);
  const receipt = await tx.wait();
  res.json({ txHash: receipt.hash });
}));

router.get('/simulation-status', asyncHandler(async (req, res) => {
  res.json(netSim.getStatus());
}));

router.post('/simulation/trigger', asyncHandler(async (req, res) => {
  await netSim.tick();
  res.json({ result: "Tick executed manually" });
}));

module.exports = router;
