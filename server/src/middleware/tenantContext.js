import { pool } from '../db/pool.js';
import { requireAuth } from './requireAuth.js';
import { requireRole } from './requireRole.js';

/**
 * Opens a transaction bound to the caller's institution (taken from the JWT) and exposes it as req.db.
 *
 * Commit/rollback is decided when the response is written: any status < 400 commits, anything else (including
 * errors routed through errorHandler) rolls back. The COMMIT finishes BEFORE the response bytes are sent, so the
 * client can never observe a response whose data is not yet committed.
 */
export function tenantContext(req, res, next) {
  (async () => {
    const client = await pool.connect();
    let finished = false;
    const finish = async (commit) => {
      if (finished) return;
      finished = true;
      try { await client.query(commit ? 'COMMIT' : 'ROLLBACK'); }
      catch (err) { console.error('tx finish failed', err.message); }
      finally { client.release(); }
    };
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.institution_id', $1, true)", [String(req.user.institutionId)]);
    } catch (err) {
      finished = true;
      client.release(err);
      throw err;
    }
    req.db = client;

    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      if (finished) return originalEnd(...args);
      finish(res.statusCode < 400).then(() => originalEnd(...args));
      return res;
    };
    // Client went away before a response was written: roll back and free the connection.
    res.on('close', () => { finish(false); });
    next();
  })().catch(next);
}

/** Standard guards: authenticated user + tenant transaction. */
export const tenantGuard = [requireAuth, tenantContext];
/** Same, restricted to admins. */
export const adminGuard = [requireAuth, requireRole('admin'), tenantContext];
