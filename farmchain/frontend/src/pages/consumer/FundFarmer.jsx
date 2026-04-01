import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Leaf, ShieldCheck, MapPin, TrendingUp, Info, X, DollarSign, Clock, ChevronRight, CheckCircle2, Lock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const ETH_TO_INR = 200000;

// Mock Data
const MOCK_REQUESTS = [
  { id: 1, name: 'Lakshmamma', village: 'Hassan', isSmallholder: true, crop: 'Tomato', land: 1.5, progress: 65, target: 0.5, equity: 15, reliability: 94, daysLeft: 4, pastRoi: 14.2 },
  { id: 2, name: 'Suresh Kumar', village: 'Tumkur', isSmallholder: false, crop: 'Onion', land: 3.0, progress: 20, target: 1.2, equity: 12, reliability: 88, daysLeft: 12, pastRoi: 11.5 },
  { id: 3, name: 'Venkatappa', village: 'Mandya', isSmallholder: true, crop: 'Sugarcane', land: 0.75, progress: 100, target: 0.3, equity: 20, reliability: 98, daysLeft: 0, pastRoi: 18.0 },
  { id: 4, name: 'Gowramma', village: 'Mysuru', isSmallholder: true, crop: 'Banana', land: 2.0, progress: 45, target: 0.8, equity: 18, reliability: 91, daysLeft: 7, pastRoi: 15.6 },
  { id: 5, name: 'Ravi Reddy', village: 'Kolar', isSmallholder: false, crop: 'Mango', land: 5.0, progress: 8, target: 2.5, equity: 10, reliability: 82, daysLeft: 21, pastRoi: 9.8 }
];

export default function FundFarmer() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [investmentEth, setInvestmentEth] = useState(0.1);
  const [investing, setInvesting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Simulate API fetch POST /consumer/funding/marketplace
    setTimeout(() => {
      setRequests(MOCK_REQUESTS);
      setLoading(false);
    }, 1000);
  }, []);

  const handleInvest = () => {
    setInvesting(true);
    setTimeout(() => {
      setInvesting(false);
      setSuccess(true);
      toast.success('Smart Contract executed! Welcome as a stakeholder.');
    }, 1500);
  };

  const closePanel = () => {
    setSelectedRequest(null);
    setSuccess(false);
    setInvestmentEth(0.1);
  };

  return (
    <div className="max-w-7xl mx-auto flex h-full pb-10 relative">
      <div className={`flex-1 transition-all duration-300 ${selectedRequest ? 'lg:w-2/3 lg:pr-6' : 'w-full'}`}>
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-farm-text flex items-center gap-3">
             <Leaf className="text-farm-green" size={32} /> Fund a Farmer
          </h1>
          <p className="text-farm-muted mt-2">Become a stakeholder in your food supply by financing harvests directly via smart contracts.</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-farm-surface-2 border border-farm-border rounded-lg items-center text-sm">
           <div className="flex items-center gap-2 flex-1 min-w-[200px]">
             <Search size={16} className="text-farm-muted" />
             <input type="text" placeholder="Search crops or villages..." className="bg-transparent border-none outline-none text-farm-text w-full placeholder-farm-muted" />
           </div>
           <div className="h-6 w-px bg-farm-border hidden sm:block"></div>
           <select className="bg-transparent text-farm-text border-none outline-none font-bold">
             <option>All Crops</option>
             <option>Tomato</option>
             <option>Banana</option>
             <option>Onion</option>
           </select>
           <select className="bg-transparent text-farm-text border-none outline-none font-bold">
             <option>Sort: Reliability Score</option>
             <option>Sort: Highest Equity</option>
             <option>Sort: Ending Soon</option>
           </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-[320px] bg-farm-surface-2 animate-pulse rounded-xl border border-farm-border"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {requests.map(req => (
              <div key={req.id} className="card flex flex-col hover:border-farm-green transition-colors group cursor-pointer" onClick={() => setSelectedRequest(req)}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="font-bold text-lg text-farm-text flex items-center gap-2">{req.name}</h3>
                     <p className="text-xs text-farm-muted flex items-center gap-1"><MapPin size={12}/> {req.village}, Karnataka</p>
                   </div>
                   {req.isSmallholder && <div className="badge-green"><ShieldCheck size={12} className="inline mr-1"/> Smallholder</div>}
                </div>

                <div className="flex justify-between items-center mb-6 bg-farm-surface-2 p-3 rounded-lg border border-farm-border">
                  <div className="text-center w-1/2 border-r border-farm-border">
                    <p className="text-xs text-farm-muted">Crop / Land</p>
                    <p className="font-bold text-farm-text">{req.crop} <span className="text-xs font-normal">({req.land}ac)</span></p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-xs text-farm-muted">Equity Offered</p>
                    <p className="font-bold text-farm-green">{req.equity}% Proceeds</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-farm-muted">Funding Target</span>
                    <span className="font-bold text-farm-text">₹{(req.target * ETH_TO_INR).toLocaleString()} <span className="text-farm-muted">({req.target} ETH)</span></span>
                  </div>
                  <div className="w-full bg-farm-surface-3 rounded-full h-2 mb-1 overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${req.progress}%`}} className={`h-full ${req.progress === 100 ? 'bg-farm-green' : 'bg-gradient-to-r from-farm-green to-farm-green-light'}`} />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-farm-muted">
                    <span>{req.progress}% Filled</span>
                    {req.daysLeft > 0 ? <span className="flex items-center gap-1"><Clock size={10}/> {req.daysLeft} days left</span> : <span className="text-farm-green">FUNDED</span>}
                  </div>
                </div>

                <div className="mt-auto pt-4 flex gap-3 items-center border-t border-farm-border">
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1 text-xs text-farm-muted mb-1">Reliability Score <Info size={12}/></div>
                    <div className="flex gap-1 h-1.5">
                       {[...Array(5)].map((_,i) => (
                         <div key={i} className={`flex-1 rounded-full ${i < Math.round(req.reliability/20) ? 'bg-farm-green' : 'bg-farm-surface-3'}`}></div>
                       ))}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }} disabled={req.progress === 100} className="btn-primary py-1.5 px-6 text-sm flex items-center gap-2">
                    {req.progress === 100 ? 'CLOSED' : 'FUND'} <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SLIDE-OVER PANEL */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div 
            initial={{x: '100%', opacity: 0}} 
            animate={{x: 0, opacity: 1}} 
            exit={{x: '100%', opacity: 0}} 
            transition={{type: 'spring', damping: 25, stiffness: 200}}
            className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-farm-surface border-l border-farm-border shadow-2xl z-50 overflow-y-auto"
          >
            {/* Slide Header */}
            <div className="p-6 border-b border-farm-border sticky top-0 bg-farm-surface/90 backdrop-blur z-10 flex items-center justify-between">
               <h2 className="text-xl font-bold text-farm-text flex items-center gap-2"><Leaf className="text-farm-green"/> Investment Detail</h2>
               <button onClick={closePanel} className="p-2 hover:bg-farm-surface-2 rounded-full text-farm-muted hover:text-farm-text transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 space-y-8">
              {success ? (
                <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="text-center py-10 space-y-4">
                  <div className="w-24 h-24 bg-farm-green/20 text-farm-green rounded-full flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                    <ShieldCheck size={48} className="absolute z-10" />
                    <motion.div animate={{scale:[1,1.5,1]}} transition={{repeat:Infinity, duration:2}} className="absolute inset-0 bg-farm-green/30 rounded-full blur-md" />
                  </div>
                  <h3 className="text-2xl font-bold text-farm-text">Investment Executed!</h3>
                  <p className="text-farm-muted">You are now a FarmChain stakeholder in {selectedRequest.name}'s {selectedRequest.crop} harvest.</p>
                  <div className="bg-[#0B1121] p-4 rounded-lg border border-farm-border text-left mt-6">
                    <p className="text-xs text-farm-muted font-mono mb-2 uppercase flex items-center gap-2 block"><Lock size={12}/> Contract Secured</p>
                    <p className="text-xs text-farm-text font-mono truncate">TX: 0x9f83ca12b9d...ee14</p>
                    <p className="text-xs text-farm-text font-mono truncate">Equity Token: 0xFC_EQ_{selectedRequest.id}</p>
                  </div>
                  <button onClick={closePanel} className="btn-ghost w-full mt-4">Return to Marketplace</button>
                </motion.div>
              ) : (
                <>
                  {/* Profile */}
                  <div className="flex gap-4 items-start">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedRequest.name}&backgroundColor=16a34a`} className="w-16 h-16 rounded-full border-2 border-farm-green" alt="avatar" />
                    <div>
                      <h3 className="text-xl font-bold text-farm-text">{selectedRequest.name}</h3>
                      <p className="text-sm text-farm-muted">{selectedRequest.village}, Karnataka</p>
                      <div className="flex gap-2 mt-2">
                        {selectedRequest.isSmallholder && <span className="badge-green flex items-center gap-1 text-[10px]"><ShieldCheck size={10}/> Verified</span>}
                        <span className="badge-amber flex items-center gap-1 text-[10px]"><TrendingUp size={10}/> {selectedRequest.pastRoi}% Avg ROI</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculator */}
                  <div className="bg-farm-surface-2 p-5 rounded-xl border border-farm-border relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-farm-green/5 blur-2xl rounded-full"></div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-farm-muted mb-4">Investment Calculator</h4>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-farm-text">Your Contribution (ETH)</label>
                        <span className="font-mono text-farm-green font-bold text-sm">{investmentEth.toFixed(3)} ETH</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.01" 
                        max={selectedRequest.target - (selectedRequest.target * (selectedRequest.progress/100))} 
                        step="0.01" 
                        value={investmentEth} 
                        onChange={e => setInvestmentEth(Number(e.target.value))}
                        className="w-full accent-farm-green"
                      />
                      <div className="text-right text-xs text-farm-muted mt-1 font-mono">≈ ₹{(investmentEth * ETH_TO_INR).toLocaleString()}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-farm-border">
                      <div>
                        <p className="text-xs text-farm-muted">Your Equity Share</p>
                        <p className="text-lg font-bold text-farm-text">{((investmentEth / selectedRequest.target) * selectedRequest.equity).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-farm-muted">Proj. Return (Est. Yield)</p>
                        <p className="text-lg font-bold text-farm-green">≈ ₹{((investmentEth * ETH_TO_INR) * (1 + (selectedRequest.pastRoi/100))).toLocaleString([], {maximumFractionDigits:0})}</p>
                      </div>
                    </div>
                  </div>

                  {/* Insurance Clause */}
                  <div className="flex items-start gap-3 p-4 bg-farm-blue/10 border border-farm-blue/30 rounded-lg text-sm text-farm-blue-light">
                    <ShieldCheck size={20} className="flex-shrink-0 mt-0.5" />
                    <p><strong>Insurance coverage active.</strong> If harvest fails due to verified weather anomalies, you recover ~60% of principal via the decentralized gas fee pool.</p>
                  </div>

                  {/* Smart Contract Terms */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-farm-muted mb-3 flex items-center gap-2"><Lock size={14}/> Smart Contract Terms</h4>
                    <ul className="text-sm border-l-2 border-farm-border pl-4 space-y-3 text-farm-muted">
                      <li><strong className="text-farm-text">Funds Lock:</strong> ETH locked in contract until harvest (Est: {new Date(Date.now() + 86400000 * 90).toLocaleDateString()}).</li>
                      <li><strong className="text-farm-text">Auto-Disburse:</strong> Activated immediately when farmer settles retail sale on-chain.</li>
                      <li><strong className="text-farm-text">Immutable:</strong> Terms written to FarmChain blockchain and cannot be altered by either party.</li>
                    </ul>
                  </div>

                  <button onClick={handleInvest} disabled={investing} className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-farm-green/20">
                    {investing ? <Activity className="animate-spin" /> : <DollarSign size={20}/>}
                    {investing ? 'EXECUTING CONTRACT...' : 'INVEST NOW'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {selectedRequest && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={closePanel}></div>}
    </div>
  );
}
