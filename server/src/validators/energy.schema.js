import { z } from 'zod';
import { MONTH_RE } from '../utils/dates.js';

const num = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
  .refine((v) => Number.isFinite(v), `${label} must be a number`).refine((v) => v >= 0, `${label} cannot be negative`);

// "kWh" / "Cost" required: z.coerce turns '' into 0, so reject empty strings and null explicitly first.
const required = (label) => z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v), num(label));

export const monthField = z.string({ required_error: 'Month is required' }).trim().regex(MONTH_RE, 'Month must be in YYYY-MM format');

export const energyRecordSchema = z.object({ month: monthField, kwh: required('kWh'), cost: required('Cost') });
export const updateEnergyRecordSchema = z.object({ month: monthField.optional(), kwh: required('kWh').optional(), cost: required('Cost').optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const importSchema = z.object({
  csv: z.string({ required_error: 'CSV text is required' }).min(1, 'CSV text is required').max(1_000_000),
  confirm: z.boolean().optional().default(false),
});
