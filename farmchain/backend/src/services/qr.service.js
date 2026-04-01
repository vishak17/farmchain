const QRCode = require('qrcode');
const crypto = require('crypto');

class QRService {
  generateChecksum(batchId) {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    return crypto.createHmac('sha256', secret).update(batchId).digest('hex').slice(0, 8);
  }

  async generateBatchQR(batchId) {
    const checksum = this.generateChecksum(batchId);
    const payloadObj = {
      batchId,
      v: 'farmchain-v1',
      t: Date.now(),
      c: checksum
    };
    
    const payload = JSON.stringify(payloadObj);
    const dataURL = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'H', width: 300 });
    
    return { dataURL, payload, checksum };
  }

  verifyQRPayload(payloadString) {
    try {
      const payload = JSON.parse(payloadString);
      
      if (!payload.batchId || !payload.c) {
        return { valid: false, batchId: null, error: 'Invalid payload format' };
      }
      
      const expectedChecksum = this.generateChecksum(payload.batchId);
      
      if (payload.c !== expectedChecksum) {
        return { valid: false, batchId: null, error: 'Checksum mismatch (Possible forgery)' };
      }
      
      return { valid: true, batchId: payload.batchId, error: null };
    } catch (err) {
      return { valid: false, batchId: null, error: 'Invalid JSON payload' };
    }
  }
}

module.exports = new QRService();
