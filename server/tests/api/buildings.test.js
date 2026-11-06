import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, closeAll } from '../helpers/testDb.js';
import { makeInstitution, makeAuditor, makeBuilding } from '../helpers/factories.js';

beforeEach(resetDb);
afterAll(closeAll);

describe('buildings', () => {
  it('creates, lists, reads, updates and deletes (admin)', async () => {
    const { agent } = await makeInstitution();
    const b = await makeBuilding(agent, { name: 'Library', floorAreaM2: 1200.5, operatingHours: 11.5 });
    expect(b).toMatchObject({ name: 'Library', type: 'Education', floorAreaM2: 1200.5, operatingHours: 11.5 });

    const list = await agent.get('/api/buildings');
    expect(list.body.items).toHaveLength(1);
    expect(list.body.maxBuildings).toBe(5);

    expect((await agent.get(`/api/buildings/${b.id}`)).body.name).toBe('Library');
    const patched = await agent.patch(`/api/buildings/${b.id}`).send({ floorAreaM2: 900 });
    expect(patched.status).toBe(200);
    expect(patched.body.floorAreaM2).toBe(900);
    expect(patched.body.name).toBe('Library');

    expect((await agent.delete(`/api/buildings/${b.id}`)).status).toBe(204);
    expect((await agent.get(`/api/buildings/${b.id}`)).status).toBe(404);
  });

  it('validates fields with per-field details', async () => {
    const { agent } = await makeInstitution();
    const res = await agent.post('/api/buildings').send({ name: '', type: 'X', floorAreaM2: 0, operatingHours: 25 });
    expect(res.status).toBe(400);
    expect(res.body.details).toMatchObject({
      name: expect.any(String), floorAreaM2: expect.stringMatching(/greater than 0/), operatingHours: expect.stringMatching(/1 and 24/),
    });
    expect((await agent.post('/api/buildings').send({ name: 'N', type: 'X', floorAreaM2: 'abc', operatingHours: 8 })).status).toBe(400);
    expect((await agent.post('/api/buildings').send({ name: 'N', type: 'X', floorAreaM2: 10, operatingHours: 0 })).status).toBe(400);
  });

  it('rejects a duplicate name within the institution', async () => {
    const { agent } = await makeInstitution();
    await makeBuilding(agent, { name: 'Same' });
    const res = await agent.post('/api/buildings').send({ name: 'Same', type: 'X', floorAreaM2: 10, operatingHours: 8 });
    expect(res.status).toBe(409);
    expect(res.body.details.name).toBeTruthy();
  });

  it("enforces the institution's building limit", async () => {
    const { agent } = await makeInstitution();
    expect((await agent.patch('/api/institution').send({ maxBuildings: 2 })).status).toBe(200);
    await makeBuilding(agent);
    await makeBuilding(agent);
    const third = await agent.post('/api/buildings').send({ name: 'Third', type: 'X', floorAreaM2: 10, operatingHours: 8 });
    expect(third.status).toBe(400);
    expect(third.body.error).toMatch(/limit/i);
    // cannot lower the limit under the existing count; invalid limits rejected
    expect((await agent.patch('/api/institution').send({ maxBuildings: 1 })).status).toBe(400);
    expect((await agent.patch('/api/institution').send({ maxBuildings: 51 })).status).toBe(400);
  });

  it('auditors can create and edit but cannot delete', async () => {
    const admin = await makeInstitution();
    const aud = await makeAuditor(admin);
    const b = await makeBuilding(aud.agent);
    expect((await aud.agent.patch(`/api/buildings/${b.id}`).send({ name: 'Renamed' })).status).toBe(200);
    expect((await aud.agent.delete(`/api/buildings/${b.id}`)).status).toBe(403);
    expect((await admin.agent.delete(`/api/buildings/${b.id}`)).status).toBe(204);
  });

  it('non-numeric ids behave like missing records', async () => {
    const { agent } = await makeInstitution();
    expect((await agent.get('/api/buildings/abc')).status).toBe(404);
    expect((await agent.get('/api/buildings/99999')).status).toBe(404);
  });
});
