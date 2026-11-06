// Proves the isolation is enforced by PostgreSQL itself (row-level security), independent of the API code.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetDb, closeAll, ownerPool, appPool } from '../helpers/testDb.js';
import { withTenant } from '../../src/db/withTenant.js';

const TABLES = ['institutions', 'users', 'buildings', 'energy_records', 'equipment', 'findings', 'recommendations'];
let a, b; // institution ids

beforeAll(async () => {
  await resetDb();
  // Fixtures are inserted as the OWNER (bypasses RLS) so the policies are tested against real rows.
  for (const n of ['A', 'B']) {
    const inst = (await ownerPool.query('INSERT INTO institutions (name) VALUES ($1) RETURNING id', [`RLS ${n}`])).rows[0].id;
    await ownerPool.query("INSERT INTO users (institution_id, name, email, password_hash, role) VALUES ($1,'u',$2,'h','admin')", [inst, `${n}@rls.test`]);
    const bid = (await ownerPool.query("INSERT INTO buildings (institution_id, name, type, floor_area_m2, operating_hours) VALUES ($1,'B','T',10,8) RETURNING id", [inst])).rows[0].id;
    await ownerPool.query('INSERT INTO energy_records (institution_id, building_id, month, kwh, cost) VALUES ($1,$2,$3,1,1)', [inst, bid, '2025-01-01']);
    await ownerPool.query("INSERT INTO equipment (institution_id, building_id, category, name, rating_w, qty, hours_day, days_year) VALUES ($1,$2,'ict','e',1,1,1,1)", [inst, bid]);
    const fid = (await ownerPool.query("INSERT INTO findings (institution_id, building_id, area, problem, priority) VALUES ($1,$2,'lighting','p','Low') RETURNING id", [inst, bid])).rows[0].id;
    await ownerPool.query("INSERT INTO recommendations (institution_id, building_id, finding_id, title, estimated_cost, estimated_annual_saving) VALUES ($1,$2,$3,'r',1,1)", [inst, bid, fid]);
    if (n === 'A') a = inst; else b = inst;
  }
});
afterAll(closeAll);

describe('row-level security', () => {
  it('the app connects as a role that cannot bypass RLS', async () => {
    const { rows } = await appPool.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it('a direct SQL query WITHOUT app.institution_id returns zero rows from every tenant table', async () => {
    for (const t of TABLES) {
      const { rows } = await appPool.query(`SELECT count(*)::int AS n FROM ${t}`);
      expect(rows[0].n, t).toBe(0);
    }
    // owner sees the fixtures, so "zero" is not just an empty database
    expect((await ownerPool.query('SELECT count(*)::int AS n FROM buildings')).rows[0].n).toBe(2);
  });

  it('with the tenant set, only that institution’s rows are visible', async () => {
    for (const [id, other] of [[a, b], [b, a]]) {
      await withTenant(id, async (c) => {
        for (const t of TABLES) {
          const { rows } = await c.query(`SELECT count(*)::int AS n FROM ${t}`);
          expect(rows[0].n, `${t} for ${id}`).toBe(1);
        }
        expect((await c.query('SELECT count(*)::int AS n FROM buildings WHERE institution_id = $1', [other])).rows[0].n).toBe(0);
      });
    }
  });

  it('the tenant setting does not leak to the next use of a pooled connection', async () => {
    await withTenant(a, async (c) => { expect((await c.query('SELECT count(*)::int AS n FROM buildings')).rows[0].n).toBe(1); });
    const { rows } = await appPool.query('SELECT count(*)::int AS n FROM buildings');
    expect(rows[0].n).toBe(0);
  });

  it('a tenant cannot write, update or delete another institution’s rows', async () => {
    await expect(withTenant(a, (c) => c.query(
      "INSERT INTO buildings (institution_id, name, type, floor_area_m2, operating_hours) VALUES ($1,'Evil','T',1,1)", [b]))).rejects.toThrow(/row-level security/);
    await withTenant(a, async (c) => {
      expect((await c.query("UPDATE buildings SET name = 'x' WHERE institution_id = $1", [b])).rowCount).toBe(0);
      expect((await c.query('DELETE FROM buildings WHERE institution_id = $1', [b])).rowCount).toBe(0);
      expect((await c.query('DELETE FROM users WHERE institution_id = $1', [b])).rowCount).toBe(0);
      expect((await c.query("UPDATE institutions SET name = 'x' WHERE id = $1", [b])).rowCount).toBe(0);
    });
    await expect(withTenant(a, (c) => c.query("UPDATE buildings SET institution_id = $1", [b]))).rejects.toThrow(/row-level security/);
    expect((await ownerPool.query('SELECT count(*)::int AS n FROM buildings')).rows[0].n).toBe(2);
  });

  it('composite foreign keys stop a row pointing at another institution’s building (even for the owner)', async () => {
    const bidB = (await ownerPool.query('SELECT id FROM buildings WHERE institution_id = $1', [b])).rows[0].id;
    await expect(ownerPool.query('INSERT INTO energy_records (institution_id, building_id, month, kwh, cost) VALUES ($1,$2,$3,1,1)', [a, bidB, '2025-02-01']))
      .rejects.toThrow(/foreign key/);
  });

  it('the database rejects bad data even without the API', async () => {
    const bidA = (await ownerPool.query('SELECT id FROM buildings WHERE institution_id = $1', [a])).rows[0].id;
    const ins = (kwh, month) => ownerPool.query('INSERT INTO energy_records (institution_id, building_id, month, kwh, cost) VALUES ($1,$2,$3,$4,1)', [a, bidA, month, kwh]);
    await expect(ins(-1, '2025-03-01')).rejects.toThrow(/check constraint/);
    await expect(ins(1, '2025-03-15')).rejects.toThrow(/check constraint/);
    await expect(ins(1, '2025-01-01')).rejects.toThrow(/duplicate key/);
    await expect(ownerPool.query("UPDATE recommendations SET is_estimate = false WHERE institution_id = $1", [a])).rejects.toThrow(/check constraint/);
  });

  it('system measures are readable by every tenant, but tenants cannot create or alter them', async () => {
    await ownerPool.query("INSERT INTO measures_library (institution_id, name, category, typical_saving_pct, typical_cost) VALUES (NULL,'Preset','lighting',10,1)");
    await withTenant(a, async (c) => {
      expect((await c.query("SELECT count(*)::int AS n FROM measures_library WHERE name = 'Preset'")).rows[0].n).toBe(1);
      expect((await c.query("UPDATE measures_library SET name = 'x' WHERE name = 'Preset'")).rowCount).toBe(0);
    });
    await expect(withTenant(a, (c) => c.query(
      "INSERT INTO measures_library (institution_id, name, category, typical_saving_pct, typical_cost) VALUES (NULL,'Sneaky','other',1,1)"))).rejects.toThrow(/row-level security/);
  });

  it('login/sign-up SECURITY DEFINER functions work without a tenant and expose only what they return', async () => {
    const { rows } = await appPool.query("SELECT * FROM auth_lookup('A@rls.test')");
    expect(rows).toHaveLength(1);
    expect(rows[0].institution_id).toBe(a);
    expect((await appPool.query("SELECT * FROM auth_lookup('nobody@rls.test')")).rows).toHaveLength(0);
    const reg = await appPool.query("SELECT * FROM register_institution('RLS C','kes','Admin C','c@rls.test','hash')");
    expect(reg.rows[0].institution_id).toBeGreaterThan(0);
    // the new institution's rows are still invisible without a tenant
    expect((await appPool.query('SELECT count(*)::int AS n FROM users')).rows[0].n).toBe(0);
  });
});
