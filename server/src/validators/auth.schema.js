import { z } from 'zod';

export const passwordField = z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(200);
const email = z.string().trim().toLowerCase().email('Enter a valid e-mail address').max(200);

export const registerInstitutionSchema = z.object({
  institutionName: z.string().trim().min(2, 'Institution name is required').max(150),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code').default('KES'),
  adminName: z.string().trim().min(1, 'Your name is required').max(150),
  email,
  password: passwordField,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});
