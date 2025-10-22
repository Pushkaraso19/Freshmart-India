const { Pool } = require('pg');
require('../setupEnv');

const connectionString = process.env.DATABASE_URL;

// Configure SSL for Aiven PostgreSQL with self-signed certificates
const sslSetting = (() => {
  const v = String(process.env.PG_SSL || 'false').toLowerCase();
  if (v === 'true' || v === 'require') {
    return {
      rejectUnauthorized: false
    };
  }
  return false;
})();

// Remove sslmode from connection string to avoid conflicts
const cleanConnectionString = connectionString?.replace(/[?&]sslmode=\w+/, '');

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: sslSetting,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

module.exports = pool;
