import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Download, ShieldCheck, AlignLeft, AlertCircle, Clock, Check, TrendingUp, Cpu, Server, Play, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ETH_TO_INR = 200000;

const MOCK_QUEUE = [
  { id: '1', name: 'Lakshmamma R.', tier: 'Tier 1', land: 1.5, activity: 94, risk: 'HIGH', score: 98, lastDisbursed: null },
  { id: '2', name: 'Venkatappa', tier: 'Tier 1', land: 0.8, activity: 88, risk: 'HIGH', score: 95, lastDisbursed: null },
  { id: '3', name: 'Ramesh Gowda', tier: 'Tier 2', land: 2.2, activity: 95, risk: 'MEDIUM', score: 91, lastDisbursed: '6 mos ago' },
  { id: '4', name: 'Gowramma', tier: 'Tier 1', land: 1.0, activity: 72, risk: 'LOW', score: 85, lastDisbursed: null },
  { id: '5', name: 'Suresh Kumar', tier: 'Tier 3', land: 4.5, activity: 99, risk: 'LOW', score: 70, lastDisbursed: '2 mos ago' },
];

const MOCK_HISTORY = [
  { id: 'TX-1A', name: 'Manjula D.', amount: 0.15, date: Date.now() - 86400000, score: 96 },
  { id: 'TX-2B', name: 'Krishnappa', amount: 0.20, date: Date.now() - 172800000, score: 92 },
  { id: 'TX-3C', name: 'Ravi Reddy', amount: 0.10, date: Date.now() - 345600000, score: 89 },
];

export default function SubsidyControl() {
  const [stats, setStats] = useState({ pool: 45.5, disbursed: 128.2, farmers: 412, queue: MOCK_QUEUE.length, lastProcessed: new Date() });
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [batchSize, setBatchSize] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock endpoints
    setTimeout(() => {
      setQueue(MOCK_QUEUE.sort((a,b) => b.score - a.score));
      setHistory(MOCK_HISTORY);
      setLoading(false);
    }, 800);
  }, []);

  const simulateDeposit = () => {
    toast.success('Deposited 10 ETH into Subsidy DAO Pool');
    setStats(s => ({ ...s, pool: s.pool + 10 }));
  };

  const processBatch = async () => {
    if (queue.length === 0) return toast.error('Queue is empty');
    
    setProcessing(true);
    const count = Math.min(batchSize, queue.length);
    const processed = queue.slice(0, count);
    const newQueue = queue.slice(count);
    
    // Simulate real-time WS events
    for (let i = 0; i < processed.length; i++) {
      await new Promise(r => setTimeout(r, 600)); // Delay between Txns
      toast.success(`Disbursed to ${processed[i].name} (Score: ${processed[i].score})`, { icon: '💸' });
      setStats(s => ({
         ...s, 
         pool: Math.max(0, s.pool - 0.2), 
         disbursed: s.disbursed + 0.2, 
         farmers: s.farmers + 1,
         queue: s.queue - 1,
         lastProcessed: new Date()
      }));
      setHistory(prev => [{
         id: `TX-${Math.random().toString(36).substr(2,6)}`,
         name: processed[i].name,
         amount: 0.2,
         date: Date.now(),
         score: processed[i].score
      }, ...prev]);
    }
    
    setQueue(newQueue);
    setProcessing(false);
  };

  const disburseTop10 = () => {
    setBatchSize(10);
    processBatch();
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Activity className="animate-spin text-farm-green" size={32}/></div>;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      
      {/* HEADER & STATS */}
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-farm-text flex items-center gap-3">
               <Droplets className="text-farm-blue text-transparent fill-farm-blue" size={32} /> Subsidy Governance
            </h1>
            <p className="text-farm-muted mt-2 text-sm">Decentralized Autonomous Organization (DAO) fund management and algorithmic disbursement.</p>
          </div>
          <button onClick={simulateDeposit} className="btn-ghost text-sm flex items-center gap-2 border-farm-blue/30 hover:bg-farm-blue/10 hover:text-farm-blue hover:border-farm-blue transition-colors">
            <Coins size={16}/> Simulate Deposit (10 ETH)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Pool Balance" value={`${stats.pool.toFixed(1)} ETH`} subValue={`≈ ₹${(stats.pool * ETH_TO_INR).toLocaleString()}`} icon={<Server/>} color="blue" />
          <StatCard title="Total Disbursed" value={`${stats.disbursed.toFixed(1)} ETH`} subValue={`to ${stats.farmers} farmers`} icon={<TrendingUp/>} color="green" />
          <StatCard title="Priority Queue" value={stats.queue} subValue="farmers awaiting funds" icon={<AlignLeft/>} color={stats.queue > 0 ? "amber" : "green"} />
          <StatCard title="Last Execution" value={format(stats.lastProcessed, 'HH:mm')} subValue={format(stats.lastProcessed, 'MMM d, yyyy')} icon={<Clock/>} color="surface" />
        </div>
      </div>

      {/* PRIORITY QUEUE MAIN TABLE */}
      <div className="card p-0 overflow-hidden border-farm-green/20">
        <div className="p-6 border-b border-farm-border bg-farm-surface-2 flex flex-wrap justify-between items-center gap-4">
           <div>
             <h2 className="text-lg font-bold text-farm-text uppercase tracking-wider flex items-center gap-2">
               <Cpu size={20} className="text-farm-green" /> Algorithmic Priority Queue
             </h2>
             <p className="text-xs text-farm-muted mt-1">Smart contracts rank farmers autonomously via <strong className="text-farm-text">Income Tier + Rep Score + Risk Exposure</strong>.</p>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#0B1121] px-3 py-1.5 rounded border border-farm-border">
                <span className="text-xs text-farm-muted font-bold tracking-widest uppercase">Batch Size:</span>
                <input type="number" min="1" max="50" value={batchSize} onChange={e=>setBatchSize(Number(e.target.value))} className="bg-transparent border-b border-farm-border w-12 text-center text-farm-text focus:outline-none focus:border-farm-green font-mono" />
             </div>
             <button onClick={processBatch} disabled={processing || queue.length === 0} className="btn-primary py-2 px-6 flex items-center gap-2 shadow-lg shadow-farm-green/20 text-sm">
                {processing ? <Activity className="animate-spin" size={16}/> : <Play size={16} className="fill-white"/>}
                PROCESS BATCH
             </button>
             <button onClick={disburseTop10} disabled={processing || queue.length === 0} className="btn-ghost hidden md:flex items-center gap-2 text-sm text-farm-blue border-farm-blue/30 hover:bg-farm-blue/10">
                DISBURSE TOP 10
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0B1121] text-farm-muted uppercase text-[10px] tracking-widest font-bold border-b border-farm-border">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Farmer Info</th>
                <th className="p-4">Tier / Land</th>
                <th className="p-4">Crop Risk</th>
                <th className="p-4 w-64">Total Priority Score</th>
                <th className="p-4 text-center">Last Disbursed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-farm-border">
              <AnimatePresence>
                {queue.map((farmer, index) => (
                  <motion.tr 
                    initial={{opacity:0, background:'rgba(34, 197, 94, 0.2)'}} 
                    animate={{opacity:1, background:'transparent'}} 
                    exit={{opacity:0, x:-50, backgroundColor:'rgba(34, 197, 94, 0.5)'}}
                    key={farmer.id} 
                    className={`hover:bg-farm-surface-2 transition-colors ${index < 3 ? 'bg-farm-green/5' : ''}`}
                  >
                    <td className="p-4 text-center font-mono font-bold text-farm-muted">
                      {index < 3 ? <span className="text-farm-green-light">{index + 1}</span> : index + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-farm-text text-base flex items-center gap-2">
                         {farmer.name} 
                         {index < 3 && <span className="badge-green rounded text-[8px] uppercase tracking-widest py-0">Priority</span>}
                      </div>
                      <div className="text-xs text-farm-muted">Activity Score: <span className="text-farm-green-light font-bold font-mono">{farmer.activity}/100</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-farm-text font-bold">{farmer.tier}</div>
                      <div className="text-xs text-farm-muted font-mono">{farmer.land} acres</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${farmer.risk === 'HIGH' ? 'bg-farm-red/10 text-farm-red border-farm-red/30' : farmer.risk === 'MEDIUM' ? 'bg-farm-amber/10 text-farm-amber border-farm-amber/30' : 'bg-farm-green/10 text-farm-green border-farm-green/30'}`}>
                        {farmer.risk}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         <div className="text-xl font-bold font-mono text-farm-text w-8">{farmer.score}</div>
                         <div className="h-2 flex-1 bg-farm-surface-3 rounded-full overflow-hidden border border-farm-surface-3">
                           <div className="h-full bg-gradient-to-r from-farm-amber to-farm-green" style={{width: `${farmer.score}%`}}></div>
                         </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-xs font-mono text-farm-muted">
                      {farmer.lastDisbursed || <span className="text-farm-amber">Never</span>}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {queue.length === 0 && (
             <div className="text-center p-12 text-farm-muted flex flex-col items-center">
                <Check className="text-farm-green mb-2" size={32}/>
                <span>The subsidy queue is fully processed and empty.</span>
             </div>
          )}
        </div>
      </div>

      {/* DISBURSEMENT HISTORY */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-farm-border flex justify-between items-center bg-[#0B1121]">
           <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider flex items-center gap-2"><Clock size={16}/> Execution History</h3>
           <button className="text-xs font-bold text-farm-muted hover:text-farm-text flex items-center gap-1 border border-farm-border px-3 py-1.5 rounded">
             <Download size={12}/> Export CSV
           </button>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0B1121] text-farm-muted uppercase text-[10px] tracking-widest font-bold border-b border-farm-border">
                <tr>
                   <th className="p-4">Transaction Hash</th>
                   <th className="p-4">Recipient</th>
                   <th className="p-4">Amount (ETH)</th>
                   <th className="p-4">Prior Score</th>
                   <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-farm-border">
                 <AnimatePresence>
                   {history.map(row => (
                      <motion.tr initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} key={row.id} className="hover:bg-farm-surface-2 transition-colors">
                         <td className="p-4 font-mono text-farm-blue-light">{row.id}</td>
                         <td className="p-4 font-bold text-farm-text">{row.name}</td>
                         <td className="p-4 font-mono font-bold text-farm-green flex items-center gap-1"><Coins size={12}/> {row.amount}</td>
                         <td className="p-4 text-farm-muted">{row.score}</td>
                         <td className="p-4 text-right text-xs text-farm-muted">{format(row.date, 'PP pp')}</td>
                      </motion.tr>
                   ))}
                 </AnimatePresence>
              </tbody>
           </table>
        </div>
      </div>

    </div>
  );
}

const StatCard = ({ title, value, subValue, icon, color }) => {
  const colorMap = {
    blue: 'text-farm-blue bg-farm-blue/10 border-farm-blue/30',
    green: 'text-farm-green bg-farm-green/10 border-farm-green/30',
    amber: 'text-farm-amber bg-farm-amber/10 border-farm-amber/30',
    surface: 'text-farm-muted bg-farm-surface-2 border-farm-border',
  };
  return (
    <div className={`card flex items-center p-5 gap-4 border-b-4 ${colorMap[color].split(' ')[2]}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[color].split(' ').slice(0,2).join(' ')}`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <p className="text-xs font-bold text-farm-muted uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-xl font-bold font-mono text-farm-text leading-none">{value}</h3>
        <p className="text-[10px] text-farm-muted mt-1">{subValue}</p>
      </div>
    </div>
  );
};
