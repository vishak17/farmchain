import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CircleDollarSign, Sprout, TrendingUp, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

export default function MyInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      // Hardcoded demo consumer wallet (Hardhat Account #2)
      const demoWallet = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      const res = await api.get(`/consumer/${demoWallet}/investments`);
      setInvestments(res.data);
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

  // Calculate totals
  const totalEth = investments.reduce((sum, inv) => sum + (Number(inv.userContributionWei) / 1e18), 0);
  const activeCount = investments.filter(inv => inv.status === 1 || inv.status === 2).length;
  const settledCount = investments.filter(inv => inv.status === 3).length;

  const STATUS_MAP = {
    0: { label: 'FUNDING OPEN', color: 'text-farm-amber', bg: 'bg-farm-amber/10', border: 'border-farm-amber/30' },
    1: { label: 'FUNDED', color: 'text-farm-green', bg: 'bg-farm-green/10', border: 'border-farm-green/30' },
    2: { label: 'ACTIVE SEASON', color: 'text-farm-green', bg: 'bg-farm-green/10', border: 'border-farm-green/30' },
    3: { label: 'SETTLED', color: 'text-farm-muted', bg: 'bg-farm-surface-3', border: 'border-farm-border' },
    4: { label: 'FAILED', color: 'text-farm-red', bg: 'bg-farm-red/10', border: 'border-farm-red/30' }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold text-farm-text">My Agricultural Portfolio</h1>
          <p className="text-farm-muted mt-2 text-lg">Direct financing to farmers via Smart Contracts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="card border-farm-green/30 bg-gradient-to-br from-farm-surface to-farm-green/5 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 text-farm-green -mb-4 -mr-4">
            <CircleDollarSign size={120} />
          </div>
          <p className="text-farm-muted font-bold tracking-widest text-sm uppercase mb-2">Total Invested</p>
          <div className="text-5xl font-mono font-bold text-farm-text">
            {totalEth.toFixed(3)} <span className="text-xl text-farm-green">ETH</span>
          </div>
        </div>
        
        <div className="card relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 text-white -mb-4 -mr-4">
            <Sprout size={120} />
          </div>
          <p className="text-farm-muted font-bold tracking-widest text-sm uppercase mb-2">Active Crops</p>
          <div className="text-5xl font-mono font-bold text-farm-text">{activeCount}</div>
        </div>
        
        <div className="card relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 text-farm-muted -mb-4 -mr-4">
            <Scale size={120} />
          </div>
          <p className="text-farm-muted font-bold tracking-widest text-sm uppercase mb-2">Yields Settled</p>
          <div className="text-5xl font-mono font-bold text-farm-text">{settledCount}</div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-farm-text mb-6">Investment History</h2>

      {investments.length === 0 ? (
        <div className="card p-16 text-center border-dashed">
          <Sprout size={64} className="mx-auto text-farm-muted mb-6 opacity-30" />
          <h3 className="text-2xl font-bold text-farm-text mb-2">No Active Investments</h3>
          <p className="text-farm-muted max-w-md mx-auto mb-8">
            You haven't funded any agricultural seasons yet. Head to the matching portal to find farmers needing capital.
          </p>
          <button className="btn-primary" onClick={() => window.location.href = '/consumer/fund'}>
            Explore Funding Opportunities
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {investments.map((inv, idx) => {
            const uiStatus = STATUS_MAP[inv.status] || STATUS_MAP[4];
            const contributionEth = (Number(inv.userContributionWei) / 1e18).toFixed(3);
            
            return (
              <div key={idx} className="card relative transition-all hover:border-farm-green">
                <div className="flex justify-between items-start mb-6 border-b border-farm-border pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-farm-text capitalize flex items-center gap-2">
                       {inv.cropType} Season {inv.season}
                    </h3>
                    <p className="font-mono text-xs text-farm-muted mt-1 uppercase tracking-widest">
                       Contract ID: #{inv.requestId}
                    </p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-xs font-bold font-mono tracking-widest border ${uiStatus.bg} ${uiStatus.color} ${uiStatus.border}`}>
                    {uiStatus.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#0B1121] p-4 rounded-lg">
                    <p className="text-xs text-farm-muted uppercase tracking-widest mb-1 flex items-center gap-1">
                      <CircleDollarSign size={14}/> Initial Capital
                    </p>
                    <p className="font-bold font-mono text-farm-text text-xl">{contributionEth} ETH</p>
                  </div>
                  <div className="bg-[#0B1121] p-4 rounded-lg">
                    <p className="text-xs text-farm-muted uppercase tracking-widest mb-1 flex items-center gap-1">
                      <TrendingUp size={14}/> Equity Share
                    </p>
                    <p className="font-bold font-mono text-farm-text text-xl">{inv.equityPercent}%</p>
                  </div>
                </div>

                {inv.status === 2 && (
                  <div className="mt-4 bg-farm-green/10 text-farm-green border border-farm-green/30 p-4 rounded-lg flex items-center gap-3">
                     <CheckCircle2 size={24} className="flex-shrink-0" />
                     <div>
                       <p className="font-bold font-display text-sm">Crop successfully growing!</p>
                       <p className="text-xs opacity-80">Smart contract locked. Payout scheduled upon post-harvest retailer settlement.</p>
                     </div>
                  </div>
                )}
                
                {inv.status === 3 && (
                  <button className="btn-primary w-full py-3 mt-2" onClick={() => alert('Simulated: Executing ClaimYield on Smart Contract.')}>
                    Claim Settled Yield
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
