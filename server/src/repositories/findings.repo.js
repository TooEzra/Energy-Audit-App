import { definedOnly } from '../db/tenantDb.js';

export const map = (r) => r && ({
  id: r._id, buildingId: r.buildingId, area: r.area, problem: r.problem, locationSystem: r.locationSystem ?? null,
  suggestedImprovement: r.suggestedImprovement ?? null, priority: r.priority, hasPhoto: !!r.photoPath, createdAt: r.createdAt,
});

export async function listForBuilding(db, buildingId, area) {
  const filter = area ? { buildingId, area } : { buildingId };
  return (await db.find('findings', filter, { sort: { createdAt: -1, _id: -1 } })).map(map);
}
export async function listAll(db) {
  return (await db.find('findings', {}, { sort: { buildingId: 1, _id: 1 } })).map(map);
}
export async function getById(db, buildingId, id) {
  return map(await db.findOne('findings', { buildingId, _id: id }));
}
/** Internal: the stored relative photo path (never sent to the client). */
export async function getPhotoPath(db, buildingId, id) {
  return (await db.findOne('findings', { buildingId, _id: id }, { projection: { photoPath: 1 } }))?.photoPath ?? null;
}
export async function photoPathsForBuilding(db, buildingId) {
  return (await db.find('findings', { buildingId, photoPath: { $ne: null } }, { projection: { photoPath: 1 } })).map((r) => r.photoPath);
}
export async function create(db, buildingId, f, photoPath) {
  return map(await db.insert('findings', {
    buildingId, area: f.area, problem: f.problem, locationSystem: f.locationSystem || null,
    suggestedImprovement: f.suggestedImprovement || null, priority: f.priority, photoPath: photoPath ?? null, createdAt: new Date(),
  }));
}
/** photoPath: undefined = keep, null = remove, string = replace. */
export async function update(db, buildingId, id, f, photoPath) {
  const set = {
    ...definedOnly({ area: f.area, problem: f.problem, priority: f.priority }),
    ...(f.locationSystem !== undefined && { locationSystem: f.locationSystem || null }),
    ...(f.suggestedImprovement !== undefined && { suggestedImprovement: f.suggestedImprovement || null }),
    ...(photoPath !== undefined && { photoPath }),
  };
  if (!Object.keys(set).length) return getById(db, buildingId, id);
  return map(await db.updateOne('findings', { buildingId, _id: id }, set));
}
export async function remove(db, buildingId, id) {
  const removed = await db.deleteOne('findings', { buildingId, _id: id });
  // was ON DELETE SET NULL: recommendations that pointed at this finding keep existing without the link.
  if (removed) await db.updateMany('recommendations', { buildingId, findingId: id }, { findingId: null });
  return removed;
}
