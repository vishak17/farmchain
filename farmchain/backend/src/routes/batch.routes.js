const express = require('express');
const axios = require('axios');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const sensorSim = require('../simulators/SensorSimulator');
const qrService = require('../services/qr.service');
const OffChainBatch = require('../models/OffChainBatch');
const User = require('../models/User');

const router = express.Router();

router.post('/custody-transfer', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role === 'CONSUMER') throw new AppError('Consumers cannot process custody transfers', 403);
  
  const { batchId, nodeName, sealStatus } = req.body;
  const user = await User.findById(req.user.id);
  const batch = await OffChainBatch.findOne({ batchId });
  
  if (!batch) throw new AppError('Batch not found', 404);

  // Derive enum node type from role
  let nodeType = 1; // MIDDLEMAN
  if (req.user.role === 'TRANSPORTER') nodeType = 2;
  if (req.user.role === 'RETAILER') nodeType = 3;

  // Predict decay window
  const hoursSince = Math.floor((Date.now() - new Date(batch.harvestTimestamp).getTime()) / 3600000) || 12;
  const payload = sensorSim.generateIoTPayload(batchId, nodeType, batch.produceType, batch.originWeightGrams, hoursSince, 0, 0);

  let aiAnalysis = null;
  if (process.env.AI_SERVICE_URL) {
    try {
      const FormData = require('form-data');
      const fd = new FormData();
      fd.append('request', JSON.stringify({
        batch_id: batchId,
        produce_type: batch.produceType,
        category: batch.category,
        declared_count: 100,
        declared_weight_grams: payload.weightGrams,
        node_type: nodeType,
        hours_since_harvest: hoursSince
      }));

      const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, fd, { headers: fd.getHeaders() });
      aiAnalysis = aiRes.data;
    } catch (err) {
      console.warn("AI Service unavailable or Error during request, skipping analysis.");
    }
  }

  // Push on chain
  const tx = await blockchainService.recordCustodyTransfer({
    batchId,
    currentWeightGrams: payload.weightGrams,
    nodeType,
    sealStatus: sealStatus === 'BROKEN' ? 1 : 0,
    ipfsVisualHash: aiAnalysis ? `AI-V:${aiAnalysis.confidence}` : 'N/A',
    nodeName: nodeName || user.name,
    gpsLocation: payload.gpsLocation
  }, user.walletPrivateKey);

  // Sync cache
  await OffChainBatch.findOneAndUpdate({ batchId }, {
    currentFRS: tx.newFRS ? tx.newFRS / 100 : batch.currentFRS,
    currentGrade: tx.grade,
    lastUpdated: new Date()
  });

  res.json({
    newFRS: tx.newFRS ? tx.newFRS / 100 : 0,
    grade: tx.grade,
    label: tx.label,
    sensorData: payload,
    aiAnalysis,
    alerts: tx.alerts,
    txHash: tx.txHash
  });
}));

router.get('/network/inventory', asyncHandler(async (req, res) => {
  const produce = req.query.produce || 'tomato';
  const data = await blockchainService.getNetworkInventory(produce);
  res.json({
    produceType: produce,
    totalWeightKg: data.totalWeightGrams / 1000,
    activeBatchCount: data.activeBatchCount,
    lastUpdated: new Date()
  });
}));

router.get('/:batchId', optionalAuth, asyncHandler(async (req, res) => {
  const batch = await blockchainService.getBatch(req.params.batchId);
  const dbBatch = await OffChainBatch.findOne({ batchId: req.params.batchId });
  res.json({ ...batch, ...dbBatch?._doc });
}));

router.get('/:batchId/qr', asyncHandler(async (req, res) => {
  const qr = await qrService.generateBatchQR(req.params.batchId);
  res.json({ dataURL: qr.dataURL, batchId: req.params.batchId });
}));

module.exports = router;
