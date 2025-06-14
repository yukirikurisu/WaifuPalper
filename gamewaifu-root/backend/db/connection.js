const { Pool } = require('pg');
const config = require('../config');

let pool;

function initializePool() {
  if (!pool) {
    // Obtener configuración directamente de config.db
    const dbConfig = {
      user: config.db.user,
      host: config.db.host,
      database: config.db.database,
      password: config.db.password,
      port: config.db.port,
      ...(config.db.ssl ? { ssl: config.db.ssl } : {})
    };

    pool = new Pool({
      ...dbConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('connect', () => {
      console.log('Connection pool created successfully');
    });
    
    pool.on('error', err => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

function getConnection() {
  initializePool();
  return pool.connect(); 
}

async function query(text, params) {
  initializePool();
  return pool.query(text, params);
}

async function withDb(callback, { autocommit = false } = {}) {
  const client = await getConnection();
  try {
    if (!autocommit) await client.query('BEGIN');
    await callback(client);
    if (!autocommit) await client.query('COMMIT');
  } catch (err) {
    if (!autocommit) await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function closeAllConnections() {
  if (pool) return pool.end();
}

module.exports = {
  initializePool,
  getConnection,
  query,
  withDb,
  closeAllConnections
};