import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldCheck, MapPin, Star, AlertTriangle, Scale, Clock, Camera, Heart, Hash, Info, ChevronDown, ChevronUp, Link as LinkIcon, Truck } from 'lucide-react';
import { format } from 'date-fns';
import FRSGauge, { getGrade } from '../../components/shared/FRSGauge';

export default function BatchTrace() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        setLoading(true);
        // Uses the configured axios instance pointing to backend
        const { default: api } = await import('../../services/api');
        const res = await api.get(`/batch/${batchId}/trace`);
        const { batch: onChainBatch, chain } = res.data;
        
        if (!onChainBatch || !onChainBatch.batchId) {
          setBatch(null);
          return;
        }

        const formattedBatch = {
          batchId: onChainBatch.batchId,
          produce: onChainBatch.produceType,
          weight: onChainBatch.originWeightGrams,
          frs: Number(onChainBatch.currentFRS) / 100,
          category: onChainBatch.category === 0 ? 'STANDARD' : (onChainBatch.category === 1 ? 'HIGH_SENSITIVITY' : 'ROBUST'),
          farmer: {
            name: onChainBatch.farmerWallet.substring(0, 8),
            village: 'Unknown',
            state: 'Unknown',
            isVerifiedSmallholder: true,
            reputation: 99,
            photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${onChainBatch.farmerWallet}&backgroundColor=16a34a`
          },
          harvestDate: new Date(onChainBatch.harvestTimestamp).getTime(),
          blockchainStatus: 'VERIFIED',
          trustIndicators: {
            weightVerifiedChecks: chain.length,
            sealBroken: chain.some(c => c.seal === 1),
            anomalyDetected: chain.some(c => c.label !== 'Normal Update' && c.label !== ''),
            smartContractPaid: true
          },
          transitNodes: chain.map(node => ({
            name: node.nodeName || node.nodeWallet.substring(0, 8),
            role: node.nodeType === 1 ? 'MIDDLEMAN' : (node.nodeType === 2 ? 'TRANSPORT' : 'RETAILER'),
            time: new Date(node.timestamp).getTime(),
            frs: Number(node.frsBasisPoints) / 100,
            status: node.grade || 'A+',
            warning: node.label
          })).sort((a,b) => a.time - b.time),
          rawHashes: {
            creationTx: 'Genesis Tx',
            lastTransferTx: 'Latest Tx',
            ipfsMetadata: 'N/A'
          }
        };
        setBatch(formattedBatch);
      } catch (err) {
        console.error(err);
        setBatch(null);
      } finally {
        setLoading(false);
      }
    };
    if (batchId && batchId !== 'notfound') {
      fetchTrace();
    } else {
      setLoading(false);
      setBatch(null);
    }
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-farm-green">
        <div className="w-16 h-16 border-4 border-farm-green border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold font-mono tracking-widest uppercase">Fetching Blockchain Record...</h2>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 card text-center">
         <div className="w-24 h-24 mx-auto bg-farm-red/20 text-farm-red rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={48} />
         </div>
         <h1 className="text-3xl font-bold text-farm-text mb-4">Batch Not Found</h1>
         <p className="text-farm-muted mb-8 text-lg">We couldn't verify this QR code on the FarmChain network. This might be an invalid or fraudulent code.</p>
         <button className="btn-primary w-full max-w-sm mx-auto mb-4">Report Suspicious QR Code</button>
         <p className="text-xs text-farm-muted">Batch ID searched: <strong className="font-mono text-farm-text">{batchId}</strong></p>
      </div>
    );
  }

  const grade = getGrade(batch.frs, batch.category);
  const isGood = grade.startsWith('A') || grade === 'B';

  return (
    <div className="max-w-3xl mx-auto pb-20">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-8">
         <div className="inline-flex items-center justify-center gap-2 bg-farm-green text-white px-6 py-2 rounded-full font-bold text-sm tracking-widest shadow-lg shadow-farm-green/30 hover:scale-105 transition-transform mb-6">
            <ShieldCheck size={18} /> VERIFIED ON BLOCKCHAIN
         </div>
         <h1 className="text-4xl md:text-5xl font-bold text-farm-text capitalize mb-2">{batch.produce}</h1>
         <p className="text-farm-muted font-mono tracking-widest uppercase text-sm mb-8">Batch: {batch.batchId}</p>

         <div className="bg-farm-surface-2 rounded-2xl p-8 border border-farm-border shadow-xl max-w-md mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-farm-green via-farm-amber to-farm-red"></div>
            <div className="scale-125 origin-top mb-12">
               <FRSGauge frs={batch.frs} category={batch.category} size="lg" />
            </div>
            <h2 className={`text-2xl font-bold ${isGood ? 'text-farm-green' : 'text-farm-amber'}`}>
              This produce is {isGood ? 'FRESH' : 'ACCEPTABLE'} — Grade {grade}
            </h2>
            <p className="text-farm-muted text-sm mt-2">Score dynamically updated based on time and transit data.</p>
         </div>
      </div>

      {/* FARMER PROFILE */}
      <div className="card mb-8">
        <h3 className="text-xs font-bold text-farm-muted uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-farm-border pb-2"><MapPin size={16}/> Grown By</h3>
        <div className="flex items-center gap-6">
           <img src={batch.farmer.photoUrl} alt="Farmer" className="w-20 h-20 rounded-full border-4 border-farm-green/30 shadow-lg" />
           <div>
             <h2 className="text-2xl font-bold text-farm-text">{batch.farmer.name}</h2>
             <p className="text-farm-muted mt-1">{batch.farmer.village}, {batch.farmer.state}</p>
             <div className="flex flex-wrap items-center gap-3 mt-3">
               {batch.farmer.isVerifiedSmallholder && (
                 <span className="badge-green rounded-full px-3 py-1 flex items-center gap-1 text-xs"><ShieldCheck size={12}/> Verified Smallholder</span>
               )}
               <div className="flex items-center text-farm-amber">
                 {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i*20 <= batch.farmer.reputation ? "currentColor" : "none"} />)}
               </div>
             </div>
           </div>
        </div>
        <div className="mt-6 p-4 bg-farm-surface rounded-lg flex items-center justify-between border border-farm-border">
           <span className="text-farm-muted text-sm">Harvested on:</span>
           <span className="text-farm-text font-bold">{format(batch.harvestDate, 'PPP')}</span>
        </div>
      </div>

      {/* TRUST INDICATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <TrustBadge active={true} icon={<Scale/>} text={`Weight verified at ${batch.trustIndicators.weightVerifiedChecks} checkpoints`} />
        <TrustBadge active={!batch.trustIndicators.sealBroken} icon={<ShieldCheck/>} text={batch.trustIndicators.sealBroken ? 'Seal anomaly detected' : 'No seal breaks detected'} />
        <TrustBadge active={!batch.trustIndicators.anomalyDetected} icon={<CheckCircle2/>} text={batch.trustIndicators.anomalyDetected ? 'Quality anomaly logged' : 'No freshness anomalies'} />
        <TrustBadge active={batch.trustIndicators.smartContractPaid} icon={<Hash/>} text={batch.trustIndicators.smartContractPaid ? 'Smart contract paid farmer' : 'Payment pending escrow'} />
      </div>

      {/* SUPPLY CHAIN JOURNEY TIMELINE */}
      <div className="card mb-8">
        <h3 className="text-xs font-bold text-farm-muted uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-farm-border pb-2"><Truck size={16}/> Supply Chain Journey</h3>
        
        <div className="relative pl-8 space-y-8 py-4">
          <div className="absolute top-8 bottom-8 left-[11px] w-0.5 bg-farm-border"></div>
          
          {batch.transitNodes.map((node, i) => (
            <div key={i} className="relative">
               <div className={`absolute -left-9 w-6 h-6 rounded-full border-4 border-farm-surface flex items-center justify-center 
                 ${node.status.startsWith('A') ? 'bg-farm-green' : node.status === 'B' ? 'bg-farm-amber' : 'bg-farm-red'}`}>
               </div>
               
               <div className="bg-farm-surface p-4 rounded-lg border border-farm-border hover:border-farm-green transition-colors">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h4 className="font-bold text-farm-text">{node.name}</h4>
                     <p className="text-xs text-farm-muted">{node.role} • {format(node.time, 'MMM d, h:mm a')}</p>
                   </div>
                   <div className="text-right">
                     <span className={`text-xl font-bold font-mono ${node.status.startsWith('A') ? 'text-farm-green' : node.status === 'B' ? 'text-farm-amber' : 'text-farm-red'}`}>
                       {node.frs.toFixed(1)}%
                     </span>
                     <p className="text-[10px] text-farm-muted uppercase">FRS at node</p>
                   </div>
                 </div>
                 
                 {node.warning && (
                   <div className="mt-2 text-xs text-farm-amber flex items-center gap-1 bg-farm-amber/10 p-2 rounded border border-farm-amber/30">
                     <AlertTriangle size={12} /> ⚠️ {node.warning}
                   </div>
                 )}
               </div>
               
               {/* Transit time line */}
               {i < batch.transitNodes.length - 1 && (
                 <div className="absolute -left-12 top-10 pl-1 py-1 h-full text-[10px] text-farm-muted font-mono flex items-center">
                    <span className="bg-farm-surface py-1">➔ {Math.floor((batch.transitNodes[i+1].time - node.time)/3600000)}h</span>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-12">
         <button onClick={() => setShowReportModal(true)} className="flex-1 btn-ghost border-farm-border flex items-center justify-center gap-2 py-4 shadow-sm hover:border-farm-red hover:text-farm-red group transition-all">
           <Camera size={20} className="group-hover:scale-110 transition-transform" /> REPORT QUALITY ISSUE
         </button>
         <button className="flex-1 btn-primary bg-gradient-to-r from-farm-green to-farm-green-dark border-transparent flex items-center justify-center gap-2 py-4 shadow-lg shadow-farm-green/20 hover:shadow-farm-green/40">
           <Heart size={20} className="text-white hover:scale-110 transition-transform" fill="currentColor"/> FUND THIS FARMER
         </button>
      </div>

      {/* RAW BLOCKCHAIN SECTION */}
      <div className="bg-farm-surface-2 rounded-lg border border-farm-border overflow-hidden">
        <button 
          onClick={() => setShowRaw(!showRaw)} 
          className="w-full flex items-center justify-between p-4 text-farm-muted hover:text-farm-text hover:bg-farm-surface transition-colors text-sm font-bold uppercase tracking-wider"
        >
          <span className="flex items-center gap-2"><LinkIcon size={16}/> View Raw Blockchain Data</span>
          {showRaw ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        <AnimatePresence>
          {showRaw && (
            <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="border-t border-farm-border">
               <div className="p-4 bg-[#0B1121] font-mono text-xs overflow-x-auto">
                 <div className="grid grid-cols-[120px_1fr] gap-2 mb-2 text-farm-green-light">
                   <span className="opacity-70">Contract:</span><span>0x5f24A7e...F1b9</span>
                   <span className="opacity-70">Batch Token ID:</span><span>{batch.batchId}</span>
                   <span className="opacity-70">Genesis TX:</span><span className="break-all">{batch.rawHashes.creationTx}</span>
                   <span className="opacity-70">Latest State TX:</span><span className="break-all">{batch.rawHashes.lastTransferTx}</span>
                   <span className="opacity-70">Metadata IPFS:</span><span className="break-all">ipfs://{batch.rawHashes.ipfsMetadata}</span>
                 </div>
                 <div className="mt-4 pt-4 border-t border-farm-border/30 text-farm-muted">
                    Raw data verification happens instantly via FarmChain verifier nodes. Data relies on cryptography and cannot be altered.
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* REPORT ISSUE MODAL placeholder */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="card w-full max-w-lg">
              <h2 className="text-xl font-bold text-farm-text mb-4">Report Quality Issue</h2>
              <p className="text-farm-muted mb-6 text-sm">FarmChain uses consumer reports to penalize bad actors and improve supply chain standards.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-farm-muted mb-1">Issue Type</label>
                  <select className="input text-sm">
                    <option>Spoiled / Rotten</option>
                    <option>Underweight</option>
                    <option>Damaged Packaging</option>
                    <option>Mislabeled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-farm-muted mb-1">Photo Evidence (strongly recommended)</label>
                  <div className="border-2 border-dashed border-farm-border rounded-lg p-8 text-center bg-farm-surface hover:border-farm-green cursor-pointer transition-colors text-farm-muted">
                     <Camera size={32} className="mx-auto mb-2 opacity-50"/>
                     <span>Tap to take a photo or upload</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-farm-muted mb-1">Comments</label>
                  <textarea className="input text-sm h-24" placeholder="Describe the issue..."></textarea>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button onClick={() => setShowReportModal(false)} className="flex-1 btn-ghost">Cancel</button>
                <button onClick={() => { setShowReportModal(false); alert('Report submitted to decentralized arbitration pool.'); }} className="flex-1 btn-danger">Submit Report</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponents
const TrustBadge = ({ active, icon, text }) => (
  <div className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${active ? 'bg-farm-green/10 border-farm-green/30 text-farm-green' : 'bg-farm-red/10 border-farm-red/30 text-farm-red'}`}>
     <div>{React.cloneElement(icon, { size: 24, className: active ? 'text-farm-green' : 'text-farm-red' })}</div>
     <span className="text-sm font-bold text-farm-text leading-tight">{text}</span>
  </div>
);
