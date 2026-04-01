import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Thermometer, Scale as ScaleIcon, Coins, RefreshCw, Zap, ShieldAlert, Activity, MapPin, Settings, X, Loader2, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import LiveFeed from '../../components/shared/LiveFeed';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Mock API Call
const fetchDashboardStats = () => new Promise(resolve => setTimeout(() => resolve({
  activeBatches: 1248,
  avgFrs: 91.2,
  openDisputes: 3,
  subsidyPool: 14.5,
  frsDistribution: [
    { name: 'A+', count: 450, color: '#16a34a' },
    { name: 'A', count: 320, color: '#22c55e' },
    { name: 'B', count: 280, color: '#f59e0b' },
    { name: 'C', count: 120, color: '#f97316' },
    { name: 'D', count: 78, color: '#ef4444' }
  ],
  inventory: [
    { name: 'Tomato', weight: 45000 },
    { name: 'Onion', weight: 38000 },
    { name: 'Banana', weight: 32000 },
    { name: 'Mango', weight: 28000 },
    { name: 'Potato', weight: 25000 }
  ]
}), 1000));

// CountUp helper component
const CountUp = ({ to, prefix = '', suffix = '', decimals = 0 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(progress * to);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to]);
  return <span>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = async () => {
    setLoading(true);
    const data = await fetchDashboardStats();
    setStats(data);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh 30s
    return () => clearInterval(interval);
  }, []);

  const triggerSimulation = () => {
    toast.success('Simulation tick triggered! Advancing network state...');
  };

  const processSubsidy = () => {
    toast.success('Processed 10 pending subsidies. Smart contracts executed.');
  };

  if (!stats && loading) return <div className="p-8 flex items-center justify-center text-farm-green h-full"><RefreshCw className="animate-spin" size={32}/></div>;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-farm-text">Network Command Center</h1>
           <p className="text-sm text-farm-muted flex items-center gap-2">
             <Activity size={14} className="text-farm-green animate-pulse" /> 
             Live Network Status • Last updated: {format(lastUpdated, 'HH:mm:ss')}
           </p>
        </div>
        <button onClick={loadData} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
           <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* TOP ROW: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="Active Batches" value={stats.activeBatches} icon={<Package/>} color="blue" />
        <KPIBox 
           title="Network Avg FRS" 
           value={stats.avgFrs} 
           suffix="%" 
           decimals={1} 
           icon={<Thermometer/>} 
           color={stats.avgFrs > 90 ? 'green' : stats.avgFrs > 80 ? 'amber' : 'red'} 
        />
        <KPIBox title="Open Disputes" value={stats.openDisputes} icon={<ScaleIcon/>} color={stats.openDisputes > 0 ? 'red' : 'green'} />
        <KPIBox title="Subsidy Pool" value={stats.subsidyPool} suffix=" ETH" decimals={2} icon={<Coins/>} color="green" />
      </div>

      {/* MIDDLE ROW: Charts & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[350px]">
        {/* FRS Distribution */}
        <div className="card h-full flex flex-col">
          <h3 className="text-sm font-bold text-farm-muted uppercase tracking-wider mb-4">FRS Grade Distribution</h3>
          <div className="flex-1 min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.frsDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                 <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} />
                 <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} />
                 <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true}>
                   {stats.frsDistribution.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Network Inventory */}
        <div className="card h-full flex flex-col">
           <h3 className="text-sm font-bold text-farm-muted uppercase tracking-wider mb-4">Top Inventory (kg)</h3>
           <div className="flex-1 min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.inventory} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                 <XAxis type="number" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} />
                 <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} width={60} />
                 <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} />
                 <Bar dataKey="weight" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={true} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Live Event Feed */}
        <div className="card h-full p-0 overflow-hidden flex flex-col border-farm-green/30">
          <div className="p-4 border-b border-farm-border bg-farm-surface-2">
            <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-farm-green" /> Network Event Stream
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
             <LiveFeed />
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Map & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Karnataka Map (simplified SVG) */}
        <div className="lg:col-span-2 card bg-[#0B1121] relative min-h-[400px] overflow-hidden flex flex-col items-center justify-center">
          <h3 className="absolute top-4 left-4 text-sm font-bold text-farm-text uppercase tracking-wider bg-farm-surface/80 px-3 py-1 rounded backdrop-blur border border-farm-border z-10">Live Depot Map</h3>
          
          <div className="relative w-full max-w-md aspect-[3/4] opacity-80 scale-90">
            {/* Extremely simplified Karnataka polygon bounding box style outline for atmospheric effect */}
            <svg viewBox="0 0 400 500" className="w-full h-full stroke-farm-border/50 fill-farm-surface-2/20 relative z-0">
              <path d="M150,20 L280,40 L350,150 L320,280 L250,380 L180,480 L120,400 L50,250 L80,100 Z" strokeWidth="2" strokeDasharray="4 4"/>
              
              {/* Route Lines */}
              <line x1="200" y1="350" x2="160" y2="420" stroke="#334155" strokeWidth="1" />
              <line x1="200" y1="350" x2="250" y2="380" stroke="#334155" strokeWidth="1" />
              <line x1="200" y1="350" x2="180" y2="280" stroke="#334155" strokeWidth="1" />
              <line x1="180" y1="280" x2="150" y2="150" stroke="#334155" strokeWidth="1" />
              <line x1="180" y1="280" x2="280" y2="200" stroke="#334155" strokeWidth="1" />
            </svg>
            
            {/* Nodes */}
            <MapNode x="200" y="350" name="Bengaluru HUB" isMain />
            <MapNode x="160" y="420" name="Mysuru" />
            <MapNode x="250" y="380" name="Kolar" />
            <MapNode x="180" y="280" name="Tumkur" />
            <MapNode x="150" y="150" name="Hubballi" />
            <MapNode x="280" y="200" name="Ballari" />

            {/* Simulated moving batches */}
            <MovingBatch start={{x: 180, y: 280}} end={{x: 200, y: 350}} color="#22c55e" delay={0} />
            <MovingBatch start={{x: 150, y: 150}} end={{x: 180, y: 280}} color="#f59e0b" delay={2} />
            <MovingBatch start={{x: 250, y: 380}} end={{x: 200, y: 350}} color="#16a34a" delay={1} />
            <MovingBatch start={{x: 280, y: 200}} end={{x: 180, y: 280}} color="#ef4444" delay={3} />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-farm-muted px-4 py-2 bg-farm-surface/80 rounded backdrop-blur border border-farm-border">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-farm-green"></div> Grade A</span>
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-farm-amber"></div> Grade B/C</span>
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-farm-red"></div> Grade D</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-2">Quick Actions</h3>
          
          <button onClick={processSubsidy} className="group relative w-full p-4 bg-farm-surface flex items-center gap-4 rounded-lg border border-farm-green/30 hover:border-farm-green transition-colors text-left overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-farm-green group-hover:w-2 transition-all"></div>
            <div className="w-10 h-10 rounded-full bg-farm-green/20 text-farm-green flex items-center justify-center flex-shrink-0">
               <Coins size={20} />
            </div>
            <div>
              <p className="font-bold text-farm-text">Process Subsidy Queue</p>
              <p className="text-xs text-farm-muted">10 farmers awaiting payout</p>
            </div>
          </button>

          <button onClick={triggerSimulation} className="group relative w-full p-4 bg-farm-surface flex items-center gap-4 rounded-lg border border-farm-blue/30 hover:border-farm-blue transition-colors text-left overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-farm-blue group-hover:w-2 transition-all"></div>
            <div className="w-10 h-10 rounded-full bg-farm-blue/20 text-farm-blue flex items-center justify-center flex-shrink-0">
               <Zap size={20} />
            </div>
            <div>
              <p className="font-bold text-farm-text">Trigger Simulation Tick</p>
              <p className="text-xs text-farm-muted">Advance network time safely</p>
            </div>
          </button>

          <div className="mt-auto pt-4 border-t border-farm-border">
             <button className="flex justify-between w-full p-3 rounded text-sm font-bold text-farm-red hover:bg-farm-red/10 transition-colors">
               <span className="flex items-center gap-2"><ShieldAlert size={16}/> View Bad Actors Network</span>
               <span>→</span>
             </button>
          </div>
        </div>
      </div>
      
      <DemoControls />
      <WSTicker />
    </div>
  );
}

// Subcomponents

const KPIBox = ({ title, value, suffix = '', decimals = 0, icon, color }) => {
  const colorMap = {
    green: 'text-farm-green bg-farm-green/10 border-farm-green/30',
    blue: 'text-farm-blue border-farm-blue/30 bg-farm-blue/10',
    amber: 'text-farm-amber border-farm-amber/30 bg-farm-amber/10',
    red: 'text-farm-red border-farm-red/30 bg-farm-red/10',
  };
  
  return (
    <div className={`card flex items-center gap-4 border ${colorMap[color].split(' ')[2]}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[color].split(' ').slice(0,2).join(' ')}`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <p className="text-sm font-medium text-farm-muted">{title}</p>
        <h3 className="text-2xl font-bold font-mono text-farm-text">
          <CountUp to={value} suffix={suffix} decimals={decimals} />
        </h3>
      </div>
    </div>
  );
};

const MapNode = ({ x, y, name, isMain = false }) => (
  <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}px`, top: `${y}px` }}>
    <div className={`rounded-full border-2 border-[#0B1121] shadow-xl flex items-center justify-center ${isMain ? 'w-6 h-6 bg-farm-green animate-pulse' : 'w-4 h-4 bg-farm-surface-3'}`}></div>
    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-bold text-farm-muted whitespace-nowrap bg-[#0B1121]/80 px-1 rounded">{name}</span>
  </div>
);

const MovingBatch = ({ start, end, color, delay }) => {
  return (
    <motion.div 
      className="absolute w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] z-20"
      style={{ backgroundColor: color, color: color, left: `${start.x}px`, top: `${start.y}px` }}
      animate={{ left: [`${start.x}px`, `${end.x}px`], top: [`${start.y}px`, `${end.y}px`] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: delay }}
    />
  );
};


// ----------------------------------------------------
// ADDED DEMO CONTROLS MODULE
// ----------------------------------------------------

const DemoControls = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);

  const executeAction = async (id, actionFn) => {
    setLoading(id);
    setResult(null);
    try {
      await actionFn();
      setResult({ id, status: 'Success! Executed.' });
    } catch (e) {
      setResult({ id, status: 'Error executing action.' });
    }
    setLoading(null);
    setTimeout(() => setResult(null), 5000);
  };

  const actions = [
    { id: 'register', icon: '🌱', label: 'Register New Batch', fn: () => api.post('/farmer/register-produce', { produceType: 'Tomato', weight: 10, category: 'STANDARD' }) },
    { id: 'transit', icon: '🚚', label: 'Simulate Transit Leg', fn: () => api.post('/admin/simulation/trigger') },
    { id: 'alert', icon: '⚠️', label: 'Inject FRS Alert', fn: () => api.post('/admin/simulation/trigger', { type: 'FRS_ALERT' }) },
    { id: 'dispute', icon: '⚖️', label: 'Create Mock Dispute', fn: () => api.post('/dispute/create', { batchId: 'BTH-DEMO', reason: 'Mock created by demo controls.', status: 'OPEN' }) },
    { id: 'subsidy', icon: '💰', label: 'Deposit Subsidy (1 ETH)', fn: () => api.post('/subsidy/deposit', { amount: 1 }) },
    { id: 'process', icon: '🔄', label: 'Process Subsidy Queue', fn: () => api.post('/subsidy/process', { batchSize: 5 }) },
  ];

  return (
    <div className="fixed bottom-16 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} className="bg-farm-surface-2 border border-farm-border rounded-xl shadow-2xl p-4 mb-4 w-72">
            <div className="flex justify-between items-center mb-4 border-b border-farm-border pb-2">
              <h3 className="font-bold text-farm-text">Admin Demo Controls</h3>
              <button onClick={() => setIsOpen(false)} className="text-farm-muted hover:text-farm-text"><X size={16}/></button>
            </div>
            <div className="space-y-3">
              {actions.map(a => (
                <div key={a.id}>
                  <button 
                    onClick={() => executeAction(a.id, a.fn)}
                    disabled={loading === a.id}
                    className="w-full text-left px-3 py-2 bg-farm-surface border border-farm-border rounded hover:border-farm-green transition-colors flex items-center justify-between text-sm text-farm-text group"
                  >
                    <span className="flex items-center gap-2"><span className="text-lg">{a.icon}</span> {a.label}</span>
                    {loading === a.id && <Loader2 size={14} className="animate-spin text-farm-green" />}
                  </button>
                  {result?.id === a.id && (
                    <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="text-[10px] text-farm-green mt-1 ml-1 flex items-center gap-1">
                       <CheckCircle2 size={10}/> {result.status}
                    </motion.p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-farm-green text-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(22,163,74,0.5)] hover:bg-farm-green-light transition-colors"
      >
        <Settings size={24} className={isOpen ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

// ----------------------------------------------------
// ADDED WS TICKER
// ----------------------------------------------------

const WSTicker = () => {
  const [events, setEvents] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = {
        id: Math.random().toString(),
        batchId: 'BTH-' + Math.floor(1000 + Math.random() * 9000),
        icon: ['🚚', '🌡️', '✅', '⚠️'][Math.floor(Math.random() * 4)],
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setEvents(prev => {
        const next = [...prev, newEvent];
        return next;
      });

      // Auto fade event after 8s
      setTimeout(() => {
        setEvents(current => current.filter(e => e.id !== newEvent.id));
      }, 8000);

    }, 4500);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-farm-surface-2 border border-farm-border rounded-t-lg px-4 py-1 flex items-center gap-2 text-xs text-farm-muted hover:text-farm-text z-40"
      >
        <Activity size={12}/> Show Live Ticker
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="bg-farm-surface-2/95 backdrop-blur border-t border-farm-border px-6 py-2 w-full max-w-4xl rounded-t-xl flex items-center justify-between pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 flex-1 overflow-hidden h-8">
          <Activity size={14} className="text-farm-green animate-pulse flex-shrink-0" />
          <span className="text-xs font-bold text-farm-muted uppercase tracking-widest mr-4 flex-shrink-0">Live Network Feed</span>
          
          <div className="flex gap-4">
            <AnimatePresence mode="popLayout">
              {events.map((ev) => (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  className="bg-[#0B1121] border border-farm-border px-3 py-1 rounded-full text-xs flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <span>{ev.icon}</span>
                  <span className="font-mono text-farm-blue-light font-bold tracking-wider">{ev.batchId}</span>
                  <span className="text-farm-muted text-[10px]">{ev.timestamp}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-farm-muted hover:text-farm-red ml-4"><X size={14}/></button>
      </div>
    </div>
  );
};
