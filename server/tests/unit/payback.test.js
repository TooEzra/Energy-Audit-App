import { describe, it, expect } from 'vitest';
import { calculatePayback, suggestFromMeasure } from '../../src/services/payback.service.js';

describe('calculatePayback', () => {
  it('cost / annual saving in years', () => {
    const p = calculatePayback(100000, 50000);
    expect(p.years).toBe(2);
    expect(p.label).toBe('2.0 years');
    expect(calculatePayback(250000, 180000).label).toBe('1.4 years');
  });
  it('cost 0 => Immediate', () => {
    expect(calculatePayback(0, 500)).toMatchObject({ years: 0, label: 'Immediate' });
  });
  it('saving 0 => Not applicable, never divides by zero', () => {
    expect(calculatePayback(1000, 0)).toMatchObject({ years: null, label: 'Not applicable' });
    expect(calculatePayback(0, 0).label).toBe('Not applicable');
  });
});

describe('suggestFromMeasure', () => {
  const led = { name: 'LED', category: 'lighting', typicalSavingPct: 50, typicalCost: 250000 };
  it('uses the end-use share of annual cost as baseline when an inventory exists', () => {
    const s = suggestFromMeasure({ measure: led, annualCost: 1000000, endUseSharePct: 40 });
    expect(s.baselineCost).toBe(400000);
    expect(s.estimatedAnnualSaving).toBe(200000);
    expect(s.title).toBe('LED');
    expect(s.estimatedCost).toBe(250000);
  });
  it('falls back to whole-building cost without an inventory, and for whole-building categories', () => {
    expect(suggestFromMeasure({ measure: led, annualCost: 1000000, endUseSharePct: null }).estimatedAnnualSaving).toBe(500000);
    const practices = { name: 'Awareness', category: 'practices', typicalSavingPct: 5, typicalCost: 15000 };
    expect(suggestFromMeasure({ measure: practices, annualCost: 1000000, endUseSharePct: 30 }).estimatedAnnualSaving).toBe(50000);
  });
});
