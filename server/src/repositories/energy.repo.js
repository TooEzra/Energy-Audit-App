import { definedOnly } from '../db/tenantDb.js';

// month is stored as the string 'YYYY-MM' (sorts correctly, and is exactly what the API exposes).
export const map = (r) => r && ({ id: r._id, buildingId: r.buildingId, month: r.month, kwh: r.kwh, cost: r.cost });

export async function listForBuilding(db, buildingId) {
  return (await db.find('energy_records', { buildingId }, { sort: { month: 1 } })).map(map);
}
export async function listAll(db) {
  return (await db.find('energy_records', {}, { sort: { buildingId: 1, month: 1 } })).map(map);
}
export async function getById(db, buildingId, id) {
  return map(await db.findOne('energy_records', { buildingId, _id: id }));
}
export async function existingMonths(db, buildingId) {
  return new Set((await db.find('energy_records', { buildingId }, { projection: { month: 1 } })).map((r) => r.month));
}
export async function create(db, buildingId, { month, kwh, cost }) {
  return map(await db.insert('energy_records', { buildingId, month, kwh, cost }));
}
export async function update(db, buildingId, id, { month, kwh, cost }) {
  const set = definedOnly({ month, kwh, cost });
  if (!Object.keys(set).length) return getById(db, buildingId, id);
  return map(await db.updateOne('energy_records', { buildingId, _id: id }, set));
}
export const remove = (db, buildingId, id) => db.deleteOne('energy_records', { buildingId, _id: id });
