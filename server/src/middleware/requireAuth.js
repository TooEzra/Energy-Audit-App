import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const COOKIE_NAME = 'ea_token';

/** Sign a session token. The institution id lives ONLY in the token - never in URL or body. */
export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), inst: user.institutionId, role: user.role, mcp: !!user.mustChangePassword },
    env.jwtSecret,
    { expiresIn: `${env.jwtExpiresHours}h` },
  );
}

export function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    maxAge: env.jwtExpiresHours * 3600 * 1000,
    path: '/',
  });
}

export const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, { path: '/' });

function build({ allowMustChange }) {
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next(new UnauthorizedError());
    try {
      const p = jwt.verify(token, env.jwtSecret);
      req.user = { id: Number(p.sub), institutionId: Number(p.inst), role: p.role, mustChangePassword: !!p.mcp };
    } catch {
      return next(new UnauthorizedError('Session expired, please sign in again'));
    }
    // Users holding a temporary password may only change it (and log out / read their profile).
    if (req.user.mustChangePassword && !allowMustChange) {
      return next(new ForbiddenError('You must change your temporary password first', { code: 'MUST_CHANGE_PASSWORD' }));
    }
    next();
  };
}

export const requireAuth = build({ allowMustChange: false });
export const requireAuthLoose = build({ allowMustChange: true });
