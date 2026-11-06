import { describe, it, expect } from 'vitest';
import { analyseBuilding, calcEui, compareBuildings, sum } from '../../src/services/analysis.service.js';

const building = (over = {}) => ({ id: 1, name: 'B1', type: 'Education', floorAreaM2: 500, ...over });
const year = (kwh, cost, start = 2025, n = 12) => Array.from({ length: n }, (_, i) => {
  const idx = start * 12 + i;
  return { month: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`, kwh, cost };
});

describe('analysis', () => {
  it('sums values and computes EUI = annual kWh / floor area', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(calcEui(120000, 1000)).toBe(120);
    expect(calcEui(100, 0)).toBeNull();
  });
  it('annual totals and EUI for 12 months (12 x 1000 kWh, 500 m2 => 24 kWh/m2/year)', () => {
    const a = analyseBuilding({ building: building(), records: year(1000, 150) });
    expect(a.totals.kwh).toBe(12000);
    expect(a.totals.cost).toBe(1800);
    expect(a.totals.costPerKwh).toBeCloseTo(0.15, 10);
    expect(a.eui.complete).toBe(true);
    expect(a.eui.value).toBe(24);
  });
  it('EUI is "incomplete" with fewer than 12 months but consumption so far is still shown', () => {
    const a = analyseBuilding({ building: building(), records: year(1000, 150, 2025, 11) });
    expect(a.eui.value).toBeNull();
    expect(a.eui.complete).toBe(false);
    expect(a.eui.label).toContain('incomplete');
    expect(a.totals.kwh).toBe(11000);
  });
  it('with more than 12 months only the latest 12 calendar months count', () => {
    const a = analyseBuilding({ building: building(), records: [{ month: '2024-12', kwh: 99999, cost: 1 }, ...year(1000, 150)] });
    expect(a.totals.kwh).toBe(12000);
    expect(a.eui.complete).toBe(true);
    expect(a.monthsRecorded).toBe(13);
  });
  it('a gap in the months means the 12-month window is incomplete', () => {
    const recs = year(1000, 150).filter((r) => r.month !== '2025-06');
    expect(analyseBuilding({ building: building(), records: recs }).eui.complete).toBe(false);
  });
  it('flags the deliberately high month', () => {
    const recs = year(1000, 150);
    recs[8].kwh = 1600;
    const a = analyseBuilding({ building: building(), records: recs });
    expect(a.anomalies).toHaveLength(1);
    expect(a.anomalies[0].month).toBe('2025-09');
  });
});

describe('compareBuildings', () => {
  const a1 = analyseBuilding({ building: building({ id: 1, name: 'A', type: 'Education' }), records: year(1000, 100) });
  const a2 = analyseBuilding({ building: building({ id: 2, name: 'B', type: 'education ', floorAreaM2: 250 }), records: year(1000, 100) });
  const a3 = analyseBuilding({ building: building({ id: 3, name: 'C', type: 'Hospital' }), records: year(1000, 100) });
  it('compares EUI with no warning when types match (case/space-insensitive)', () => {
    const c = compareBuildings([a1, a2]);
    expect(c.items.map((i) => i.eui)).toEqual([24, 48]);
    expect(c.typesDiffer).toBe(false);
    expect(c.warning).toBeNull();
    expect(c.totals).toEqual({ buildings: 2, kwh: 24000, cost: 2400 });
  });
  it('warns when building types differ', () => {
    const c = compareBuildings([a1, a3]);
    expect(c.typesDiffer).toBe(true);
    expect(c.warning).toMatch(/may not be fair/);
  });
  it('builds a shared month axis for the dashboard chart', () => {
    const c = compareBuildings([a1, a2]);
    expect(c.monthly.labels).toHaveLength(12);
    expect(c.monthly.series[0].values.every((v) => v === 1000)).toBe(true);
  });
});
