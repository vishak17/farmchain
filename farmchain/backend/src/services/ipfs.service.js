const crypto = require('crypto');
const axios = require('axios');

class IPFSService {
  async pinJSON(data) {
    if (process.env.IPFS_MOCK === 'true' || !process.env.PINATA_API_KEY) {
      const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const mockCID = 'Qm' + hash.substring(0, 44);
      return { 
        hash: mockCID, 
        url: `https://ipfs.io/ipfs/${mockCID}` 
      };
    }
    
    // Real Pinata logic
    const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', data, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
      }
    });
    return {
      hash: res.data.IpfsHash,
      url: `https://ipfs.io/ipfs/${res.data.IpfsHash}`
    };
  }

  async pinFile(filePath) {
    if (process.env.IPFS_MOCK === 'true' || !process.env.PINATA_API_KEY) {
      const hash = crypto.createHash('sha256').update(filePath + Date.now()).digest('hex');
      const mockCID = 'Qm' + hash.substring(0, 44);
      return { 
        hash: mockCID, 
        url: `https://ipfs.io/ipfs/${mockCID}` 
      };
    }
    // Simplification for real file upload logic (would use form-data)
    throw new Error("Real IPFS file pin requires form-data module and stream processing");
  }

  getURL(hash) {
    return `https://ipfs.io/ipfs/${hash}`;
  }
}

module.exports = new IPFSService();
