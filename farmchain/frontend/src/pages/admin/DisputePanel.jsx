import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, FileText, Image as ImageIcon, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Filter, ArrowRight, Gavel, Upload, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock Data
const MOCK_DISPUTES = [
  { id: 'DSP-8842', batchId: 'BTH-TM-1102', type: 'WEIGHT_MISMATCH', status: 'EVIDENCE_PHASE', created: '2026-04-01T10:00:00Z', deadline: '2026-04-04T10:00:00Z', aiVerdict: 'GUILTY', aiConf: 94, targetNode: '0x4f...9a21' },
  { id: 'DSP-8911', batchId: 'BTH-ON-0921', type: 'QUALITY_DROP', status: 'VOTING', created: '2026-03-30T14:30:00Z', deadline: '2026-04-02T14:30:00Z', aiVerdict: 'INNOCENT', aiConf: 82, targetNode: '0x1a...b442' },
  { id: 'DSP-8999', batchId: 'BTH-BN-1024', type: 'ROUTE_DEVIATION', status: 'OPEN', created: '2026-04-02T08:15:00Z', deadline: '2026-04-05T08:15:00Z', aiVerdict: 'GUILTY', aiConf: 99, targetNode: '0x99...c110' },
  { id: 'DSP-8820', batchId: 'BTH-MG-1001', type: 'WEIGHT_MISMATCH', status: 'RESOLVED', created: '2026-03-25T09:00:00Z', deadline: '2026-03-28T09:00:00Z', aiVerdict: 'GUILTY', aiConf: 98, targetNode: '0x2b...a055' },
];

const FRS_DELTA = [
  { node: 'Farm (Origin)', frs: 98.5, change: 0, status: 'OK' },
  { node: 'Transit 1 (KA-01)', frs: 98.0, change: -0.5, status: 'OK' },
  { node: 'Middleman Depot', frs: 82.5, change: -15.5, status: 'CRITICAL' },
  { node: 'Transit 2 (KA-04)', frs: 81.0, change: -1.5, status: 'OK' },
];

export default function DisputePanel() {
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);
  const [selected, setSelected] = useState(MOCK_DISPUTES[0]);
  const [filter, setFilter] = useState('ALL');
  const [vote, setVote] = useState(null);
  
  const filtered = disputes.filter(d => filter === 'ALL' || d.status === filter);

  const getStatusColor = (s) => ({
    'OPEN': 'badge-blue',
    'EVIDENCE_PHASE': 'badge-amber',
    'VOTING': 'badge-purple text-purple-400 border-purple-400',
    'RESOLVED': 'badge-green'
  }[s]);

  const handleVote = (verdict) => {
    setVote(verdict);
    toast.success(`Vote cast: ${verdict}`);
  };

  const resolveDispute = () => {
    toast.success('Dispute resolved on-chain. Penalties applied.');
    setDisputes(disputes.map(d => d.id === selected.id ? {...d, status: 'RESOLVED'} : d));
    setSelected({...selected, status: 'RESOLVED'});
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] pb-6">
      
      {/* LEFT SIDEBAR: List */}
      <div className="w-full lg:w-1/3 card p-0 flex flex-col overflow-hidden border-farm-border">
        <div className="p-4 border-b border-farm-border bg-farm-surface-2 flex justify-between items-center">
           <h2 className="font-bold text-farm-text flex items-center gap-2">
             <ShieldAlert size={18} className="text-farm-amber"/> Open Disputes
           </h2>
           <button className="text-farm-muted hover:text-farm-text transition-colors"><RefreshCw size={16}/></button>
        </div>
        
        <div className="p-3 border-b border-farm-border flex gap-2 overflow-x-auto hide-scrollbar bg-[#0B1121]">
           {['ALL', 'OPEN', 'EVIDENCE_PHASE', 'VOTING', 'RESOLVED'].map(f => (
             <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-farm-green text-white' : 'bg-farm-surface border border-farm-border text-farm-muted hover:text-farm-text'}`}>
               {f.replace('_', ' ')}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
           <AnimatePresence>
             {filtered.map(d => (
               <motion.button 
                 key={d.id}
                 layout
                 initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}}
                 onClick={() => setSelected(d)}
                 className={`w-full text-left p-4 rounded-lg border transition-all ${selected?.id === d.id ? 'bg-farm-surface-2 border-farm-blue shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-farm-surface border-farm-border hover:border-farm-blue/50'}`}
               >
                 <div className="flex justify-between items-start mb-2">
                   <span className="font-mono text-xs font-bold text-farm-blue-light tracking-wider">{d.id}</span>
                   <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold border ${getStatusColor(d.status).split(' ')[0] === 'badge-purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : getStatusColor(d.status)}`}>
                     {d.status.replace('_', ' ')}
                   </span>
                 </div>
                 <h3 className="font-bold text-farm-text text-sm truncate">{d.batchId}</h3>
                 <p className="text-xs text-farm-muted mt-1 uppercase tracking-wider">{d.type.replace('_', ' ')}</p>
               </motion.button>
             ))}
           </AnimatePresence>
        </div>
      </div>

      {/* MAIN PANEL: Detail */}
      <div className="w-full lg:w-2/3 card p-0 flex flex-col overflow-hidden border-farm-border relative">
        {selected ? (
          <>
            {/* Top Info */}
            <div className="p-6 border-b border-farm-border bg-[#0B1121]">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h1 className="text-2xl font-bold text-farm-text font-mono tracking-tight flex items-center gap-3">
                     {selected.id}
                     <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${getStatusColor(selected.status).split(' ')[0] === 'badge-purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : getStatusColor(selected.status)}`}>
                       {selected.status.replace('_', ' ')}
                     </span>
                   </h1>
                   <p className="text-farm-muted text-sm mt-1 uppercase tracking-wider">{selected.batchId} • {selected.type.replace('_', ' ')}</p>
                </div>
                <button className="flex items-center gap-1 text-xs text-farm-blue hover:text-farm-blue-light font-bold">
                  BLOCKCHAIN RECORD <ExternalLink size={14}/>
                </button>
              </div>
              
              <div className="flex gap-6 text-xs text-farm-muted bg-farm-surface-2 p-3 rounded-md border border-farm-border">
                <p><strong>Created:</strong> {new Date(selected.created).toLocaleString()}</p>
                <p className="text-farm-amber"><strong>Evidence Deadline:</strong> {new Date(selected.deadline).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               
               {/* AI Analysis */}
               <section>
                 <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Cpu size={18} className="text-farm-blue"/> AI Forensic Analysis
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-border">
                      <p className="text-xs text-farm-muted uppercase font-bold mb-1">Recommendation</p>
                      <p className={`text-xl font-bold flex items-center gap-2 ${selected.aiVerdict === 'GUILTY' ? 'text-farm-red' : 'text-farm-green'}`}>
                        {selected.aiVerdict === 'GUILTY' ? <XCircle size={20}/> : <CheckCircle2 size={20}/>}
                        {selected.aiVerdict} <span className="text-sm text-farm-muted font-mono ml-2">({selected.aiConf}% Conf)</span>
                      </p>
                   </div>
                   <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-border">
                      <p className="text-xs text-farm-muted uppercase font-bold mb-1">Likely Responsible Node</p>
                      <p className="text-lg font-mono font-bold text-farm-text">{selected.targetNode}</p>
                   </div>
                 </div>

                 {/* FRS Delta Table */}
                 <div className="overflow-hidden rounded-lg border border-farm-border text-sm">
                   <table className="w-full text-left">
                     <thead className="bg-[#0B1121] text-farm-muted text-xs uppercase">
                       <tr><th className="p-3">Custody Node</th><th className="p-3">Read FRS</th><th className="p-3">Delta</th><th className="p-3 text-center">Status</th></tr>
                     </thead>
                     <tbody className="divide-y divide-farm-border bg-farm-surface">
                       {FRS_DELTA.map((row, i) => (
                         <tr key={i} className={row.status === 'CRITICAL' ? 'bg-farm-red/10' : ''}>
                           <td className={`p-3 font-bold ${row.status === 'CRITICAL' ? 'text-farm-red' : 'text-farm-text'}`}>{row.node}</td>
                           <td className="p-3 font-mono">{row.frs}</td>
                           <td className={`p-3 font-mono font-bold ${row.change < -10 ? 'text-farm-red' : row.change < 0 ? 'text-farm-amber' : 'text-farm-muted'}`}>{row.change}</td>
                           <td className="p-3 text-center">
                             {row.status === 'CRITICAL' ? <span className="bg-farm-red text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase animate-pulse">Critical Drop</span> : <span className="text-farm-muted text-[10px] uppercase font-bold">OK</span>}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </section>

               {/* Evidence Section */}
               <section>
                 <div className="flex justify-between items-end mb-4">
                   <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider flex items-center gap-2">
                     <FileText size={18} className="text-farm-amber"/> Submitted Evidence
                   </h3>
                   {selected.status !== 'RESOLVED' && (
                     <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 border-farm-amber/30 text-farm-amber hover:bg-farm-amber/10">
                       <Upload size={14}/> Submit File
                     </button>
                   )}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <div className="flex items-center gap-3 p-3 bg-farm-surface-2 border border-farm-border rounded-lg hover:border-farm-blue/50 cursor-pointer transition-colors">
                     <div className="bg-farm-blue/10 p-2 rounded text-farm-blue"><ImageIcon size={20}/></div>
                     <div>
                       <p className="text-sm text-farm-text font-bold">origin_scale_reading.jpg</p>
                       <p className="text-xs text-farm-blue-light font-mono truncate w-48">ipfs://QmX...9vL</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-farm-surface-2 border border-farm-border rounded-lg hover:border-farm-blue/50 cursor-pointer transition-colors">
                     <div className="bg-farm-amber/10 p-2 rounded text-farm-amber"><FileText size={20}/></div>
                     <div>
                       <p className="text-sm text-farm-text font-bold">transit_temp_log_KA01.csv</p>
                       <p className="text-xs text-farm-blue-light font-mono truncate w-48">ipfs://QmY...2kP</p>
                     </div>
                   </div>
                 </div>
               </section>

               {/* Voting & Resolution */}
               {(selected.status === 'VOTING' || selected.status === 'RESOLVED') && (
                 <section className="bg-farm-surface-3/30 p-5 rounded-lg border border-farm-border">
                   <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Gavel size={18} className="text-purple-400"/> Governance Voting
                   </h3>
                   
                   {selected.status === 'VOTING' ? (
                     <div className="text-center space-y-4">
                       <p className="text-sm text-farm-muted">3/5 Panel Members have cast their vote. Results hidden until deadline.</p>
                       {vote ? (
                         <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold border ${vote === 'GUILTY' ? 'bg-farm-red/20 text-farm-red border-farm-red/50' : 'bg-farm-green/20 text-farm-green border-farm-green/50'}`}>
                           {vote === 'GUILTY' ? <XCircle size={18}/> : <CheckCircle2 size={18}/>}
                           You voted:  {vote}
                         </div>
                       ) : (
                         <div className="flex justify-center gap-4">
                           <button onClick={()=>handleVote('GUILTY')} className="btn-primary bg-farm-red/20 text-farm-red border border-farm-red hover:bg-farm-red hover:text-white px-8">VOTE GUILTY</button>
                           <button onClick={()=>handleVote('INNOCENT')} className="btn-primary bg-farm-green/20 text-farm-green border border-farm-green hover:bg-farm-green hover:text-white px-8">VOTE INNOCENT</button>
                         </div>
                       )}
                       <div className="mt-6">
                         <button onClick={resolveDispute} className="btn-primary w-full max-w-sm mx-auto shadow-[0_0_20px_rgba(59,130,246,0.2)]">RESOLVE DISPUTE (ADMIN BYPASS)</button>
                       </div>
                     </div>
                   ) : (
                     <div>
                       <div className="mb-4">
                         <div className="flex justify-between text-xs mb-1 font-bold"><span className="text-farm-red">GUILTY (4 Votes)</span><span className="text-farm-green">INNOCENT (1 Vote)</span></div>
                         <div className="w-full h-3 bg-farm-surface-3 rounded-full overflow-hidden flex">
                           <div className="h-full bg-farm-red" style={{width: '80%'}}></div>
                           <div className="h-full bg-farm-green" style={{width: '20%'}}></div>
                         </div>
                       </div>
                       <div className="bg-[#0B1121] border border-farm-border p-4 rounded-md text-sm text-farm-text flex items-center justify-between">
                         <span><strong>Verdict:</strong> Middleman Depot is liable for Route Deviation.</span>
                         <span className="text-farm-blue-light font-mono text-xs">TX: 0x9a8f...112c</span>
                       </div>
                     </div>
                   )}
                 </section>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-farm-muted">
            <ShieldAlert size={48} className="mb-4 opacity-20"/>
            <p>Select a dispute from the list to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
