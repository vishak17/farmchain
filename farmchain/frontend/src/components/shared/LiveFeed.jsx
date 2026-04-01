import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import wsClient from '../../services/websocket';
import { formatDistanceToNow } from 'date-fns';

const eventIcons = {
  BATCH_CREATED: '🌱',
  CUSTODY_TRANSFER: '🚚',
  FRS_ALERT: '⚠️',
  DISPUTE_CREATED: '⚖️',
  SUBSIDY_DISBURSED: '💰'
};

const getEventColor = (type) => {
  if (type === 'FRS_ALERT') return 'text-farm-red bg-farm-red/10 border-farm-red/30';
  if (type === 'SUBSIDY_DISBURSED') return 'text-farm-green-light bg-farm-green/10 border-farm-green/30';
  if (type === 'DISPUTE_CREATED') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (type === 'BATCH_CREATED') return 'text-farm-green bg-farm-green/10 border-farm-green/30';
  return 'text-farm-blue-light bg-farm-blue/10 border-farm-blue/30';
};

const LiveFeed = ({ maxItems = 20, filter = [] }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsub = wsClient.subscribe('*', (payload) => {
      if (payload && payload.type && payload.type !== 'CONNECTION_STATUS') {
        if (filter.length > 0 && !filter.includes(payload.type)) return;
        
        setEvents(prev => {
          const newEvent = { ...payload, id: Math.random().toString(36).substr(2, 9) };
          return [newEvent, ...prev].slice(0, maxItems);
        });
      }
    });
    return unsub;
  }, [maxItems, filter]);

  return (
    <div className="flex flex-col h-full card">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-farm-border">
        <h3 className="font-bold text-farm-text flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-farm-green animate-pulse-slow"></span>
          Live Network Feed
        </h3>
        <button onClick={() => setEvents([])} className="text-xs text-farm-muted hover:text-farm-text transition-colors">
          Clear
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        <AnimatePresence>
          {events.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-farm-muted text-sm py-4">
              Waiting for events...
            </motion.div>
          )}
          {events.map((evt) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass p-3 rounded-lg flex items-start gap-3"
            >
              <div className="text-2xl mt-1">{eventIcons[evt.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getEventColor(evt.type)}`}>
                    {evt.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-farm-muted whitespace-nowrap">
                    {evt.timestamp ? formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true }) : 'just now'}
                  </span>
                </div>
                <p className="text-sm font-mono text-farm-text truncate">
                  {evt.data?.batchId || evt.data?.id || 'System Event'}
                </p>
                {evt.data?.message && (
                  <p className="text-xs text-farm-muted mt-1 truncate">{evt.data.message}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default LiveFeed;
