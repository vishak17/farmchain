import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, MapPin, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import FRSGauge, { getGrade } from '../../components/shared/FRSGauge';
import { format } from 'date-fns';

export default function MyBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      // Hardcoded demo farmer wallet (Hardhat Account #1)
      const demoWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const res = await api.get(`/farmer/${demoWallet}/batches`);
      setBatches(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-farm-green">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-farm-text">My Registered Batches</h1>
          <p className="text-farm-muted mt-2">Track the freshness and custody of your produce on the blockchain.</p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="bg-farm-surface-2 p-12 text-center rounded-2xl border border-farm-border">
          <Package className="h-16 w-16 mx-auto text-farm-muted mb-4" />
          <h2 className="text-xl font-bold text-farm-text mb-2">No Batches Yet</h2>
          <p className="text-farm-muted">You haven't registered any produce batches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            const actualFrs = Number(batch.currentFRS) / 100;
            const grade = batch.currentGrade || 'N/A';
            const isGood = grade.startsWith('A') || grade === 'B';

            return (
              <div key={batch.batchId} className="card hover:border-farm-green transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Package size={80} />
                </div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-farm-text capitalize">{batch.produceType}</h3>
                    <p className="font-mono text-xs text-farm-muted mt-1">{batch.batchId}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest ${isGood ? 'bg-farm-green/10 text-farm-green' : 'bg-farm-amber/10 text-farm-amber'}`}>
                    {grade}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-farm-surface p-3 rounded-lg border border-farm-border">
                    <p className="text-xs text-farm-muted mb-1">Status</p>
                    <p className="font-bold text-farm-text capitalize">{batch.isExpired ? 'Expired' : 'Active'}</p>
                  </div>
                  <div className="bg-farm-surface p-3 rounded-lg border border-farm-border">
                    <p className="text-xs text-farm-muted mb-1">Origin Count</p>
                    <p className="font-bold text-farm-text">{batch.originCount || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6 text-sm text-farm-muted">
                  <ShieldCheck size={16} className="text-farm-green" />
                  <span>Blockchain Verified</span>
                </div>

                <div className="mt-auto border-t border-farm-border pt-4 -mx-6 px-6 bg-farm-surface-2/50 flex justify-between items-center relative">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 relative flex-shrink-0">
                         <div className="absolute inset-0 scale-[0.4] origin-top-left -top-2 -left-2">
                           <FRSGauge frs={actualFrs} category={batch.category === 0 ? 'STANDARD' : (batch.category === 1 ? 'HIGH_SENSITIVITY' : 'ROBUST')} size="sm" />
                         </div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold font-mono ${isGood ? 'text-farm-green' : 'text-farm-amber'}`}>
                          {actualFrs.toFixed(2)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-farm-muted">Current FRS</div>
                      </div>
                   </div>
                   <a href={`/consumer/scan?id=${batch.batchId}`} className="text-farm-green text-xs font-bold hover:underline">
                     View Custody
                   </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
