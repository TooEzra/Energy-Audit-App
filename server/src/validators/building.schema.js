import { z } from 'zod';

const base = {
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(150),
  type: z.string({ required_error: 'Type is required' }).trim().min(1, 'Type is required').max(80),
  floorAreaM2: z.coerce.number({ invalid_type_error: 'Floor area must be a number' }).positive('Floor area must be greater than 0'),
  operatingHours: z.coerce.number({ invalid_type_error: 'Operating hours must be a number' })
    .min(1, 'Operating hours must be between 1 and 24').max(24, 'Operating hours must be between 1 and 24'),
};
export const createBuildingSchema = z.object(base);
export const updateBuildingSchema = z.object(base).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
