import { z } from 'zod';

export const AREAS = ['lighting', 'ac_ventilation', 'motors_pumps', 'operating_hours', 'practices'];
const optionalText = z.string().trim().max(1000).optional().nullable();
const base = {
  area: z.enum(AREAS, { errorMap: () => ({ message: 'Choose a valid audit area' }) }),
  problem: z.string({ required_error: 'Problem is required' }).trim().min(1, 'Problem is required').max(1000),
  locationSystem: optionalText,
  suggestedImprovement: optionalText,
  priority: z.enum(['Low', 'Medium', 'High'], { errorMap: () => ({ message: 'Priority must be Low, Medium or High' }) }),
};
export const createFindingSchema = z.object(base);
export const updateFindingSchema = z.object({
  ...base,
  removePhoto: z.preprocess((v) => v === true || v === 'true', z.boolean()).optional(), // multipart sends strings
}).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const findingQuerySchema = z.object({ area: z.enum(AREAS).optional() });
