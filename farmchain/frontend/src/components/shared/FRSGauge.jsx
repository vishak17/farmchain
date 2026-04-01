import React from 'react';
import { motion } from 'framer-motion';

export const getGrade = (frs, category = 'STANDARD') => {
  if (frs >= 96) return 'A+';
  if (frs >= 92) return 'A';
  if (frs >= 85) return 'B';
  if (frs >= 75) return 'C';
  return 'D';
};

const getGradeColor = (grade) => {
  if (grade.startsWith('A')) return 'text-farm-green';
  if (grade === 'B') return 'text-farm-amber';
  if (grade === 'C') return 'text-orange-500';
  return 'text-farm-red';
};

const FRSGauge = ({ frs = 0, category = 'STANDARD', size = 'md', showLabel = false }) => {
  const MathPi = Math.PI;
  const radius = 80;
  const arcLength = MathPi * radius; // 251.327
  const redLength = 0.85 * arcLength;
  const amberLength = 0.92 * arcLength;
  
  const grade = getGrade(frs, category);
  const colorClass = getGradeColor(grade);

  const sizeClasses = {
    sm: 'w-24 h-16',
    md: 'w-48 h-28',
    lg: 'w-64 h-40'
  };

  const pathD = `M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`;

  return (
    <div className={`relative flex flex-col items-center ${sizeClasses[size]}`}>
      <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
        {/* Base Green */}
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="butt" />
        {/* Amber Middle */}
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray={`${amberLength} ${arcLength}`} strokeLinecap="butt" />
        {/* Red Bottom */}
        <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="16" strokeDasharray={`${redLength} ${arcLength}`} strokeLinecap="butt" />
        
        {/* Needle */}
        <motion.line 
          x1="100" y1="100" x2="30" y2="100"
          stroke="currentColor" strokeWidth="4"
          strokeLinecap="round"
          className="text-farm-text"
          style={{ originX: '100px', originY: '100px' }}
          initial={{ rotate: 0 }}
          animate={{ rotate: Math.min(180, Math.max(0, (frs / 100) * 180)) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <circle cx="100" cy="100" r="8" className="fill-farm-text" />
      </svg>
      {showLabel && (
        <div className="absolute bottom-[-10px] flex flex-col items-center">
          <span className="text-2xl font-bold font-mono text-farm-text">{Number(frs).toFixed(1)}</span>
          <span className={`text-sm font-bold ${colorClass}`}>Grade {grade}</span>
        </div>
      )}
    </div>
  );
};

export default FRSGauge;
