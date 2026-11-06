// Small CSV helper for the import preview (the server re-validates everything on import).
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(field); field = ''; rows.push(row); row = []; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

/** Quick structural check before sending: header must contain month, kwh, cost. */
export function checkCsvHeader(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { ok: false, message: 'The CSV is empty', rows: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = ['month', 'kwh', 'cost'].filter((c) => !header.includes(c));
  if (missing.length) return { ok: false, message: `Missing column(s): ${missing.join(', ')}. Expected header: month,kwh,cost`, rows: rows.length - 1 };
  return { ok: true, rows: rows.length - 1 };
}
