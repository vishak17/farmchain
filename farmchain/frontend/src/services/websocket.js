class WSClient {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();  // eventType => Set of callbacks
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
  }
  
  connect(url = 'ws://localhost:3001/ws') {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.log('[WS] Connected to FarmChain');
      this.reconnectDelay = 1000;
      this.emit('CONNECTION_STATUS', { connected: true });
    };
    this.ws.onmessage = (event) => {
      try {
        const { event: type, data, timestamp } = JSON.parse(event.data);
        this.emit(type, data);
        this.emit('*', { type, data, timestamp });  // wildcard subscribers
      } catch (e) { console.error('[WS] Parse error:', e); }
    };
    this.ws.onclose = () => {
      this.emit('CONNECTION_STATUS', { connected: false });
      console.log(`[WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms`);
      setTimeout(() => this.connect(url), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    };
    this.ws.onerror = (e) => console.error('[WS] Error:', e);
  }
  
  emit(eventType, data) {
    const subs = this.subscribers.get(eventType);
    if (subs) subs.forEach(cb => cb(data));
  }
  
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
    this.subscribers.get(eventType).add(callback);
    return () => this.subscribers.get(eventType).delete(callback);  // unsubscribe function
  }
}

export const wsClient = new WSClient();
export default wsClient;
