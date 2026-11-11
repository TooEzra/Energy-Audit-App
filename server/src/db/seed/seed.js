// Seeds the system measures and two fictional demo institutions. Run with `npm run seed` (idempotent).
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import { connect, ensureIndexes, closeMongo, getDb, nextId } from '../mongo.js';
import { SYSTEM_MEASURES } from './measures.js';
import { DEMO_INSTITUTIONS, DEMO_PASSWORD, monthlyRecords, equipmentFor, FINDINGS } from './demoData.js';

export async function seed(log = console.log) {
  await connect();
  await ensureIndexes();
  const d = getDb();
  const insert = async (name, doc) => { const _id = await nextId(name); await d.collection(name).insertOne({ _id, ...doc }); return _id; };

  for (const m of SYSTEM_MEASURES) {
    if (!(await d.collection('measures_library').findOne({ institutionId: null, name: m.name }))) {
      await insert('measures_library', {
        institutionId: null, name: m.name, category: m.category, typicalSavingPct: m.typicalSavingPct,
        typicalCost: m.typicalCost, description: m.description ?? null,
      });
    }
  }
  log(`system measures: ${SYSTEM_MEASURES.length}`);

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const inst of DEMO_INSTITUTIONS) {
    if (await d.collection('institutions').findOne({ name: inst.name })) { log(`skip (already exists): ${inst.name}`); continue; }

    const iid = await insert('institutions', { name: inst.name, currency: inst.currency, maxBuildings: inst.maxBuildings, createdAt: new Date() });
    for (const [u, role] of [[inst.admin, 'admin'], [inst.auditor, 'auditor']]) {
      await insert('users', { institutionId: iid, name: u.name, email: u.email.toLowerCase(), passwordHash: hash, role, mustChangePassword: false, createdAt: new Date() });
    }

    const buildingIds = [];
    for (const b of inst.buildings) {
      const bid = await insert('buildings', { institutionId: iid, name: b.name, type: b.type, floorAreaM2: b.floorAreaM2, operatingHours: b.operatingHours });
      buildingIds.push(bid);
      for (const r of monthlyRecords(b)) {
        await insert('energy_records', { institutionId: iid, buildingId: bid, month: r.month, kwh: r.kwh, cost: r.cost });
      }
      for (const e of equipmentFor(b)) {
        await insert('equipment', {
          institutionId: iid, buildingId: bid, category: e.category, name: e.name, location: e.location ?? null,
          ratingW: e.ratingW, qty: e.qty, hoursDay: e.hoursDay, daysYear: e.daysYear, condition: e.condition ?? null,
        });
      }
    }

    // Findings for the first building; two recommendations reference its findings.
    const firstId = buildingIds[0];
    const findingIds = [];
    for (const f of FINDINGS) {
      findingIds.push(await insert('findings', {
        institutionId: iid, buildingId: firstId, area: f.area, problem: f.problem, locationSystem: f.locationSystem ?? null,
        suggestedImprovement: f.suggestedImprovement ?? null, priority: f.priority, photoPath: null, createdAt: new Date(),
      }));
    }
    const led = await d.collection('measures_library').findOne({ institutionId: null, name: 'LED lighting retrofit' });
    const acs = await d.collection('measures_library').findOne({ institutionId: null, name: 'AC schedule / switch-off' });
    await insert('recommendations', { institutionId: iid, buildingId: firstId, findingId: findingIds[1], measureId: led._id, title: 'LED lighting retrofit', estimatedCost: 250000, estimatedAnnualSaving: 180000, status: 'Proposed', createdAt: new Date() });
    await insert('recommendations', { institutionId: iid, buildingId: firstId, findingId: findingIds[2], measureId: acs._id, title: 'AC schedule / switch-off', estimatedCost: 20000, estimatedAnnualSaving: 95000, status: 'Accepted', createdAt: new Date() });
    log(`created: ${inst.name}`);
  }
  log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  DEMO_INSTITUTIONS.forEach((i) => log(`  ${i.name}: ${i.admin.email} (admin), ${i.auditor.email} (auditor)`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(closeMongo);
}
