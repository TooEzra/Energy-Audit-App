import multer from 'multer';
import { AppError } from '../utils/errors.js';

// Maps database constraint names to friendly messages.
const CONSTRAINT_MESSAGES = {
  institutions_name_key: ['name', 'An institution with this name already exists'],
  users_email_unique: ['email', 'This e-mail address is already in use'],
  buildings_inst_name_key: ['name', 'A building with this name already exists'],
  energy_building_month_key: ['month', 'This month is already recorded for this building'],
};

/** Converts any thrown error into { error, details } JSON. */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? null });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message;
    return res.status(400).json({ error: msg, details: { photo: msg } });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body', details: null });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large', details: null });

  // PostgreSQL errors
  if (err.code === '23505') {
    const [field, message] = CONSTRAINT_MESSAGES[err.constraint] || ['_', 'Duplicate value'];
    return res.status(409).json({ error: message, details: { [field]: message } });
  }
  if (err.code === '23514') return res.status(400).json({ error: 'A value is outside the allowed range', details: { constraint: err.constraint } });
  if (err.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist', details: { constraint: err.constraint } });
  if (err.code === '22P02' || err.code === '22003') return res.status(400).json({ error: 'Invalid value', details: null });

  console.error(err);
  res.status(500).json({ error: 'Internal server error', details: null });
}
