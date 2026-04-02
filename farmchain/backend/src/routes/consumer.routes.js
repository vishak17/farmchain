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

router.post('/report/:batchId', asyncHandler(async (req, res) => {
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

router.post('/funding/:requestId/invest', asyncHandler(async (req, res) => {
  // Use demo consumer wallet
  const uId = req.body.walletAddress || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const tx = await blockchainService.fundFarmer(req.params.requestId, req.body.amountWei, null);
  res.json({ txHash: tx.txHash, contribution: req.body.amountWei, equityPercent: 10 });
}));

router.get('/investments', asyncHandler(async (req, res) => {
  // Demo consumer
  const uId = req.query.wallet || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  
  // Call FundingContracts to get investor's portfolio IDs
  const contract = blockchainService.getContract('FundingContracts', blockchainService.getDeployerSigner());
  const requestIds = await contract.investorPortfolio(uId);

  const investments = [];
  for (let id of requestIds) {
    const reqData = await contract.getRequest(id);
    const contribution = await contract.getContribution(id, user.walletAddress);
    investments.push({
      requestId: id.toString(),
      cropType: reqData.cropType,
      status: Number(reqData.status),
      totalFundedWei: reqData.totalFundedWei.toString(),
      equityPercent: Number(reqData.equityPercent),
      userContributionWei: contribution.toString(),
      season: reqData.season.toString()
    });
  }

  res.json(investments);
}));

router.get('/:wallet/investments', asyncHandler(async (req, res) => {
  const wallet = req.params.wallet;
  
  // Call FundingContracts to get investor's portfolio IDs
  const contract = blockchainService.getContract('FundingContracts', blockchainService.getDeployerSigner());
  const requestIds = await contract.investorPortfolio(wallet);

  const investments = [];
  for (let id of requestIds) {
    const reqData = await contract.getRequest(id);
    const contribution = await contract.getContribution(id, wallet);
    investments.push({
      requestId: id.toString(),
      cropType: reqData.cropType,
      status: Number(reqData.status),
      totalFundedWei: reqData.totalFundedWei.toString(),
      equityPercent: Number(reqData.equityPercent),
      userContributionWei: contribution.toString(),
      season: reqData.season.toString()
    });
  }

  res.json(investments);
}));

module.exports = router;
