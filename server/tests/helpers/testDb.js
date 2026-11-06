import pg from 'pg';
import { env } from '../../src/config/env.js';
import { pool as appPool, closePool } from '../../src/db/pool.js';

// The OWNER connection bypasses RLS (superuser): used only to reset data and to prepare fixtures in tests.
export const ownerPool = new pg.Pool({ connectionString: env.ownerDatabaseUrl, max: 2 });
export { appPool };

export async function resetDb() {
  await ownerPool.query(
    'TRUNCATE institutions, users, buildings, energy_records, equipment, findings, recommendations, measures_library RESTART IDENTITY CASCADE');
}

export async function addSystemMeasure(over = {}) {
  const m = { name: 'LED retrofit', category: 'lighting', pct: 50, cost: 100000, ...over };
  const { rows } = await ownerPool.query(
    `INSERT INTO measures_library (institution_id, name, category, typical_saving_pct, typical_cost) VALUES (NULL,$1,$2,$3,$4) RETURNING id`,
    [m.name, m.category, m.pct, m.cost]);
  return rows[0].id;
}

export async function closeAll() {
  await ownerPool.end();
  await closePool();
}
