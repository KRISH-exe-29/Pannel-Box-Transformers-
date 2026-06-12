const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// POST /api/work-orders/:workOrderId/pending-points - Add single pending point
router.post('/work-orders/:workOrderId/pending-points', authenticate, async (req, res) => {
  try {
    const { workOrderId } = req.params;
    const { description, remarks, status } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Verify work order ownership
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

    const insertResult = await db.query(
      `INSERT INTO pending_points (work_order_id, description, remarks, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [workOrderId, description, remarks || null, status || 'open']
    );

    return res.status(201).json({ pending_point: insertResult.rows[0] });
  } catch (err) {
    console.error('Add pending point error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/pending-points/:id - Update pending point
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, remarks, status } = req.body;

    // Fetch the pending point and its work order
    const fetchResult = await db.query(
      `SELECT pp.*, wo.created_by AS wo_created_by
       FROM pending_points pp
       JOIN work_orders wo ON wo.id = pp.work_order_id
       WHERE pp.id = $1`,
      [id]
    );

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending point not found' });
    }

    const point = fetchResult.rows[0];

    if (req.profile.role !== 'admin' && point.wo_created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (remarks !== undefined) {
      fields.push(`remarks = $${paramIndex++}`);
      values.push(remarks);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (fields.length === 0) {
      return res.json({ pending_point: point });
    }

    values.push(id);
    const updateResult = await db.query(
      `UPDATE pending_points SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return res.json({ pending_point: updateResult.rows[0] });
  } catch (err) {
    console.error('Update pending point error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/pending-points/:id - Delete pending point
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the pending point and its work order
    const fetchResult = await db.query(
      `SELECT pp.*, wo.created_by AS wo_created_by
       FROM pending_points pp
       JOIN work_orders wo ON wo.id = pp.work_order_id
       WHERE pp.id = $1`,
      [id]
    );

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending point not found' });
    }

    const point = fetchResult.rows[0];

    if (req.profile.role !== 'admin' && point.wo_created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM pending_points WHERE id = $1', [id]);

    return res.json({ message: 'Pending point deleted successfully' });
  } catch (err) {
    console.error('Delete pending point error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
