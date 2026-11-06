import { z } from 'zod';
import { passwordField } from './auth.schema.js';

const role = z.enum(['admin', 'auditor'], { errorMap: () => ({ message: 'Role must be admin or auditor' }) });
const email = z.string().trim().toLowerCase().email('Enter a valid e-mail address').max(200);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  email,
  role: role.default('auditor'),
  temporaryPassword: passwordField.optional(), // generated when omitted
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  role: role.optional(),
  temporaryPassword: passwordField.optional(), // resets the password and forces a change at next login
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const updateInstitutionSchema = z.object({
  name: z.string().trim().min(2, 'Institution name is required').max(150).optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code').optional(),
  maxBuildings: z.coerce.number({ invalid_type_error: 'Building limit must be a number' })
    .int('Building limit must be a whole number').min(1, 'Limit must be between 1 and 50').max(50, 'Limit must be between 1 and 50').optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');
