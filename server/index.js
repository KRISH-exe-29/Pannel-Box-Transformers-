// PM2 DEPLOYMENT: pm2 start index.js --name "rtcc-tracker"
// PM2 AUTO-START: pm2 startup && pm2 save
// LAN ACCESS: http://<your-windows-ip>:5000
// FIND YOUR IP: Run 'ipconfig' in Windows CMD, look for IPv4 Address

require('dotenv').config();
require('./services/logger'); // Initialize logger first

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route files
const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrders');
const pendingPointsRoutes = require('./routes/pendingPoints');
const actionComplaintRoutes = require('./routes/actionComplaints');
const emailLogRoutes = require('./routes/emailLogs');
const settingsRoutes = require('./routes/settings');
const systemRoutes = require('./routes/system');

// Import cron service
const cronService = require('./services/cronService');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request timeout middleware - 20 seconds max
app.use((req, res, next) => {
  req.setTimeout(20000);
  res.setTimeout(20000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timed out. Please try again.' });
    }
  });
  next();
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/pending-points', pendingPointsRoutes);
app.use('/api/action-complaints', actionComplaintRoutes);
app.use('/api/email-logs', emailLogRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files from the client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all route for SPA (Single Page Application)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('RTCC Tracking System server running on port ' + PORT);

  // Start cron jobs
  cronService.startCronJobs();
});
