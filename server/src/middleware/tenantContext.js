import { tenantDb } from '../db/tenantDb.js';
import { requireAuth } from './requireAuth.js';
import { requireRole } from './requireRole.js';

/**
 * Exposes the tenant-scoped database handle as req.db. The institution id comes ONLY from the verified JWT
 * (req.user), never from the URL or body. Every repository query made through req.db is automatically restricted
 * to that institution (see db/tenantDb.js).
 */
export function tenantContext(req, res, next) {
  try {
    req.db = tenantDb(req.user.institutionId);
    next();
  } catch (err) { next(err); }
}

/** Standard guards: authenticated user + tenant handle. */
export const tenantGuard = [requireAuth, tenantContext];
/** Same, restricted to admins. */
export const adminGuard = [requireAuth, requireRole('admin'), tenantContext];
