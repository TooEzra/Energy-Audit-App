import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuthLoose, setSessionCookie, clearSessionCookie } from '../middleware/requireAuth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { registerInstitutionSchema, loginSchema, changePasswordSchema } from '../validators/auth.schema.js';
import * as auth from '../services/auth.service.js';

const router = Router();
const limiter = rateLimit();

// Sign-up and login happen BEFORE a tenant is known (auth lookup / registration use the raw database), so no tenantContext here.
router.post('/register-institution', limiter, validate(registerInstitutionSchema), asyncHandler(async (req, res) => {
  const session = await auth.registerInstitution(req.valid.body);
  setSessionCookie(res, session.user);
  res.status(201).json(session);
}));

router.post('/login', limiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const session = await auth.login(email, password);
  setSessionCookie(res, session.user);
  res.json(session);
}));

router.post('/logout', (req, res) => { clearSessionCookie(res); res.status(204).end(); });

// Users with a temporary password may still call these (requireAuthLoose).
router.get('/me', requireAuthLoose, tenantContext, asyncHandler(async (req, res) => {
  res.json(await auth.me(req.db, req.user.id));
}));

router.post('/change-password', requireAuthLoose, tenantContext, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  await auth.changePassword(req.db, req.user.id, currentPassword, newPassword);
  const session = await auth.me(req.db, req.user.id);
  setSessionCookie(res, { ...session.user, institutionId: req.user.institutionId }); // reissue without the must-change flag
  res.json(session);
}));

export default router;
