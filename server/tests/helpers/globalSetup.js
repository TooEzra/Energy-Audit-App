// Runs once before the test files: creates the test database if needed and applies all migrations to it.
process.env.NODE_ENV = 'test';
import pg from 'pg';

export default async function setup() {
  const { env } = await import('../../src/config/env.js');
  const { migrate } = await import('../../src/db/migrate.js');
  const url = new URL(env.ownerDatabaseUrl);
  const dbName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(dbName)) throw new Error('Unsafe test database name');
  const admin = new pg.Client({ connectionString: env.ownerDatabaseUrl.replace(`/${dbName}`, '/postgres') });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!rowCount) await admin.query(`CREATE DATABASE ${dbName}`);
  } finally { await admin.end(); }
  await migrate(env.ownerDatabaseUrl, () => {});
}
