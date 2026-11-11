import multer from 'multer';
import { AppError } from '../utils/errors.js';

// Maps MongoDB unique-index names to friendly messages (see ensureIndexes in db/mongo.js).
const INDEX_MESSAGES = {
  institutions_name_key: ['name', 'An institution with this name already exists'],
  users_email_unique: ['email', 'This e-mail address is already in use'],
  buildings_inst_name_key: ['name', 'A building with this name already exists'],
  energy_building_month_key: ['month', 'This month is already recorded for this building'],
};

/** The index name from a duplicate-key error (message looks like: "... index: users_email_unique dup key: ..."). */
const duplicateIndex = (err) => /index:\s+(\S+)/.exec(err.message || '')?.[1];

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

  // MongoDB duplicate key (E11000) from a unique index
  if (err.code === 11000) {
    const [field, message] = INDEX_MESSAGES[duplicateIndex(err)] || ['_', 'Duplicate value'];
    return res.status(409).json({ error: message, details: { [field]: message } });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error', details: null });
}
