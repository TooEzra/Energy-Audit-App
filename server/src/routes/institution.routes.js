import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { updateInstitutionSchema } from '../validators/user.schema.js';
import * as users from '../services/users.service.js';

const router = Router();
router.get('/', ...tenantGuard, asyncHandler(async (req, res) => res.json(await users.getInstitution(req.db))));
router.patch('/', ...adminGuard, validate(updateInstitutionSchema), asyncHandler(async (req, res) => {
  res.json(await users.updateInstitution(req.db, req.valid.body));
}));
export default router;
