const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const sensorSim = require('../simulators/SensorSimulator');
const qrService = require('../services/qr.service');
const OffChainBatch = require('../models/OffChainBatch');
const User = require('../models/User');

const router = express.Router();

router.use(authenticate, requireRole('FARMER'));

router.post('/register-produce', asyncHandler(async (req, res) => {
  const { produceType, weightGrams, count, gpsLocation, harvestDate, specialNotes } = req.body;
  const user = await User.findById(req.user.id);

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
    nodeName: user.name
  }, user.walletPrivateKey);

  // Generate Immutable QR Identity
  const qr = await qrService.generateBatchQR(tx.batchId);

  // Synchronize with off-chain aggregation layer
  await OffChainBatch.create({
    batchId: tx.batchId,
    farmerWallet: user.walletAddress,
    farmerName: user.name,
    produceType,
    category: categoryLabel,
    currentFRS: 100,
    currentGrade: 'A+',
    originWeightGrams: weightGrams,
    harvestTimestamp: harvestDate || new Date(),
    pdeeTimestamp: tx.pdeeTimestamp,
    tags: [produceType, categoryLabel, user.name]
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

router.get('/batches', asyncHandler(async (req, res) => {
  const batches = await OffChainBatch.find({ farmerWallet: req.user.walletAddress }).sort({ lastUpdated: -1 });
  res.json(batches);
}));

router.get('/batches/:batchId', asyncHandler(async (req, res) => {
  const bcBatch = await blockchainService.getBatch(req.params.batchId);
  const dbBatch = await OffChainBatch.findOne({ batchId: req.params.batchId });
  res.json({ ...bcBatch, ...dbBatch?._doc });
}));

router.get('/insurance-pool', asyncHandler(async (req, res) => {
  const farmerContract = blockchainService.getContract('FarmerRegistry', blockchainService.getDeployerSigner());
  const farmerData = await farmerContract.getFarmer(req.user.walletAddress);
  
  res.json({
    poolBalanceWei: farmerData.insurancePoolWei.toString(),
    poolBalanceEth: (Number(farmerData.insurancePoolWei) / 1e18).toString(),
    transactions: [] 
  });
}));

module.exports = router;
