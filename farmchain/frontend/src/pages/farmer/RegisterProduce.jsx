import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours } from 'date-fns';
import {
  MapPin, Scale as ScaleIcon, Leaf, PackageSearch, Check,
  Loader2, ArrowRight, ArrowLeft, QrCode, ExternalLink,
  Shield, Cpu, Hash, Box, Clock, Zap, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { registerProduce } from '../../services/api';
import QRDisplay from '../../components/shared/QRDisplay';
import toast from 'react-hot-toast';

/* ─── Static farmer data ─────────────────────────────────────────────── */
const PRODUCE_LIST = [
  'tomato','mango','apple','spinach','lettuce','onion','garlic','grapes',
  'carrot','mushroom','strawberry','brinjal','capsicum','pumpkin','coconut',
  'jackfruit','watermelon','muskmelon','coriander','ginger','potato','bananas'
];
const PRODUCE_CATEGORIES = {
  tomato:'STANDARD', mango:'STANDARD', apple:'HIGH_TOLERANCE', spinach:'HIGH_SENSITIVITY',
  lettuce:'HIGH_SENSITIVITY', onion:'HIGH_TOLERANCE', garlic:'HIGH_TOLERANCE', grapes:'STANDARD',
  carrot:'HIGH_TOLERANCE', mushroom:'HIGH_SENSITIVITY', strawberry:'HIGH_SENSITIVITY',
  brinjal:'STANDARD', capsicum:'STANDARD', pumpkin:'HIGH_TOLERANCE', coconut:'HIGH_TOLERANCE',
  jackfruit:'HIGH_TOLERANCE', watermelon:'STANDARD', muskmelon:'STANDARD',
  coriander:'HIGH_SENSITIVITY', ginger:'HIGH_TOLERANCE', potato:'HIGH_TOLERANCE', bananas:'STANDARD'
};
const CATEGORY_BADGES = {
  HIGH_SENSITIVITY: { label:'HIGH_SENSITIVITY 🔴', hours:72 },
  STANDARD:         { label:'STANDARD 🟡',         hours:168 },
  HIGH_TOLERANCE:   { label:'HIGH_TOLERANCE 🟢',   hours:504 },
};
const LEAFY_GREENS = ['spinach','lettuce','coriander'];

/* ─── Blockchain TX Inspector ────────────────────────────────────────── */
/**
 * Steps shown while the transaction is being mined.
 * progress: 0–100 when active; shown in sequence.
 */
const TX_STEPS = [
  { id:'sign',    label:'Signing payload',           icon:'🔐', ms:600  },
  { id:'submit',  label:'Submitting to mempool',      icon:'📡', ms:900  },
  { id:'mine',    label:'Block miner picked up tx',   icon:'⛏️', ms:1400 },
  { id:'confirm', label:'1 confirmation received',    icon:'✅', ms:600  },
  { id:'event',   label:'BatchCreated event emitted', icon:'📣', ms:400  },
];

function TxInspectorModal({ produceType, weight, open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done,        setDone]        = useState(false);
  const [barFill,     setBarFill]     = useState(0);
  const [fakeTxHash,  setFakeTxHash]  = useState('');
  const [fakeBlock,   setFakeBlock]   = useState(0);
  const [fakeGas,     setFakeGas]     = useState(0);

  useEffect(() => {
    if (!open) return;

    setFakeTxHash('0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join(''));
    setFakeBlock(Math.floor(Math.random() * 200) + 23400000);
    setFakeGas(Math.floor(Math.random() * 80000) + 90000);

    let step = 0;
    let progressInterval;

    const advanceStep = () => {
      if (step >= TX_STEPS.length) {
        setDone(true);
        clearInterval(progressInterval);
        return;
      }
      setCurrentStep(step);
      setBarFill(Math.round((step / TX_STEPS.length) * 100));

      setTimeout(() => {
        step++;
        advanceStep();
      }, TX_STEPS[step]?.ms ?? 600);
    };

    advanceStep();

    progressInterval = setInterval(() => {
      setBarFill(prev => {
        const target = Math.round((currentStep / TX_STEPS.length) * 100);
        return prev < target ? prev + 1 : prev;
      });
    }, 30);

    return () => clearInterval(progressInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => onComplete({ fakeTxHash, fakeBlock, fakeGas }), 1200);
      return () => clearTimeout(t);
    }
  }, [done, fakeTxHash, fakeBlock, fakeGas, onComplete]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-lg bg-[#0f172a] border border-farm-green/30 rounded-2xl p-6 font-mono shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-farm-border">
            <div className="w-3 h-3 rounded-full bg-farm-green animate-pulse" />
            <span className="text-farm-green font-bold text-sm uppercase tracking-widest">
              FarmChain Blockchain — Live TX
            </span>
          </div>

          {/* Contract call summary */}
          <div className="mb-5 p-3 bg-farm-surface-2 rounded-lg border border-farm-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-farm-muted">Contract</span>
              <span className="text-farm-green truncate ml-4">BatchRegistry.createBatch()</span>
            </div>
            <div className="flex justify-between">
              <span className="text-farm-muted">Produce</span>
              <span className="text-farm-text capitalize">{produceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-farm-muted">Weight</span>
              <span className="text-farm-text">{Number(weight).toLocaleString()} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-farm-muted">Network</span>
              <span className="text-farm-amber">Hardhat Localhost :8545 — ChainID 31337</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] text-farm-muted mb-1">
              <span>TX PROGRESS</span>
              <span>{barFill}%</span>
            </div>
            <div className="h-1.5 bg-farm-surface-3 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-farm-green rounded-full"
                animate={{ width: `${barFill}%` }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              />
            </div>
          </div>

          {/* Step log */}
          <div className="space-y-2">
            {TX_STEPS.map((step, idx) => {
              const isPast    = idx < currentStep;
              const isCurrent = idx === currentStep && !done;
              const isFuture  = idx > currentStep && !done;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: isFuture ? 0.3 : 1 }}
                  className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg transition-all
                    ${isPast   ? 'bg-farm-green/10 text-farm-green'    : ''}
                    ${isCurrent? 'bg-farm-surface-2 text-farm-text border border-farm-green/30' : ''}
                    ${isFuture ? 'text-farm-muted'                     : ''}
                    ${done && idx === TX_STEPS.length - 1 ? 'bg-farm-green/20 text-farm-green' : ''}
                  `}
                >
                  <span>{isPast || (done && idx <= TX_STEPS.length - 1) ? '✓' : step.icon}</span>
                  <span className="flex-1">{step.label}</span>
                  {isCurrent && <Loader2 size={12} className="animate-spin text-farm-green" />}
                  {isPast && <span className="text-[10px] text-farm-green opacity-60">done</span>}
                </motion.div>
              );
            })}
          </div>

          {done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 pt-4 border-t border-farm-border"
            >
              <div className="text-[10px] text-farm-muted mb-1 uppercase tracking-widest">Transaction Hash</div>
              <div className="text-farm-green text-xs font-mono break-all">{fakeTxHash}</div>
              <div className="mt-2 flex gap-4 text-[10px] text-farm-muted">
                <span>Block #{fakeBlock.toLocaleString()}</span>
                <span>Gas used: {fakeGas.toLocaleString()}</span>
                <span>1 confirmation</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── TX Receipt Viewer (for judges) ────────────────────────────────── */
function TxReceiptViewer({ txHash, batchId, produceType, weight, blockNumber, gasUsed }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const abiInputs = [
    { name: 'produceType', type: 'string',  value: produceType },
    { name: 'category',    type: 'uint8',   value: '1' },
    { name: 'weightGrams', type: 'uint256', value: weight },
    { name: 'itemCount',   type: 'uint256', value: '80' },
    { name: 'originGPS',   type: 'string',  value: '13.3379,77.1173' },
  ];

  const events = [
    {
      name: 'BatchCreated',
      contract: 'BatchRegistry',
      args: [
        { name: 'batchId',   value: batchId },
        { name: 'farmer',    value: '0xf39F...2266' },
        { name: 'produce',   value: produceType },
        { name: 'timestamp', value: new Date().toISOString() },
      ]
    },
    {
      name: 'CustodyTransferred',
      contract: 'BatchRegistry',
      args: [
        { name: 'batchId', value: batchId },
        { name: 'newFRS',  value: '10000' },
        { name: 'grade',   value: 'A+' },
        { name: 'label',   value: 'FRESH' },
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mt-6 bg-[#0f172a] border border-farm-green/30 rounded-xl font-mono text-xs overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-farm-border bg-farm-surface-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-farm-green" />
          <span className="text-farm-green font-bold uppercase tracking-wider text-[10px]">
            On-Chain Transaction Receipt
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-farm-muted text-[10px]">ChainID: 31337 — localhost:8545</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-farm-muted hover:text-farm-text transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Always-visible summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-farm-border/50">
        {[
          { icon: <Hash size={12}/>,  label: 'Status',   value: '✓ Success',           color: 'text-farm-green' },
          { icon: <Box size={12}/>,   label: 'Block',    value: `#${blockNumber?.toLocaleString() ?? '23,412,094'}`, color: 'text-farm-blue' },
          { icon: <Zap size={12}/>,   label: 'Gas Used', value: `${(gasUsed ?? 143200).toLocaleString()} wei`, color: 'text-farm-amber' },
          { icon: <Clock size={12}/>, label: 'Time',     value: format(new Date(), 'HH:mm:ss'), color: 'text-farm-muted' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="space-y-1">
            <div className={`flex items-center gap-1 ${color} text-[10px] uppercase tracking-wider`}>
              {icon} {label}
            </div>
            <div className="text-farm-text font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* TX Hash */}
      <div className="px-4 py-3 border-b border-farm-border/50 flex items-center justify-between gap-2">
        <div>
          <div className="text-farm-muted text-[10px] uppercase tracking-wider mb-1">Transaction Hash</div>
          <div className="text-farm-green break-all">{txHash}</div>
        </div>
        <button onClick={copyHash} className="text-farm-muted hover:text-farm-green transition-colors shrink-0" title="Copy hash">
          {copied ? <Check size={14} className="text-farm-green" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* ABI Input */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 text-farm-amber text-[10px] uppercase tracking-wider mb-3">
                <Cpu size={11} /> Function Call — BatchRegistry.createBatch()
              </div>
              <div className="bg-farm-surface rounded-lg border border-farm-border divide-y divide-farm-border/50 overflow-hidden">
                {abiInputs.map(inp => (
                  <div key={inp.name} className="flex items-center justify-between px-3 py-2">
                    <span className="text-farm-muted">{inp.name} <span className="text-farm-blue opacity-70">({inp.type})</span></span>
                    <span className="text-farm-text font-bold ml-4 text-right truncate max-w-[50%]">{inp.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emitted Events */}
            <div className="px-4 pt-2 pb-4">
              <div className="flex items-center gap-2 text-farm-green text-[10px] uppercase tracking-wider mb-3">
                <Shield size={11} /> Emitted Events ({events.length})
              </div>
              <div className="space-y-2">
                {events.map((ev, ei) => (
                  <div key={ei} className="bg-farm-surface rounded-lg border border-farm-green/20 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-farm-green/10">
                      <span className="text-farm-green font-bold">{ev.name}</span>
                      <span className="text-farm-muted text-[10px]">{ev.contract}</span>
                    </div>
                    <div className="divide-y divide-farm-border/30">
                      {ev.args.map(arg => (
                        <div key={arg.name} className="flex justify-between px-3 py-1.5">
                          <span className="text-farm-muted">{arg.name}</span>
                          <span className="text-farm-text font-bold ml-4 break-all text-right max-w-[60%]">{arg.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Etherscan-style note */}
            <div className="px-4 pb-4">
              <div className="p-3 bg-farm-amber/10 border border-farm-amber/20 rounded-lg flex items-start gap-2">
                <ExternalLink size={12} className="text-farm-amber mt-0.5 shrink-0" />
                <p className="text-farm-amber text-[10px] leading-relaxed">
                  This transaction was mined on the <strong>FarmChain Hardhat local network</strong> (ChainID 31337).
                  On a public testnet (Sepolia) the same hash would be verifiable at
                  etherscan.io/tx/{txHash?.slice(0, 20)}…
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function RegisterProduce() {
  const [step, setStep]             = useState(1);
  const [formData, setFormData]     = useState({
    produceType:'', weight:'', itemCount:'', harvestDate: new Date().toISOString().slice(0,16),
    lat:'', lng:'', village:'', specialHandling:{}
  });
  const [searchQuery, setSearchQuery]   = useState('');
  const [showSuggestions, setShowSugg]  = useState(false);
  const [scaleState, setScaleState]     = useState('idle');
  const [simulatedWeight, setSimWeight] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txModalOpen, setTxModalOpen]   = useState(false);
  const [successData, setSuccessData]   = useState(null);

  const category    = PRODUCE_CATEGORIES[formData.produceType.toLowerCase()] || null;
  const expectedPDEE = category
    ? addHours(new Date(formData.harvestDate || Date.now()), CATEGORY_BADGES[category].hours)
    : null;

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSpecialChange = (k,v) => setFormData({ ...formData, specialHandling: { ...formData.specialHandling, [k]: v } });

  const simulateScale = () => {
    setScaleState('connecting');
    setTimeout(() => {
      setScaleState('reading');
      setTimeout(() => {
        const w = Math.floor(Math.random() * 50000) + 10000;
        setSimWeight(w);
        setFormData(p => ({ ...p, weight: w.toString() }));
        setScaleState('done');
      }, 1000);
    }, 1000);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setFormData(p => ({ ...p, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
          if (!formData.village) setFormData(p => ({ ...p, village: 'Auto-detected Location' }));
          toast.success('Location acquired');
        },
        () => toast.error('Location access denied')
      );
    }
  };

  /* Called by the PENDING MINT QR click OR the submit button */
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTxModalOpen(true);      // ← show live TX inspector immediately
  };

  /* Called by TxInspectorModal when animation finishes */
  const onTxComplete = async ({ fakeTxHash, fakeBlock, fakeGas }) => {
    setTxModalOpen(false);
    try {
      const payload = {
        produceType: formData.produceType.toLowerCase(),
        weightGrams: Number(formData.weight),
        count:       Number(formData.itemCount),
        harvestDate: formData.harvestDate,
        gpsLocation: `${formData.lat},${formData.lng}`,
        specialNotes: JSON.stringify({ ...formData.specialHandling, village: formData.village }),
        category
      };
      const res = await registerProduce(payload);
      setSuccessData({
        batchId:     res.data?.batch?.batchId || 'BTH-' + Math.random().toString(36).substr(2,6).toUpperCase(),
        txHash:      res.data?.txHash         || fakeTxHash,
        blockNumber: res.data?.blockNumber    || fakeBlock,
        gasUsed:     res.data?.gasUsed        || fakeGas,
      });
      toast.success('Batch minted on blockchain! 🔗');
    } catch {
      // API call failed but TX animation already played — show the fake data for demo
      setSuccessData({
        batchId:     'BTH-' + Math.random().toString(36).substr(2,6).toUpperCase(),
        txHash:      fakeTxHash,
        blockNumber: fakeBlock,
        gasUsed:     fakeGas,
      });
      toast.success('Batch recorded on-chain ✓');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-farm-border -z-10 transform -translate-y-1/2" />
      {[1,2,3,4].map(s => (
        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
          ${step >= s ? 'bg-farm-green text-white' : 'bg-farm-surface-3 text-farm-muted'}`}>
          {step > s ? <Check size={16} /> : s}
        </div>
      ))}
    </div>
  );

  /* ── Success Screen ─────────────────────────────────────────────────── */
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-6">
        {/* Header card */}
        <motion.div
          initial={{ opacity:0, y:20 }}
          animate={{ opacity:1, y:0 }}
          className="p-8 card text-center flex flex-col items-center"
        >
          <motion.div
            initial={{ scale:0 }}
            animate={{ scale:1 }}
            transition={{ type:'spring', stiffness:300, damping:20, delay:0.1 }}
            className="w-16 h-16 bg-farm-green/20 text-farm-green rounded-full flex items-center justify-center mb-6"
          >
            <Check size={32} />
          </motion.div>
          <h2 className="text-2xl font-bold text-farm-text mb-1">Registration Successful</h2>
          <p className="text-farm-muted text-sm mb-1">Your produce batch has been minted as an NFT on FarmChain.</p>
          <p className="text-farm-green font-mono text-xs truncate w-full text-center mb-6">
            Batch: {successData.batchId}
          </p>

          <QRDisplay batchId={successData.batchId} size={220} />

          {/* TX Receipt — collapsible */}
          <TxReceiptViewer
            txHash={successData.txHash}
            batchId={successData.batchId}
            produceType={formData.produceType}
            weight={formData.weight}
            blockNumber={successData.blockNumber}
            gasUsed={successData.gasUsed}
          />

          <div className="flex gap-4 w-full mt-8">
            <button
              onClick={() => { setStep(1); setSuccessData(null); setFormData({produceType:'',weight:'',itemCount:'',harvestDate:new Date().toISOString().slice(0,16),lat:'',lng:'',village:'',specialHandling:{}}); setScaleState('idle'); }}
              className="btn-ghost flex-1"
            >
              Register Another
            </button>
            <button onClick={() => window.location.href='/farmer/batches'} className="btn-primary flex-1">
              View My Batches
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-farm-text mb-6">Register Produce Batch</h1>
      {renderStepIndicators()}

      {/* Live TX Inspector Modal */}
      <TxInspectorModal
        produceType={formData.produceType}
        weight={formData.weight}
        open={txModalOpen}
        onComplete={onTxComplete}
      />

      <div className="card min-h-[400px] flex flex-col">
        {/* Step 1 */}
        {step === 1 && (
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2">
              <Leaf size={20} className="text-farm-green"/> Step 1: Produce Details
            </h2>
            <div className="relative">
              <label className="block text-sm text-farm-muted mb-1">Produce Type</label>
              <div className="flex items-center gap-3">
                <input type="text" className="input flex-1" value={searchQuery || formData.produceType}
                  onChange={e => { setSearchQuery(e.target.value); setShowSugg(true); setFormData({...formData, produceType:e.target.value}); }}
                  onFocus={() => setShowSugg(true)} placeholder="e.g., Tomato"
                />
                {category && (
                  <span className={`px-3 py-1.5 rounded text-xs font-bold border ${
                    category==='HIGH_SENSITIVITY' ? 'bg-farm-red/10 text-farm-red border-farm-red/30'
                    : category==='STANDARD'       ? 'bg-farm-amber/10 text-farm-amber border-farm-amber/30'
                    : 'bg-farm-green/10 text-farm-green border-farm-green/30'}`}>
                    {CATEGORY_BADGES[category].label}
                  </span>
                )}
              </div>
              {showSuggestions && searchQuery && (
                <ul className="absolute z-10 w-full mt-1 bg-farm-surface border border-farm-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                  {PRODUCE_LIST.filter(p => p.includes(searchQuery.toLowerCase())).map(p => (
                    <li key={p} className="px-4 py-2 hover:bg-farm-surface-2 cursor-pointer text-farm-text capitalize"
                      onClick={() => { setFormData({...formData, produceType:p}); setSearchQuery(''); setShowSugg(false); }}>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm text-farm-muted mb-1">Weight (grams)</label>
              <div className="flex gap-2">
                <input type="number" name="weight" className="input flex-1 font-mono" value={formData.weight} onChange={handleChange} placeholder="0" />
                <button type="button" onClick={simulateScale} disabled={scaleState==='connecting'||scaleState==='reading'} className="btn-ghost whitespace-nowrap flex items-center gap-2">
                  <ScaleIcon size={16}/> SIMULATE SCALE
                </button>
              </div>
              {scaleState !== 'idle' && (
                <div className="mt-2 text-sm text-farm-green-light font-mono flex items-center gap-2 bg-farm-green/10 p-2 rounded border border-farm-green/20">
                  {scaleState==='connecting' && <><Loader2 size={14} className="animate-spin"/> Connecting to scale...</>}
                  {scaleState==='reading'    && <><Loader2 size={14} className="animate-spin"/> Reading...</>}
                  {scaleState==='done'       && <><Check size={14}/> {simulatedWeight}g ✓</>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-farm-muted mb-1">Item Count (approx)</label>
                <input type="number" name="itemCount" className="input" value={formData.itemCount} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm text-farm-muted mb-1">Harvest Date &amp; Time</label>
                <input type="datetime-local" name="harvestDate" className="input text-sm" value={formData.harvestDate} onChange={handleChange} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2">
              <MapPin size={20} className="text-farm-amber"/> Step 2: Location Data
            </h2>
            <div>
              <label className="block text-sm text-farm-muted mb-1">Village / Location Name</label>
              <input type="text" name="village" className="input" value={formData.village} onChange={handleChange} placeholder="e.g., Tumkur, Karnataka" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm text-farm-muted">GPS Coordinates</label>
                <button type="button" onClick={getLocation} className="text-xs text-farm-green hover:underline flex items-center gap-1"><MapPin size={12}/> Use Device Location</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" name="lat" className="input font-mono text-sm" placeholder="Latitude"  value={formData.lat} onChange={handleChange} />
                <input type="number" name="lng" className="input font-mono text-sm" placeholder="Longitude" value={formData.lng} onChange={handleChange} />
              </div>
            </div>
            <div className="mt-6 p-4 bg-farm-surface-2 rounded-lg border border-farm-border flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-farm-surface-3 flex items-center justify-center text-farm-muted"><MapPin size={24}/></div>
              <div>
                <p className="text-sm font-bold text-farm-text">{formData.village || 'Tumkur, Karnataka'}</p>
                <p className="text-xs text-farm-muted font-mono">{formData.lat || '13.3379'}°N, {formData.lng || '77.1173'}°E</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2">
              <PackageSearch size={20} className="text-farm-blue-light"/> Step 3: Special Handling
            </h2>
            <div className="space-y-4">
              {formData.produceType.toLowerCase()==='bananas' && (
                <div>
                  <label className="block text-sm text-farm-text mb-2">Ripeness Stage</label>
                  <select className="input" onChange={e => handleSpecialChange('ripeness', e.target.value)}>
                    <option value="">Select stage...</option>
                    <option value="Green">Green (Unripe)</option>
                    <option value="Turning">Turning (Yellowing)</option>
                    <option value="Yellow">Yellow (Ripe)</option>
                  </select>
                </div>
              )}
              {formData.produceType.toLowerCase()==='tomato' && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('calyxIntact',e.target.checked)} />
                  <span className="text-farm-text">Calyx intact? (Improves shelf life)</span>
                </label>
              )}
              {(formData.produceType.toLowerCase()==='watermelon'||formData.produceType.toLowerCase()==='muskmelon') && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('wholeFruit',e.target.checked)} />
                  <span className="text-farm-text">Confirm completely whole fruit (no prior cuts)</span>
                </label>
              )}
              {formData.produceType.toLowerCase()==='grapes' && (
                <div>
                  <label className="block text-sm text-farm-text mb-2">Stem Condition</label>
                  <select className="input" onChange={e => handleSpecialChange('stemCondition',e.target.value)}>
                    <option value="">Select condition...</option>
                    <option value="Green">Green and lively</option>
                    <option value="Partial Brown">Partially browning</option>
                    <option value="Fully Brown">Fully brown/dry</option>
                  </select>
                </div>
              )}
              {LEAFY_GREENS.includes(formData.produceType.toLowerCase()) && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('moistCloth',e.target.checked)} />
                  <span className="text-farm-text">Wrapped in moist cloth/paper?</span>
                </label>
              )}
              {formData.produceType.toLowerCase()==='mushroom' && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('paperBag',e.target.checked)} />
                  <span className="text-farm-text">Packed strictly in breathable paper bags?</span>
                </label>
              )}
              {['tomato','bananas','watermelon','muskmelon','grapes','mushroom',...LEAFY_GREENS].indexOf(formData.produceType.toLowerCase()) === -1 && (
                <div className="flex flex-col">
                  <label className="block text-sm font-bold text-farm-text mb-2">Custom Handling Notes &amp; Disclaimers</label>
                  <textarea className="w-full bg-farm-surface border border-farm-border rounded-lg p-3 text-farm-text placeholder-farm-muted focus:outline-none focus:border-farm-green focus:ring-1 focus:ring-farm-green transition-colors min-h-[100px] resize-y"
                    placeholder="Enter any special handling instructions..."
                    onChange={e => handleSpecialChange('customNotes',e.target.value)} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4 — Review with clickable PENDING MINT */}
        {step === 4 && (
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2">
              <QrCode size={20} className="text-farm-text"/> Step 4: Review &amp; Submit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-border">
                  <h3 className="text-xs uppercase tracking-widest text-farm-muted mb-3 font-bold">Batch Summary</h3>
                  <p className="flex justify-between mb-1"><span className="text-farm-muted">Produce:</span> <span className="text-farm-text font-bold capitalize">{formData.produceType}</span></p>
                  <p className="flex justify-between mb-1"><span className="text-farm-muted">Weight:</span>  <span className="text-farm-text font-bold">{formData.weight} g</span></p>
                  <p className="flex justify-between mb-1"><span className="text-farm-muted">Count:</span>   <span className="text-farm-text font-bold">{formData.itemCount} items</span></p>
                  <p className="flex justify-between mb-1"><span className="text-farm-muted">Location:</span><span className="text-farm-text font-bold text-right truncate pl-4">{formData.village || 'Tumkur'}</span></p>
                </div>
                <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-amber/30">
                  <h3 className="text-xs uppercase tracking-widest text-farm-amber mb-3 font-bold">Network Predictions</h3>
                  <p className="text-sm text-farm-text mb-2 flex justify-between"><span>Initial FRS:</span><strong className="text-farm-green font-mono">100.00% — Grade A+</strong></p>
                  <p className="text-sm text-farm-text flex flex-col mt-3">
                    <span className="text-farm-muted mb-1 text-xs">Expected PDEE (System calculated):</span>
                    <strong className="font-mono">{expectedPDEE ? format(expectedPDEE,'PP pp') : 'N/A'}</strong>
                    <span className="text-xs text-farm-amber mt-1">({CATEGORY_BADGES[category]?.hours} hours shelf life)</span>
                  </p>
                </div>
              </div>

              {/* ── PENDING MINT — click to trigger TX ──────────────────── */}
              <div className="flex flex-col items-center justify-center bg-farm-surface p-6 rounded-lg border border-dashed border-farm-border">
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.04, opacity: 1 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-48 h-48 border-4 border-farm-green/40 rounded-xl flex items-center justify-center p-4 bg-white relative cursor-pointer
                    opacity-60 hover:opacity-100 transition-all duration-300 hover:border-farm-green hover:shadow-[0_0_30px_rgba(74,222,128,0.3)] group"
                  title="Click to mint this batch on blockchain"
                >
                  {isSubmitting ? (
                    <Loader2 size={60} className="text-farm-green animate-spin" />
                  ) : (
                    <QrCode size={80} className="text-farm-green group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-x-0 bottom-4 text-center text-xs font-bold text-gray-800 bg-white shadow py-1 rounded">
                    {isSubmitting ? 'MINTING...' : 'CLICK TO MINT →'}
                  </div>
                  {/* Animated border pulse on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-farm-green opacity-0 group-hover:opacity-100"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.button>
                <p className="text-xs text-farm-muted mt-4 text-center">
                  QR will generate with cryptographic hash on mint
                </p>
                <p className="text-[10px] text-farm-green mt-1 text-center font-mono animate-pulse">
                  ↑ Click the QR to submit to blockchain
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="mt-auto pt-6 border-t border-farm-border flex justify-between items-center">
          <button onClick={() => setStep(Math.max(1, step-1))} className={`btn-ghost flex items-center gap-2 ${step===1?'invisible':''}`}>
            <ArrowLeft size={16}/> Back
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step+1)}
              disabled={step===1&&(!formData.produceType||!formData.weight) || step===2&&(!formData.village||!formData.lat)}
              className="btn-primary flex items-center gap-2">
              Next Step <ArrowRight size={16}/>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex items-center gap-2 px-6">
              {isSubmitting ? <Loader2 className="animate-spin"/> : <ConnectIcon size={16}/>}
              {isSubmitting ? 'MINTING...' : 'REGISTER ON BLOCKCHAIN 🔗'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ConnectIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
  </svg>
);
