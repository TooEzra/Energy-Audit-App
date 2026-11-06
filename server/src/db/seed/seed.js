// Seeds the 8 system measures and two fictional demo institutions. Run with `npm run seed` (idempotent).
// Connects as the OWNER role (needs RLS bypass to write system presets with institution_id NULL).
import pg from 'pg';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';
import { SYSTEM_MEASURES } from './measures.js';
import { DEMO_INSTITUTIONS, DEMO_PASSWORD, monthlyRecords, equipmentFor, FINDINGS } from './demoData.js';

export async function seed(ownerUrl = env.ownerDatabaseUrl, log = console.log) {
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query('BEGIN');

    for (const m of SYSTEM_MEASURES) {
      const { rowCount } = await client.query('SELECT 1 FROM measures_library WHERE institution_id IS NULL AND name = $1', [m.name]);
      if (!rowCount) {
        await client.query(
          `INSERT INTO measures_library (institution_id, name, category, typical_saving_pct, typical_cost, description)
           VALUES (NULL, $1,$2,$3,$4,$5)`, [m.name, m.category, m.typicalSavingPct, m.typicalCost, m.description]);
      }
    }
    log(`system measures: ${SYSTEM_MEASURES.length}`);

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const inst of DEMO_INSTITUTIONS) {
      const exists = await client.query('SELECT 1 FROM institutions WHERE name = $1', [inst.name]);
      if (exists.rowCount) { log(`skip (already exists): ${inst.name}`); continue; }

      const { rows: [{ id: iid }] } = await client.query(
        'INSERT INTO institutions (name, currency, max_buildings) VALUES ($1,$2,$3) RETURNING id', [inst.name, inst.currency, inst.maxBuildings]);
      for (const [u, role] of [[inst.admin, 'admin'], [inst.auditor, 'auditor']]) {
        await client.query(
          'INSERT INTO users (institution_id, name, email, password_hash, role, must_change_password) VALUES ($1,$2,$3,$4,$5,false)',
          [iid, u.name, u.email, hash, role]);
      }

      const buildingIds = [];
      for (const b of inst.buildings) {
        const { rows: [{ id: bid }] } = await client.query(
          'INSERT INTO buildings (institution_id, name, type, floor_area_m2, operating_hours) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [iid, b.name, b.type, b.floorAreaM2, b.operatingHours]);
        buildingIds.push(bid);
        for (const r of monthlyRecords(b)) {
          await client.query('INSERT INTO energy_records (institution_id, building_id, month, kwh, cost) VALUES ($1,$2,$3,$4,$5)',
            [iid, bid, `${r.month}-01`, r.kwh, r.cost]);
        }
        for (const e of equipmentFor(b)) {
          await client.query(
            `INSERT INTO equipment (institution_id, building_id, category, name, location, rating_w, qty, hours_day, days_year, condition)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [iid, bid, e.category, e.name, e.location, e.ratingW, e.qty, e.hoursDay, e.daysYear, e.condition]);
        }
      }

      // Findings for the first building; recommendations (2 per institution) reference its first findings.
      const firstId = buildingIds[0];
      const findingIds = [];
      for (const f of FINDINGS) {
        const { rows: [{ id }] } = await client.query(
          `INSERT INTO findings (institution_id, building_id, area, problem, location_system, suggested_improvement, priority)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [iid, firstId, f.area, f.problem, f.locationSystem, f.suggestedImprovement, f.priority]);
        findingIds.push(id);
      }
      const led = await client.query("SELECT id FROM measures_library WHERE institution_id IS NULL AND name = 'LED lighting retrofit'");
      const acs = await client.query("SELECT id FROM measures_library WHERE institution_id IS NULL AND name = 'AC schedule / switch-off'");
      await client.query(
        `INSERT INTO recommendations (institution_id, building_id, finding_id, measure_id, title, estimated_cost, estimated_annual_saving, status)
         VALUES ($1,$2,$3,$4,'LED lighting retrofit',250000,180000,'Proposed'), ($1,$2,$5,$6,'AC schedule / switch-off',20000,95000,'Accepted')`,
        [iid, firstId, findingIds[1], led.rows[0].id, findingIds[2], acs.rows[0].id]);
      log(`created: ${inst.name}`);
    }
    await client.query('COMMIT');
    log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
    DEMO_INSTITUTIONS.forEach((i) => log(`  ${i.name}: ${i.admin.email} (admin), ${i.auditor.email} (auditor)`));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().catch((e) => { console.error(e.message); process.exit(1); });
}
