const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { calculateWorkingDays } = require('../services/dateService');
const emailService = require('../services/emailService');

// POST /api/work-orders - Create work order with nested arrays
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      work_order_number,
      customer_name,
      rating_mva,
      inspection_start_date,
      received_date,
      testing_date,
      rtcc_mb_internal_test,
      inspection_completion_date,
      clearance_for_packing_date,
      total_working_days,
      pending_points,
      action_complaints
    } = req.body;

    if (!work_order_number || !customer_name) {
      return res.status(400).json({ error: 'Work order number and customer name are required' });
    }

    // Calculate total working days if dates are provided
    let calculatedWorkingDays = total_working_days || null;
    if (inspection_start_date && clearance_for_packing_date) {
      calculatedWorkingDays = calculateWorkingDays(inspection_start_date, clearance_for_packing_date);
    }

    // Determine pending_points_approved status
    let pendingPointsApproved = undefined;
    if (received_date) {
      pendingPointsApproved = null; // Needs approval
    }

    // Build columns and values dynamically
    const columns = [
      'work_order_number', 'customer_name', 'rating_mva',
      'inspection_start_date', 'received_date', 'testing_date',
      'rtcc_mb_internal_test', 'inspection_completion_date',
      'clearance_for_packing_date', 'total_working_days', 'created_by'
    ];
    const values = [
      work_order_number, customer_name, rating_mva || null,
      inspection_start_date || null, received_date || null, testing_date || null,
      rtcc_mb_internal_test || null, inspection_completion_date || null,
      clearance_for_packing_date || null, calculatedWorkingDays, req.user.id
    ];

    if (pendingPointsApproved !== undefined) {
      columns.push('pending_points_approved');
      values.push(pendingPointsApproved);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO work_orders (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    // Insert work order
    const woResult = await db.query(insertSQL, values);

    if (woResult.rows.length === 0) {
      console.error('Create work order error: no rows returned');
      return res.status(500).json({ error: 'Failed to create work order' });
    }

    const workOrder = woResult.rows[0];

    // Bulk insert pending points
    let insertedPendingPoints = [];
    if (pending_points && pending_points.length > 0) {
      const ppValues = [];
      const ppPlaceholders = [];
      pending_points.forEach((pp, i) => {
        const offset = i * 4;
        ppPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        ppValues.push(workOrder.id, pp.description, pp.remarks || null, pp.status || 'open');
      });

      try {
        const ppResult = await db.query(
          `INSERT INTO pending_points (work_order_id, description, remarks, status) VALUES ${ppPlaceholders.join(', ')} RETURNING *`,
          ppValues
        );
        insertedPendingPoints = ppResult.rows;
      } catch (ppError) {
        console.error('Insert pending points error:', ppError.message);
      }
    }

    // Bulk insert action complaints
    let insertedComplaints = [];
    if (action_complaints && action_complaints.length > 0) {
      const acValues = [];
      const acPlaceholders = [];
      action_complaints.forEach((ac, index) => {
        const offset = index * 8;
        acPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        acValues.push(
          workOrder.id, ac.complaint, ac.action_date || null, ac.target_date || null,
          ac.responsibility || null, ac.status || 'pending', ac.is_default || false,
          ac.sort_order !== undefined ? ac.sort_order : index
        );
      });

      try {
        const acResult = await db.query(
          `INSERT INTO action_complaints (work_order_id, complaint, action_date, target_date, responsibility, status, is_default, sort_order) VALUES ${acPlaceholders.join(', ')} RETURNING *`,
          acValues
        );
        insertedComplaints = acResult.rows;
      } catch (acError) {
        console.error('Insert action complaints error:', acError.message);
      }
    }

    return res.status(201).json({
      work_order: {
        ...workOrder,
        pending_points: insertedPendingPoints,
        action_complaints: insertedComplaints
      }
    });
  } catch (err) {
    console.error('Create work order error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work-orders - List work orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (req.profile.role !== 'admin') {
      params.push(req.user.id);
      conditions.push(`wo.created_by = $${params.length}`);
    }

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      const searchIdx = params.length;
      conditions.push(`(wo.work_order_number ILIKE $${searchIdx} OR wo.customer_name ILIKE $${searchIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT wo.*,
        COALESCE((SELECT COUNT(*) FROM pending_points pp WHERE pp.work_order_id = wo.id AND pp.status = 'open'), 0)::int AS open_pending_points_count
      FROM work_orders wo
      ${whereClause}
      ORDER BY wo.created_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({ work_orders: result.rows });
  } catch (err) {
    console.error('List work orders error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work-orders/summary - Dashboard stats (optimized with parallel queries)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const isAdmin = req.profile.role === 'admin';
    const userId = req.user.id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Build all queries
    const queries = [];

    // Q0: Total active users (Admin only)
    if (isAdmin) {
      queries.push(db.query('SELECT COUNT(*)::int AS count FROM profiles'));
    } else {
      queries.push(Promise.resolve({ rows: [{ count: 0 }] }));
    }

    // Q1: Total work orders
    if (isAdmin) {
      queries.push(db.query('SELECT COUNT(*)::int AS count FROM work_orders'));
    } else {
      queries.push(db.query('SELECT COUNT(*)::int AS count FROM work_orders WHERE created_by = $1', [userId]));
    }

    // Q2: Open pending points count
    if (isAdmin) {
      queries.push(db.query(
        "SELECT COUNT(*)::int AS count FROM pending_points pp INNER JOIN work_orders wo ON wo.id = pp.work_order_id WHERE pp.status = 'open'"
      ));
    } else {
      queries.push(db.query(
        "SELECT COUNT(*)::int AS count FROM pending_points pp INNER JOIN work_orders wo ON wo.id = pp.work_order_id WHERE pp.status = 'open' AND wo.created_by = $1",
        [userId]
      ));
    }

    // Q3: Resolved pending points this month
    if (isAdmin) {
      queries.push(db.query(
        "SELECT COUNT(*)::int AS count FROM pending_points pp INNER JOIN work_orders wo ON wo.id = pp.work_order_id WHERE pp.status = 'resolved' AND pp.updated_at >= $1 AND pp.updated_at <= $2",
        [monthStart, monthEnd]
      ));
    } else {
      queries.push(db.query(
        "SELECT COUNT(*)::int AS count FROM pending_points pp INNER JOIN work_orders wo ON wo.id = pp.work_order_id WHERE pp.status = 'resolved' AND pp.updated_at >= $1 AND pp.updated_at <= $2 AND wo.created_by = $3",
        [monthStart, monthEnd, userId]
      ));
    }

    // Q4: Work orders created this month
    if (isAdmin) {
      queries.push(db.query(
        'SELECT COUNT(*)::int AS count FROM work_orders WHERE created_at >= $1 AND created_at <= $2',
        [monthStart, monthEnd]
      ));
    } else {
      queries.push(db.query(
        'SELECT COUNT(*)::int AS count FROM work_orders WHERE created_at >= $1 AND created_at <= $2 AND created_by = $3',
        [monthStart, monthEnd, userId]
      ));
    }

    // Execute all queries in parallel
    const [usersResult, woResult, ppResult, resolvedResult, woMonthResult] = await Promise.all(queries);

    return res.json({
      summary: {
        total_work_orders: woResult.rows[0].count || 0,
        open_pending_points: ppResult.rows[0].count || 0,
        resolved_this_month: resolvedResult.rows[0].count || 0,
        work_orders_this_month: woMonthResult.rows[0].count || 0,
        total_active_users: usersResult.rows[0].count || 0
      }
    });
  } catch (err) {
    console.error('Summary endpoint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work-orders/pending-approval - Work orders needing approval
router.get('/pending-approval', authenticate, async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const query = `
      SELECT wo.*,
        COALESCE((SELECT COUNT(*) FROM pending_points pp WHERE pp.work_order_id = wo.id AND pp.status = 'open'), 0)::int AS open_pending_points_count
      FROM work_orders wo
      WHERE wo.pending_points_approved IS NULL
        AND wo.received_date IS NOT NULL
        AND wo.received_date <= $1
      ORDER BY wo.created_at DESC
    `;

    const result = await db.query(query, [yesterdayStr]);

    return res.json({ work_orders: result.rows });
  } catch (err) {
    console.error('Pending approval error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work-orders/:id - Single work order with all related data
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch work order
    const woResult = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const workOrder = woResult.rows[0];

    // Authorization check
    if (req.profile.role !== 'admin' && workOrder.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch pending points, action complaints, and email logs in parallel
    const [ppResult, acResult, elResult] = await Promise.all([
      db.query('SELECT * FROM pending_points WHERE work_order_id = $1 ORDER BY created_at ASC', [id]),
      db.query('SELECT * FROM action_complaints WHERE work_order_id = $1 ORDER BY sort_order ASC, created_at ASC', [id]),
      db.query('SELECT * FROM email_logs WHERE work_order_id = $1 ORDER BY sent_at DESC', [id])
    ]);

    return res.json({
      work_order: {
        ...workOrder,
        pending_points: ppResult.rows,
        action_complaints: acResult.rows,
        email_logs: elResult.rows
      }
    });
  } catch (err) {
    console.error('Get work order error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/work-orders/:id - Update work order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      work_order_number,
      customer_name,
      rating_mva,
      inspection_start_date,
      received_date,
      testing_date,
      rtcc_mb_internal_test,
      inspection_completion_date,
      clearance_for_packing_date,
      total_working_days,
      pending_points,
      action_complaints
    } = req.body;

    // Verify ownership
    const existingResult = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const existing = existingResult.rows[0];

    if (req.profile.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update data
    const setClauses = [];
    const updateValues = [];

    const fieldMap = {
      work_order_number, customer_name, rating_mva,
      inspection_start_date, received_date, testing_date,
      rtcc_mb_internal_test, inspection_completion_date,
      clearance_for_packing_date
    };

    for (const [key, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        updateValues.push(value);
        setClauses.push(`${key} = $${updateValues.length}`);
      }
    }

    // Recalculate total working days if clearance dates changed
    const startDate = inspection_start_date !== undefined ? inspection_start_date : existing.inspection_start_date;
    const endDate = clearance_for_packing_date !== undefined ? clearance_for_packing_date : existing.clearance_for_packing_date;

    if (startDate && endDate) {
      const calculatedDays = calculateWorkingDays(startDate, endDate);
      updateValues.push(calculatedDays);
      setClauses.push(`total_working_days = $${updateValues.length}`);
    } else if (total_working_days !== undefined) {
      updateValues.push(total_working_days);
      setClauses.push(`total_working_days = $${updateValues.length}`);
    }

    // Update work order
    let updatedWO;
    if (setClauses.length > 0) {
      updateValues.push(id);
      const updateSQL = `UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = $${updateValues.length} RETURNING *`;
      const updateResult = await db.query(updateSQL, updateValues);

      if (updateResult.rows.length === 0) {
        console.error('Update work order error: no rows returned');
        return res.status(500).json({ error: 'Failed to update work order' });
      }

      updatedWO = updateResult.rows[0];
    } else {
      updatedWO = existing;
    }

    // Replace pending points if provided (delete existing, re-insert all)
    let updatedPendingPoints = [];
    if (pending_points !== undefined) {
      // Delete existing
      await db.query('DELETE FROM pending_points WHERE work_order_id = $1', [id]);

      // Re-insert
      if (pending_points.length > 0) {
        const ppValues = [];
        const ppPlaceholders = [];
        pending_points.forEach((pp, i) => {
          const offset = i * 4;
          ppPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
          ppValues.push(id, pp.description, pp.remarks || null, pp.status || 'open');
        });

        try {
          const ppResult = await db.query(
            `INSERT INTO pending_points (work_order_id, description, remarks, status) VALUES ${ppPlaceholders.join(', ')} RETURNING *`,
            ppValues
          );
          updatedPendingPoints = ppResult.rows;
        } catch (ppError) {
          console.error('Re-insert pending points error:', ppError.message);
        }
      }
    }

    // Replace action complaints if provided
    let updatedComplaints = [];
    if (action_complaints !== undefined) {
      // Delete existing
      await db.query('DELETE FROM action_complaints WHERE work_order_id = $1', [id]);

      // Re-insert
      if (action_complaints.length > 0) {
        const acValues = [];
        const acPlaceholders = [];
        action_complaints.forEach((ac, index) => {
          const offset = index * 8;
          acPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
          acValues.push(
            id, ac.complaint, ac.action_date || null, ac.target_date || null,
            ac.responsibility || null, ac.status || 'pending', ac.is_default || false,
            ac.sort_order !== undefined ? ac.sort_order : index
          );
        });

        try {
          const acResult = await db.query(
            `INSERT INTO action_complaints (work_order_id, complaint, action_date, target_date, responsibility, status, is_default, sort_order) VALUES ${acPlaceholders.join(', ')} RETURNING *`,
            acValues
          );
          updatedComplaints = acResult.rows;
        } catch (acError) {
          console.error('Re-insert action complaints error:', acError.message);
        }
      }
    }

    return res.json({
      work_order: {
        ...updatedWO,
        pending_points: updatedPendingPoints,
        action_complaints: updatedComplaints
      }
    });
  } catch (err) {
    console.error('Update work order error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/work-orders/:id/approve-pending - Approve/reject pending points
router.put('/:id/approve-pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (approved === undefined) {
      return res.status(400).json({ error: 'Approved field is required (true or false)' });
    }

    // Fetch the work order
    const woResult = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Update approval fields
    const updateResult = await db.query(
      'UPDATE work_orders SET pending_points_approved = $1, pending_points_approval_date = $2 WHERE id = $3 RETURNING *',
      [approved, new Date().toISOString(), id]
    );

    if (updateResult.rows.length === 0) {
      console.error('Approve pending points error: no rows returned');
      return res.status(500).json({ error: 'Failed to update approval status' });
    }

    const updated = updateResult.rows[0];

    // If rejected (approved = false), send reminder email
    if (approved === false) {
      try {
        // Fetch active reminder recipients
        const recipResult = await db.query(
          'SELECT * FROM email_recipients WHERE is_active = true AND receives_reminder = true'
        );
        const recipients = recipResult.rows;

        // Fetch open pending points
        const ppResult = await db.query(
          "SELECT * FROM pending_points WHERE work_order_id = $1 AND status = 'open'",
          [id]
        );
        const pendingPoints = ppResult.rows;

        if (recipients && recipients.length > 0 && pendingPoints && pendingPoints.length > 0) {
          const emailResult = await emailService.sendReminderEmail(updated, pendingPoints, recipients);

          // Log to email_logs
          await db.query(
            'INSERT INTO email_logs (work_order_id, type, status, recipients, error_message) VALUES ($1, $2, $3, $4, $5)',
            [id, 'reminder', emailResult.success ? 'sent' : 'failed', recipients.map(r => r.email).join(', '), emailResult.error || null]
          );
        }
      } catch (emailErr) {
        console.error('Email sending error during rejection:', emailErr.message);
      }
    }

    return res.json({ work_order: updated });
  } catch (err) {
    console.error('Approve pending error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-orders/:id/send-reminder - Manual reminder trigger
router.post('/:id/send-reminder', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // Fetch work order
    const woResult = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const workOrder = woResult.rows[0];

    // Authorization check
    if (req.profile.role !== 'admin' && workOrder.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for existing reminder (unless force=true)
    if (force !== 'true') {
      const existingResult = await db.query(
        "SELECT id FROM email_logs WHERE work_order_id = $1 AND type = 'reminder' AND status = 'sent' ORDER BY sent_at DESC LIMIT 1",
        [id]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'Reminder already sent for this work order. Use ?force=true to send again.' });
      }
    }

    // Fetch open pending points
    const ppResult = await db.query(
      "SELECT * FROM pending_points WHERE work_order_id = $1 AND status = 'open'",
      [id]
    );
    const pendingPoints = ppResult.rows;

    if (!pendingPoints || pendingPoints.length === 0) {
      return res.status(400).json({ error: 'No open pending points to send reminder for' });
    }

    // Fetch reminder recipients
    const recipResult = await db.query(
      'SELECT * FROM email_recipients WHERE is_active = true AND receives_reminder = true'
    );
    const recipients = recipResult.rows;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No active reminder recipients configured' });
    }

    // Send reminder email
    const emailResult = await emailService.sendReminderEmail(workOrder, pendingPoints, recipients);

    // Log to email_logs
    await db.query(
      'INSERT INTO email_logs (work_order_id, type, status, recipients, error_message) VALUES ($1, $2, $3, $4, $5)',
      [id, 'reminder', emailResult.success ? 'sent' : 'failed', recipients.map(r => r.email).join(', '), emailResult.error || null]
    );

    if (emailResult.success) {
      return res.json({ message: 'Reminder email sent successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to send reminder email', details: emailResult.error });
    }
  } catch (err) {
    console.error('Send reminder error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-orders/:id/send-followup - Manual follow-up trigger
router.post('/:id/send-followup', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // Fetch work order
    const woResult = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const workOrder = woResult.rows[0];

    // Authorization check
    if (req.profile.role !== 'admin' && workOrder.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for existing follow-up (unless force=true)
    if (force !== 'true') {
      const existingResult = await db.query(
        "SELECT id FROM email_logs WHERE work_order_id = $1 AND type = 'followup' AND status = 'sent' ORDER BY sent_at DESC LIMIT 1",
        [id]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'Follow-up already sent for this work order. Use ?force=true to send again.' });
      }
    }

    // Fetch open pending points
    const ppResult = await db.query(
      "SELECT * FROM pending_points WHERE work_order_id = $1 AND status = 'open'",
      [id]
    );
    const pendingPoints = ppResult.rows;

    if (!pendingPoints || pendingPoints.length === 0) {
      return res.status(400).json({ error: 'No open pending points to send follow-up for' });
    }

    // Fetch follow-up recipients
    const recipResult = await db.query(
      'SELECT * FROM email_recipients WHERE is_active = true AND receives_followup = true'
    );
    const recipients = recipResult.rows;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No active follow-up recipients configured' });
    }

    // Send follow-up email
    const emailResult = await emailService.sendFollowUpEmail(workOrder, pendingPoints, recipients);

    // Log to email_logs
    await db.query(
      'INSERT INTO email_logs (work_order_id, type, status, recipients, error_message) VALUES ($1, $2, $3, $4, $5)',
      [id, 'followup', emailResult.success ? 'sent' : 'failed', recipients.map(r => r.email).join(', '), emailResult.error || null]
    );

    if (emailResult.success) {
      return res.json({ message: 'Follow-up email sent successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to send follow-up email', details: emailResult.error });
    }
  } catch (err) {
    console.error('Send follow-up error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
