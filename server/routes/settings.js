const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const emailService = require('../services/emailService');

// All settings routes require admin
router.use(authenticate, requireAdmin);

// Helper to get .env path
const getEnvPath = () => path.resolve(process.cwd(), '.env');

// GET /api/settings/email-config
router.get('/email-config', async (req, res) => {
  try {
    const envPath = getEnvPath();
    let email = '';
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^GMAIL_USER=(.*)$/m);
      if (match) email = match[1].trim();
    }
    
    return res.json({ email });
  } catch (err) {
    console.error('Fetch email config error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/email-config
router.put('/email-config', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and App Password are required' });
    }

    const envPath = getEnvPath();
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Update or append GMAIL_USER
    if (content.match(/^GMAIL_USER=/m)) {
      content = content.replace(/^GMAIL_USER=.*$/m, `GMAIL_USER=${email}`);
    } else {
      content += `\nGMAIL_USER=${email}`;
    }

    // Update or append GMAIL_APP_PASSWORD
    if (content.match(/^GMAIL_APP_PASSWORD=/m)) {
      content = content.replace(/^GMAIL_APP_PASSWORD=.*$/m, `GMAIL_APP_PASSWORD=${password}`);
    } else {
      content += `\nGMAIL_APP_PASSWORD=${password}`;
    }

    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');

    // Update current process env variables
    process.env.GMAIL_USER = email;
    process.env.GMAIL_APP_PASSWORD = password;

    // Reload email service
    emailService.updateConfig();

    return res.json({ message: 'Email configuration updated successfully', email });
  } catch (err) {
    console.error('Update email config error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/recipients - List all email recipients
router.get('/recipients', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM email_recipients ORDER BY department ASC, contact_name ASC'
    );

    return res.json({ recipients: result.rows || [] });
  } catch (err) {
    console.error('Recipients list error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings/recipients - Add recipient
router.post('/recipients', async (req, res) => {
  try {
    const { department, contact_name, email, receives_reminder, receives_followup } = req.body;

    if (!email || !contact_name) {
      return res.status(400).json({ error: 'Contact name and email are required' });
    }

    const result = await db.query(
      `INSERT INTO email_recipients (department, contact_name, email, receives_reminder, receives_followup, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        department || null,
        contact_name,
        email,
        receives_reminder !== undefined ? receives_reminder : true,
        receives_followup !== undefined ? receives_followup : true,
        true
      ]
    );

    return res.status(201).json({ recipient: result.rows[0] });
  } catch (err) {
    console.error('Add recipient error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/recipients/:id - Update recipient
router.put('/recipients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { department, contact_name, email, receives_reminder, receives_followup, is_active } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (department !== undefined) {
      fields.push(`department = $${paramIndex++}`);
      values.push(department);
    }
    if (contact_name !== undefined) {
      fields.push(`contact_name = $${paramIndex++}`);
      values.push(contact_name);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (receives_reminder !== undefined) {
      fields.push(`receives_reminder = $${paramIndex++}`);
      values.push(receives_reminder);
    }
    if (receives_followup !== undefined) {
      fields.push(`receives_followup = $${paramIndex++}`);
      values.push(receives_followup);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE email_recipients SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    return res.json({ recipient: result.rows[0] });
  } catch (err) {
    console.error('Update recipient error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/settings/recipients/:id - Delete recipient
router.delete('/recipients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM email_recipients WHERE id = $1', [id]);

    return res.json({ message: 'Recipient deleted successfully' });
  } catch (err) {
    console.error('Delete recipient error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
