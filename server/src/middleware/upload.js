import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png' };

// Files go to uploads/<institution_id>/<random>.<ext>; the institution id comes from the token.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(env.uploadDir, String(req.user.institutionId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
});

/** Single optional "photo" field: JPG or PNG, max 5 MB. */
export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ValidationError('Photo must be a JPG or PNG image', { photo: 'JPG or PNG only' })),
}).single('photo');
