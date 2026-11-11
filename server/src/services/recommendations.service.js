import * as recsRepo from '../repositories/recommendations.repo.js';
import * as measuresRepo from '../repositories/measures.repo.js';
import * as findingsRepo from '../repositories/findings.repo.js';
import * as equipmentRepo from '../repositories/equipment.repo.js';
import { requireBuilding } from './buildings.service.js';
import { getAnalysis } from './energy.service.js';
import { endUseShares } from './reconciliation.service.js';
import { calculatePayback, suggestFromMeasure } from './payback.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const withPayback = (r) => ({ ...r, payback: calculatePayback(r.estimatedCost, r.estimatedAnnualSaving) });

async function assertFinding(db, buildingId, findingId) {
  if (findingId && !(await findingsRepo.getById(db, buildingId, findingId))) {
    throw new ValidationError('Finding not found for this building', { findingId: 'Finding not found for this building' });
  }
}

export async function list(db, buildingId) {
  await requireBuilding(db, buildingId);
  const items = (await recsRepo.listForBuilding(db, buildingId)).map(withPayback);
  return {
    items,
    totals: {
      estimatedCost: items.reduce((s, r) => s + r.estimatedCost, 0),
      estimatedAnnualSaving: items.reduce((s, r) => s + r.estimatedAnnualSaving, 0),
    },
  };
}

/** Suggested title/cost/saving for a library measure; the auditor can edit everything before saving. */
export async function prefill(db, buildingId, measureId) {
  await requireBuilding(db, buildingId);
  const measure = await measuresRepo.getById(db, measureId); // tenant handle: system presets + own measures only
  if (!measure) throw new NotFoundError('Measure not found');
  const analysis = await getAnalysis(db, buildingId);
  const { categories } = endUseShares(await equipmentRepo.listForBuilding(db, buildingId));
  const share = categories.find((c) => c.category === measure.category)?.sharePct ?? null;
  const s = suggestFromMeasure({ measure, annualCost: analysis.totals.cost, endUseSharePct: share });
  return { ...s, measureId: measure.id, isEstimate: true, annualCostComplete: analysis.eui.complete };
}

export async function create(db, buildingId, data) {
  await requireBuilding(db, buildingId);
  await assertFinding(db, buildingId, data.findingId);
  let { title, estimatedCost, estimatedAnnualSaving } = data;
  if (data.measureId) {
    const p = await prefill(db, buildingId, data.measureId);
    title ??= p.title;
    estimatedCost ??= p.estimatedCost;
    estimatedAnnualSaving ??= p.estimatedAnnualSaving;
  }
  const rec = await recsRepo.create(db, buildingId, { ...data, title, estimatedCost, estimatedAnnualSaving });
  return withPayback(rec);
}

export async function update(db, buildingId, id, data) {
  await requireBuilding(db, buildingId);
  await assertFinding(db, buildingId, data.findingId);
  const rec = await recsRepo.update(db, buildingId, id, data);
  if (!rec) throw new NotFoundError('Recommendation not found');
  return withPayback(rec);
}

export async function remove(db, buildingId, id) {
  await requireBuilding(db, buildingId);
  if (!(await recsRepo.remove(db, buildingId, id))) throw new NotFoundError('Recommendation not found');
}

export const listMeasures = (db) => measuresRepo.list(db).then((items) => ({ items }));
export const createMeasure = (db, data) => measuresRepo.create(db, data);
export { withPayback };
