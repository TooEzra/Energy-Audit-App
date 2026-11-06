// The 8 system preset measures (institution_id NULL). Costs are typical order-of-magnitude figures in KES.
export const SYSTEM_MEASURES = [
  { name: 'LED lighting retrofit', category: 'lighting', typicalSavingPct: 50, typicalCost: 250000, description: 'Replace fluorescent/incandescent lamps with LED.' },
  { name: 'Occupancy sensors', category: 'lighting', typicalSavingPct: 25, typicalCost: 80000, description: 'Switch lights off automatically in unoccupied rooms and corridors.' },
  { name: 'Efficient AC units', category: 'ac_ventilation', typicalSavingPct: 30, typicalCost: 600000, description: 'Replace old split units with inverter-type, high-COP units.' },
  { name: 'AC schedule / switch-off', category: 'ac_ventilation', typicalSavingPct: 15, typicalCost: 20000, description: 'Set temperature limits and switch AC off outside occupied hours.' },
  { name: 'VFD on pumps', category: 'motors_pumps', typicalSavingPct: 30, typicalCost: 350000, description: 'Fit variable-frequency drives to pumps running at partial load.' },
  { name: 'Power factor correction', category: 'other', typicalSavingPct: 5, typicalCost: 300000, description: 'Install capacitor banks to avoid low power-factor penalties.' },
  { name: 'Timer on water heating', category: 'other', typicalSavingPct: 20, typicalCost: 25000, description: 'Heat water only when needed with timers on heaters.' },
  { name: 'Staff awareness programme', category: 'practices', typicalSavingPct: 5, typicalCost: 15000, description: 'Switch-off campaigns, signage and simple operating rules.' },
];
