import path from 'node:path';
import { env } from '../config/env.js';
import { NotFoundError } from './errors.js';

/** Resolve a stored relative photo path inside the upload dir (refuses anything that escapes it). */
export function absolutePhotoPath(rel) {
  const abs = path.resolve(env.uploadDir, rel);
  if (!abs.startsWith(env.uploadDir + path.sep)) throw new NotFoundError('Photo not found');
  return abs;
}
