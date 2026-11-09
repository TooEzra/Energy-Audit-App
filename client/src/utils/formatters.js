// Display helpers (numbers, currency, dates).
const nf = (digits) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const formatNumber = (n, digits = 0) => (n === null || n === undefined || Number.isNaN(n) ? '–' : nf(digits).format(n));
export const formatKwh = (n) => `${formatNumber(n)} kWh`;
export const formatPct = (n, digits = 1) => (n === null || n === undefined ? '–' : `${formatNumber(n, digits)}%`);
export const formatCurrency = (n, currency = 'KES', digits = 0) =>
  n === null || n === undefined ? '–' : `${currency} ${formatNumber(n, digits)}`;

/** 'YYYY-MM' -> 'Mar 2025' (timezone-safe). */
export function formatMonth(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export const CATEGORY_LABELS = {
  lighting: 'Lighting', ac_ventilation: 'AC & ventilation', motors_pumps: 'Motors & pumps', ict: 'ICT', other: 'Other',
  refrigeration: 'Refrigeration', water_heating: 'Water heating', kitchen_catering: 'Kitchen & catering', office_equipment: 'Office equipment',
  medical_lab: 'Medical & laboratory', laundry: 'Laundry', lifts: 'Lifts & escalators', audio_visual: 'Audio-visual', workshop: 'Workshop & machinery',
  security: 'Security systems', operating_hours: 'Operating hours', practices: 'Practices',
};
/** Equipment categories in display order (keep in sync with the server's CATEGORIES and migration 009). 'Other' stays last. */
export const EQUIPMENT_CATEGORIES = [
  'lighting', 'ac_ventilation', 'motors_pumps', 'ict', 'refrigeration', 'water_heating', 'kitchen_catering', 'office_equipment',
  'medical_lab', 'laundry', 'lifts', 'audio_visual', 'workshop', 'security', 'other',
];
export const categoryLabel = (c) => CATEGORY_LABELS[c] || c;
