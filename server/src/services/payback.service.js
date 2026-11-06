// PURE: no database access. All savings are ESTIMATES, never verified results.

/**
 * Simple payback (years) = estimated cost / annual cost saving. Never divides by zero.
 *  - saving = 0  -> "Not applicable" (there is no saving to pay the cost back)   [checked first]
 *  - cost   = 0  -> "Immediate"
 */
export function calculatePayback(cost, annualSaving) {
  if (!(annualSaving > 0)) return { years: null, status: 'not_applicable', label: 'Not applicable' };
  if (!(cost > 0)) return { years: 0, status: 'immediate', label: 'Immediate' };
  const years = cost / annualSaving;
  return { years, status: 'ok', label: `${years.toFixed(1)} years` };
}

/**
 * Pre-fill a recommendation from a library measure.
 * Saving estimate = typical saving % x baseline annual cost, where the baseline is
 *   - the building's annual cost x the measure category's end-use share (when an inventory exists for it), else
 *   - the building's whole annual cost (also for whole-building categories: operating_hours, practices).
 */
export function suggestFromMeasure({ measure, annualCost, endUseSharePct = null }) {
  const wholeBuilding = ['operating_hours', 'practices'].includes(measure.category) || endUseSharePct === null;
  const baselineCost = wholeBuilding ? annualCost : annualCost * (endUseSharePct / 100);
  return {
    title: measure.name,
    estimatedCost: measure.typicalCost,
    estimatedAnnualSaving: Math.round(baselineCost * (measure.typicalSavingPct / 100) * 100) / 100,
    baselineCost,
    baselineBasis: wholeBuilding ? 'whole-building annual cost' : `${measure.category} share (${endUseSharePct.toFixed(0)}%) of annual cost`,
  };
}
