// PURE: no database access.
export const RECONCILIATION_WARN_PCT = 15;

/** Equipment annual kWh = rating_w * qty * hours_day * days_year / 1000. */
export const equipmentAnnualKwh = (e) => (e.ratingW * e.qty * e.hoursDay * e.daysYear) / 1000;

/** End-use share (%) = category kWh / total inventory kWh * 100. Returns categories that have equipment. */
export function endUseShares(items) {
  const byCat = new Map();
  for (const e of items) byCat.set(e.category, (byCat.get(e.category) || 0) + equipmentAnnualKwh(e));
  const total = [...byCat.values()].reduce((s, v) => s + v, 0);
  return {
    totalKwh: total,
    categories: [...byCat.entries()].map(([category, kwh]) => ({ category, kwh, sharePct: total > 0 ? (kwh / total) * 100 : 0 })),
  };
}

/**
 * Reconciliation gap (%) = (billed kWh - inventory kWh) / billed kWh * 100.
 * Warn when |gap| > 15% (an inventory normally covers only the audited equipment).
 */
export function reconcile({ billedKwh, inventoryKwh, billedComplete = true }) {
  const gapKwh = billedKwh - inventoryKwh;
  const gapPct = billedKwh > 0 ? (gapKwh / billedKwh) * 100 : null;
  const warning = gapPct !== null && Math.abs(gapPct) > RECONCILIATION_WARN_PCT;
  let message;
  if (gapPct === null) message = 'No billed consumption recorded yet, so the inventory cannot be reconciled.';
  else if (warning) message = `Inventory differs from billed consumption by ${gapPct.toFixed(1)}%. The inventory usually covers only audited equipment; check for missing items or wrong hours.`;
  else message = `Inventory is within ${RECONCILIATION_WARN_PCT}% of billed consumption.`;
  return { billedKwh, inventoryKwh, gapKwh, gapPct, warning, threshold: RECONCILIATION_WARN_PCT, billedComplete, message };
}
