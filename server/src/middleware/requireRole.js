import { ForbiddenError } from '../utils/errors.js';

/** Allow only the listed roles (use after requireAuth). */
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ForbiddenError('Admin access required'));
