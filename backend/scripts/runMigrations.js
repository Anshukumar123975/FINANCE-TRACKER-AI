import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = readFileSync(fullPath, 'utf8');
    console.log(`Running migration ${file}...`);
    await pool.query(sql);
  }

  await pool.end();
  console.log('Migrations complete');
}

run().catch((err) => {
  console.error('Migration error', err);
  process.exit(1);
});
