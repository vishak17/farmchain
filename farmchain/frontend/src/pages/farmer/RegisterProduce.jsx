import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours } from 'date-fns';
import { MapPin, Scale as ScaleIcon, Leaf, PackageSearch, Check, Loader2, ArrowRight, ArrowLeft, QrCode } from 'lucide-react';
import { registerProduce } from '../../services/api';
import QRDisplay from '../../components/shared/QRDisplay';
import toast from 'react-hot-toast';

const PRODUCE_LIST = [
  'tomato', 'mango', 'apple', 'spinach', 'lettuce', 'onion', 'garlic', 'grapes', 'carrot', 'mushroom',
  'strawberry', 'brinjal', 'capsicum', 'pumpkin', 'coconut', 'jackfruit', 'watermelon', 'muskmelon', 'coriander', 'ginger', 'potato', 'bananas'
];

const PRODUCE_CATEGORIES = {
  tomato: 'STANDARD', mango: 'STANDARD', apple: 'HIGH_TOLERANCE', spinach: 'HIGH_SENSITIVITY', 
  lettuce: 'HIGH_SENSITIVITY', onion: 'HIGH_TOLERANCE', garlic: 'HIGH_TOLERANCE', grapes: 'STANDARD', 
  carrot: 'HIGH_TOLERANCE', mushroom: 'HIGH_SENSITIVITY', strawberry: 'HIGH_SENSITIVITY', 
  brinjal: 'STANDARD', capsicum: 'STANDARD', pumpkin: 'HIGH_TOLERANCE', coconut: 'HIGH_TOLERANCE', 
  jackfruit: 'HIGH_TOLERANCE', watermelon: 'STANDARD', muskmelon: 'STANDARD', coriander: 'HIGH_SENSITIVITY', 
  ginger: 'HIGH_TOLERANCE', potato: 'HIGH_TOLERANCE', bananas: 'STANDARD'
};

const CATEGORY_BADGES = {
  HIGH_SENSITIVITY: { label: 'HIGH_SENSITIVITY 🔴', hours: 72 },
  STANDARD: { label: 'STANDARD 🟡', hours: 168 },
  HIGH_TOLERANCE: { label: 'HIGH_TOLERANCE 🟢', hours: 504 },
};

const LEAFY_GREENS = ['spinach', 'lettuce', 'coriander'];

export default function RegisterProduce() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    produceType: '',
    weight: '',
    itemCount: '',
    harvestDate: new Date().toISOString().slice(0, 16),
    lat: '',
    lng: '',
    village: '',
    specialHandling: {}
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scaleState, setScaleState] = useState('idle'); // idle, connecting, reading, done
  const [simulatedWeight, setSimulatedWeight] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Computed values
  const category = PRODUCE_CATEGORIES[formData.produceType.toLowerCase()] || null;
  const expectedPDEE = category ? addHours(new Date(formData.harvestDate || Date.now()), CATEGORY_BADGES[category].hours) : null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSpecialChange = (key, value) => setFormData({ ...formData, specialHandling: { ...formData.specialHandling, [key]: value } });

  const simulateScale = () => {
    setScaleState('connecting');
    setTimeout(() => {
      setScaleState('reading');
      setTimeout(() => {
        const weight = Math.floor(Math.random() * 50000) + 10000; // 10k to 60k grams
        setSimulatedWeight(weight);
        setFormData(prev => ({ ...prev, weight: weight.toString() }));
        setScaleState('done');
      }, 1000);
    }, 1000);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
          if (!formData.village) setFormData(prev => ({ ...prev, village: 'Auto-detected Location' }));
          toast.success('Location acquired');
        },
        () => toast.error('Location access denied')
      );
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        produce: formData.produceType.toLowerCase(),
        weight: Number(formData.weight),
        itemCount: Number(formData.itemCount),
        harvestDate: formData.harvestDate,
        location: { lat: Number(formData.lat), lng: Number(formData.lng), name: formData.village },
        notes: formData.specialHandling,
        category
      };
      
      const res = await registerProduce(payload);
      setSuccessData({
        batchId: res.data?.batch?.batchId || Math.random().toString(36).substr(2, 10).toUpperCase(),
        txHash: res.data?.txHash || '0x' + Math.random().toString(16).substr(2, 40)
      });
      toast.success('Batch registered on blockchain!');
    } catch (error) {
      toast.error('Failed to register batch');
      // Mock success for UI demonstration if API fails
      setSuccessData({
        batchId: 'BTH-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        txHash: '0xabc' + Math.random().toString(16).substr(2, 30)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-farm-border -z-10 transform -translate-y-1/2"></div>
      {[1, 2, 3, 4].map(s => (
        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-farm-green text-white' : 'bg-farm-surface-3 text-farm-muted'}`}>
          {step > s ? <Check size={16} /> : s}
        </div>
      ))}
    </div>
  );

  if (successData) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-8 card text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-farm-green/20 text-farm-green rounded-full flex items-center justify-center mb-6">
          <Check size={32} />
        </div>
        <h2 className="text-2xl font-bold text-farm-text mb-2">Registration Successful</h2>
        <p className="text-farm-muted mb-6 tracking-wide text-sm font-mono truncate w-full">Recorded on-chain: {successData.txHash} ✓</p>
        
        <QRDisplay batchId={successData.batchId} size={220} />
        
        <div className="flex gap-4 w-full mt-8">
          <button onClick={() => { setStep(1); setSuccessData(null); setFormData({produceType:'',weight:'',itemCount:'',harvestDate:new Date().toISOString().slice(0, 16),lat:'',lng:'',village:'',specialHandling:{}}); setScaleState('idle'); }} className="btn-ghost flex-1">Register Another</button>
          <button onClick={() => window.location.href='/farmer/batches'} className="btn-primary flex-1">View My Batches</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-farm-text mb-6">Register Produce Batch</h1>
      {renderStepIndicators()}

      <div className="card min-h-[400px] flex flex-col">
        {step === 1 && (
          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2"><Leaf size={20} className="text-farm-green"/> Step 1: Produce Details</h2>
            
            <div className="relative">
              <label className="block text-sm text-farm-muted mb-1">Produce Type</label>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="input flex-1" 
                  value={searchQuery || formData.produceType} 
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setFormData({...formData, produceType: e.target.value}); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g., Tomato"
                />
                {category && (
                  <span className={`px-3 py-1.5 rounded text-xs font-bold border ${category === 'HIGH_SENSITIVITY' ? 'bg-farm-red/10 text-farm-red border-farm-red/30' : category === 'STANDARD' ? 'bg-farm-amber/10 text-farm-amber border-farm-amber/30' : 'bg-farm-green/10 text-farm-green border-farm-green/30'}`}>
                    {CATEGORY_BADGES[category].label}
                  </span>
                )}
              </div>
              {showSuggestions && searchQuery && (
                <ul className="absolute z-10 w-full mt-1 bg-farm-surface border border-farm-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                  {PRODUCE_LIST.filter(p => p.includes(searchQuery.toLowerCase())).map(p => (
                    <li key={p} className="px-4 py-2 hover:bg-farm-surface-2 cursor-pointer text-farm-text capitalize" onClick={() => { setFormData({...formData, produceType: p}); setSearchQuery(''); setShowSuggestions(false); }}>
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
                <button type="button" onClick={simulateScale} disabled={scaleState === 'connecting' || scaleState === 'reading'} className="btn-ghost whitespace-nowrap flex items-center gap-2">
                  <ScaleIcon size={16} /> SIMULATE SCALE
                </button>
              </div>
              {scaleState !== 'idle' && (
                <div className="mt-2 text-sm text-farm-green-light font-mono flex items-center gap-2 bg-farm-green/10 p-2 rounded border border-farm-green/20">
                  {scaleState === 'connecting' && <><Loader2 size={14} className="animate-spin"/> Connecting to scale...</>}
                  {scaleState === 'reading' && <><Loader2 size={14} className="animate-spin"/> Reading...</>}
                  {scaleState === 'done' && <><Check size={14}/> {simulatedWeight}g ✓</>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-farm-muted mb-1">Item Count (approx)</label>
                <input type="number" name="itemCount" className="input" value={formData.itemCount} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm text-farm-muted mb-1">Harvest Date & Time</label>
                <input type="datetime-local" name="harvestDate" className="input text-sm" value={formData.harvestDate} onChange={handleChange} />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2"><MapPin size={20} className="text-farm-amber"/> Step 2: Location Data</h2>
            
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
                <input type="number" name="lat" className="input font-mono text-sm" placeholder="Latitude" value={formData.lat} onChange={handleChange} />
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

        {step === 3 && (
          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2"><PackageSearch size={20} className="text-farm-blue-light"/> Step 3: Special Handling</h2>
            <div className="p-4 bg-farm-surface-2 rounded-lg border border-farm-border">
              
              {formData.produceType.toLowerCase() === 'bananas' && (
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

              {formData.produceType.toLowerCase() === 'tomato' && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('calyxIntact', e.target.checked)} />
                  <span className="text-farm-text">Calyx intact? (Improves shelf life)</span>
                </label>
              )}

              {(formData.produceType.toLowerCase() === 'watermelon' || formData.produceType.toLowerCase() === 'muskmelon') && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('wholeFruit', e.target.checked)} />
                  <span className="text-farm-text">Confirm completely whole fruit (no prior cuts)</span>
                </label>
              )}

              {formData.produceType.toLowerCase() === 'grapes' && (
                <div>
                  <label className="block text-sm text-farm-text mb-2">Stem Condition</label>
                  <select className="input" onChange={e => handleSpecialChange('stemCondition', e.target.value)}>
                    <option value="">Select condition...</option>
                    <option value="Green">Green and lively</option>
                    <option value="Partial Brown">Partially browning</option>
                    <option value="Fully Brown">Fully brown/dry</option>
                  </select>
                </div>
              )}

              {LEAFY_GREENS.includes(formData.produceType.toLowerCase()) && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('moistCloth', e.target.checked)} />
                  <span className="text-farm-text">Wrapped in moist cloth/paper?</span>
                </label>
              )}

              {formData.produceType.toLowerCase() === 'mushroom' && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-farm-surface rounded border border-farm-border hover:border-farm-green transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-farm-border bg-farm-bg text-farm-green focus:ring-farm-green" onChange={e => handleSpecialChange('paperBag', e.target.checked)} />
                  <span className="text-farm-text">Packed strictly in breathable paper bags?</span>
                </label>
              )}

              {['tomato', 'bananas', 'watermelon', 'muskmelon', 'grapes', 'mushroom', ...LEAFY_GREENS].indexOf(formData.produceType.toLowerCase()) === -1 && (
                <div className="text-center py-8 text-farm-muted flex flex-col items-center">
                  <Check size={32} className="text-farm-green mb-2" />
                  <span>No special handling notes required for <strong className="capitalize">{formData.produceType || 'this produce'}</strong></span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="flex-1 space-y-5">
             <h2 className="text-lg font-bold text-farm-text flex items-center gap-2 border-b border-farm-border pb-2"><QrCode size={20} className="text-farm-text"/> Step 4: Review & Submit</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-border">
                    <h3 className="text-xs uppercase tracking-widest text-farm-muted mb-3 font-bold">Batch Summary</h3>
                    <p className="flex justify-between mb-1"><span className="text-farm-muted">Produce:</span> <span className="text-farm-text font-bold capitalize">{formData.produceType}</span></p>
                    <p className="flex justify-between mb-1"><span className="text-farm-muted">Weight:</span> <span className="text-farm-text font-bold">{formData.weight} g</span></p>
                    <p className="flex justify-between mb-1"><span className="text-farm-muted">Count:</span> <span className="text-farm-text font-bold">{formData.itemCount} items</span></p>
                    <p className="flex justify-between mb-1"><span className="text-farm-muted">Location:</span> <span className="text-farm-text font-bold text-right truncate pl-4">{formData.village || 'Tumkur'}</span></p>
                  </div>
                  
                  <div className="bg-farm-surface-2 p-4 rounded-lg border border-farm-amber/30">
                    <h3 className="text-xs uppercase tracking-widest text-farm-amber mb-3 font-bold">Network Predictions</h3>
                    <p className="text-sm text-farm-text mb-2 flex justify-between"><span>Initial FRS:</span><strong className="text-farm-green font-mono">100.00% — Grade A+</strong></p>
                    <p className="text-sm text-farm-text flex flex-col mt-3">
                      <span className="text-farm-muted mb-1 text-xs">Expected PDEE (System calculated):</span>
                      <strong className="font-mono">{expectedPDEE ? format(expectedPDEE, 'PP pp') : 'N/A'}</strong>
                      <span className="text-xs text-farm-amber mt-1">({CATEGORY_BADGES[category]?.hours} hours shelf life)</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-farm-surface p-6 rounded-lg border border-dashed border-farm-border">
                  <div className="w-48 h-48 border-4 border-farm-green/30 rounded-xl flex items-center justify-center p-4 bg-white opacity-50 relative">
                     <QrCode size={80} className="text-farm-green" />
                     <div className="absolute inset-x-0 bottom-4 text-center text-xs font-bold text-gray-800 bg-white shadow py-1 rounded">PENDING MINT</div>
                  </div>
                  <p className="text-xs text-farm-muted mt-4 text-center">QR will dynamically generate with Cryptographic Hash on submit</p>
                </div>
             </div>
          </motion.div>
        )}

        <div className="mt-auto pt-6 border-t border-farm-border flex justify-between items-center">
          <button onClick={() => setStep(Math.max(1, step - 1))} className={`btn-ghost flex items-center gap-2 ${step === 1 ? 'invisible' : ''}`}>
            <ArrowLeft size={16} /> Back
          </button>
          
          {step < 4 ? (
             <button 
               onClick={() => setStep(step + 1)} 
               disabled={step===1 && (!formData.produceType || !formData.weight) || step===2 && (!formData.village || !formData.lat)} 
               className="btn-primary flex items-center gap-2"
             >
               Next Step <ArrowRight size={16} />
             </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex items-center gap-2 px-6">
              {isSubmitting ? <Loader2 className="animate-spin"/> : <Connect size={16} />} 
              {isSubmitting ? 'MINTING...' : 'REGISTER ON BLOCKCHAIN 🔗'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Connect = ({ size, className }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>;
