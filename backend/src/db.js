import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/** @typedef {import('./types.d.ts').User} User */

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    console.log('slow query', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
