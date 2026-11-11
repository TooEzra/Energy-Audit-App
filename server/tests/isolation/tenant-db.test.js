// Proves the tenant-scoped database handle isolates institutions regardless of what the API code passes to it.
// (MongoDB has no row-level security, so this facade is the isolation boundary.)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetDb, closeAll, getDb, addSystemMeasure } from '../helpers/testDb.js';
import { tenantDb } from '../../src/db/tenantDb.js';
import * as buildingsRepo from '../../src/repositories/buildings.repo.js';
import * as energyRepo from '../../src/repositories/energy.repo.js';
import * as measuresRepo from '../../src/repositories/measures.repo.js';
import * as institutionsRepo from '../../src/repositories/institutions.repo.js';
import * as usersRepo from '../../src/repositories/users.repo.js';

let a, b, dbA, dbB, bidA, bidB;

beforeAll(async () => {
  await resetDb();
  a = (await institutionsRepo.register({ institutionName: 'Tenant A', currency: 'kes', adminName: 'A', email: 'A@tenant.test', passwordHash: 'h' })).institutionId;
  b = (await institutionsRepo.register({ institutionName: 'Tenant B', currency: 'kes', adminName: 'B', email: 'b@tenant.test', passwordHash: 'h' })).institutionId;
  dbA = tenantDb(a); dbB = tenantDb(b);
  bidA = (await buildingsRepo.create(dbA, { name: 'Block', type: 'T', floorAreaM2: 10, operatingHours: 8 })).id;
  bidB = (await buildingsRepo.create(dbB, { name: 'Block', type: 'T', floorAreaM2: 10, operatingHours: 8 })).id;
  await energyRepo.create(dbA, bidA, { month: '2025-01', kwh: 1, cost: 1 });
  await energyRepo.create(dbB, bidB, { month: '2025-01', kwh: 1, cost: 1 });
});
afterAll(closeAll);

describe('tenant-scoped database handle', () => {
  it('only ever returns the caller’s own documents', async () => {
    expect(await buildingsRepo.list(dbA)).toHaveLength(1);
    expect(await buildingsRepo.getById(dbA, bidB)).toBeNull();
    expect(await buildingsRepo.getById(dbA, bidA)).not.toBeNull();
    expect(await energyRepo.listAll(dbA)).toHaveLength(1);
    expect((await institutionsRepo.getOwn(dbA)).name).toBe('Tenant A');
    expect(await usersRepo.list(dbA)).toHaveLength(1);
  });

  it('a caller-supplied institutionId in a filter cannot widen the scope', async () => {
    // the handle's institution is merged last, so these still return only A's own building
    for (const filter of [{ institutionId: b }, { institutionId: { $ne: a } }]) {
      const rows = await dbA.find('buildings', filter);
      expect(rows).toHaveLength(1);
      expect(rows[0].institutionId).toBe(a);
      expect(rows[0]._id).toBe(bidA);
    }
  });

  it('updates and deletes aimed at another institution change nothing', async () => {
    expect(await buildingsRepo.update(dbA, bidB, { name: 'Hacked' })).toBeNull();
    expect(await buildingsRepo.remove(dbA, bidB)).toBe(false);
    const [userB] = await usersRepo.list(dbB);
    expect(await usersRepo.remove(dbA, userB.id)).toBe(false);
    expect(await usersRepo.update(dbA, userB.id, { name: 'Hacked' })).toBeNull();
    expect(await usersRepo.list(dbB)).toHaveLength(1);
    expect((await buildingsRepo.getById(dbB, bidB)).name).toBe('Block');
  });

  it('inserts are stamped with the handle’s institution, even if the document claims another', async () => {
    const doc = await dbA.insert('equipment', { buildingId: bidA, institutionId: b, category: 'ict', name: 'x', ratingW: 1, qty: 1, hoursDay: 1, daysYear: 1 });
    expect(doc.institutionId).toBe(a);
  });

  it('system measures are readable by every tenant but cannot be changed by them', async () => {
    const id = await addSystemMeasure({ name: 'Preset' });
    expect((await measuresRepo.list(dbA)).find((m) => m.id === id)?.isSystem).toBe(true);
    expect((await measuresRepo.list(dbB)).find((m) => m.id === id)?.isSystem).toBe(true);
    expect(await dbA.updateOne('measures_library', { _id: id }, { name: 'x' })).toBeNull();
    expect(await dbA.deleteOne('measures_library', { _id: id })).toBe(false);
    const own = await measuresRepo.create(dbA, { name: 'Mine', category: 'lighting', typicalSavingPct: 10, typicalCost: 1 });
    expect(await measuresRepo.getById(dbB, own.id)).toBeNull();
  });

  it('unique indexes reject duplicates (e-mail globally, building name per institution, month per building)', async () => {
    await expect(institutionsRepo.register({ institutionName: 'Tenant C', currency: 'kes', adminName: 'C', email: 'a@tenant.test', passwordHash: 'h' }))
      .rejects.toMatchObject({ code: 11000 });
    expect(await getDb().collection('institutions').findOne({ name: 'Tenant C' })).toBeNull(); // compensated
    await expect(buildingsRepo.create(dbA, { name: 'Block', type: 'T', floorAreaM2: 1, operatingHours: 1 })).rejects.toMatchObject({ code: 11000 });
    await expect(energyRepo.create(dbA, bidA, { month: '2025-01', kwh: 2, cost: 2 })).rejects.toMatchObject({ code: 11000 });
    expect((await buildingsRepo.create(dbB, { name: 'Other', type: 'T', floorAreaM2: 1, operatingHours: 1 })).name).toBe('Other');
  });

  it('login lookup finds a user by e-mail (any case) without a tenant', async () => {
    const found = await usersRepo.authLookup('b@TENANT.test');
    expect(found.user.institutionId).toBe(b);
    expect(found.institution.name).toBe('Tenant B');
    expect(await usersRepo.authLookup('nobody@tenant.test')).toBeNull();
  });

  it('deleting a building removes its children', async () => {
    expect(await buildingsRepo.remove(dbB, bidB)).toBe(true);
    expect(await energyRepo.listAll(dbB)).toHaveLength(0);
    expect(await energyRepo.listAll(dbA)).toHaveLength(1);
  });
});
