import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const nodeIcons = ['🌾', '🏬', '🏭', '🏪'];
const getGradeColor = (grade) => {
  if (grade?.startsWith('A')) return '#22c55e';
  if (grade === 'B') return '#f59e0b';
  if (grade === 'C') return '#f97316';
  return '#ef4444';
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const color = getGradeColor(payload.grade);
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#1e293b" strokeWidth={2} />
      <text x={cx} y={cy - 15} textAnchor="middle" fontSize={16}>{nodeIcons[payload.nodeType || 0] || '🏢'}</text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-farm-surface-2 border border-farm-border p-3 rounded-lg shadow-xl">
        <p className="font-bold text-farm-text">{data.nodeName || data.label}</p>
        <p className="text-sm text-farm-muted">{format(new Date(data.timestamp), 'PP pp')}</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-farm-text">FRS:</span>
          <span className="font-mono font-bold" style={{color: getGradeColor(data.grade)}}>
            {(data.frsBasisPoints / 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-farm-text">Grade:</span>
          <span className="font-bold" style={{color: getGradeColor(data.grade)}}>{data.grade}</span>
        </div>
      </div>
    );
  }
  return null;
};

const FRSTimeline = ({ custodyChain = [] }) => {
  const data = custodyChain.map(item => ({
    ...item,
    frsValue: item.frsBasisPoints / 100
  }));

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorFrs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="74%" stopColor="#22c55e" />
              <stop offset="76%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="nodeName" stroke="#94a3b8" tick={{fill: '#94a3b8'}} tickMargin={10} />
          <YAxis domain={[80, 100]} stroke="#94a3b8" tick={{fill: '#94a3b8'}} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Rejection Threshold', fill: '#ef4444', fontSize: 12 }} />
          <Line 
            type="monotone" 
            dataKey="frsValue" 
            stroke="url(#colorFrs)" 
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FRSTimeline;
