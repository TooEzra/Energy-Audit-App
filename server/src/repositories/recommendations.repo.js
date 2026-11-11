import { definedOnly } from '../db/tenantDb.js';

export const map = (r) => r && ({
  id: r._id, buildingId: r.buildingId, findingId: r.findingId ?? null, measureId: r.measureId ?? null, title: r.title,
  estimatedCost: r.estimatedCost, estimatedAnnualSaving: r.estimatedAnnualSaving, status: r.status,
  isEstimate: true, createdAt: r.createdAt, // savings are ALWAYS estimates (spec rule), never stored as false
});

export async function listForBuilding(db, buildingId) {
  return (await db.find('recommendations', { buildingId }, { sort: { createdAt: -1, _id: -1 } })).map(map);
}
export async function listAll(db) {
  return (await db.find('recommendations', {}, { sort: { buildingId: 1, _id: 1 } })).map(map);
}
export async function getById(db, buildingId, id) {
  return map(await db.findOne('recommendations', { buildingId, _id: id }));
}
export async function create(db, buildingId, r) {
  return map(await db.insert('recommendations', {
    buildingId, findingId: r.findingId ?? null, measureId: r.measureId ?? null, title: r.title,
    estimatedCost: r.estimatedCost, estimatedAnnualSaving: r.estimatedAnnualSaving, status: r.status || 'Proposed', createdAt: new Date(),
  }));
}
export async function update(db, buildingId, id, r) {
  const set = {
    ...definedOnly({ title: r.title, estimatedCost: r.estimatedCost, estimatedAnnualSaving: r.estimatedAnnualSaving, status: r.status }),
    ...(r.findingId !== undefined && { findingId: r.findingId ?? null }),
  };
  if (!Object.keys(set).length) return getById(db, buildingId, id);
  return map(await db.updateOne('recommendations', { buildingId, _id: id }, set));
}
export const remove = (db, buildingId, id) => db.deleteOne('recommendations', { buildingId, _id: id });
