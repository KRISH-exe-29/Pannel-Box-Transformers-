const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// POST /api/work-orders/:workOrderId/action-complaints - Add single complaint
router.post('/work-orders/:workOrderId/action-complaints', authenticate, async (req, res) => {
  try {
    const { workOrderId } = req.params;
    const { complaint, action_date, target_date, responsibility, status, is_default, sort_order } = req.body;

    if (!complaint) {
      return res.status(400).json({ error: 'Complaint text is required' });
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
      `INSERT INTO action_complaints (work_order_id, complaint, action_date, target_date, responsibility, status, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        workOrderId,
        complaint,
        action_date || null,
        target_date || null,
        responsibility || null,
        status || 'pending',
        is_default || false,
        sort_order || 0
      ]
    );

    return res.status(201).json({ action_complaint: insertResult.rows[0] });
  } catch (err) {
    console.error('Add action complaint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/action-complaints/:id - Update complaint
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { complaint, action_date, target_date, responsibility, status } = req.body;

    // Fetch the complaint and its work order
    const fetchResult = await db.query(
      `SELECT ac.*, wo.created_by AS wo_created_by
       FROM action_complaints ac
       JOIN work_orders wo ON wo.id = ac.work_order_id
       WHERE ac.id = $1`,
      [id]
    );

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action complaint not found' });
    }

    const existing = fetchResult.rows[0];

    if (req.profile.role !== 'admin' && existing.wo_created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If is_default = true, do NOT allow changing the complaint text
    if (existing.is_default && complaint !== undefined && complaint !== existing.complaint) {
      return res.status(400).json({ error: 'Cannot modify complaint text of a default action item' });
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (complaint !== undefined && !existing.is_default) {
      fields.push(`complaint = $${paramIndex++}`);
      values.push(complaint);
    }
    if (action_date !== undefined) {
      fields.push(`action_date = $${paramIndex++}`);
      values.push(action_date);
    }
    if (target_date !== undefined) {
      fields.push(`target_date = $${paramIndex++}`);
      values.push(target_date);
    }
    if (responsibility !== undefined) {
      fields.push(`responsibility = $${paramIndex++}`);
      values.push(responsibility);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (fields.length === 0) {
      return res.json({ action_complaint: existing });
    }

    values.push(id);
    const updateResult = await db.query(
      `UPDATE action_complaints SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return res.json({ action_complaint: updateResult.rows[0] });
  } catch (err) {
    console.error('Update action complaint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/action-complaints/:id - Delete complaint
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the complaint
    const fetchResult = await db.query(
      `SELECT ac.*, wo.created_by AS wo_created_by
       FROM action_complaints ac
       JOIN work_orders wo ON wo.id = ac.work_order_id
       WHERE ac.id = $1`,
      [id]
    );

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action complaint not found' });
    }

    const existing = fetchResult.rows[0];

    if (req.profile.role !== 'admin' && existing.wo_created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow deletion if is_default = false
    if (existing.is_default) {
      return res.status(400).json({ error: 'Cannot delete a default action complaint item' });
    }

    await db.query('DELETE FROM action_complaints WHERE id = $1', [id]);

    return res.json({ message: 'Action complaint deleted successfully' });
  } catch (err) {
    console.error('Delete action complaint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
