import { describe, it, expect } from 'vitest';
import { flagAnomalies } from '../../src/services/anomaly.service.js';

const recs = (...kwh) => kwh.map((v, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, kwh: v }));

describe('flagAnomalies', () => {
  it('flags a month far above the average of the OTHER months', () => {
    const out = flagAnomalies(recs(100, 100, 100, 200));
    expect(out.map((o) => o.anomaly)).toEqual([false, false, false, true]);
    expect(out[3].avgOthers).toBeCloseTo(100, 6);   // (100+100+100)/3
    expect(out[3].pctAbove).toBeCloseTo(100, 6);    // (200-100)/100
  });
  it('uses a strict "more than 30%" rule', () => {
    expect(flagAnomalies(recs(100, 100, 100, 130))[3].anomaly).toBe(false); // exactly +30% is not flagged
    expect(flagAnomalies(recs(100, 100, 100, 131))[3].anomaly).toBe(true);
  });
  it('threshold is configurable', () => {
    expect(flagAnomalies(recs(100, 100, 100, 140), 0.5)[3].anomaly).toBe(false);
    expect(flagAnomalies(recs(100, 100, 100, 160), 0.5)[3].anomaly).toBe(true);
  });
  it('does not flag with fewer than two months or a zero baseline', () => {
    expect(flagAnomalies(recs(500))[0].anomaly).toBe(false);
    expect(flagAnomalies(recs(0, 0, 50)).every((o) => !o.anomaly)).toBe(true);
  });
});
