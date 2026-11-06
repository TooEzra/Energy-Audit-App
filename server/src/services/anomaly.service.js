// PURE: no database access.
export const DEFAULT_ANOMALY_THRESHOLD = 0.3;

/**
 * Flag months whose kWh is more than `threshold` (default 30%) above the average of the building's OTHER months.
 * @param {{month:string,kwh:number}[]} records
 * @returns {{month:string,kwh:number,avgOthers:number|null,pctAbove:number|null,anomaly:boolean}[]} same order as input
 */
export function flagAnomalies(records, threshold = DEFAULT_ANOMALY_THRESHOLD) {
  const n = records.length;
  const total = records.reduce((s, r) => s + r.kwh, 0);
  return records.map((r) => {
    if (n < 2) return { month: r.month, kwh: r.kwh, avgOthers: null, pctAbove: null, anomaly: false };
    const avgOthers = (total - r.kwh) / (n - 1);
    // Without a positive baseline a percentage is meaningless, so nothing is flagged.
    if (avgOthers <= 0) return { month: r.month, kwh: r.kwh, avgOthers, pctAbove: null, anomaly: false };
    const pctAbove = ((r.kwh - avgOthers) / avgOthers) * 100;
    return { month: r.month, kwh: r.kwh, avgOthers, pctAbove, anomaly: r.kwh > avgOthers * (1 + threshold) };
  });
}
