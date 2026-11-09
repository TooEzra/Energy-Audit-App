import { z } from 'zod';

// Keep in sync with migration 009 and client/src/utils/formatters.js.
export const CATEGORIES = [
  'lighting', 'ac_ventilation', 'motors_pumps', 'ict', 'other',
  'refrigeration', 'water_heating', 'kitchen_catering', 'office_equipment', 'medical_lab',
  'laundry', 'lifts', 'audio_visual', 'workshop', 'security',
];
const base = {
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Choose a valid category' }) }),
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(150),
  location: z.string().trim().max(150).optional().nullable(),
  ratingW: z.coerce.number({ invalid_type_error: 'Rating must be a number' }).positive('Rating must be greater than 0'),
  qty: z.coerce.number({ invalid_type_error: 'Quantity must be a number' }).int('Quantity must be a whole number').positive('Quantity must be greater than 0'),
  hoursDay: z.coerce.number({ invalid_type_error: 'Hours per day must be a number' }).min(0, 'Hours per day must be 0 to 24').max(24, 'Hours per day must be 0 to 24'),
  daysYear: z.coerce.number({ invalid_type_error: 'Days per year must be a number' }).int('Days per year must be a whole number').min(0, 'Days per year must be 0 to 366').max(366, 'Days per year must be 0 to 366'),
  condition: z.string().trim().max(100).optional().nullable(),
};
export const createEquipmentSchema = z.object(base);
export const updateEquipmentSchema = z.object(base).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
