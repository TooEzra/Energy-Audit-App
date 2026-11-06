import { pool } from './pool.js';

/**
 * Run fn(client) inside ONE transaction bound to a single institution (tenant).
 *
 *   BEGIN -> set_config('app.institution_id', id, true) -> fn(client) -> COMMIT  (ROLLBACK on error)
 *
 * The third argument `true` makes the setting transaction-local: it disappears at COMMIT/ROLLBACK, so a pooled
 * connection can never leak one tenant's id into the next request. Row-level security policies read this
 * setting (via app_institution_id()), which is what actually isolates tenants - not application-level WHERE clauses.
 */
export async function withTenant(institutionId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.institution_id', $1, true)", [String(institutionId)]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection already broken */ }
    throw err;
  } finally {
    client.release();
  }
}
