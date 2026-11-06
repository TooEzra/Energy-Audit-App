// pg Pool that connects as the NON-superuser app role (energy_app), so RLS policies always apply.
import pg from 'pg';
import { env } from '../config/env.js';

// Return dates as plain 'YYYY-MM-DD' strings (no timezone shifting) and numerics/bigints as JS numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
pool.on('error', (err) => console.error('Unexpected pg pool error', err.message));

export const closePool = () => pool.end();
