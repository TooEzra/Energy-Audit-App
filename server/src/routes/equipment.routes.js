import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { createEquipmentSchema, updateEquipmentSchema } from '../validators/equipment.schema.js';
import * as equipment from '../services/equipment.service.js';

// Mounted at /api: owns /buildings/:id/equipment* and /buildings/:id/reconciliation.
const router = Router();
const bid = (req) => idParam(req.params.id);

router.get('/buildings/:id/equipment', ...tenantGuard, asyncHandler(async (req, res) => res.json(await equipment.list(req.db, bid(req)))));
router.post('/buildings/:id/equipment', ...tenantGuard, validate(createEquipmentSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await equipment.create(req.db, bid(req), req.valid.body));
}));
router.patch('/buildings/:id/equipment/:eqId', ...tenantGuard, validate(updateEquipmentSchema), asyncHandler(async (req, res) => {
  res.json(await equipment.update(req.db, bid(req), idParam(req.params.eqId), req.valid.body));
}));
router.delete('/buildings/:id/equipment/:eqId', ...adminGuard, asyncHandler(async (req, res) => {
  await equipment.remove(req.db, bid(req), idParam(req.params.eqId));
  res.status(204).end();
}));
router.get('/buildings/:id/reconciliation', ...tenantGuard, asyncHandler(async (req, res) => res.json(await equipment.getReconciliation(req.db, bid(req)))));

export default router;
