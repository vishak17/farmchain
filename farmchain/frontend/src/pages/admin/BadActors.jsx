import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Search, Flag, Ban, CheckCircle, AlertOctagon, Copy, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MOCK_ACTORS = [
  { id: '0x4f8B...9a21', role: 'MIDDLEMAN', name: 'Metro Cold Storage', disputes: 4, guilty: 3, rep: 32, status: 'FLAGGED' },
  { id: '0x992C...c110', role: 'RETAILER', name: 'Fresh Mart HSR', disputes: 8, guilty: 6, rep: 12, status: 'BLACKLISTED' },
  { id: '0x1a7F...b442', role: 'FARMER', name: 'Gowramma', disputes: 1, guilty: 0, rep: 94, status: 'ACTIVE' },
  { id: '0x2b3D...a055', role: 'MIDDLEMAN', name: 'FastTrack Logistics', disputes: 2, guilty: 1, rep: 68, status: 'ACTIVE' },
  { id: '0x884E...e991', role: 'RETAILER', name: 'Daily Needs', disputes: 3, guilty: 3, rep: 45, status: 'FLAGGED' }
];

// Heatmap Data (Days x 4 time periods: Morning, Afternoon, Evening, Night)
const HEATMAP_DATA = [
  { day: 'Mon', periods: [1, 0, 3, 8] },
  { day: 'Tue', periods: [0, 1, 2, 7] },
  { day: 'Wed', periods: [2, 1, 4, 12] },
  { day: 'Thu', periods: [0, 0, 1, 5] },
  { day: 'Fri', periods: [1, 2, 5, 14] },
  { day: 'Sat', periods: [3, 4, 8, 18] },
  { day: 'Sun', periods: [1, 1, 2, 6] }
];

export default function BadActors() {
  const [actors, setActors] = useState(MOCK_ACTORS.sort((a,b) => b.disputes - a.disputes));
  const [confirmBlacklist, setConfirmBlacklist] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Wallet address copied to clipboard');
  };

  const executeBlacklist = () => {
    toast.error(`Node ${confirmBlacklist.id} permanently blacklisted on Ethereum mainnet.`);
    setActors(actors.map(a => a.id === confirmBlacklist.id ? {...a, status: 'BLACKLISTED', rep: 0} : a));
    setConfirmBlacklist(null);
  };

  const getStatusBadge = (s) => ({
    'ACTIVE': <span className="bg-farm-green/10 text-farm-green border border-farm-green/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">ACTIVE</span>,
    'FLAGGED': <span className="bg-farm-amber/10 text-farm-amber border border-farm-amber/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider animate-pulse">FLAGGED</span>,
    'BLACKLISTED': <span className="bg-farm-red text-white border border-farm-red px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">BLACKLISTED</span>
  }[s]);

  // Mini Gauge SVG
  const RepGauge = ({ value }) => {
    const strokeDasharray = `${value} 100`;
    let color = '#16a34a'; // green
    if (value < 50) color = '#ef4444'; // red
    else if (value < 80) color = '#f59e0b'; // amber
    
    return (
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
          <path className="stroke-farm-surface-3 fill-none stroke-[4]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="fill-none stroke-[4]" stroke={color} strokeDasharray={strokeDasharray} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span className="font-mono text-sm font-bold text-farm-text">{value}</span>
      </div>
    );
  };

  const HeatmapCell = ({ val }) => {
    // scale 0 to 20
    const intensity = Math.min(val / 20, 1);
    let bgColor = 'rgba(30, 41, 59, 1)'; // neutral
    if (val > 0) bgColor = `rgba(239, 68, 68, ${0.1 + (intensity * 0.9)})`;
    
    return (
      <div 
        className="aspect-square rounded flex items-center justify-center text-[10px] font-bold font-mono transition-colors hover:border border-white"
        style={{ backgroundColor: bgColor, color: val > 10 ? 'white' : 'rgba(255,255,255,0.5)' }}
        title={`${val} incidents recorded`}
      >
        {val}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-farm-text flex items-center gap-3">
           <ShieldAlert className="text-farm-red" size={32} /> Network Integrity
        </h1>
        <p className="text-farm-muted mt-2 text-sm">Monitor systematic fraud, FRS manipulation, and autonomously penalize malicious actors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-farm-amber/30 p-5 flex items-center justify-between">
           <div><p className="text-xs font-bold text-farm-muted uppercase tracking-wider">Nodes Flagged</p><h3 className="text-3xl font-bold font-mono text-farm-amber">42</h3></div>
           <AlertTriangle size={32} className="text-farm-amber opacity-30"/>
        </div>
        <div className="card border-farm-red/30 p-5 flex items-center justify-between">
           <div><p className="text-xs font-bold text-farm-muted uppercase tracking-wider">Blacklisted Wallets</p><h3 className="text-3xl font-bold font-mono text-farm-red">12</h3></div>
           <Ban size={32} className="text-farm-red opacity-30"/>
        </div>
        <div className="card p-5 flex items-center justify-between bg-[#0B1121]">
           <div><p className="text-xs font-bold text-farm-muted uppercase tracking-wider">Disputes (7 Days)</p><h3 className="text-3xl font-bold font-mono text-farm-blue-light">18</h3></div>
           <AlertOctagon size={32} className="text-farm-blue-light opacity-30"/>
        </div>
      </div>

      {/* HEATMAP */}
      <div className="card flex flex-col lg:flex-row gap-8 items-center border-farm-border">
         <div className="lg:w-1/3">
           <h3 className="text-lg font-bold text-farm-text uppercase tracking-wider mb-2">Dispute Heatmap</h3>
           <p className="text-sm text-farm-muted">AI pattern analysis reveals that <strong className="text-farm-amber">74% of quality discrepancies</strong> (batch substitution) happen during the Night shift (12 AM - 6 AM) at Middleman transit depots.</p>
         </div>
         <div className="lg:w-2/3 w-full border border-farm-surface-3 p-4 rounded bg-[#0B1121]">
           <div className="grid grid-cols-8 gap-1 mb-1">
             <div className="text-[10px] text-farm-muted uppercase font-bold text-right pr-2">Shift</div>
             {HEATMAP_DATA.map(d => <div key={d.day} className="text-[10px] text-farm-muted uppercase font-bold text-center">{d.day}</div>)}
           </div>
           {['Morning', 'Afternoon', 'Evening', 'Night'].map((period, i) => (
             <div key={period} className="grid grid-cols-8 gap-1 mb-1 items-center">
               <div className="text-[10px] text-farm-muted uppercase font-bold text-right pr-2">{period}</div>
               {HEATMAP_DATA.map(d => <HeatmapCell key={d.day} val={d.periods[i]} />)}
             </div>
           ))}
         </div>
      </div>

      {/* MAIN TABLE */}
      <div className="card p-0 overflow-hidden border-farm-border">
        <div className="p-4 border-b border-farm-border bg-farm-surface-2 flex justify-between items-center">
           <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider">Actor Reputation Registry</h3>
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-farm-muted" />
             <input type="text" placeholder="Search wallet or name..." className="input py-1.5 pl-8 text-xs w-64 bg-[#0B1121]" />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0B1121] text-farm-muted uppercase text-[10px] tracking-widest font-bold border-b border-farm-border">
              <tr>
                 <th className="p-4">Wallet Address</th>
                 <th className="p-4">Entity</th>
                 <th className="p-4 text-center">Disputes</th>
                 <th className="p-4 text-center">Guilty</th>
                 <th className="p-4">Reputation Score</th>
                 <th className="p-4">Status</th>
                 <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-farm-border">
              {actors.map(actor => (
                <tr key={actor.id} className="hover:bg-farm-surface-2/50 transition-colors">
                  <td className="p-4">
                     <div className="flex items-center gap-2 font-mono text-farm-blue-light bg-farm-blue/10 px-2 py-1 rounded w-max">
                        {actor.id}
                        <button onClick={() => copyToClipboard(actor.id)} className="hover:text-white"><Copy size={12}/></button>
                     </div>
                  </td>
                  <td className="p-4">
                     <p className="font-bold text-farm-text text-base">{actor.name}</p>
                     <p className="text-[10px] font-bold text-farm-muted uppercase tracking-wider">{actor.role}</p>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-farm-muted">{actor.disputes}</td>
                  <td className="p-4 text-center font-mono font-bold text-farm-red">{actor.guilty}</td>
                  <td className="p-4"><RepGauge value={actor.rep} /></td>
                  <td className="p-4">{getStatusBadge(actor.status)}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                     <button className="btn-ghost text-xs px-2 py-1 hover:text-farm-blue border-farm-blue/30"><Search size={14}/></button>
                     {actor.status !== 'BLACKLISTED' && (
                       <button onClick={() => setConfirmBlacklist(actor)} className="btn-ghost text-xs px-2 py-1 border-farm-red/30 text-farm-red hover:bg-farm-red hover:text-white">
                         <Ban size={14}/>
                       </button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blacklist Confirmation Modal */}
      {confirmBlacklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="card w-full max-w-sm border-farm-red/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="w-12 h-12 bg-farm-red/20 text-farm-red rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24}/>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Confirm Blacklist</h2>
            <p className="text-sm text-farm-muted mb-6">Ban <strong className="text-farm-red">{confirmBlacklist.name} ({confirmBlacklist.id})</strong> at smart contract level? This action permanently disables their platform access and zeros their reputation score via consensus algorithm.</p>
            
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlacklist(null)} className="flex-1 btn-ghost border-farm-border">Cancel</button>
              <button onClick={executeBlacklist} className="flex-1 btn-primary bg-farm-red border-transparent text-white hover:bg-red-600">
                 CONFIRM BAN
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
