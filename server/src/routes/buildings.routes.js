import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { createBuildingSchema, updateBuildingSchema } from '../validators/building.schema.js';
import * as buildings from '../services/buildings.service.js';

const router = Router();

router.get('/', ...tenantGuard, asyncHandler(async (req, res) => res.json(await buildings.list(req.db))));
router.post('/', ...tenantGuard, validate(createBuildingSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await buildings.create(req.db, req.valid.body));
}));
router.get('/:id', ...tenantGuard, asyncHandler(async (req, res) => {
  res.json(await buildings.requireBuilding(req.db, idParam(req.params.id)));
}));
router.patch('/:id', ...tenantGuard, validate(updateBuildingSchema), asyncHandler(async (req, res) => {
  res.json(await buildings.update(req.db, idParam(req.params.id), req.valid.body));
}));
// Deleting data is admin-only.
router.delete('/:id', ...adminGuard, asyncHandler(async (req, res) => {
  const cleanup = await buildings.remove(req.db, idParam(req.params.id));
  res.on('finish', cleanup); // remove finding photos from disk once the delete is committed
  res.status(204).end();
}));
export default router;
