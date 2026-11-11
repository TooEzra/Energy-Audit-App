import { definedOnly } from '../db/tenantDb.js';

export const map = (r) => r && ({
  id: r._id, buildingId: r.buildingId, category: r.category, name: r.name, location: r.location ?? null,
  ratingW: r.ratingW, qty: r.qty, hoursDay: r.hoursDay, daysYear: r.daysYear, condition: r.condition ?? null,
});

export async function listForBuilding(db, buildingId) {
  return (await db.find('equipment', { buildingId }, { sort: { category: 1, name: 1, _id: 1 }, collation: { locale: 'en', strength: 2 } })).map(map);
}
export async function listAll(db) {
  return (await db.find('equipment', {}, { sort: { buildingId: 1, _id: 1 } })).map(map);
}
export async function getById(db, buildingId, id) {
  return map(await db.findOne('equipment', { buildingId, _id: id }));
}
export async function create(db, buildingId, e) {
  return map(await db.insert('equipment', {
    buildingId, category: e.category, name: e.name, location: e.location || null, ratingW: e.ratingW, qty: e.qty,
    hoursDay: e.hoursDay, daysYear: e.daysYear, condition: e.condition || null,
  }));
}
export async function update(db, buildingId, id, e) {
  // location/condition can be cleared with '' or null, so they are applied whenever they were provided at all.
  const set = {
    ...definedOnly({ category: e.category, name: e.name, ratingW: e.ratingW, qty: e.qty, hoursDay: e.hoursDay, daysYear: e.daysYear }),
    ...(e.location !== undefined && { location: e.location || null }),
    ...(e.condition !== undefined && { condition: e.condition || null }),
  };
  if (!Object.keys(set).length) return getById(db, buildingId, id);
  return map(await db.updateOne('equipment', { buildingId, _id: id }, set));
}
export const remove = (db, buildingId, id) => db.deleteOne('equipment', { buildingId, _id: id });
