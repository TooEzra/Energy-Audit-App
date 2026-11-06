// PURE: no database access. Plain data in, plain data out.
import { flagAnomalies, DEFAULT_ANOMALY_THRESHOLD } from './anomaly.service.js';
import { addMonths, monthDiff } from '../utils/dates.js';

export const ANALYSIS_MONTHS = 12;

export const sum = (values) => values.reduce((s, v) => s + v, 0);

/** EUI (kWh/m2/year) = annual kWh / floor area. */
export const calcEui = (annualKwh, floorAreaM2) => (floorAreaM2 > 0 ? annualKwh / floorAreaM2 : null);

/**
 * The analysis window = the 12 calendar months ending at the building's most recent recorded month.
 * Annual totals and EUI use only records inside this window; EUI is "complete" only when all 12 exist.
 */
export function selectWindow(records) {
  if (!records.length) return { window: [], complete: false, start: null, end: null };
  const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
  const end = sorted[sorted.length - 1].month;
  const start = addMonths(end, -(ANALYSIS_MONTHS - 1));
  const window = sorted.filter((r) => monthDiff(start, r.month) >= 0);
  return { window, complete: window.length === ANALYSIS_MONTHS, start, end };
}

/**
 * Full analysis of one building.
 * @param {{building:{id:number,name:string,type:string,floorAreaM2:number}, records:{month:string,kwh:number,cost:number}[], threshold?:number}} input
 */
export function analyseBuilding({ building, records, threshold = DEFAULT_ANOMALY_THRESHOLD }) {
  const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
  const flags = flagAnomalies(sorted, threshold);
  const series = sorted.map((r, i) => ({
    month: r.month, kwh: r.kwh, cost: r.cost,
    anomaly: flags[i].anomaly, pctAbove: flags[i].pctAbove, avgOthers: flags[i].avgOthers,
  }));
  const { window, complete } = selectWindow(sorted);
  const annualKwh = sum(window.map((r) => r.kwh));
  const annualCost = sum(window.map((r) => r.cost));
  const eui = complete ? calcEui(annualKwh, building.floorAreaM2) : null;
  return {
    building: { id: building.id, name: building.name, type: building.type, floorAreaM2: building.floorAreaM2 },
    monthsRecorded: sorted.length,
    monthsInPeriod: window.length,
    totals: { kwh: annualKwh, cost: annualCost, costPerKwh: annualKwh > 0 ? annualCost / annualKwh : null },
    eui: {
      value: eui,
      complete,
      label: complete ? 'kWh/m²/year' : `incomplete (${window.length} of ${ANALYSIS_MONTHS} months recorded)`,
    },
    series,
    anomalies: series.filter((s) => s.anomaly).map((s) => ({ month: s.month, kwh: s.kwh, avgOthers: s.avgOthers, pctAbove: s.pctAbove })),
  };
}

/**
 * Compare buildings of ONE institution by EUI, and build the dashboard overview.
 * @param {ReturnType<typeof analyseBuilding>[]} analyses
 */
export function compareBuildings(analyses) {
  const items = analyses.map((a) => ({
    buildingId: a.building.id, name: a.building.name, type: a.building.type, floorAreaM2: a.building.floorAreaM2,
    annualKwh: a.totals.kwh, annualCost: a.totals.cost, monthsRecorded: a.monthsInPeriod,
    eui: a.eui.value, euiComplete: a.eui.complete,
  }));
  const types = new Set(items.map((i) => i.type.trim().toLowerCase()));
  const typesDiffer = types.size > 1;

  // Monthly consumption of every building on a shared month axis (months any building has data for, in its window).
  const monthSet = new Set();
  analyses.forEach((a) => a.series.forEach((s) => monthSet.add(s.month)));
  const labels = [...monthSet].sort().slice(-ANALYSIS_MONTHS);
  const monthly = {
    labels,
    series: analyses.map((a) => {
      const byMonth = new Map(a.series.map((s) => [s.month, s.kwh]));
      return { buildingId: a.building.id, name: a.building.name, values: labels.map((m) => byMonth.get(m) ?? null) };
    }),
  };
  return {
    items,
    typesDiffer,
    warning: typesDiffer ? 'Buildings have different types, so comparing their EUI may not be fair.' : null,
    totals: { buildings: items.length, kwh: sum(items.map((i) => i.annualKwh)), cost: sum(items.map((i) => i.annualCost)) },
    monthly,
    anomalies: analyses.flatMap((a) => a.anomalies.map((x) => ({ buildingId: a.building.id, buildingName: a.building.name, ...x }))),
  };
}
