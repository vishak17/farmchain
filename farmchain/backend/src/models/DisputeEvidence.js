const mongoose = require('mongoose');

const DisputeEvidenceSchema = new mongoose.Schema({
  disputeId: { type: Number, required: true },
  batchId: { type: String, required: true },
  submittedBy: { type: String },
  submitterRole: { type: String },
  fileUrl: { type: String },
  ipfsHash: { type: String },
  evidenceType: { type: String, enum: ['PHOTO','TEMPERATURE_LOG','SEAL_PHOTO','STATEMENT'] },
  description: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisputeEvidence', DisputeEvidenceSchema);
