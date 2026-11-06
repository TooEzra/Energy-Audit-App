import * as equipmentRepo from '../repositories/equipment.repo.js';
import { requireBuilding } from './buildings.service.js';
import { getAnalysis } from './energy.service.js';
import { equipmentAnnualKwh, endUseShares, reconcile } from './reconciliation.service.js';
import { NotFoundError } from '../utils/errors.js';

/** Adds annualKwh and sharePct (of total inventory kWh) to each item. */
export function decorate(items) {
  const { totalKwh, categories } = endUseShares(items);
  return {
    items: items.map((e) => {
      const annualKwh = equipmentAnnualKwh(e);
      return { ...e, annualKwh, sharePct: totalKwh > 0 ? (annualKwh / totalKwh) * 100 : 0 };
    }),
    endUse: categories,
    totalKwh,
  };
}

export async function list(db, buildingId) {
  await requireBuilding(db, buildingId);
  return decorate(await equipmentRepo.listForBuilding(db, buildingId));
}
export async function create(db, buildingId, data) {
  await requireBuilding(db, buildingId);
  return equipmentRepo.create(db, buildingId, data);
}
export async function update(db, buildingId, id, data) {
  await requireBuilding(db, buildingId);
  const e = await equipmentRepo.update(db, buildingId, id, data);
  if (!e) throw new NotFoundError('Equipment not found');
  return e;
}
export async function remove(db, buildingId, id) {
  await requireBuilding(db, buildingId);
  if (!(await equipmentRepo.remove(db, buildingId, id))) throw new NotFoundError('Equipment not found');
}

/** Billed kWh (12-month window) vs. the inventory's calculated kWh. */
export async function getReconciliation(db, buildingId) {
  await requireBuilding(db, buildingId);
  const [analysis, items] = await Promise.all([getAnalysis(db, buildingId), equipmentRepo.listForBuilding(db, buildingId)]);
  const { totalKwh } = endUseShares(items);
  return {
    ...reconcile({ billedKwh: analysis.totals.kwh, inventoryKwh: totalKwh, billedComplete: analysis.eui.complete }),
    equipmentCount: items.length,
  };
}
