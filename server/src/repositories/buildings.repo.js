import { definedOnly } from '../db/tenantDb.js';

const COLLATION = { locale: 'en', strength: 2 }; // case-insensitive, natural ordering of names
export const map = (r) => r && ({ id: r._id, name: r.name, type: r.type, floorAreaM2: r.floorAreaM2, operatingHours: r.operatingHours });

export async function list(db) {
  return (await db.find('buildings', {}, { sort: { name: 1 }, collation: COLLATION })).map(map);
}
export async function getById(db, id) {
  return map(await db.findOne('buildings', { _id: id }));
}
export const count = (db) => db.count('buildings');

export async function create(db, { name, type, floorAreaM2, operatingHours }) {
  return map(await db.insert('buildings', { name, type, floorAreaM2, operatingHours }));
}
export async function update(db, id, { name, type, floorAreaM2, operatingHours }) {
  const set = definedOnly({ name, type, floorAreaM2, operatingHours });
  if (!Object.keys(set).length) return getById(db, id);
  return map(await db.updateOne('buildings', { _id: id }, set));
}
/** MongoDB has no foreign-key cascade, so the building's children are deleted here, children first. */
export async function remove(db, id) {
  for (const c of ['energy_records', 'equipment', 'findings', 'recommendations']) await db.deleteMany(c, { buildingId: id });
  return db.deleteOne('buildings', { _id: id });
}
