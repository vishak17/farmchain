import React, { useState, useEffect } from 'react';
import { Search, Scale as ScaleIcon, AlertTriangle, ShieldCheck, CheckCircle2, XOctagon, Loader2, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBatch, recordCustody } from '../../services/api';
import BatchCard from '../../components/shared/BatchCard';
import FRSTimeline from '../../components/shared/FRSTimeline';
import FRSGauge, { getGrade } from '../../components/shared/FRSGauge';
import toast from 'react-hot-toast';

export default function FRSVerification() {
  const [batchIdInput, setBatchIdInput] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [batch, setBatch] = useState(null);
  const [custodyChain, setCustodyChain] = useState([]);
  
  const [scaleState, setScaleState] = useState('idle'); // idle, taring, detecting, reading, done
  const [actualWeight, setActualWeight] = useState(null);
  const [newFrs, setNewFrs] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successHash, setSuccessHash] = useState(null);

  const fetchBatch = async (id) => {
    setLoadingBatch(true);
    try {
      // Mocking fetch response since backend might not be fully seeded yet
      // const { data } = await getBatch(id);
      setTimeout(() => {
        const mockBatch = {
          batchId: id,
          produce: 'tomato',
          weight: 12500,
          frs: 98.5,
          category: 'STANDARD',
          farmerName: 'Raju Farms Ltd.',
          location: 'Transit - Hub 2',
          pdee: new Date(Date.now() + 86400000 * 4).toISOString(),
          anomalyFlagged: false,
          isDisputed: false,
          isExpired: false
        };
        const mockChain = [
          { nodeType: 0, nodeName: 'Raju Farms', frsBasisPoints: 10000, timestamp: Date.now() - 86400000*2, grade: 'A+' },
          { nodeType: 1, nodeName: 'AgriLogistics India', frsBasisPoints: 9850, timestamp: Date.now() - 86400000, grade: 'A' }
        ];
        setBatch(mockBatch);
        setCustodyChain(mockChain);
        setLoadingBatch(false);
      }, 500);
    } catch (err) {
      toast.error('Batch not found');
      setLoadingBatch(false);
    }
  };

  const simulateWeighing = () => {
    setScaleState('taring');
    setTimeout(() => {
      setScaleState('detecting');
      setTimeout(() => {
        setScaleState('reading');
        setTimeout(() => {
          // Simulate some natural weight loss (e.g., moisture loss)
          const drop = Math.floor(Math.random() * 200); 
          setActualWeight(batch.weight - drop);
          
          // Calculate new FRS. Simulated drop of 0-5% based on transit time.
          // Let's force a significant drop 20% of the time for demo
          const severeDrop = Math.random() > 0.8;
          const frsDrop = severeDrop ? (Math.random() * 5 + 4) : (Math.random() * 1.5 + 0.5);
          const calculatedFrs = Math.max(0, batch.frs - frsDrop);
          
          setNewFrs(calculatedFrs);
          setScaleState('done');
        }, 1000);
      }, 800);
    }, 500);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await recordCustody({ batchId: batch.batchId, measuredWeight: actualWeight, computedFrs: newFrs });
      setSuccessHash('0x' + Math.random().toString(16).substr(2, 40));
      toast.success('Custody transfer recorded on blockchain');
    } catch (e) {
      toast.error('Failed to confirm delivery');
      setSuccessHash('0x' + Math.random().toString(16).substr(2, 40)); // Mock success
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (batchIdInput.trim()) {
      setSuccessHash(null);
      setScaleState('idle');
      fetchBatch(batchIdInput.trim());
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6">
      
      {/* LEFT COLUMN: Batch Information */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-farm-text mb-4">SCAN OR ENTER BATCH ID</h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <button type="button" className="p-3 bg-farm-surface-2 border border-farm-border rounded-lg text-farm-green hover:bg-farm-surface-3 transition-colors">
              <QrCode size={24} />
            </button>
            <input 
              type="text" 
              className="input flex-1 font-mono uppercase" 
              placeholder="BTH-XXX..." 
              value={batchIdInput} 
              onChange={e => setBatchIdInput(e.target.value)}
            />
            <button type="submit" disabled={loadingBatch || !batchIdInput} className="btn-primary w-24 flex justify-center">
              {loadingBatch ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            </button>
          </form>
        </div>

        <AnimatePresence>
          {batch && (
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2">
              <BatchCard batch={batch} />
              
              <div className="card">
                 <h3 className="font-bold text-farm-text mb-2 text-sm uppercase tracking-wider">Custody History</h3>
                 <FRSTimeline custodyChain={custodyChain} currentFRS={batch.frs} />
              </div>

              <div className="card bg-farm-surface-2 border-farm-green/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-farm-text uppercase tracking-wider">System Prediction</h3>
                  <ShieldCheck size={20} className="text-farm-green" />
                </div>
                <p className="text-sm text-farm-muted">Based on 24h transit time for Standard produce category, the FRS should remain above <strong className="text-farm-text">97.0%</strong>.</p>
                <div className="mt-4 p-3 bg-farm-surface rounded border border-farm-border flex items-center justify-between text-sm">
                  <span className="text-farm-muted">Origin Farmer:</span>
                  <span className="font-bold text-farm-text flex items-center gap-2">
                    {batch.farmerName} <span className="badge-green rounded text-[10px] py-0">Rep: 98/100</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!batch && !loadingBatch && (
          <div className="flex-1 flex flex-col items-center justify-center text-farm-muted opacity-50 p-10 text-center border-2 border-dashed border-farm-border rounded-xl">
            <Search size={64} className="mb-4" />
            <p>Enter a Batch ID or scan a QR code to view transit verification data</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Weighing & Verification */}
      <div className="w-full lg:w-1/2">
        <div className="card h-full flex flex-col">
          <h2 className="text-xl font-bold text-farm-text mb-6 border-b border-farm-border pb-4">Verification Station</h2>
          
          {!batch ? (
            <div className="flex-1 flex items-center justify-center text-farm-muted opacity-50">
              <p>Load a batch to begin verification</p>
            </div>
          ) : successHash ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-farm-green/20 text-farm-green flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-farm-text">Delivery Confirmed</h2>
              <p className="text-farm-muted">Smart contract updated successfully.</p>
              <div className="bg-farm-surface-2 px-4 py-2 rounded-lg border border-farm-border font-mono text-sm text-farm-text break-all">
                Hash: {successHash}
              </div>
              <button className="btn-ghost mt-4" onClick={() => { setBatch(null); setBatchIdInput(''); setSuccessHash(null); }}>Verify Next Batch</button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 h-full">
              
              {/* Scale Action */}
              <div className="flex flex-col items-center justify-center p-8 bg-farm-surface-2 border-2 border-dashed border-farm-border rounded-xl mb-6 relative overflow-hidden">
                {scaleState === 'idle' ? (
                  <button onClick={simulateWeighing} className="w-48 h-48 rounded-full border-4 border-farm-green bg-farm-green/10 text-farm-green font-bold text-lg flex flex-col items-center justify-center gap-4 hover:bg-farm-green/20 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse-slow">
                    <ScaleIcon size={48} />
                    PLACE CRATE<br/>ON SCALE
                  </button>
                ) : (
                  <div className="w-full h-48 flex flex-col items-center justify-center text-farm-text">
                    <ScaleIcon size={48} className={`mb-4 ${scaleState === 'done' ? 'text-farm-green' : 'text-farm-amber animate-bounce'}`} />
                    <h3 className="text-2xl font-bold font-mono tracking-widest uppercase text-farm-green-light">
                      {scaleState === 'taring' && 'Taring scale...'}
                      {scaleState === 'detecting' && 'Detecting crate...'}
                      {scaleState === 'reading' && 'Reading weight...'}
                      {scaleState === 'done' && `Weight: ${actualWeight}g ✓`}
                    </h3>
                  </div>
                )}
              </div>

              {/* Verification Results */}
              <AnimatePresence>
                {scaleState === 'done' && (
                  <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="flex flex-col gap-6">
                    
                    {/* FRS Drop Alert */}
                    {(batch.frs - newFrs > 3) && (
                      <div className="bg-farm-red/10 border border-farm-red p-4 rounded-lg flex gap-4 items-start shadow-lg">
                        <AlertTriangle className="text-farm-red flex-shrink-0" size={24} />
                        <div>
                          <h4 className="text-farm-red font-bold uppercase tracking-wider mb-1">⚠️ Significant Degradation Detected</h4>
                          <p className="text-sm text-farm-text mb-2">FRS dropped by {(batch.frs - newFrs).toFixed(1)}% since last scan.</p>
                          <div className="bg-farm-surface-2 px-3 py-2 rounded text-sm text-farm-muted border border-farm-border mb-3">
                            Responsible transit leg: <strong className="text-farm-text">{custodyChain[custodyChain.length - 1]?.nodeName || 'AgriLogistics India'}</strong>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-farm-text">Initiating dispute?</span>
                            <button className="px-4 py-1 bg-farm-red text-white text-sm font-bold rounded">YES</button>
                            <button className="px-4 py-1 bg-farm-surface-3 text-farm-muted text-sm font-bold rounded border border-farm-border">NO</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FRS Gauge Recalculated */}
                    <div className="flex items-center justify-between p-4 bg-farm-surface-2 border border-farm-border rounded-lg">
                       <div>
                         <p className="text-sm text-farm-muted uppercase tracking-wider font-bold mb-1">Calculated FRS</p>
                         <div className="flex items-end gap-3">
                            <span className="text-3xl font-mono font-bold text-farm-text">{newFrs.toFixed(2)}%</span>
                            <span className="text-sm text-farm-red line-through mb-1">{batch.frs.toFixed(2)}%</span>
                         </div>
                       </div>
                       <div className="scale-75 origin-right -my-4">
                         <FRSGauge frs={newFrs} category={batch.category} />
                       </div>
                    </div>
                    
                    {/* Grade Outcome */}
                    {(() => {
                      const grade = getGrade(newFrs, batch.category);
                      const isBad = grade === 'D';
                      const isOk = grade === 'C' || grade === 'B';
                      const isGood = grade.startsWith('A');
                      return (
                        <div className={`p-6 rounded-xl border-2 flex items-center justify-between ${isBad ? 'border-farm-red bg-farm-red/5' : isOk ? 'border-farm-amber bg-farm-amber/5' : 'border-farm-green bg-farm-green/5'}`}>
                           <div>
                              <span className="text-sm uppercase tracking-wider font-bold text-farm-muted block mb-1">FINAL GRADE</span>
                              <span className={`text-5xl font-bold ${isBad ? 'text-farm-red' : isOk ? 'text-farm-amber' : 'text-farm-green'}`}>{grade}</span>
                           </div>
                           <div className="text-right">
                              <p className={`font-bold text-xl uppercase ${isBad ? 'text-farm-red' : isOk ? 'text-farm-amber' : 'text-farm-green'}`}>
                                {isBad ? 'REJECTED - DO NOT SELL' : grade === 'C' ? 'DISCOUNTED - Sell Today' : grade === 'B' ? 'Slight Discount' : 'ACCEPTED - Full Price'}
                              </p>
                           </div>
                        </div>
                      )
                    })()}

                    <div className="flex gap-4 mt-auto pt-4">
                      {getGrade(newFrs, batch.category) === 'D' || (batch.frs - newFrs > 3) ? (
                        <>
                          <button onClick={() => toast('Opening smart-contract dispute form...')} className="flex-1 btn-danger py-4 text-lg items-center justify-center flex gap-2">
                             <XOctagon size={24} /> REJECT & DISPUTE
                          </button>
                        </>
                      ) : (
                        <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 btn-primary py-4 text-lg items-center justify-center flex gap-2">
                             {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle2 size={24} />} 
                             {isSubmitting ? 'SIGNING...' : 'CONFIRM DELIVERY'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
