const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');
const dbConnect = require('./config/db');
const networkSimulator = require('./simulators/NetworkSimulator');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);
  
  ws.send(JSON.stringify({ event: 'CONNECTED', message: 'FarmChain WS active' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });
});

networkSimulator.setWsClients(clients);

async function start() {
  try {
    const connectMongo = typeof dbConnect === 'function' ? dbConnect : require('./config/db'); // handling varied exports safety
    if(typeof connectMongo === 'function') await connectMongo();

    server.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════╗`);
      console.log(`║   FARMCHAIN BACKEND v1.0             ║`);
      console.log(`║   API: http://localhost:${PORT}         ║`);
      console.log(`║   WS:  ws://localhost:${PORT}/ws        ║`);
      console.log(`╚══════════════════════════════════════╝\n`);

      // Give blockchain and Mongo time to lock before scheduling events
      setTimeout(() => {
        console.log(`[NetworkSimulator] Starting background simulation loop...`);
        networkSimulator.start();
      }, 5000);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
