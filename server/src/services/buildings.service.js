import fs from 'node:fs/promises';
import * as buildingsRepo from '../repositories/buildings.repo.js';
import * as institutionsRepo from '../repositories/institutions.repo.js';
import * as findingsRepo from '../repositories/findings.repo.js';
import { absolutePhotoPath } from '../utils/files.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/** Load a building through the tenant-scoped client. Another institution's building is invisible (RLS) => 404. */
export async function requireBuilding(db, id) {
  if (!id) throw new NotFoundError('Building not found');
  const b = await buildingsRepo.getById(db, id);
  if (!b) throw new NotFoundError('Building not found');
  return b;
}

export async function list(db) {
  const [items, inst] = await Promise.all([buildingsRepo.list(db), institutionsRepo.getOwn(db)]);
  return { items, maxBuildings: inst.maxBuildings };
}

export async function create(db, data) {
  // Lock the institution row so two concurrent requests cannot both slip under the limit.
  const inst = await institutionsRepo.getOwn(db, { lock: true });
  const n = await buildingsRepo.count(db);
  if (n >= inst.maxBuildings) {
    throw new ValidationError(`Building limit reached (${inst.maxBuildings}). An admin can raise it in Settings.`, { limit: `Maximum ${inst.maxBuildings} buildings` });
  }
  return buildingsRepo.create(db, data);
}

export async function update(db, id, data) {
  await requireBuilding(db, id);
  return buildingsRepo.update(db, id, data);
}

/** Deleting a building cascades to its records; finding photos on disk are removed afterwards (best effort). */
export async function remove(db, id) {
  await requireBuilding(db, id);
  const photos = await findingsRepo.photoPathsForBuilding(db, id);
  await buildingsRepo.remove(db, id);
  return () => Promise.all(photos.map((p) => fs.unlink(absolutePhotoPath(p)).catch(() => {})));
}
