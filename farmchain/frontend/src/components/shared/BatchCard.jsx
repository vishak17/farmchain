import React from 'react';
import FRSGauge, { getGrade } from './FRSGauge';

const BatchCard = ({ batch, onClick }) => {
  if (!batch) return null;
  const grade = getGrade(batch.frs, batch.category);
  const isExpiringSoon = batch.pdee && (new Date(batch.pdee).getTime() - Date.now() < 86400000);

  return (
    <div 
      className={`card relative overflow-hidden cursor-pointer hover:border-farm-green transition-colors ${batch.isExpired ? 'opacity-70 grayscale' : ''}`}
      onClick={() => onClick && onClick(batch)}
    >
      {/* Absolute Overlays */}
      {batch.isExpired && (
        <div className="absolute inset-0 bg-farm-surface/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <span className="px-4 py-1 bg-farm-surface-3 border border-farm-border text-farm-text font-bold tracking-widest rounded shadow-lg transform -rotate-12">
            EXPIRED
          </span>
        </div>
      )}
      
      {/* Banners */}
      {batch.anomalyFlagged && !batch.isExpired && (
        <div className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1 -mx-4 -mt-4 mb-4 text-center border-b border-orange-500/30">
          ⚠️ ANOMALY FLAGGED
        </div>
      )}

      {/* Top Row */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-farm-muted uppercase tracking-wider">Batch ID</p>
          <p className="font-mono text-sm text-farm-text truncate max-w-[120px]" title={batch.batchId}>
            {batch.batchId?.substring(0, 12)}...
          </p>
        </div>
        <div className="flex gap-2">
          {batch.isDisputed && <span className="badge-red">DISPUTED</span>}
          <span className={`badge-${grade.startsWith('A') ? 'green' : grade === 'B' ? 'amber' : 'red'}`}>
            Grade {grade}
          </span>
        </div>
      </div>

      {/* Middle Row */}
      <div className="flex items-center justify-between mb-4 bg-farm-surface-2 p-3 rounded-lg border border-farm-border">
        <div>
          <h3 className="text-lg font-bold text-farm-text capitalize">{batch.produce}</h3>
          <p className="text-sm text-farm-muted">{batch.weight} kg</p>
        </div>
        <div className="scale-75 origin-right">
          <FRSGauge frs={batch.frs} category={batch.category} size="sm" showLabel={false} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-2 text-xs text-farm-muted">
        <div>
          <p className="uppercase tracking-wider opacity-70 mb-1">Farmer</p>
          <p className="text-farm-text font-medium truncate">{batch.farmerName}</p>
        </div>
        <div>
          <p className="uppercase tracking-wider opacity-70 mb-1">Location</p>
          <p className="text-farm-text font-medium truncate">{batch.location}</p>
        </div>
      </div>
      
      {batch.pdee && !batch.isExpired && (
        <div className="mt-3 pt-3 border-t border-farm-border flex justify-between items-center text-xs">
          <span className="text-farm-muted">Expires:</span>
          <span className={`font-mono ${isExpiringSoon ? 'text-farm-amber font-bold' : 'text-farm-text'}`}>
            {new Date(batch.pdee).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};
export default BatchCard;
