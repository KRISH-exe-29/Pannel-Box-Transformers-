const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_this';

// In-memory profile cache (5 min TTL)
const profileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function clearProfileCache(userId) {
  profileCache.delete(userId);
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;
    const now = Date.now();

    // Check profile cache
    if (profileCache.has(userId) && profileCache.get(userId).expiresAt > now) {
      req.user = { id: userId };
      req.profile = profileCache.get(userId).profile;
      return next();
    }

    // Fetch from database
    const result = await db.query(
      'SELECT * FROM profiles WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const profile = result.rows[0];
    profileCache.set(userId, { profile, expiresAt: now + CACHE_TTL_MS });

    req.user = { id: userId };
    req.profile = profile;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, clearProfileCache };
