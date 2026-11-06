import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard, adminGuard } from '../middleware/tenantContext.js';
import { uploadPhoto } from '../middleware/upload.js';
import { createFindingSchema, updateFindingSchema, findingQuerySchema } from '../validators/finding.schema.js';
import * as findings from '../services/findings.service.js';

// Mounted at /api. Create/update accept multipart/form-data (optional "photo") as well as plain JSON.
const router = Router();
const bid = (req) => idParam(req.params.id);
const fid = (req) => idParam(req.params.fid);

router.get('/buildings/:id/findings', ...tenantGuard, validate(findingQuerySchema, 'query'), asyncHandler(async (req, res) => {
  res.json(await findings.list(req.db, bid(req), req.valid.query.area));
}));
router.post('/buildings/:id/findings', ...tenantGuard, uploadPhoto, validate(createFindingSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await findings.create(req.db, req.user, bid(req), req.valid.body, req.file));
}));
router.patch('/buildings/:id/findings/:fid', ...tenantGuard, uploadPhoto, validate(updateFindingSchema), asyncHandler(async (req, res) => {
  res.json(await findings.update(req.db, req.user, bid(req), fid(req), req.valid.body, req.file));
}));
router.delete('/buildings/:id/findings/:fid', ...adminGuard, asyncHandler(async (req, res) => {
  await findings.remove(req.db, bid(req), fid(req));
  res.status(204).end();
}));
// Photos are never served statically: only through this authenticated, tenant-scoped route.
router.get('/buildings/:id/findings/:fid/photo', ...tenantGuard, asyncHandler(async (req, res) => {
  const file = await findings.getPhotoFile(req.db, bid(req), fid(req));
  res.set('Cache-Control', 'private, max-age=300');
  res.sendFile(file, (err) => { if (err && !res.headersSent) res.status(404).json({ error: 'Photo not found', details: null }); });
}));

export default router;
