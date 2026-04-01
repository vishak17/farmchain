import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Wallet, History, Users, ArrowUpRight, CheckCircle2, AlertTriangle, AlertCircle, Activity, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock active requests
const MOCK_ACTIVE = [
  { id: 'FR-94A', crop: 'Tomato', land: 1.5, target: 0.5, progress: 65, investors: 4, status: 'OPEN' },
  { id: 'FR-88B', crop: 'Onion', land: 2.0, target: 1.2, progress: 100, investors: 12, status: 'FUNDED' },
  { id: 'FR-10C', crop: 'Banana', land: 0.5, target: 0.3, progress: 100, investors: 2, status: 'ACTIVE_SEASON' },
];

const MOCK_PAST = [
  { id: 'FR-OLD1', crop: 'Mango', season: 'Summer 2025', status: 'SETTLED', target: 2.0, roi: '+14.2%' },
  { id: 'FR-OLD2', crop: 'Potato', season: 'Winter 2025', status: 'SETTLED', target: 0.8, roi: '+9.5%' },
];

export default function FundingRequests() {
  const [activeTab, setActiveTab] = useState('active'); // active, history
  const [formData, setFormData] = useState({
    crop: '', landArea: '',
    seeds: 0, fertilizer: 0, labor: 0,
    yieldEst: '', equity: 15
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(null); // holds request ID explicitly
  const [settleAmount, setSettleAmount] = useState('');

  const totalCost = Number(formData.seeds) + Number(formData.fertilizer) + Number(formData.labor);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Smart contract generated and published to marketplace!');
      setFormData({ crop: '', landArea: '', seeds: 0, fertilizer: 0, labor: 0, yieldEst: '', equity: 15 });
    }, 1500);
  };

  const handleSettle = () => {
    toast.success(`Harvest settled for ${settleAmount} INR. Funds auto-disbursed via smart contract to investors!`);
    setSettleModalOpen(null);
    setSettleAmount('');
  };

  const statusBadge = (s) => ({
    'OPEN': <span className="badge-blue text-[10px] py-1">OPEN</span>,
    'FUNDED': <span className="badge-amber bg-farm-amber/10 text-farm-amber-light text-[10px] py-1 border-farm-amber/30">FUNDED</span>,
    'ACTIVE_SEASON': <span className="badge-green text-[10px] py-1">ACTIVE</span>,
    'SETTLED': <span className="bg-farm-surface-3 text-farm-muted px-2 py-0.5 rounded-full text-[10px] font-bold border border-farm-border">SETTLED</span>
  }[s]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-10">
      
      {/* LEFT COLUMN: Create Form */}
      <div className="w-full lg:w-[40%] flex flex-col gap-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-farm-text flex items-center gap-3">
             <Wallet className="text-farm-green" size={32} /> Farm Financing
          </h1>
          <p className="text-farm-muted mt-2 text-sm">Raise capital directly from consumers via trustless smart contracts.</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-farm-surface-2 border-farm-green/30 relative overflow-hidden">
           <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-farm-green to-farm-green-dark"></div>
           <h2 className="text-lg font-bold text-farm-text uppercase tracking-wider mb-6 flex items-center gap-2 mt-2"><PlusCircle size={18}/> New Pitch</h2>
           
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs uppercase text-farm-muted font-bold tracking-wider mb-1">Crop Type</label>
                  <input required type="text" className="input text-sm" placeholder="e.g. Tomato" value={formData.crop} onChange={e=>setFormData({...formData, crop:e.target.value})}/>
               </div>
               <div>
                  <label className="block text-xs uppercase text-farm-muted font-bold tracking-wider mb-1">Land (Acres)</label>
                  <input required type="number" step="0.1" className="input text-sm" placeholder="0.0" value={formData.landArea} onChange={e=>setFormData({...formData, landArea:e.target.value})}/>
               </div>
             </div>

             <div className="p-4 bg-farm-surface rounded-lg border border-farm-border space-y-3">
                <h3 className="text-xs uppercase font-bold text-farm-muted flex justify-between items-center tracking-wider">
                  Cost Breakdown <span className="font-mono text-farm-text">Total: ₹{totalCost.toLocaleString()}</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                   <div><label className="text-[10px] uppercase text-farm-muted">Seeds (₹)</label><input type="number" min="0" className="input text-xs font-mono p-2" value={formData.seeds} onChange={e=>setFormData({...formData, seeds:e.target.value})}/></div>
                   <div><label className="text-[10px] uppercase text-farm-muted">Fertilizer (₹)</label><input type="number" min="0" className="input text-xs font-mono p-2" value={formData.fertilizer} onChange={e=>setFormData({...formData, fertilizer:e.target.value})}/></div>
                   <div><label className="text-[10px] uppercase text-farm-muted">Labor (₹)</label><input type="number" min="0" className="input text-xs font-mono p-2" value={formData.labor} onChange={e=>setFormData({...formData, labor:e.target.value})}/></div>
                </div>
             </div>

             <div>
                <label className="block text-xs uppercase text-farm-muted font-bold tracking-wider mb-1">Estimated Yield (kg)</label>
                <input required type="number" className="input text-sm font-mono w-full" placeholder="5000" value={formData.yieldEst} onChange={e=>setFormData({...formData, yieldEst:e.target.value})}/>
             </div>

             <div className="p-4 bg-[#0B1121] rounded-lg border border-farm-border">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <label className="block text-xs uppercase text-farm-green font-bold tracking-wider mb-1 flex items-center gap-1"><ArrowUpRight size={12}/> Equity Offered</label>
                    <p className="text-[10px] text-farm-muted w-3/4">Percentage of final harvest sale given to backers.</p>
                  </div>
                  <span className={`text-2xl font-bold font-mono ${formData.equity > 25 ? 'text-farm-amber' : 'text-farm-green'}`}>{formData.equity}%</span>
                </div>
                
                <input type="range" min="5" max="30" step="1" value={formData.equity} onChange={e=>setFormData({...formData, equity:Number(e.target.value)})} className="w-full accent-farm-green"/>
                
                {formData.equity > 25 && (
                  <p className="text-[10px] text-farm-amber mt-2 flex items-center gap-1"><AlertTriangle size={10}/> High equity offering. Ensure sufficient margin remains.</p>
                )}
             </div>

             <button type="submit" disabled={submitting || totalCost === 0} className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2">
               {submitting ? <Activity className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>}
               {submitting ? 'DEPLOYING CONTRACT...' : 'CREATE REQUEST'}
             </button>
           </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Active / Past Lists */}
      <div className="w-full lg:w-[60%] flex flex-col gap-6">
         
         <div className="flex bg-farm-surface-2 p-1 rounded-lg border border-farm-border w-max mx-auto lg:mx-0 shadow-sm">
           <button onClick={()=>setActiveTab('active')} className={`px-6 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${activeTab==='active' ? 'bg-farm-surface border border-farm-border shadow-sm text-farm-green' : 'text-farm-muted hover:text-farm-text'}`}>
             <Activity size={16}/> Active Contracts
           </button>
           <button onClick={()=>setActiveTab('history')} className={`px-6 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${activeTab==='history' ? 'bg-farm-surface border border-farm-border shadow-sm text-farm-text' : 'text-farm-muted hover:text-farm-text'}`}>
             <History size={16}/> Past Seasons
           </button>
         </div>

         {activeTab === 'active' && (
           <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="space-y-4">
              {MOCK_ACTIVE.map(req => (
                <div key={req.id} className="card p-5 hover:border-farm-green/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group">
                   <div className="flex-1 w-full">
                     <div className="flex items-center gap-3 mb-2">
                       <h3 className="font-bold text-lg text-farm-text uppercase">{req.crop} <span className="text-xs text-farm-muted capitalize tracking-widest font-normal">({req.land}ac)</span></h3>
                       {statusBadge(req.status)}
                     </div>
                     <div className="flex items-center gap-6 text-sm">
                       <p className="text-farm-muted font-mono"><span className="text-farm-green">{req.target * (req.progress/100)}</span> / {req.target} ETH</p>
                       <p className="text-farm-muted flex items-center gap-1"><Users size={14}/> {req.investors} Backers</p>
                     </div>
                     
                     <div className="w-full bg-farm-surface-3 rounded-full h-1.5 mt-3 overflow-hidden box-border border-b border-t border-farm-surface-3 shadow-inner">
                        <div className={`h-full ${req.progress === 100 ? 'bg-farm-amber' : 'bg-farm-green'} shadow-[0_0_10px_currentColor]`} style={{width: `${req.progress}%`}}></div>
                     </div>
                   </div>

                   {req.status === 'FUNDED' ? (
                     <button onClick={() => setSettleModalOpen(req.id)} className="btn-primary w-full sm:w-auto px-6 whitespace-nowrap bg-farm-amber hover:bg-farm-amber-dark text-black border border-farm-amber/50 animate-pulse transition">
                       Settle Harvest
                     </button>
                   ) : req.status === 'ACTIVE_SEASON' ? (
                     <button disabled className="btn-ghost opacity-50 cursor-not-allowed w-full sm:w-auto">Harvesting...</button>
                   ) : (
                     <button className="btn-ghost w-full sm:w-auto border-farm-green/30 text-farm-green group-hover:bg-farm-green/10">Share Link <ArrowUpRight size={14} className="inline"/></button>
                   )}
                </div>
              ))}

              {MOCK_ACTIVE.length === 0 && (
                <div className="text-center p-12 card border-dashed text-farm-muted">No active funding requests right now.</div>
              )}
           </motion.div>
         )}

         {activeTab === 'history' && (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="card p-0 overflow-hidden">
               <table className="w-full text-left border-collapse text-sm">
                 <thead>
                   <tr className="bg-farm-surface-2 border-b border-farm-border text-farm-muted text-xs uppercase tracking-widest">
                     <th className="p-4 font-bold">Crop / Season</th>
                     <th className="p-4 font-bold hidden sm:table-cell">Target</th>
                     <th className="p-4 font-bold">Total ROI Delivered</th>
                     <th className="p-4 font-bold text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-farm-border">
                   {MOCK_PAST.map((row, i) => (
                     <tr key={i} className="hover:bg-farm-surface-2/50 transition-colors">
                       <td className="p-4">
                         <div className="font-bold text-farm-text">{row.crop}</div>
                         <div className="text-xs text-farm-muted">{row.season}</div>
                       </td>
                       <td className="p-4 hidden sm:table-cell font-mono text-farm-muted">{row.target} ETH</td>
                       <td className="p-4 font-bold text-farm-green-light tracking-wider">{row.roi}</td>
                       <td className="p-4 text-center">{statusBadge(row.status)}</td>
                     </tr>
                   ))}
                  </tbody>
               </table>
            </motion.div>
         )}
      </div>

      {/* Settle Harvest Modal */}
      <AnimatePresence>
        {settleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="card w-full max-w-sm relative">
              <button className="absolute top-4 right-4 text-farm-muted hover:text-farm-text" onClick={() => setSettleModalOpen(null)}><X size={18}/></button>
              
              <div className="w-12 h-12 bg-farm-amber/20 text-farm-amber rounded-full flex items-center justify-center mb-4">
                <Wallet size={24}/>
              </div>
              <h2 className="text-xl font-bold text-farm-text mb-2">Settle Harvest On-Chain</h2>
              <p className="text-sm text-farm-muted mb-6">Enter the total physical revenue earned from retail. The smart contract will automatically extract the exact equity percentage dedicated to investors to their wallets.</p>
              
              <div className="mb-6">
                <label className="block text-xs uppercase text-farm-amber font-bold tracking-wider mb-2">Actual Total Retail Sale (INR)</label>
                <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-farm-muted font-bold font-mono">₹</span>
                   <input autoFocus type="number" min="0" value={settleAmount} onChange={e=>setSettleAmount(e.target.value)} className="input pl-8 text-xl font-bold font-mono py-3 placeholder-farm-surface-3 border-farm-amber/30 focus:ring-farm-amber text-farm-text" placeholder="0"/>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSettleModalOpen(null)} className="flex-1 btn-ghost border-farm-border">Cancel</button>
                <button disabled={!settleAmount || settleAmount <= 0} onClick={handleSettle} className="flex-[2] btn-primary bg-farm-amber border-transparent text-black font-extrabold flex items-center justify-center gap-2 hover:bg-farm-amber-light">
                   DISBURSE <ChevronRight size={16}/>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
