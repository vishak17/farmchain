import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Smartphone } from 'lucide-react';

export default function ScanBadge() {
  const [batchId, setBatchId] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (batchId.trim()) {
      navigate(`/trace/${batchId.trim()}`);
    }
  };

  const simulateScan = () => {
    // Autopopulate the test ID from deploy.js seed
    setBatchId('BATCH-KA-2024-00001');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-farm-green/10 text-farm-green mb-6">
          <QrCode size={40} />
        </div>
        <h1 className="text-4xl font-bold text-farm-text mb-4">Scan Produce Badge</h1>
        <p className="text-farm-muted text-lg">
          Verify the origin, quality, and complete journey of your food directly from the FarmChain blockchain network.
        </p>
      </div>

      <div className="card p-8 border-farm-green/30 shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)]">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-farm-muted uppercase tracking-wider mb-2">
              Enter Produce Batch ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-farm-muted">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="e.g. BATCH-KA-2024-00001"
                className="input pl-12 h-16 text-lg font-mono placeholder:font-sans"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary h-16 text-lg font-bold tracking-wide mt-2">
             Verify on Blockchain
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-farm-border text-center">
          <p className="text-sm text-farm-muted mb-4">Or simulate scanning a QR code with your phone</p>
          <button 
             onClick={simulateScan}
             className="btn-ghost w-full flex items-center justify-center gap-2"
          >
             <Smartphone size={20} /> Simulate QR Scan (Test Batch)
          </button>
        </div>
      </div>
    </div>
  );
}
