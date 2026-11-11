import { env } from '../config/env.js';

/**
 * CORS for a front end hosted on a different origin (e.g. Vercel) than the API (e.g. Render).
 * Only origins listed in CLIENT_ORIGIN are allowed, and credentials (the httpOnly cookie) are enabled.
 * With no CLIENT_ORIGIN set (local dev through the Vite proxy) this does nothing.
 */
export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && env.clientOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.append('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
  }
  next();
}
