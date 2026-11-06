import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { energyRecordSchema, updateEnergyRecordSchema, importSchema } from '../validators/energy.schema.js';
import * as energy from '../services/energy.service.js';

// Mounted at /api: owns /buildings/:id/energy*, /buildings/:id/analysis and /analysis/compare.
const router = Router();
const bid = (req) => idParam(req.params.id);

router.get('/buildings/:id/energy', ...tenantGuard, asyncHandler(async (req, res) => res.json(await energy.list(req.db, bid(req)))));
router.post('/buildings/:id/energy', ...tenantGuard, validate(energyRecordSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await energy.create(req.db, bid(req), req.valid.body));
}));
router.post('/buildings/:id/energy/import', ...tenantGuard, validate(importSchema), asyncHandler(async (req, res) => {
  res.json(await energy.importCsv(req.db, bid(req), req.valid.body));
}));
router.patch('/buildings/:id/energy/:recId', ...tenantGuard, validate(updateEnergyRecordSchema), asyncHandler(async (req, res) => {
  res.json(await energy.update(req.db, bid(req), idParam(req.params.recId), req.valid.body));
}));
router.delete('/buildings/:id/energy/:recId', ...adminGuard, asyncHandler(async (req, res) => {
  await energy.remove(req.db, bid(req), idParam(req.params.recId));
  res.status(204).end();
}));

router.get('/buildings/:id/analysis', ...tenantGuard, asyncHandler(async (req, res) => res.json(await energy.getAnalysis(req.db, bid(req)))));
router.get('/analysis/compare', ...tenantGuard, asyncHandler(async (req, res) => res.json(await energy.compare(req.db))));

export default router;
