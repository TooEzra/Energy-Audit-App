// Tiny migration runner: applies db/migrations/*.sql in filename order, once each, as the OWNER role.
// Usage: `npm run migrate` (root) or `node src/db/migrate.js` (from server/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Create the two roles the migrations grant to (needs a superuser/CREATEROLE owner connection). */
async function ensureRoles(client) {
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'energy_app') THEN
      CREATE ROLE energy_app LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'energy_definer') THEN
      CREATE ROLE energy_definer NOLOGIN NOSUPERUSER BYPASSRLS; END IF;
  END $$;`);
  await client.query(`ALTER ROLE energy_app PASSWORD ${client.escapeLiteral(env.appDbPassword)}`);
}

export async function migrate(ownerUrl = env.ownerDatabaseUrl, log = console.log) {
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await ensureRoles(client);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      log(`applying ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    log('migrations up to date');
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().catch((e) => { console.error(e.message); process.exit(1); });
}
