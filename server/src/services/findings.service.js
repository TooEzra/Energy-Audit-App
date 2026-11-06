import fs from 'node:fs/promises';
import { absolutePhotoPath } from '../utils/files.js';
import * as findingsRepo from '../repositories/findings.repo.js';
import { requireBuilding } from './buildings.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const relPath = (file, institutionId) => `${institutionId}/${file.filename}`;
const discard = (file) => (file ? fs.unlink(file.path).catch(() => {}) : undefined);

/** multer trusts the client's mimetype; also verify the real file signature (JPEG FF D8 FF / PNG 89 50 4E 47). */
async function assertImage(file) {
  const fh = await fs.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(4);
    await fh.read(buf, 0, 4, 0);
    const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!isJpg && !isPng) throw new ValidationError('Photo must be a JPG or PNG image', { photo: 'Not a valid JPG or PNG image' });
  } finally { await fh.close(); }
}

export async function list(db, buildingId, area) {
  await requireBuilding(db, buildingId);
  return { items: await findingsRepo.listForBuilding(db, buildingId, area) };
}

export async function create(db, user, buildingId, data, file) {
  try {
    await requireBuilding(db, buildingId);
    if (file) await assertImage(file);
    return await findingsRepo.create(db, buildingId, data, file ? relPath(file, user.institutionId) : null);
  } catch (err) { await discard(file); throw err; }
}

export async function update(db, user, buildingId, id, data, file) {
  let oldPhoto = null;
  try {
    await requireBuilding(db, buildingId);
    if (!(await findingsRepo.getById(db, buildingId, id))) throw new NotFoundError('Finding not found');
    if (file) await assertImage(file);
    oldPhoto = await findingsRepo.getPhotoPath(db, buildingId, id);
    const { removePhoto, ...fields } = data;
    const photo = file ? relPath(file, user.institutionId) : removePhoto ? null : undefined;
    const updated = await findingsRepo.update(db, buildingId, id, fields, photo);
    // Old file is deleted only when it was replaced/removed (after the DB update succeeded).
    if (photo !== undefined && oldPhoto) await fs.unlink(absolutePhotoPath(oldPhoto)).catch(() => {});
    return updated;
  } catch (err) { await discard(file); throw err; }
}

export async function remove(db, buildingId, id) {
  await requireBuilding(db, buildingId);
  const photo = await findingsRepo.getPhotoPath(db, buildingId, id);
  if (!(await findingsRepo.remove(db, buildingId, id))) throw new NotFoundError('Finding not found');
  if (photo) await fs.unlink(absolutePhotoPath(photo)).catch(() => {});
}

/** Absolute photo path for the authenticated download route; 404 when the finding or photo does not exist. */
export async function getPhotoFile(db, buildingId, id) {
  await requireBuilding(db, buildingId);
  const rel = await findingsRepo.getPhotoPath(db, buildingId, id);
  if (!rel) throw new NotFoundError('Photo not found');
  return absolutePhotoPath(rel);
}
