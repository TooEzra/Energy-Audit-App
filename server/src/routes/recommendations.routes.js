import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { createRecommendationSchema, updateRecommendationSchema, prefillQuerySchema } from '../validators/recommendation.schema.js';
import * as recs from '../services/recommendations.service.js';

// Mounted at /api.
const router = Router();
const bid = (req) => idParam(req.params.id);

router.get('/buildings/:id/recommendations', ...tenantGuard, asyncHandler(async (req, res) => res.json(await recs.list(req.db, bid(req)))));
// Pre-filled values for "Add from measures library" (nothing is saved; the auditor edits then POSTs).
router.get('/buildings/:id/recommendations/prefill', ...tenantGuard, validate(prefillQuerySchema, 'query'), asyncHandler(async (req, res) => {
  res.json(await recs.prefill(req.db, bid(req), req.valid.query.measureId));
}));
router.post('/buildings/:id/recommendations', ...tenantGuard, validate(createRecommendationSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await recs.create(req.db, bid(req), req.valid.body));
}));
router.patch('/buildings/:id/recommendations/:rid', ...tenantGuard, validate(updateRecommendationSchema), asyncHandler(async (req, res) => {
  res.json(await recs.update(req.db, bid(req), idParam(req.params.rid), req.valid.body));
}));
router.delete('/buildings/:id/recommendations/:rid', ...adminGuard, asyncHandler(async (req, res) => {
  await recs.remove(req.db, bid(req), idParam(req.params.rid));
  res.status(204).end();
}));

export default router;
