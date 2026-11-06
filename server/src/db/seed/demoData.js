// Fictional demo institutions. Two buildings of the SAME type each, 12 months of data (one deliberately high month).
export const DEMO_PASSWORD = 'Demo1234!';

export const DEMO_INSTITUTIONS = [
  {
    name: 'Greenfield Technical College', currency: 'KES', maxBuildings: 5,
    admin: { name: 'Amina Wanjiru', email: 'admin@greenfield.example' },
    auditor: { name: 'Brian Otieno', email: 'auditor@greenfield.example' },
    buildings: [
      { name: 'Science Block', type: 'Education', floorAreaM2: 1800, operatingHours: 10, baseKwh: 21000, highMonthIndex: 8, costPerKwh: 24 },
      { name: 'Library Wing', type: 'Education', floorAreaM2: 1200, operatingHours: 11, baseKwh: 12500, highMonthIndex: 5, costPerKwh: 24 },
    ],
  },
  {
    name: 'Lakeview Community Hospital', currency: 'KES', maxBuildings: 5,
    admin: { name: 'Grace Achieng', email: 'admin@lakeview.example' },
    auditor: { name: 'Peter Kamau', email: 'auditor@lakeview.example' },
    buildings: [
      { name: 'Ward Block A', type: 'Hospital', floorAreaM2: 2400, operatingHours: 24, baseKwh: 52000, highMonthIndex: 3, costPerKwh: 22 },
      { name: 'Outpatient Clinic', type: 'Hospital', floorAreaM2: 900, operatingHours: 12, baseKwh: 14000, highMonthIndex: 10, costPerKwh: 22 },
    ],
  },
];

/** The last 12 full months ending last month, e.g. ['2025-11', ..., '2026-10']. */
export function lastTwelveMonths(now = new Date()) {
  const out = [];
  for (let i = 12; i >= 1; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** Deterministic monthly kWh: gentle seasonal wave + small wobble; one month is ~55% above normal. */
export function monthlyRecords(b, months = lastTwelveMonths()) {
  return months.map((month, i) => {
    const wobble = 1 + 0.06 * Math.sin(i * 1.7) + 0.04 * Math.cos(i * 0.9);
    let kwh = Math.round(b.baseKwh * wobble);
    if (i === b.highMonthIndex) kwh = Math.round(b.baseKwh * 1.55);
    return { month, kwh, cost: Math.round(kwh * b.costPerKwh) };
  });
}

// Per building: 6 equipment items, findings and 1 recommendation (2 per institution overall, assigned to the first building).
export const equipmentFor = (b) => {
  const s = b.floorAreaM2 / 1000;
  return [
    { category: 'lighting', name: 'T8 fluorescent tubes', location: 'Rooms and corridors', ratingW: 36, qty: Math.round(150 * s), hoursDay: b.operatingHours, daysYear: 300, condition: 'Old' },
    { category: 'lighting', name: 'Security floodlights', location: 'Outdoors', ratingW: 150, qty: 8, hoursDay: 11, daysYear: 365, condition: 'Fair' },
    { category: 'ac_ventilation', name: 'Split AC unit (18,000 BTU)', location: 'Offices', ratingW: 1800, qty: Math.round(6 * s) + 2, hoursDay: Math.min(b.operatingHours, 9), daysYear: 260, condition: 'Old' },
    { category: 'motors_pumps', name: 'Water booster pump', location: 'Pump room', ratingW: 2200, qty: 2, hoursDay: 6, daysYear: 330, condition: 'Good' },
    { category: 'ict', name: 'Desktop computers', location: 'Computer lab / offices', ratingW: 120, qty: Math.round(40 * s) + 5, hoursDay: Math.min(b.operatingHours, 9), daysYear: 260, condition: 'Good' },
    { category: 'other', name: 'Electric water heaters', location: 'Washrooms', ratingW: 3000, qty: 3, hoursDay: 4, daysYear: 330, condition: 'Fair' },
  ];
};

export const FINDINGS = [
  { area: 'lighting', problem: 'Corridor lights on all night', locationSystem: 'Ground floor corridor', suggestedImprovement: 'Fit occupancy sensors or timers', priority: 'High' },
  { area: 'lighting', problem: 'Old T8 fluorescent tubes still in use', locationSystem: 'Classrooms / wards', suggestedImprovement: 'Replace with LED tubes', priority: 'Medium' },
  { area: 'ac_ventilation', problem: 'AC running with doors and windows open', locationSystem: 'Offices', suggestedImprovement: 'Set 24 °C limit and keep doors closed', priority: 'High' },
  { area: 'motors_pumps', problem: 'Pump runs continuously with no level control', locationSystem: 'Pump room', suggestedImprovement: 'Add float switch / VFD', priority: 'Medium' },
  { area: 'operating_hours', problem: 'Equipment left on outside working hours', locationSystem: 'Whole building', suggestedImprovement: 'Introduce a switch-off round at closing time', priority: 'Low' },
];
