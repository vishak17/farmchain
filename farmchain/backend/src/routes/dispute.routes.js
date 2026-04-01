const express = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchain.service');
const ipfsService = require('../services/ipfs.service');
const DisputeEvidence = require('../models/DisputeEvidence');
const User = require('../models/User');

const router = express.Router();
const upload = multer({ dest: 'uploads/evidence/' });

router.post('/create', authenticate, asyncHandler(async (req, res) => {
  const { batchId, disputeType, description } = req.body;
  const respondent = req.body.respondent || "0x0000000000000000000000000000000000000000";
  const typeEnum = disputeType === 'LOW_FRS' ? 0 : 1; 

  const tx = await blockchainService.createDispute(batchId, respondent, typeEnum, description);
  res.json({ disputeId: tx.disputeId });
}));

router.post('/:disputeId/evidence', authenticate, upload.single('evidence'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const pin = await ipfsService.pinFile(req.file.path);
  
  const tx = await blockchainService.submitEvidence(req.params.disputeId, pin.hash, user.walletPrivateKey);
  
  await DisputeEvidence.create({
    disputeId: req.params.disputeId,
    batchId: req.body.batchId,
    submittedBy: user.walletAddress,
    submitterRole: user.role,
    fileUrl: pin.url,
    ipfsHash: pin.hash,
    evidenceType: req.body.evidenceType || 'PHOTO',
    description: req.body.description
  });

  res.json({ ipfsHash: pin.hash, txHash: tx.txHash });
}));

router.post('/:disputeId/vote', authenticate, requireRole('PANEL_MEMBER'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const tx = await blockchainService.castVote(req.params.disputeId, req.body.vote, user.walletPrivateKey);
  res.json({ txHash: tx.txHash });
}));

router.post('/:disputeId/resolve', authenticate, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const tx = await blockchainService.resolveDispute(req.params.disputeId);
  res.json({ verdict: tx.verdict, txHash: tx.txHash });
}));

router.get('/open', authenticate, asyncHandler(async (req, res) => {
  res.json([1, 2, 3]); // Placeholder
}));

router.get('/:disputeId', asyncHandler(async (req, res) => {
  const dispute = { id: req.params.disputeId }; 
  const evidence = await DisputeEvidence.find({ disputeId: req.params.disputeId });
  res.json({ dispute, evidence });
}));

module.exports = router;
