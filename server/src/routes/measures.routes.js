import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { tenantGuard } from '../middleware/tenantContext.js';
import { createMeasureSchema } from '../validators/recommendation.schema.js';
import * as recs from '../services/recommendations.service.js';

const router = Router();
// System presets + the institution's own measures (RLS decides what is visible).
router.get('/', ...tenantGuard, asyncHandler(async (req, res) => res.json(await recs.listMeasures(req.db))));
router.post('/', ...tenantGuard, validate(createMeasureSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await recs.createMeasure(req.db, req.valid.body));
}));
export default router;
