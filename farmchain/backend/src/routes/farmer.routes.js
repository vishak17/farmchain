const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const sensorSim = require('../simulators/SensorSimulator');
const qrService = require('../services/qr.service');
const OffChainBatch = require('../models/OffChainBatch');
const User = require('../models/User');

const router = express.Router();

router.post('/register-produce', asyncHandler(async (req, res) => {
  const { produceType, weightGrams, count, gpsLocation, harvestDate, specialNotes } = req.body;
  // Use demo farmer
  const uId = req.body.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const pKey = req.body.privateKey || null;

  // Derive enum class logic from SensorSimulator constraints
  const categoryLabel = sensorSim.getCategory(produceType);
  const catEnum = categoryLabel === 'STANDARD' ? 0 : (categoryLabel === 'HIGH_SENSITIVITY' ? 1 : 2);

  // Write on-chain root batch
  const tx = await blockchainService.createBatch({
    produceType,
    category: catEnum,
    originWeightGrams: weightGrams,
    originCount: count || 0,
    originGPS: gpsLocation || '0,0',
    ipfsVisualHash: specialNotes || 'N/A',
    nodeName: req.body.farmerName || "Demo Farmer"
  }, pKey);

  // Generate Immutable QR Identity
  const qr = await qrService.generateBatchQR(tx.batchId);

  // Synchronize with off-chain aggregation layer
  await OffChainBatch.create({
    batchId: tx.batchId,
    farmerWallet: uId,
    farmerName: req.body.farmerName || "Demo Farmer",
    produceType,
    category: categoryLabel,
    currentFRS: 100,
    currentGrade: 'A+',
    originWeightGrams: weightGrams,
    harvestTimestamp: harvestDate || new Date(),
    pdeeTimestamp: tx.pdeeTimestamp,
    tags: [produceType, categoryLabel, req.body.farmerName || "Demo Farmer"]
  });

  // Example WebSocket injection structure
  // req.app.get('networkSim').broadcast('BATCH_CREATED', { batchId: tx.batchId });

  res.status(201).json({
    batchId: tx.batchId,
    qrCode: qr.dataURL,
    pdeeTimestamp: tx.pdeeTimestamp,
    initialFRS: 100,
    category: categoryLabel,
    grade: 'A+'
  });
}));

router.post('/funding/create', asyncHandler(async (req, res) => {
  const { cropType, landAreaCents, inputRequiredWei, estimatedYieldKg, equityPercent } = req.body;
  const pKey = req.body.privateKey || null;
  const tx = await blockchainService.createFundingRequest({ cropType, landAreaCents, inputRequiredWei, estimatedYieldKg, equityPercent }, pKey);
  res.json({ requestId: tx.requestId, txHash: tx.txHash });
}));

router.post('/funding/:requestId/settle', asyncHandler(async (req, res) => {
  const pKey = req.body.privateKey || null;
  const tx = await blockchainService.settleHarvest(req.params.requestId, req.body.saleAmountWei, pKey);
  res.json({ txHash: tx.txHash });
}));

router.get('/batches', asyncHandler(async (req, res) => {
  const uId = req.query.wallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const batches = await OffChainBatch.find({ farmerWallet: uId }).sort({ lastUpdated: -1 });
  res.json(batches);
}));

router.get('/batches/:batchId', asyncHandler(async (req, res) => {
  const bcBatch = await blockchainService.getBatch(req.params.batchId);
  const dbBatch = await OffChainBatch.findOne({ batchId: req.params.batchId });
  res.json({ ...bcBatch, ...dbBatch?._doc });
}));

router.get('/insurance-pool', asyncHandler(async (req, res) => {
  const uId = req.query.wallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const farmerContract = blockchainService.getContract('FarmerRegistry', blockchainService.getDeployerSigner());
  const farmerData = await farmerContract.getFarmer(uId);
  
  res.json({
    poolBalanceWei: farmerData.insurancePoolWei.toString(),
    poolBalanceEth: (Number(farmerData.insurancePoolWei) / 1e18).toString(),
    transactions: [] 
  });
}));

router.get('/:wallet/batches', asyncHandler(async (req, res) => {
  const wallet = req.params.wallet;
  const contract = blockchainService.getContract('BatchRegistry', blockchainService.getDeployerSigner());
  // getBatchesByFarmer should exist in the Solidity contract even if not heavily used
  const batchIds = await contract.getBatchesByFarmer(wallet);
  
  const batches = [];
  for (let id of batchIds) {
    const batch = await blockchainService.getBatch(id.toString());
    if (batch) {
      batches.push({
        batchId: batch.batchId,
        produceType: batch.produceType,
        currentFRS: batch.currentFRS,
        category: batch.category,
        isExpired: batch.isExpired,
        currentGrade: batch.currentGrade
      });
    }
  }
  res.json(batches);
}));

router.get('/:wallet/insurance', asyncHandler(async (req, res) => {
  const wallet = req.params.wallet;
  const farmerContract = blockchainService.getContract('FarmerRegistry', blockchainService.getDeployerSigner());
  const subsidyContract = blockchainService.getContract('SubsidyEngine', blockchainService.getDeployerSigner());
  const { ethers } = require('ethers');

  const farmerData = await farmerContract.getFarmer(wallet);
  const totalReceivedWei = await subsidyContract.totalReceived(wallet);

  res.json({
    insuranceBalanceEth: ethers.formatEther(farmerData.insurancePoolWei || 0n),
    reputationScore: Number(farmerData.reputationScore || 0n),
    totalReceivedEth: ethers.formatEther(totalReceivedWei || 0n)
  });
}));

module.exports = router;
