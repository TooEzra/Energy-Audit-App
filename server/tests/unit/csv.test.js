import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv } from '../../src/utils/csv.js';
import { addMonths, monthDiff } from '../../src/utils/dates.js';

describe('csv + dates utils', () => {
  it('parses quotes, CRLF, BOM and blank lines', () => {
    expect(parseCsv('﻿month,kwh,cost\r\n2025-01,"1,000",150\r\n\r\n2025-02,900,"a ""q"""\n'))
      .toEqual([['month', 'kwh', 'cost'], ['2025-01', '1,000', '150'], ['2025-02', '900', 'a "q"']]);
  });
  it('serialises with escaping', () => {
    expect(toCsv(['a', 'b'], [{ a: 'x,y', b: null }])).toBe('a,b\n"x,y",');
  });
  it('month arithmetic crosses years', () => {
    expect(addMonths('2025-11', 3)).toBe('2026-02');
    expect(addMonths('2025-03', -11)).toBe('2024-04');
    expect(monthDiff('2025-01', '2026-01')).toBe(12);
  });
});
