const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/email-logs - List email logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, work_order_id } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.profile.role !== 'admin') {
      conditions.push(`wo.created_by = $${paramIndex++}`);
      values.push(req.user.id);
    }

    // Type filter
    if (type) {
      conditions.push(`el.type = $${paramIndex++}`);
      values.push(type);
    }

    // Work order filter
    if (work_order_id) {
      conditions.push(`el.work_order_id = $${paramIndex++}`);
      values.push(work_order_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT el.*, wo.work_order_number, wo.customer_name, wo.created_by AS wo_created_by
       FROM email_logs el
       JOIN work_orders wo ON wo.id = el.work_order_id
       ${whereClause}
       ORDER BY el.sent_at DESC`,
      values
    );

    // Flatten the join data
    const formattedLogs = (result.rows || []).map(log => ({
      id: log.id,
      work_order_id: log.work_order_id,
      work_order_number: log.work_order_number,
      customer_name: log.customer_name,
      type: log.type,
      status: log.status,
      recipients: log.recipients,
      error_message: log.error_message,
      sent_at: log.sent_at
    }));

    return res.json({ email_logs: formattedLogs });
  } catch (err) {
    console.error('Email logs endpoint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/email-logs/work-order/:workOrderId - Logs for specific work order
router.get('/work-order/:workOrderId', authenticate, async (req, res) => {
  try {
    const { workOrderId } = req.params;

    // Verify ownership
    const woResult = await db.query(
      'SELECT id, created_by FROM work_orders WHERE id = $1',
      [workOrderId]
    );

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const workOrder = woResult.rows[0];

    if (req.profile.role !== 'admin' && workOrder.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM email_logs WHERE work_order_id = $1 ORDER BY sent_at DESC',
      [workOrderId]
    );

    return res.json({ email_logs: result.rows || [] });
  } catch (err) {
    console.error('Work order email logs error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
