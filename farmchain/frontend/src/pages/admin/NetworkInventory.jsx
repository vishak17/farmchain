import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, AlertTriangle, Box, Activity, ChevronRight, Filter, ShieldAlert } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const MOCK_MARKET_DATA = [
  { name: 'Tomato', registered: 45000, expected: 40000 },
  { name: 'Onion', registered: 82000, expected: 50000 }, // Manipulation!
  { name: 'Banana', registered: 32000, expected: 35000 },
  { name: 'Mango', registered: 28000, expected: 26000 },
  { name: 'Potato', registered: 25000, expected: 27000 },
  { name: 'Garlic', registered: 15000, expected: 14000 },
  { name: 'Ginger', registered: 18000, expected: 6000 }, // Manipulation!
  { name: 'Spinach', registered: 5000, expected: 5200 },
];

const MOCK_ALERTS = [
  { id: 1, type: 'MANIPULATION', message: 'Onion: 164% above expected market volume. Suspected sybil node registration.', severity: 'CRITICAL', icon: '🚨' },
  { id: 2, type: 'STALE_BATCH', message: 'Ginger: Batch BTH-GG-1022 stale at Middleman Depot (0x992C) for 34 hours.', severity: 'WARNING', icon: '⏳' },
  { id: 3, type: 'PRICE_IMPACT', message: 'Tomato: Sudden influx of 5,000kg in Bengaluru Urban expected to crash local FRS valuations.', severity: 'INFO', icon: '📉' },
];

export default function NetworkInventory() {
  const [queryState, setQueryState] = useState({ produce: 'All', nodeType: 'All' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleQuery = () => {
    setLoading(true);
    setResults(null);
    setTimeout(() => {
      setResults([
        { id: 'BTH-ON-9912', produce: 'Onion', weight: '2,500 kg', custodian: '0x1A2B...3C4D', role: 'Middleman', frs: 94, status: 'IN_TRANSIT' },
        { id: 'BTH-ON-8342', produce: 'Onion', weight: '1,200 kg', custodian: '0x88F1...90AA', role: 'Farmer', frs: 98, status: 'STORED' },
        { id: 'BTH-ON-1156', produce: 'Onion', weight: '4,000 kg', custodian: '0x4f8B...9a21', role: 'Middleman', frs: 82, status: 'STORED_WARNING' },
      ]);
      setLoading(false);
    }, 1200);
  };

  const statusBadge = (s) => ({
    'IN_TRANSIT': 'badge-blue',
    'STORED': 'badge-green',
    'STORED_WARNING': 'badge-amber',
  }[s]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-farm-text flex items-center gap-3">
           <Activity className="text-farm-blue-light" size={32} /> Real-Time Analytics
        </h1>
        <p className="text-farm-muted mt-2 text-sm">Market manipulation detection, aggregated supply analytics, and predictive intelligence.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COL: Chart */}
        <div className="lg:w-2/3 h-[450px] card border-farm-border flex flex-col p-4">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider flex items-center gap-2">
               <TrendingUp size={16} className="text-farm-green" /> Aggregated Market Volume (kg)
             </h3>
             <div className="flex items-center gap-4 text-xs font-bold font-mono">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-farm-blue/80"></div> Expected</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-farm-green"></div> Actual</span>
             </div>
           </div>

           <div className="flex-1 min-h-0 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={MOCK_MARKET_DATA} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                 <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3"/>
                 <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                 <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} dx={-10}  />
                 <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} />
                 
                 <Bar dataKey="registered" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={true}>
                   {MOCK_MARKET_DATA.map((entry, index) => {
                     // Flag manipulation if registered is way above expected baseline
                     const ratio = entry.registered / entry.expected;
                     let color = '#16a34a'; // normal green
                     if (ratio > 1.5) color = '#ef4444'; // critical red
                     else if (ratio > 1.1) color = '#f59e0b'; // warning amber
                     return <Cell key={`cell-${index}`} fill={color} />;
                   })}
                 </Bar>
                 <Line type="monotone" dataKey="expected" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a'}} />
               </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* RIGHT COL: Alerts */}
        <div className="card lg:w-1/3 border-farm-border flex flex-col p-4 bg-gradient-to-b from-[#0B1121] to-[#0f172a]">
          <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-farm-amber" /> Intelligence Alerts
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 p-1">
            {MOCK_ALERTS.map(alert => (
               <motion.div whileHover={{ scale: 1.02 }} key={alert.id} className={`p-4 rounded-lg border text-sm cursor-pointer shadow-sm transition-colors ${alert.severity === 'CRITICAL' ? 'bg-farm-red/10 border-farm-red/50 hover:bg-farm-red/20' : alert.severity === 'WARNING' ? 'bg-farm-amber/10 border-farm-amber/30 hover:bg-farm-amber/20' : 'bg-farm-surface-2 border-farm-blue/30 hover:border-farm-blue'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-base leading-none">{alert.icon}</span>
                     <span className={`font-mono font-bold tracking-widest text-[10px] px-2 py-0.5 rounded border ${alert.severity === 'CRITICAL' ? 'bg-farm-red text-white border-farm-red' : alert.severity === 'WARNING' ? 'text-farm-amber border-farm-amber bg-farm-amber/10' : 'text-farm-blue-light border-farm-blue/30'}`}>{alert.type}</span>
                   </div>
                   <button className="text-farm-muted hover:text-white"><ChevronRight size={16}/></button>
                 </div>
                 <p className="text-farm-text mt-2 font-bold leading-relaxed">{alert.message}</p>
               </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Query Tool */}
      <div className="card p-0 overflow-hidden border-farm-border">
         <div className="bg-farm-surface-2 p-6 border-b border-farm-border">
            <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-farm-blue" /> Interrogate Supply Chain
            </h3>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="w-full md:w-1/3">
                 <label className="block text-xs uppercase font-bold text-farm-muted tracking-wider mb-1">Target Resource</label>
                 <select value={queryState.produce} onChange={e=>setQueryState({...queryState, produce:e.target.value})} className="input py-2 text-sm bg-[#0B1121] border-farm-border">
                   <option>All Produce</option><option>Tomato</option><option>Onion</option><option>Banana</option><option>Ginger</option>
                 </select>
               </div>
               <div className="w-full md:w-1/3">
                 <label className="block text-xs uppercase font-bold text-farm-muted tracking-wider mb-1">Target Custodian Tier</label>
                 <select value={queryState.nodeType} onChange={e=>setQueryState({...queryState, nodeType:e.target.value})} className="input py-2 text-sm bg-[#0B1121] border-farm-border">
                   <option>All Tiers</option><option>Farmer</option><option>Middleman Depot</option><option>Retail Store</option>
                 </select>
               </div>
               <button onClick={handleQuery} disabled={loading} className="btn-primary w-full md:w-auto px-8 py-2 md:py-2 flex items-center justify-center gap-2">
                 {loading ? <Search className="animate-spin" size={16}/> : <Filter size={16}/>}
                 EXECUTE QUERY
               </button>
            </div>
         </div>

         <div className="min-h-[250px] relative bg-[#0B1121]">
            <AnimatePresence mode="wait">
               {loading && (
                 <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 flex flex-col items-center justify-center text-farm-blue-light gap-4 z-10 bg-[#0B1121]/50 backdrop-blur">
                   <Activity className="animate-spin" size={32} />
                   <p className="font-mono text-xs uppercase tracking-widest font-bold">Scanning Global Ledger...</p>
                 </motion.div>
               )}

               {!loading && !results && (
                 <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0 flex flex-col items-center justify-center text-farm-muted opacity-50 z-0">
                    <Box size={48} className="mb-2" />
                    <p className="text-sm font-bold">Awaiting instruction vectors.</p>
                 </motion.div>
               )}

               {!loading && results && (
                 <motion.div key="results" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="overflow-x-auto p-0">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="text-farm-muted uppercase text-[10px] tracking-widest font-bold border-b border-farm-border">
                        <tr>
                          <th className="p-4">Batch ID</th>
                          <th className="p-4">Produce</th>
                          <th className="p-4">Weight</th>
                          <th className="p-4">Current Custodian</th>
                          <th className="p-4">Live FRS</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-farm-border">
                       {results.map((r, i) => (
                         <motion.tr initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: i*0.1}} key={i} className="hover:bg-farm-surface-2 transition-colors">
                           <td className="p-4 font-mono font-bold text-farm-blue-light">{r.id}</td>
                           <td className="p-4 font-bold text-farm-text">{r.produce}</td>
                           <td className="p-4 font-mono text-farm-muted">{r.weight}</td>
                           <td className="p-4">
                             <span className="font-mono text-xs text-farm-text">{r.custodian}</span>
                             <span className="block text-[10px] text-farm-muted uppercase tracking-widest">{r.role}</span>
                           </td>
                           <td className={`p-4 font-mono font-bold ${r.frs < 85 ? 'text-farm-red' : 'text-farm-green-light'}`}>{r.frs}</td>
                           <td className="p-4 text-center">
                             <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold border ${statusBadge(r.status)}`}>{r.status.replace('_', ' ')}</span>
                           </td>
                         </motion.tr>
                       ))}
                       {results.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-farm-muted font-bold font-mono">No matching records found.</td></tr>}
                     </tbody>
                   </table>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
      
    </div>
  );
}
