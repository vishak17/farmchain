/**
 * BlockchainExplorer.jsx
 *
 * A self-contained, real-time blockchain explorer for FarmChain.
 * Reads directly from the Hardhat local node via ethers.js — zero backend calls.
 *
 * Tabs
 *  1. Overview  — live block feed, network stats, recent event stream
 *  2. Batches   — all produce batches from both registries
 *  3. Custody   — select a batch → visual custody timeline
 *  4. Wallets   — all registered participants and their on-chain roles
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ethers }  from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { format }  from 'date-fns';
import {
  Box, Zap, Users, Activity, ChevronRight, Copy, Check,
  RefreshCw, ExternalLink, Search, Shield, Leaf, Truck,
  Package, ShoppingCart, Hash, Clock, ArrowRight, Loader2,
  AlertTriangle, CheckCircle2, XCircle, BarChart3, Filter,
} from 'lucide-react';
import {
  ADDRESSES, ABIS, RPC_URL, CHAIN_ROLES, BATCH_STATES, METHOD_LABELS, shortAddr,
} from '../../services/explorerConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function provider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function contract(name, prov) {
  return new ethers.Contract(ADDRESSES[name], ABIS[name], prov || provider());
}

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return [copied, copy];
}

function AddressChip({ addr, className = '' }) {
  const [copied, copy] = useCopy(addr || '');
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1 font-mono text-xs hover:text-farm-green transition-colors ${className}`}
      title={addr}
    >
      {shortAddr(addr)}
      {copied ? <Check size={10} className="text-farm-green" /> : <Copy size={10} className="opacity-40" />}
    </button>
  );
}

const ROLE_ICON = {
  FARMER: <Leaf size={12} className="text-farm-green" />,
  LOGISTICS: <Truck size={12} className="text-farm-blue" />,
  AGGREGATOR: <Package size={12} className="text-farm-amber" />,
  RETAILER: <ShoppingCart size={12} className="text-farm-purple" />,
  CONSUMER: <Users size={12} className="text-farm-muted" />,
  ADMIN: <Shield size={12} className="text-farm-red" />,
};

const STATE_COLORS = {
  HARVESTED:      'bg-farm-green/15 text-farm-green border-farm-green/30',
  IN_TRANSIT:     'bg-farm-blue/15 text-farm-blue-light border-farm-blue/30',
  AGGREGATED:     'bg-farm-amber/15 text-farm-amber border-farm-amber/30',
  RETAIL_ARRIVED: 'bg-farm-purple/15 text-farm-purple-light border-farm-purple/30',
  SOLD:           'bg-farm-muted/15 text-farm-muted border-farm-muted/30',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useNetworkStats() {
  const [stats, setStats] = useState({
    blockNumber: 0, gasPrice: '—', chainId: 31337, connected: false,
  });

  const refresh = useCallback(async () => {
    try {
      const p = provider();
      const [bn, gas, net] = await Promise.all([
        p.getBlockNumber(),
        p.getFeeData(),
        p.getNetwork(),
      ]);
      setStats({
        blockNumber: bn,
        gasPrice: gas.gasPrice ? ethers.formatUnits(gas.gasPrice, 'gwei') + ' gwei' : '—',
        chainId: Number(net.chainId),
        connected: true,
      });
    } catch {
      setStats(s => ({ ...s, connected: false }));
    }
  }, []);

  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, [refresh]);
  return [stats, refresh];
}

function useRecentBlocks(count = 8) {
  const [blocks, setBlocks] = useState([]);
  const latest = useRef(0);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const p = provider();
        const bn = await p.getBlockNumber();
        if (bn === latest.current) return;
        latest.current = bn;
        const nums = Array.from({ length: Math.min(count, bn + 1) }, (_, i) => bn - i);
        const fetched = await Promise.all(nums.map(n => p.getBlock(n, false)));
        if (active) setBlocks(fetched.filter(Boolean));
      } catch {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => { active = false; clearInterval(t); };
  }, [count]);

  return blocks;
}

function useEventStream() {
  const [events, setEvents] = useState([]);

  const pushEvent = useCallback((ev) => {
    setEvents(prev => [ev, ...prev].slice(0, 60));
  }, []);

  useEffect(() => {
    const p = provider();
    const batchReg = contract('BatchRegistry', p);
    const farmReg  = contract('FarmerRegistry', p);
    const fcReg    = contract('FarmChainRegistry', p);
    const prodBatch = contract('ProduceBatch', p);

    const handlers = [];

    const on = (c, ev, handler) => {
      c.on(ev, handler);
      handlers.push(() => c.off(ev, handler));
    };

    on(batchReg, 'BatchCreated', (batchId, farmer, produceType, originWeight, e) => {
      pushEvent({ type: 'BatchCreated', batchId, from: farmer, desc: `${produceType} · ${originWeight}g`, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-green', icon: '🌾' });
    });
    on(batchReg, 'CustodyTransferred', (batchId, node, newFRS, grade, e) => {
      pushEvent({ type: 'CustodyTransferred', batchId, from: node, desc: `FRS ${(Number(newFRS)/100).toFixed(2)}% · ${grade}`, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-blue', icon: '📦' });
    });
    on(batchReg, 'AnomalyFlagged', (batchId, anomalyType, e) => {
      pushEvent({ type: 'AnomalyFlagged', batchId, desc: anomalyType, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-red', icon: '⚠️' });
    });
    on(farmReg, 'FarmerRegistered', (id, wallet, name, village, e) => {
      pushEvent({ type: 'FarmerRegistered', from: wallet, desc: `${name} · ${village}`, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-amber', icon: '👤' });
    });
    on(fcReg, 'ParticipantRegistered', (wallet, role, _, e) => {
      pushEvent({ type: 'ParticipantRegistered', from: wallet, desc: `Role: ${CHAIN_ROLES[role] || role}`, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-amber', icon: '🔐' });
    });
    on(prodBatch, 'BatchMinted', (batchId, owner, e) => {
      pushEvent({ type: 'BatchMinted (NFT)', batchId: batchId.toString(), from: owner, desc: 'NFT minted', block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-green', icon: '🎫' });
    });
    on(prodBatch, 'CustodyAccepted', (batchId, newOwner, timestamp, e) => {
      pushEvent({ type: 'CustodyAccepted', batchId: batchId.toString(), from: newOwner, desc: `Accepted at ${format(new Date(Number(timestamp)*1000),'HH:mm:ss')}`, block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-blue', icon: '✅' });
    });
    on(prodBatch, 'BatchSold', (batchId, retailer, e) => {
      pushEvent({ type: 'BatchSold', batchId: batchId.toString(), from: retailer, desc: 'Batch sold to consumer', block: e.log.blockNumber, txHash: e.log.transactionHash, color: 'farm-muted', icon: '🏷️' });
    });

    return () => handlers.forEach(h => h());
  }, [pushEvent]);

  // Also seed with historical events on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = provider();
        const bn = await p.getBlockNumber();
        const from = Math.max(0, bn - 500);

        const queries = [
          contract('BatchRegistry',    p).queryFilter(contract('BatchRegistry',    p).filters.BatchCreated(),        from),
          contract('BatchRegistry',    p).queryFilter(contract('BatchRegistry',    p).filters.CustodyTransferred(),   from),
          contract('FarmerRegistry',   p).queryFilter(contract('FarmerRegistry',   p).filters.FarmerRegistered(),    from),
          contract('FarmChainRegistry',p).queryFilter(contract('FarmChainRegistry',p).filters.ParticipantRegistered(),from),
          contract('ProduceBatch',     p).queryFilter(contract('ProduceBatch',     p).filters.BatchMinted(),          from),
          contract('ProduceBatch',     p).queryFilter(contract('ProduceBatch',     p).filters.CustodyAccepted(),      from),
        ];

        const results = await Promise.allSettled(queries);
        const all = [];

        results[0].value?.forEach(e => all.push({ type:'BatchCreated',        batchId:e.args[0], from:e.args[1], desc:`${e.args[2]} · ${e.args[3]}g`,                block:e.blockNumber, txHash:e.transactionHash, color:'farm-green', icon:'🌾', ts:0 }));
        results[1].value?.forEach(e => all.push({ type:'CustodyTransferred',  batchId:e.args[0], from:e.args[1], desc:`FRS ${(Number(e.args[2])/100).toFixed(2)}%`,   block:e.blockNumber, txHash:e.transactionHash, color:'farm-blue',  icon:'📦', ts:0 }));
        results[2].value?.forEach(e => all.push({ type:'FarmerRegistered',    from:e.args[1],    desc:`${e.args[2]} · ${e.args[3]}`,                                  block:e.blockNumber, txHash:e.transactionHash, color:'farm-amber', icon:'👤', ts:0 }));
        results[3].value?.forEach(e => all.push({ type:'ParticipantRegistered',from:e.args[0],   desc:`Role: ${CHAIN_ROLES[Number(e.args[1])]||e.args[1]}`,           block:e.blockNumber, txHash:e.transactionHash, color:'farm-amber', icon:'🔐', ts:0 }));
        results[4].value?.forEach(e => all.push({ type:'BatchMinted (NFT)',   batchId:e.args[0].toString(), from:e.args[1], desc:'NFT minted',                        block:e.blockNumber, txHash:e.transactionHash, color:'farm-green', icon:'🎫', ts:0 }));
        results[5].value?.forEach(e => all.push({ type:'CustodyAccepted',     batchId:e.args[0].toString(), from:e.args[1], desc:'Custody accepted',                  block:e.blockNumber, txHash:e.transactionHash, color:'farm-blue',  icon:'✅', ts:0 }));

        all.sort((a,b) => b.block - a.block);
        if (active) setEvents(prev => [...all, ...prev].slice(0,60));
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ stats, blocks, events, batchCount, participantCount }) {
  const statCards = [
    { label: 'Block Height',   value: stats.blockNumber.toLocaleString(), icon: <Box size={18}/>,      color: 'farm-green'  },
    { label: 'Gas Price',      value: stats.gasPrice,                     icon: <Zap size={18}/>,      color: 'farm-amber'  },
    { label: 'Batches on Chain', value: batchCount,                       icon: <Leaf size={18}/>,     color: 'farm-blue'   },
    { label: 'Participants',   value: participantCount,                    icon: <Users size={18}/>,    color: 'farm-green'  },
    { label: 'Events (live)',  value: events.length,                       icon: <Activity size={18}/>, color: 'farm-amber'  },
    { label: 'Network Status', value: stats.connected ? 'ONLINE' : 'OFFLINE', icon: stats.connected ? <CheckCircle2 size={18}/> : <XCircle size={18}/>, color: stats.connected ? 'farm-green' : 'farm-red' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(s => (
          <div key={s.label} className={`p-4 bg-farm-surface-2 border border-farm-border rounded-xl`}>
            <div className={`flex items-center gap-1.5 text-${s.color} mb-2 text-xs uppercase tracking-widest font-bold`}>
              {s.icon} {s.label}
            </div>
            <div className={`text-2xl font-bold font-mono text-${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Live Block Feed */}
        <div className="bg-farm-surface-2 border border-farm-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-farm-border bg-farm-surface">
            <div className="flex items-center gap-2 text-farm-green text-xs font-bold uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-farm-green animate-pulse" />
              Live Blocks
            </div>
            <span className="text-farm-muted text-[10px]">polling every 5s</span>
          </div>
          <div className="divide-y divide-farm-border/50 max-h-72 overflow-y-auto">
            {blocks.length === 0 && (
              <div className="py-8 text-center text-farm-muted text-sm">Connecting to node…</div>
            )}
            {blocks.map((b, i) => (
              <motion.div
                key={b.number}
                initial={i === 0 ? { backgroundColor: 'rgba(74,222,128,0.15)' } : {}}
                animate={{ backgroundColor: 'transparent' }}
                transition={{ duration: 2 }}
                className="flex items-center justify-between px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-farm-green font-bold">#{b.number.toLocaleString()}</span>
                  <span className="text-farm-muted">{b.transactions.length} txs</span>
                </div>
                <div className="flex items-center gap-3 text-farm-muted">
                  <span className="font-mono">{b.gasUsed.toLocaleString()} gas</span>
                  <span>{b.timestamp ? format(new Date(b.timestamp * 1000), 'HH:mm:ss') : '—'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Event stream */}
        <div className="bg-farm-surface-2 border border-farm-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-farm-border bg-farm-surface">
            <div className="flex items-center gap-2 text-farm-amber text-xs font-bold uppercase tracking-wider">
              <Activity size={12} /> Event Stream
            </div>
            <span className="text-farm-muted text-[10px]">real-time</span>
          </div>
          <div className="divide-y divide-farm-border/50 max-h-72 overflow-y-auto font-mono">
            {events.length === 0 && (
              <div className="py-8 text-center text-farm-muted text-sm">No events yet. Submit a batch to see events.</div>
            )}
            <AnimatePresence initial={false}>
              {events.slice(0,20).map((ev, idx) => (
                <motion.div
                  key={`${ev.txHash}-${idx}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 px-4 py-2.5 text-xs hover:bg-farm-surface transition-colors"
                >
                  <span className="text-base leading-none mt-0.5">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-${ev.color} mb-0.5`}>{ev.type}</div>
                    <div className="text-farm-muted truncate">{ev.desc}</div>
                    {ev.from && <AddressChip addr={ev.from} className="text-farm-muted mt-0.5" />}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-farm-muted text-[10px]">#{ev.block}</div>
                    {ev.batchId && <div className="text-farm-muted text-[10px]">#{String(ev.batchId).slice(0,8)}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Batches Tab
// ─────────────────────────────────────────────────────────────────────────────
function BatchesTab({ onSelectBatch }) {
  const [batchIds,  setBatchIds]  = useState([]);
  const [nftBatches, setNftBatches] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('ALL');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = provider();
        const br  = contract('BatchRegistry', p);
        const pb  = contract('ProduceBatch',  p);

        const [legacyIds, nftCount] = await Promise.allSettled([
          br.getAllActiveBatches(),
          pb.totalBatches(),
        ]);

        if (active && legacyIds.status === 'fulfilled') {
          setBatchIds(legacyIds.value);
        }

        if (active && nftCount.status === 'fulfilled') {
          const total = Number(nftCount.value);
          const fetched = [];
          for (let i = 1; i <= total; i++) {
            try {
              const [b, state] = await Promise.all([pb.batches(i), pb.batchStates(i)]);
              fetched.push({
                id: i, batchId: i.toString(), produceType: b.produceType,
                weight: Number(b.wOrigin), items: Number(b.nItems),
                owner: b.currentOwner, harvestDate: new Date(Number(b.harvestDate)*1000),
                state: Number(state), isNFT: true,
              });
            } catch {}
          }
          if (active) setNftBatches(fetched);
        }
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const filtered = [
    ...batchIds.map(id => ({ batchId: id, isNFT: false })),
    ...nftBatches,
  ].filter(b => {
    if (search && !String(b.batchId).toLowerCase().includes(search.toLowerCase()) &&
        !String(b.produceType || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'NFT' && !b.isNFT) return false;
    if (filter === 'LEGACY' && b.isNFT) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-farm-muted" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search batch ID or produce type…"
            className="input pl-8 text-sm w-full" />
        </div>
        {['ALL','NFT','LEGACY'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
              ${filter===f ? 'bg-farm-green/20 border-farm-green text-farm-green' : 'btn-ghost'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-farm-green" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-farm-muted">No batches found. Register a produce batch first.</div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-farm-muted font-bold border-b border-farm-border">
            <span className="col-span-3">Batch ID</span>
            <span className="col-span-2">Produce</span>
            <span className="col-span-2">Weight</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Owner</span>
            <span className="col-span-1">Type</span>
          </div>
          <AnimatePresence>
            {filtered.map((b, i) => {
              const stateInfo = b.isNFT ? (BATCH_STATES[b.state] || BATCH_STATES[0]) : { label:'ACTIVE', color:'farm-green' };
              return (
                <motion.div
                  key={String(b.batchId)+i}
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelectBatch(b)}
                  className="grid grid-cols-12 gap-2 px-4 py-3 bg-farm-surface-2 border border-farm-border rounded-lg text-xs
                    hover:border-farm-green/50 hover:bg-farm-surface cursor-pointer transition-all group"
                >
                  <div className="col-span-3 font-mono text-farm-green font-bold flex items-center gap-1">
                    <Hash size={10} />
                    <span className="truncate">{String(b.batchId).slice(0,16)}</span>
                    <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-farm-green shrink-0" />
                  </div>
                  <div className="col-span-2 capitalize text-farm-text">{b.produceType || '—'}</div>
                  <div className="col-span-2 font-mono text-farm-muted">{b.weight ? `${b.weight.toLocaleString()}g` : '—'}</div>
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATE_COLORS[stateInfo.label] || STATE_COLORS.HARVESTED}`}>
                      {stateInfo.label}
                    </span>
                  </div>
                  <div className="col-span-2"><AddressChip addr={b.owner} /></div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-bold ${b.isNFT ? 'text-farm-amber' : 'text-farm-muted'}`}>
                      {b.isNFT ? 'NFT' : 'STD'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custody Chain Tab
// ─────────────────────────────────────────────────────────────────────────────
function CustodyTab({ preselectedBatch }) {
  const [batchId,   setBatchId]   = useState(preselectedBatch?.batchId || '');
  const [isNFT,     setIsNFT]     = useState(preselectedBatch?.isNFT ?? false);
  const [chain,     setChain]     = useState(null);
  const [nftEvents, setNftEvents] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (preselectedBatch) {
      setBatchId(preselectedBatch.batchId || '');
      setIsNFT(preselectedBatch.isNFT || false);
    }
  }, [preselectedBatch]);

  const lookup = async () => {
    if (!batchId) return;
    setLoading(true); setError(''); setChain(null); setNftEvents([]);
    try {
      const p = provider();
      if (isNFT) {
        const pb  = contract('ProduceBatch', p);
        const id  = Number(batchId);
        const [b, state, history] = await Promise.all([
          pb.batches(id), pb.batchStates(id), pb.getBatchTransitHistory(id),
        ]);
        // Also fetch events for this batchId
        const [minted, initiated, accepted, sold] = await Promise.allSettled([
          pb.queryFilter(pb.filters.BatchMinted(id)),
          pb.queryFilter(pb.filters.CustodyTransferInitiated(id)),
          pb.queryFilter(pb.filters.CustodyAccepted(id)),
          pb.queryFilter(pb.filters.BatchSold(id)),
        ]);
        const allEvs = [
          ...(minted.value    || []).map(e => ({ event:'BatchMinted',            from: e.args[1],  block:e.blockNumber, txHash:e.transactionHash })),
          ...(initiated.value || []).map(e => ({ event:'TransferInitiated',      from: e.args[1],  to:e.args[2], block:e.blockNumber, txHash:e.transactionHash })),
          ...(accepted.value  || []).map(e => ({ event:'CustodyAccepted',        from: e.args[1],  block:e.blockNumber, txHash:e.transactionHash, ts:Number(e.args[2]) })),
          ...(sold.value      || []).map(e => ({ event:'BatchSold',              from: e.args[1],  block:e.blockNumber, txHash:e.transactionHash })),
        ].sort((a,b)=>a.block-b.block);

        setNftEvents(allEvs);
        setChain({
          type:'nft', batchId:id, produceType:b.produceType, weight:Number(b.wOrigin),
          owner:b.currentOwner, state:Number(state), history:history.map(h=>h.toString()),
        });
      } else {
        const br = contract('BatchRegistry', p);
        const [b, c] = await Promise.all([br.getBatch(batchId), br.getCustodyChain(batchId)]);
        setChain({ type:'legacy', batchId, produceType:b.produceType, currentFRS:Number(b.currentFRS), grade:b.currentGrade, custody:c });
      }
    } catch(e) { setError(e.message || 'Batch not found'); }
    setLoading(false);
  };

  const nodeLabels = ['FARMER', 'TRANSPORT', 'AGGREGATOR', 'RETAILER'];

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex gap-3">
        <input value={batchId} onChange={e=>setBatchId(e.target.value)}
          placeholder="Enter Batch ID (e.g. 1 for NFT, or BTH-... for legacy)"
          className="input flex-1 font-mono text-sm"
          onKeyDown={e => e.key==='Enter' && lookup()} />
        <div className="flex gap-2">
          {['NFT','Legacy'].map(t => (
            <button key={t} onClick={() => setIsNFT(t==='NFT')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors
                ${(t==='NFT'&&isNFT)||(t==='Legacy'&&!isNFT) ? 'bg-farm-green/20 border-farm-green text-farm-green' : 'btn-ghost'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={lookup} disabled={loading} className="btn-primary px-5 flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14}/>}
          Trace
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-farm-red/10 border border-farm-red/30 rounded-lg text-farm-red text-sm">
          <AlertTriangle size={14}/> {error}
        </div>
      )}

      {/* NFT Timeline */}
      {chain?.type === 'nft' && (
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="space-y-5">
          {/* Header */}
          <div className="p-4 bg-farm-surface-2 border border-farm-green/30 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              ['Produce',    chain.produceType, 'text-farm-text capitalize'],
              ['Weight',     `${chain.weight.toLocaleString()} g`, 'font-mono text-farm-text'],
              ['State',      BATCH_STATES[chain.state]?.label, `text-${BATCH_STATES[chain.state]?.color}`],
              ['NFT Owner',  shortAddr(chain.owner), 'font-mono text-farm-green'],
            ].map(([l,v,c]) => (
              <div key={l}><div className="text-farm-muted uppercase tracking-wider mb-1">{l}</div><div className={`font-bold ${c}`}>{v}</div></div>
            ))}
          </div>

          {/* Event timeline */}
          <div className="relative">
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-farm-border" />
            <div className="space-y-4">
              {nftEvents.length === 0 && (
                <p className="text-farm-muted text-sm text-center py-8">No on-chain events found for this batch yet.</p>
              )}
              {nftEvents.map((ev, i) => {
                const isFirst = ev.event === 'BatchMinted';
                const isSold  = ev.event === 'BatchSold';
                return (
                  <motion.div key={i} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
                    className="flex items-start gap-4 relative">
                    {/* Node dot */}
                    <div className={`w-16 h-16 rounded-full border-2 flex-shrink-0 flex flex-col items-center justify-center z-10
                      ${isFirst ? 'border-farm-green bg-farm-green/20' : isSold ? 'border-farm-muted bg-farm-muted/20' : 'border-farm-blue bg-farm-blue/20'}`}>
                      <span className="text-xl">{isFirst?'🌾':isSold?'🏷️':ev.event==='CustodyAccepted'?'✅':'📡'}</span>
                    </div>
                    {/* Card */}
                    <div className="flex-1 bg-farm-surface-2 border border-farm-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-sm ${isFirst?'text-farm-green':isSold?'text-farm-muted':'text-farm-blue'}`}>{ev.event}</span>
                        <span className="text-farm-muted text-xs font-mono">Block #{ev.block}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-farm-muted">Wallet: </span><AddressChip addr={ev.from} className="text-farm-text" /></div>
                        {ev.to && <div><span className="text-farm-muted">→ To: </span><AddressChip addr={ev.to} className="text-farm-text" /></div>}
                        {ev.ts && <div><span className="text-farm-muted">Time: </span><span className="text-farm-text font-mono">{format(new Date(ev.ts*1000),'PPpp')}</span></div>}
                        <div className="col-span-2"><span className="text-farm-muted">TX: </span><AddressChip addr={ev.txHash} className="text-farm-green" /></div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Legacy custody chain */}
      {chain?.type === 'legacy' && (
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="space-y-5">
          <div className="p-4 bg-farm-surface-2 border border-farm-amber/30 rounded-xl grid grid-cols-3 gap-4 text-xs">
            {[
              ['Produce',  chain.produceType,                                    'text-farm-text capitalize'],
              ['FRS',      `${(chain.currentFRS/100).toFixed(2)}%`,              'font-mono text-farm-green'],
              ['Grade',    chain.grade,                                           'text-farm-amber'],
            ].map(([l,v,c]) => (
              <div key={l}><div className="text-farm-muted uppercase tracking-wider mb-1">{l}</div><div className={`font-bold ${c}`}>{v}</div></div>
            ))}
          </div>

          {/* Horizontal node flow */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-0 min-w-max">
              {chain.custody.map((hop, i) => {
                const frs = (Number(hop.frsBasisPoints)/100).toFixed(1);
                const nodeType = nodeLabels[Number(hop.nodeType)] || `NODE_${hop.nodeType}`;
                const isLast = i === chain.custody.length - 1;
                return (
                  <React.Fragment key={i}>
                    <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:i*0.1}}
                      className="flex flex-col items-center w-44">
                      {/* Circle */}
                      <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center mb-2
                        ${parseFloat(frs)>=80?'border-farm-green bg-farm-green/20':'border-farm-amber bg-farm-amber/20'}`}>
                        <span className="text-xl">{['🌾','🚛','📦','🏪'][Number(hop.nodeType)]||'📍'}</span>
                      </div>
                      <div className="text-xs font-bold text-farm-text mb-0.5">{nodeType}</div>
                      <AddressChip addr={hop.nodeWallet} className="text-farm-muted mb-1" />
                      <span className={`text-sm font-bold font-mono ${parseFloat(frs)>=80?'text-farm-green':'text-farm-amber'}`}>{frs}%</span>
                      <span className="text-[10px] text-farm-muted">{hop.grade}</span>
                      <span className="text-[10px] text-farm-muted">{hop.timestamp ? format(new Date(Number(hop.timestamp)*1000),'MMM d HH:mm') : ''}</span>
                    </motion.div>
                    {!isLast && (
                      <div className="flex flex-col items-center px-1">
                        <ArrowRight size={18} className="text-farm-border" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              {chain.custody.length === 0 && (
                <p className="text-farm-muted text-sm">No custody transfers recorded yet (only origin).</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!chain && !loading && !error && (
        <div className="py-24 text-center">
          <BarChart3 size={48} className="text-farm-border mx-auto mb-4" />
          <p className="text-farm-muted">Enter a batch ID above to trace its custody journey on-chain.</p>
          <p className="text-farm-muted text-sm mt-1">Use NFT mode for ProduceBatch tokens · Legacy mode for BatchRegistry batches.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallets / Participants Tab
// ─────────────────────────────────────────────────────────────────────────────
function WalletsTab() {
  const [participants, setParticipants] = useState([]);
  const [farmers,      setFarmers]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p   = provider();
        const fcr = contract('FarmChainRegistry', p);
        const fr  = contract('FarmerRegistry', p);

        const bn = await p.getBlockNumber();
        const fromBlock = Math.max(0, bn - 5000);

        const [regLogs, verLogs, farmerLogs] = await Promise.allSettled([
          fcr.queryFilter(fcr.filters.ParticipantRegistered(), fromBlock),
          fcr.queryFilter(fcr.filters.ParticipantVerified(), fromBlock),
          fr.queryFilter(fr.filters.FarmerRegistered(), fromBlock),
        ]);

        const verifiedSet = new Set(
          (verLogs.value || []).map(e => e.args[0].toLowerCase())
        );

        const pts = (regLogs.value || []).map(e => ({
          address:  e.args[0],
          role:     CHAIN_ROLES[Number(e.args[1])] || `ROLE_${e.args[1]}`,
          verified: verifiedSet.has(e.args[0].toLowerCase()),
          block:    e.blockNumber,
          txHash:   e.transactionHash,
        }));

        const fms = (farmerLogs.value || []).map(e => ({
          id:      Number(e.args[0]),
          address: e.args[1],
          name:    e.args[2],
          village: e.args[3],
          block:   e.blockNumber,
          txHash:  e.transactionHash,
        }));

        if (active) { setParticipants(pts); setFarmers(fms); }
      } catch(e) { console.warn('Wallets tab error:', e.message); }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-farm-green" size={32}/></div>
      ) : (
        <>
          {/* Chronicle Registry Participants */}
          <div>
            <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} className="text-farm-green"/> FarmChainRegistry Participants ({participants.length})
            </h3>
            {participants.length === 0 ? (
              <p className="text-farm-muted text-sm py-6 text-center">No participants registered via wallet connect yet.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p, i) => (
                  <motion.div key={p.address+i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                    className="flex items-center gap-4 px-4 py-3 bg-farm-surface-2 border border-farm-border rounded-lg text-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border
                      ${p.verified?'border-farm-green bg-farm-green/20':'border-farm-muted bg-farm-muted/10'}`}>
                      {ROLE_ICON[p.role] || <Users size={12}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <AddressChip addr={p.address} className="text-farm-text font-bold" />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${p.verified ? 'border-farm-green/40 text-farm-green bg-farm-green/10'
                                       : 'border-farm-muted/40 text-farm-muted bg-farm-muted/10'}`}>
                          {p.verified ? '✓ VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div className="text-farm-muted">Role: <span className="font-bold text-farm-text">{p.role}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-farm-muted text-[10px]">Block #{p.block}</div>
                      <AddressChip addr={p.txHash} className="text-farm-muted mt-0.5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Legacy Farmer Registry */}
          <div>
            <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider mb-3 flex items-center gap-2">
              <Leaf size={14} className="text-farm-green"/> FarmerRegistry ({farmers.length})
            </h3>
            {farmers.length === 0 ? (
              <p className="text-farm-muted text-sm py-6 text-center">No farmers registered on-chain yet.</p>
            ) : (
              <div className="space-y-2">
                {farmers.map((f, i) => (
                  <motion.div key={f.address+i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                    className="flex items-center gap-4 px-4 py-3 bg-farm-surface-2 border border-farm-border rounded-lg text-xs">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-farm-green bg-farm-green/20">
                      <Leaf size={12} className="text-farm-green"/>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-farm-text mb-0.5">{f.name} <span className="text-farm-muted font-normal">· {f.village}</span></div>
                      <AddressChip addr={f.address} className="text-farm-muted" />
                    </div>
                    <div className="text-right">
                      <div className="text-farm-muted text-[10px]">ID #{f.id}</div>
                      <div className="text-farm-muted text-[10px]">Block #{f.block}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Explorer Page
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'overview',  label:'Overview',       icon:<Activity size={14}/> },
  { id:'batches',   label:'Batches',         icon:<Leaf size={14}/> },
  { id:'custody',   label:'Custody Chains',  icon:<ArrowRight size={14}/> },
  { id:'wallets',   label:'Participants',    icon:<Users size={14}/> },
];

export default function BlockchainExplorer() {
  const [activeTab,       setActiveTab]       = useState('overview');
  const [selectedBatch,   setSelectedBatch]   = useState(null);
  const [batchCount,      setBatchCount]      = useState('—');
  const [participantCount,setParticipantCount]= useState('—');

  const [stats,  refreshStats] = useNetworkStats();
  const blocks  = useRecentBlocks(8);
  const events  = useEventStream();

  // Fetch aggregate counts
  useEffect(() => {
    (async () => {
      try {
        const p = provider();
        const [pb, fcr, br] = await Promise.allSettled([
          contract('ProduceBatch', p).totalBatches(),
          contract('FarmChainRegistry', p)
            .queryFilter(contract('FarmChainRegistry', p).filters.ParticipantRegistered(), 0),
          contract('BatchRegistry', p).getAllActiveBatches(),
        ]);
        const nftCount    = pb.status==='fulfilled' ? Number(pb.value) : 0;
        const legacyCount = br.status==='fulfilled' ? br.value.length : 0;
        setBatchCount(nftCount + legacyCount);
        if (fcr.status === 'fulfilled') setParticipantCount(fcr.value.length);
      } catch {}
    })();
  }, []);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setActiveTab('custody');
  };

  const contractList = [
    { name:'FarmerRegistry',    addr:ADDRESSES.FarmerRegistry,    color:'farm-green' },
    { name:'BatchRegistry',     addr:ADDRESSES.BatchRegistry,     color:'farm-blue'  },
    { name:'FarmChainRegistry', addr:ADDRESSES.FarmChainRegistry, color:'farm-amber' },
    { name:'ProduceBatch',      addr:ADDRESSES.ProduceBatch,      color:'farm-green' },
    { name:'DisputeEngine',     addr:ADDRESSES.DisputeEngine,     color:'farm-red'   },
    { name:'SubsidyEngine',     addr:ADDRESSES.SubsidyEngine,     color:'farm-amber' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-display">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-farm-text flex items-center gap-2">
            <span>🔍</span> FarmChain Blockchain Explorer
          </h1>
          <p className="text-farm-muted text-sm mt-1">
            Real-time produce tracking · Hardhat Localhost · ChainID {stats.chainId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold
            ${stats.connected ? 'border-farm-green/30 bg-farm-green/10 text-farm-green'
                              : 'border-farm-red/30 bg-farm-red/10 text-farm-red'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${stats.connected ? 'bg-farm-green animate-pulse' : 'bg-farm-red'}`}/>
            {stats.connected ? 'CONNECTED' : 'OFFLINE'}
          </div>
          <button onClick={refreshStats} className="btn-ghost text-xs flex items-center gap-1 px-3 py-1.5">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </div>

      {/* ── Contract Address Banner ──────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-1">
          {contractList.map(c => (
            <div key={c.name} className="flex items-center gap-2 px-3 py-2 bg-farm-surface-2 border border-farm-border rounded-lg text-xs shrink-0">
              <div className={`w-2 h-2 rounded-full bg-${c.color}`}/>
              <span className="text-farm-muted">{c.name}:</span>
              <AddressChip addr={c.addr} className="text-farm-text" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Nav ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-farm-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors relative
              ${activeTab===t.id ? 'text-farm-green' : 'text-farm-muted hover:text-farm-text'}`}
          >
            {t.icon} {t.label}
            {activeTab===t.id && (
              <motion.div layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-farm-green rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity:0, y:8 }}
          animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:-8 }}
          transition={{ duration:0.18 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats} blocks={blocks} events={events}
              batchCount={batchCount} participantCount={participantCount}
            />
          )}
          {activeTab === 'batches' && <BatchesTab onSelectBatch={handleSelectBatch} />}
          {activeTab === 'custody' && <CustodyTab preselectedBatch={selectedBatch} />}
          {activeTab === 'wallets' && <WalletsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
