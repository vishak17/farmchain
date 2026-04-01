import { create } from 'zustand';

export const useBatchStore = create((set, get) => ({
  activeBatches: [],
  selectedBatch: null,
  recentEvents: [],
  
  addEvent: (event) => set(s => ({
    recentEvents: [event, ...s.recentEvents].slice(0, 50)  // keep last 50
  })),
  
  updateBatch: (batchId, data) => set(s => ({
    activeBatches: s.activeBatches.map(b => b.batchId === batchId ? { ...b, ...data } : b)
  })),
  
  setActiveBatches: (batches) => set({ activeBatches: batches }),
  setSelectedBatch: (batch) => set({ selectedBatch: batch }),
  clearEvents: () => set({ recentEvents: [] })
}));
