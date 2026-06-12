const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, requireAdmin, clearProfileCache } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT * FROM profiles WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const profile = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, profile.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: profile.id, role: profile.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash before sending
    const { password_hash, ...safeProfile } = profile;

    return res.json({ token, profile: safeProfile });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/profile - Get or create profile (kept for backward compat)
router.post('/profile', authenticate, async (req, res) => {
  try {
    const { password_hash, ...safeProfile } = req.profile;
    return res.json({ profile: safeProfile });
  } catch (err) {
    console.error('Profile endpoint error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { password_hash, ...safeProfile } = req.profile;
  return res.json({ profile: safeProfile });
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM profiles ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/create-user (admin only)
router.post('/create-user', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }

    const existing = await db.query(
      'SELECT id FROM profiles WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO profiles (id, name, email, role, password_hash, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email.toLowerCase().trim(), role || 'user', password_hash]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active, password } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(hash);
    }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      // Only updated_at, nothing to change
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, is_active, created_at`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    clearProfileCache(id);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
