import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { tenantGuard } from '../middleware/tenantContext.js';
import * as report from '../services/report.service.js';

const router = Router();
const querySchema = z.object({
  format: z.enum(['json', 'pdf']).default('json'),
  conclusion: z.string().max(report.MAX_CONCLUSION, `Conclusion must be at most ${report.MAX_CONCLUSION} characters`).optional(),
});

// JSON report data (default) or ?format=pdf for a PDF download. `conclusion` carries the auditor's edited text.
router.get('/buildings/:id/report', ...tenantGuard, validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const { format, conclusion } = req.valid.query;
  const data = await report.getReportData(req.db, idParam(req.params.id), conclusion);
  if (format === 'json') return res.json(data);
  const pdf = await report.renderPdf(await report.renderReportHtml(data));
  const safe = data.building.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'building';
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="energy-audit-${safe}.pdf"` });
  res.send(pdf);
}));

export default router;
