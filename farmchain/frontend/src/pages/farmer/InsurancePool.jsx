import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Shield, Target, CircleDollarSign, CheckCircle2, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function InsurancePool() {
  const { user } = useAuthStore();
  const [insuranceData, setInsuranceData] = useState({
    poolBalanceEth: '0.00',
    reputationScore: 100,
    totalReceivedEth: '0.00',
    transactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      // Hardcoded demo farmer wallet (Hardhat Account #1)
      const demoWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const res = await api.get(`/farmer/${demoWallet}/insurance`);
      setInsuranceData({
        poolBalanceEth: res.data.insuranceBalanceEth || '0.000',
        reputationScore: res.data.reputationScore ? Number(res.data.reputationScore) : 100,
        totalReceivedEth: res.data.totalReceivedEth || '0.000',
        transactions: res.data.transactions || []
      });
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

  const isEligible = insuranceData.reputationScore >= 90;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-farm-text">Insurance & Subsidies</h1>
        <p className="text-farm-muted mt-2 text-lg">Blockchain-backed financial safety net tied to your produce quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-farm-surface-2 to-farm-surface p-6 rounded-2xl border border-farm-green/30 relative overflow-hidden shadow-[0_0_30px_-5px_rgba(34,197,94,0.1)]">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-farm-green">
            <Shield size={100} />
          </div>
          <p className="text-farm-muted font-bold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
             <Shield size={16}/> Current Insurance Pool
          </p>
          <div className="text-5xl font-mono font-bold text-farm-text mb-1">
             {Number(insuranceData.poolBalanceEth).toFixed(3)} <span className="text-xl text-farm-green">ETH</span>
          </div>
          <p className="text-sm text-farm-muted mt-4">Accrued automatically from successful batch transfers</p>
        </div>

        <div className="bg-gradient-to-br from-farm-surface-2 to-[#0B1121] p-6 rounded-2xl border border-farm-border relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-white">
            <Target size={100} />
          </div>
          <p className="text-farm-muted font-bold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
             <Target size={16}/> Reputation Score
          </p>
          <div className="flex items-end gap-3 mb-4">
             <div className="text-5xl font-mono font-bold text-farm-text">{insuranceData.reputationScore}</div>
             <div className="text-xl text-farm-muted mb-1 font-mono">/ 100</div>
          </div>
          
          <div className="w-full h-3 bg-farm-surface-3 rounded-full overflow-hidden mt-auto">
             <div 
               className={`h-full rounded-full transition-all duration-1000 ${isEligible ? 'bg-farm-green' : 'bg-farm-amber'}`} 
               style={{ width: `${insuranceData.reputationScore}%` }}>
             </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-farm-surface-2 to-farm-surface p-6 rounded-2xl border border-farm-border relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-white">
            <CircleDollarSign size={100} />
          </div>
          <p className="text-farm-muted font-bold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
             <TrendingUp size={16}/> Total Subsidies
          </p>
          <div className="text-5xl font-mono font-bold text-farm-text mb-1">
             {Number(insuranceData.totalReceivedEth).toFixed(3)} <span className="text-xl text-farm-muted">ETH</span>
          </div>
          <p className="text-sm text-farm-muted mt-4">Lifetime government subsidies received directly to wallet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="card h-full flex flex-col justify-between border-farm-green/20 bg-farm-green/5">
          <div>
            <h3 className="text-xl font-bold text-farm-text mb-2 flex items-center gap-2">
              <CheckCircle2 className="text-farm-green" /> Subsidy Eligibility Status
            </h3>
            <p className="text-farm-muted mb-6">
              Your reputation score automatically determines your eligibility for micro-subsidies triggered by the FarmChain smart contracts.
            </p>
            {isEligible ? (
              <div className="bg-farm-green/10 text-farm-green border border-farm-green/20 p-4 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-bold">Highly Eligible</h4>
                  <p className="text-sm mt-1 opacity-90">Your high reputation ensures priority queuing for the next government disbursement round.</p>
                </div>
              </div>
            ) : (
              <div className="bg-farm-amber/10 text-farm-amber border border-farm-amber/20 p-4 rounded-lg flex gap-3 items-start">
                <AlertTriangle className="mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-bold">Borderline Eligibility</h4>
                  <p className="text-sm mt-1 opacity-90">Maintain score above 90 by honoring contracts and delivering fresh produce to regain priority status.</p>
                </div>
              </div>
            )}
          </div>
          
          <button 
             className="btn-primary w-full mt-8 py-4 flex items-center justify-center gap-2"
             onClick={() => alert('Simulated: Dispatching claim request to SubsidyEngine smart contract.')}
          >
             <Download size={20} /> Claim Available Subsidies
          </button>
        </div>

        <div className="card h-full">
           <h3 className="text-xl font-bold text-farm-text mb-4 border-b border-farm-border pb-4">Recent Transactions</h3>
           {insuranceData.transactions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-farm-muted">
                <CircleDollarSign size={40} className="opacity-20 mb-3" />
                <p>No insurance payouts or subsidies yet.</p>
             </div>
           ) : (
             <ul className="space-y-4">
               {/* transactions mocked or mapped here */}
             </ul>
           )}
        </div>
      </div>
    </div>
  );
}
