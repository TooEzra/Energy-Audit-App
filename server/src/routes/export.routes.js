import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { tenantGuard } from '../middleware/tenantContext.js';
import * as exporter from '../services/export.service.js';

const router = Router();
router.get('/', ...tenantGuard, validate(z.object({ format: z.enum(['json', 'csv']).default('json') }), 'query'), asyncHandler(async (req, res) => {
  const data = await exporter.collect(req.db);
  if (req.valid.query.format === 'csv') {
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="energy-audit-export.csv"' });
    return res.send(exporter.toCsvText(data));
  }
  res.set('Content-Disposition', 'attachment; filename="energy-audit-export.json"');
  res.json(data);
}));
export default router;
