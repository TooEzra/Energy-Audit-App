import { describe, it, expect } from 'vitest';
import { equipmentAnnualKwh, endUseShares, reconcile } from '../../src/services/reconciliation.service.js';

describe('equipment kWh and end-use share', () => {
  it('rating_w * qty * hours_day * days_year / 1000', () => {
    // 36 W x 10 x 8 h x 300 d / 1000 = 864 kWh
    expect(equipmentAnnualKwh({ ratingW: 36, qty: 10, hoursDay: 8, daysYear: 300 })).toBe(864);
    expect(equipmentAnnualKwh({ ratingW: 1000, qty: 1, hoursDay: 0, daysYear: 365 })).toBe(0);
  });
  it('shares are category kWh / total inventory kWh x 100', () => {
    const items = [
      { category: 'lighting', ratingW: 100, qty: 10, hoursDay: 10, daysYear: 100 },  // 1000 kWh
      { category: 'lighting', ratingW: 100, qty: 10, hoursDay: 10, daysYear: 100 },  // 1000 kWh
      { category: 'ict', ratingW: 100, qty: 10, hoursDay: 10, daysYear: 200 },       // 2000 kWh
    ];
    const r = endUseShares(items);
    expect(r.totalKwh).toBe(4000);
    expect(r.categories.find((c) => c.category === 'lighting')).toMatchObject({ kwh: 2000, sharePct: 50 });
    expect(r.categories.find((c) => c.category === 'ict').sharePct).toBe(50);
  });
  it('empty inventory gives zero totals', () => {
    expect(endUseShares([])).toEqual({ totalKwh: 0, categories: [] });
  });
});

describe('reconcile', () => {
  it('gap % = (billed - inventory) / billed x 100', () => {
    const r = reconcile({ billedKwh: 10000, inventoryKwh: 8000 });
    expect(r.gapKwh).toBe(2000);
    expect(r.gapPct).toBe(20);
    expect(r.warning).toBe(true);
  });
  it('warns only when |gap| exceeds 15%', () => {
    expect(reconcile({ billedKwh: 10000, inventoryKwh: 9000 }).warning).toBe(false);   // 10%
    expect(reconcile({ billedKwh: 10000, inventoryKwh: 8500 }).warning).toBe(false);   // exactly 15%
    expect(reconcile({ billedKwh: 10000, inventoryKwh: 8499 }).warning).toBe(true);
    expect(reconcile({ billedKwh: 10000, inventoryKwh: 12000 }).warning).toBe(true);   // -20%: inventory too high
  });
  it('never divides by zero billed kWh', () => {
    const r = reconcile({ billedKwh: 0, inventoryKwh: 500 });
    expect(r.gapPct).toBeNull();
    expect(r.warning).toBe(false);
  });
});
