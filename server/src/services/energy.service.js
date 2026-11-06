import { env } from '../config/env.js';
import * as energyRepo from '../repositories/energy.repo.js';
import * as buildingsRepo from '../repositories/buildings.repo.js';
import { requireBuilding } from './buildings.service.js';
import { analyseBuilding, compareBuildings } from './analysis.service.js';
import { energyRecordSchema } from '../validators/energy.schema.js';
import { parseCsv } from '../utils/csv.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const MAX_IMPORT_ROWS = 600;

export async function list(db, buildingId) {
  await requireBuilding(db, buildingId);
  return { items: await energyRepo.listForBuilding(db, buildingId) };
}
export async function create(db, buildingId, data) {
  await requireBuilding(db, buildingId);
  return energyRepo.create(db, buildingId, data); // duplicate month -> unique violation -> 409 via errorHandler
}
export async function update(db, buildingId, recId, data) {
  await requireBuilding(db, buildingId);
  const rec = await energyRepo.update(db, buildingId, recId, data);
  if (!rec) throw new NotFoundError('Record not found');
  return rec;
}
export async function remove(db, buildingId, recId) {
  await requireBuilding(db, buildingId);
  if (!(await energyRepo.remove(db, buildingId, recId))) throw new NotFoundError('Record not found');
}

/**
 * CSV import (columns month,kwh,cost). Validates every row and reports problems with row numbers.
 * Nothing is written unless confirm=true; then ONLY the valid rows are imported.
 */
export async function importCsv(db, buildingId, { csv, confirm }) {
  await requireBuilding(db, buildingId);
  const rows = parseCsv(csv);
  if (!rows.length) throw new ValidationError('The CSV is empty', { csv: 'The CSV is empty' });
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = { month: header.indexOf('month'), kwh: header.indexOf('kwh'), cost: header.indexOf('cost') };
  if (Object.values(idx).some((i) => i < 0)) {
    throw new ValidationError('CSV must have the columns: month,kwh,cost', { csv: 'Expected header row: month,kwh,cost' });
  }
  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) throw new ValidationError(`Too many rows (max ${MAX_IMPORT_ROWS})`, { csv: `Max ${MAX_IMPORT_ROWS} rows` });

  const existing = await energyRepo.existingMonths(db, buildingId);
  const seen = new Set();
  const valid = [], errors = [];
  dataRows.forEach((cells, i) => {
    const row = i + 2; // 1-based, header is row 1
    const parsed = energyRecordSchema.safeParse({
      month: cells[idx.month]?.trim(), kwh: cells[idx.kwh]?.trim(), cost: cells[idx.cost]?.trim(),
    });
    if (!parsed.success) return errors.push({ row, message: [...new Set(parsed.error.issues.map((x) => x.message))].join('; ') });
    const { month, kwh, cost } = parsed.data;
    if (existing.has(month)) return errors.push({ row, message: `Month ${month} is already recorded for this building` });
    if (seen.has(month)) return errors.push({ row, message: `Month ${month} appears more than once in the file` });
    seen.add(month);
    valid.push({ row, month, kwh, cost });
  });

  let imported = 0;
  if (confirm) {
    for (const r of valid) { await energyRepo.create(db, buildingId, r); imported++; }
  }
  return { confirmed: !!confirm, totalRows: dataRows.length, valid, errors, imported };
}

/** Analysis of one building (reads its records, then runs the pure analysis service). */
export async function getAnalysis(db, buildingId) {
  const building = await requireBuilding(db, buildingId);
  const records = await energyRepo.listForBuilding(db, buildingId);
  return analyseBuilding({ building, records, threshold: env.anomalyThreshold });
}

/** Dashboard / comparison across ALL buildings of the caller's institution. */
export async function compare(db) {
  const [buildings, all] = await Promise.all([buildingsRepo.list(db), energyRepo.listAll(db)]);
  const analyses = buildings.map((building) =>
    analyseBuilding({ building, records: all.filter((r) => r.buildingId === building.id), threshold: env.anomalyThreshold }));
  return compareBuildings(analyses);
}
