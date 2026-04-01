const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const farmerRoutes = require('./routes/farmer.routes');
const batchRoutes = require('./routes/batch.routes');
const consumerRoutes = require('./routes/consumer.routes');
const disputeRoutes = require('./routes/dispute.routes');
const subsidyRoutes = require('./routes/subsidy.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/consumer', consumerRoutes); // Note: Fix 'comsumer' typo from request to standard 'consumer'
app.use('/api/dispute', disputeRoutes);
app.use('/api/subsidy', subsidyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() });
});

app.use(errorHandler);

module.exports = app;
