// Two institutions: a user of one must not be able to list, read, edit or delete the other's data. Foreign records are 404.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetDb, closeAll } from '../helpers/testDb.js';
import { makeInstitution, makeBuilding, addYear } from '../helpers/factories.js';

let A, B, bA, base, ids = {};

beforeAll(async () => {
  await resetDb();
  A = await makeInstitution({ institutionName: 'Institution A' });
  B = await makeInstitution({ institutionName: 'Institution B' });
  bA = await makeBuilding(A.agent, { name: 'A Block' });
  await makeBuilding(B.agent, { name: 'B Block' });
  base = `/api/buildings/${bA.id}`;
  await addYear(A.agent, bA.id);
  ids.energy = (await A.agent.get(`${base}/energy`)).body.items[0].id;
  ids.equipment = (await A.agent.post(`${base}/equipment`).send({ category: 'ict', name: 'PC', ratingW: 100, qty: 2, hoursDay: 8, daysYear: 250 })).body.id;
  ids.finding = (await A.agent.post(`${base}/findings`).send({ area: 'lighting', problem: 'Secret problem', priority: 'High' })).body.id;
  ids.rec = (await A.agent.post(`${base}/recommendations`).send({ title: 'Secret rec', estimatedCost: 1, estimatedAnnualSaving: 1 })).body.id;
});
afterAll(closeAll);

describe('tenant isolation via the API', () => {
  it('lists only own data', async () => {
    const b = await B.agent.get('/api/buildings');
    expect(b.body.items.map((x) => x.name)).toEqual(['B Block']);
    const cmp = await B.agent.get('/api/analysis/compare');
    expect(cmp.body.items.map((x) => x.name)).toEqual(['B Block']);
    expect((await B.agent.get('/api/users')).body.items).toHaveLength(1);
    expect((await B.agent.get('/api/institution')).body.name).toBe('Institution B');
    const exp = JSON.stringify((await B.agent.get('/api/export')).body);
    expect(exp).not.toMatch(/A Block|Secret|Institution A/);
  });

  it('reading another institution’s records returns 404', async () => {
    for (const url of [
      base, `${base}/energy`, `${base}/analysis`, `${base}/equipment`, `${base}/reconciliation`,
      `${base}/findings`, `${base}/recommendations`, `${base}/report`, `${base}/findings/${ids.finding}/photo`,
    ]) {
      const res = await B.agent.get(url);
      expect(res.status, `GET ${url}`).toBe(404);
    }
  });

  it('cannot create, edit or delete inside another institution’s building (404)', async () => {
    const post = (u, body) => B.agent.post(u).send(body);
    expect((await post(`${base}/energy`, { month: '2030-01', kwh: 1, cost: 1 })).status).toBe(404);
    expect((await post(`${base}/energy/import`, { csv: 'month,kwh,cost\n2030-01,1,1', confirm: true })).status).toBe(404);
    expect((await post(`${base}/equipment`, { category: 'ict', name: 'x', ratingW: 1, qty: 1, hoursDay: 1, daysYear: 1 })).status).toBe(404);
    expect((await post(`${base}/findings`, { area: 'lighting', problem: 'x', priority: 'Low' })).status).toBe(404);
    expect((await post(`${base}/recommendations`, { title: 'x', estimatedCost: 1, estimatedAnnualSaving: 1 })).status).toBe(404);

    expect((await B.agent.patch(base).send({ name: 'Hijacked' })).status).toBe(404);
    expect((await B.agent.patch(`${base}/energy/${ids.energy}`).send({ kwh: 1 })).status).toBe(404);
    expect((await B.agent.patch(`${base}/equipment/${ids.equipment}`).send({ qty: 9 })).status).toBe(404);
    expect((await B.agent.patch(`${base}/findings/${ids.finding}`).send({ problem: 'x' })).status).toBe(404);
    expect((await B.agent.patch(`${base}/recommendations/${ids.rec}`).send({ title: 'x' })).status).toBe(404);

    // B is an admin, so DELETE passes the role check and must still say 404
    expect((await B.agent.delete(`${base}/energy/${ids.energy}`)).status).toBe(404);
    expect((await B.agent.delete(`${base}/equipment/${ids.equipment}`)).status).toBe(404);
    expect((await B.agent.delete(`${base}/findings/${ids.finding}`)).status).toBe(404);
    expect((await B.agent.delete(`${base}/recommendations/${ids.rec}`)).status).toBe(404);
    expect((await B.agent.delete(base)).status).toBe(404);
    expect((await B.agent.patch(`/api/users/${A.user.id}`).send({ name: 'Hijacked' })).status).toBe(404);
    expect((await B.agent.delete(`/api/users/${A.user.id}`)).status).toBe(404);
  });

  it('the owner’s data is untouched after all those attempts', async () => {
    expect((await A.agent.get(base)).body.name).toBe('A Block');
    expect((await A.agent.get(`${base}/energy`)).body.items).toHaveLength(12);
    expect((await A.agent.get(`${base}/equipment`)).body.items).toHaveLength(1);
    expect((await A.agent.get(`${base}/findings`)).body.items[0].problem).toBe('Secret problem');
    expect((await A.agent.get(`${base}/recommendations`)).body.items).toHaveLength(1);
    expect((await A.agent.get('/api/users')).body.items[0].name).toBe(A.user.name);
  });

  it('a body or URL cannot choose the institution: injected institutionId is ignored', async () => {
    const res = await B.agent.post('/api/buildings').send({ name: 'Sneaky', type: 'X', floorAreaM2: 5, operatingHours: 5, institutionId: A.institution.id, institution_id: A.institution.id });
    expect(res.status).toBe(201);
    expect((await A.agent.get('/api/buildings')).body.items.map((x) => x.name)).toEqual(['A Block']);
    expect((await B.agent.get('/api/buildings')).body.items.map((x) => x.name)).toEqual(['B Block', 'Sneaky']);
  });

  it('measures: own measures are private, system presets are shared', async () => {
    await A.agent.post('/api/measures').send({ name: 'A-only measure', category: 'other', typicalSavingPct: 1, typicalCost: 1 });
    expect((await B.agent.get('/api/measures')).body.items.some((m) => m.name === 'A-only measure')).toBe(false);
    expect((await A.agent.get('/api/measures')).body.items.some((m) => m.name === 'A-only measure')).toBe(true);
  });
});
