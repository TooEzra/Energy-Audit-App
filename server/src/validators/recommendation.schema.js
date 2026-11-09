import { z } from 'zod';
import { CATEGORIES } from './equipment.schema.js';

const money = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`);
const status = z.enum(['Proposed', 'Accepted', 'Implemented'], { errorMap: () => ({ message: 'Status must be Proposed, Accepted or Implemented' }) });

// When measureId is given, omitted title/cost/saving are pre-filled from the library measure by the service.
export const createRecommendationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  estimatedCost: money('Estimated cost').optional(),
  estimatedAnnualSaving: money('Estimated annual saving').optional(),
  status: status.default('Proposed'),
  findingId: z.coerce.number().int().positive().optional().nullable(),
  measureId: z.coerce.number().int().positive().optional().nullable(),
}).superRefine((v, ctx) => {
  if (!v.measureId) {
    if (!v.title) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Title is required' });
    if (v.estimatedCost === undefined) ctx.addIssue({ code: 'custom', path: ['estimatedCost'], message: 'Estimated cost is required' });
    if (v.estimatedAnnualSaving === undefined) ctx.addIssue({ code: 'custom', path: ['estimatedAnnualSaving'], message: 'Estimated annual saving is required' });
  }
});

export const updateRecommendationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  estimatedCost: money('Estimated cost'),
  estimatedAnnualSaving: money('Estimated annual saving'),
  status,
  findingId: z.coerce.number().int().positive().nullable(),
}).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const createMeasureSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  category: z.enum([...CATEGORIES, 'operating_hours', 'practices'], { errorMap: () => ({ message: 'Choose a valid category' }) }),
  typicalSavingPct: z.coerce.number({ invalid_type_error: 'Saving % must be a number' }).min(0, 'Saving % must be 0 to 100').max(100, 'Saving % must be 0 to 100'),
  typicalCost: money('Typical cost'),
  description: z.string().trim().max(1000).optional().nullable(),
});

export const prefillQuerySchema = z.object({ measureId: z.coerce.number().int().positive() });
