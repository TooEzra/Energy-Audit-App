import * as institutionsRepo from '../repositories/institutions.repo.js';
import * as buildingsRepo from '../repositories/buildings.repo.js';
import * as energyRepo from '../repositories/energy.repo.js';
import * as equipmentRepo from '../repositories/equipment.repo.js';
import * as findingsRepo from '../repositories/findings.repo.js';
import * as recsRepo from '../repositories/recommendations.repo.js';
import * as measuresRepo from '../repositories/measures.repo.js';
import { toCsv } from '../utils/csv.js';

/** The caller's institution data (RLS guarantees nothing from other institutions can appear). */
export async function collect(db) {
  const [institution, buildings, energyRecords, equipment, findings, recommendations, measures] = await Promise.all([
    institutionsRepo.getOwn(db), buildingsRepo.list(db), energyRepo.listAll(db), equipmentRepo.listAll(db),
    findingsRepo.listAll(db), recsRepo.listAll(db), measuresRepo.list(db),
  ]);
  return {
    exportedAt: new Date().toISOString(), institution, buildings, energyRecords, equipment, findings, recommendations,
    measures: measures.filter((m) => !m.isSystem),
  };
}

const TABLES = {
  buildings: ['id', 'name', 'type', 'floorAreaM2', 'operatingHours'],
  energyRecords: ['id', 'buildingId', 'month', 'kwh', 'cost'],
  equipment: ['id', 'buildingId', 'category', 'name', 'location', 'ratingW', 'qty', 'hoursDay', 'daysYear', 'condition'],
  findings: ['id', 'buildingId', 'area', 'problem', 'locationSystem', 'suggestedImprovement', 'priority', 'hasPhoto', 'createdAt'],
  recommendations: ['id', 'buildingId', 'findingId', 'measureId', 'title', 'estimatedCost', 'estimatedAnnualSaving', 'status', 'isEstimate', 'createdAt'],
  measures: ['id', 'name', 'category', 'typicalSavingPct', 'typicalCost', 'description'],
};

/** One CSV file with a "# table" heading line before each section. */
export function toCsvText(data) {
  return Object.entries(TABLES).map(([name, cols]) => `# ${name}\n${toCsv(cols, data[name])}`).join('\n\n') + '\n';
}
