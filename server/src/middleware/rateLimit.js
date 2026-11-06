import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/** Small in-memory fixed-window limiter (single-process prototype). Keyed by client IP. */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = env.loginRateMax } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new AppError(429, 'Too many attempts, please try again later'));
    }
    next();
  };
}
