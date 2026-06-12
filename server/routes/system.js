const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../services/logger');

// All system routes require admin access
router.use(authenticate, requireAdmin);

// GET /api/system/logs - Fetch server error logs
router.get('/logs', (req, res) => {
  try {
    const logs = logger.getLogs();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// DELETE /api/system/logs - Clear server logs
router.delete('/logs', (req, res) => {
  try {
    logger.clearLogs();
    res.json({ message: 'Logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

module.exports = router;
