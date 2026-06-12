const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'rtcc_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('FATAL: Cannot connect to PostgreSQL database:', err.message);
    console.error('Please ensure PostgreSQL is running and server/.env has correct DB_ values.');
    process.exit(1);
  }
  console.log('PostgreSQL database connected successfully.');
  release();
});

module.exports = pool;
