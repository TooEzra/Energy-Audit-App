// Month helpers. A "month key" is 'YYYY-MM'; the database stores the first day ('YYYY-MM-01').
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthToDate = (key) => `${key}-01`;
export const dateToMonth = (d) => String(d).slice(0, 7);

/** Add n months (may be negative) to a 'YYYY-MM' key. */
export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Number of whole months from a to b (b later => positive). */
export function monthDiff(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return by * 12 + bm - (ay * 12 + am);
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);
