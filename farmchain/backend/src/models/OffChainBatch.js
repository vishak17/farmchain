const mongoose = require('mongoose');

const OffChainBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  farmerWallet: { type: String, required: true, index: true },
  farmerName: { type: String },
  produceType: { type: String, required: true },
  category: { type: String, enum: ['STANDARD','HIGH_SENSITIVITY','HIGH_TOLERANCE'] },
  currentFRS: { type: Number },
  currentGrade: { type: String },
  originWeightGrams: { type: Number },
  isDisputed: { type: Boolean, default: false },
  isExpired: { type: Boolean, default: false },
  anomalyFlagged: { type: Boolean, default: false },
  custodyChainLength: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now },
  harvestTimestamp: { type: Date },
  pdeeTimestamp: { type: Date },
  tags: [String]
});

module.exports = mongoose.model('OffChainBatch', OffChainBatchSchema);
