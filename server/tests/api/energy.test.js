import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, closeAll } from '../helpers/testDb.js';
import { makeInstitution, makeBuilding, addYear } from '../helpers/factories.js';

beforeEach(resetDb);
afterAll(closeAll);

const setup = async () => {
  const inst = await makeInstitution();
  const b = await makeBuilding(inst.agent, { floorAreaM2: 500 });
  return { ...inst, b, url: `/api/buildings/${b.id}/energy` };
};

describe('monthly energy records', () => {
  it('creates a record (month stored as first of month) and lists it', async () => {
    const { agent, url } = await setup();
    const res = await agent.post(url).send({ month: '2025-03', kwh: 1200.5, cost: 180 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ month: '2025-03', kwh: 1200.5, cost: 180 });
    expect((await agent.get(url)).body.items).toHaveLength(1);
  });

  it('rejects negative, missing and non-numeric values and bad months', async () => {
    const { agent, url } = await setup();
    const neg = await agent.post(url).send({ month: '2025-03', kwh: -5, cost: 10 });
    expect(neg.status).toBe(400);
    expect(neg.body.details.kwh).toMatch(/negative/);
    expect((await agent.post(url).send({ month: '2025-03', kwh: 10, cost: -1 })).status).toBe(400);
    expect((await agent.post(url).send({ month: '2025-03', cost: 10 })).status).toBe(400);
    expect((await agent.post(url).send({ month: '2025-03', kwh: '', cost: 10 })).status).toBe(400);
    expect((await agent.post(url).send({ month: '2025-03', kwh: 'abc', cost: 10 })).status).toBe(400);
    const badMonth = await agent.post(url).send({ month: '03/2025', kwh: 1, cost: 1 });
    expect(badMonth.status).toBe(400);
    expect(badMonth.body.details.month).toBeTruthy();
    expect((await agent.post(url).send({ month: '2025-13', kwh: 1, cost: 1 })).status).toBe(400);
  });

  it('rejects a month that is already recorded', async () => {
    const { agent, url } = await setup();
    await agent.post(url).send({ month: '2025-03', kwh: 100, cost: 10 });
    const dup = await agent.post(url).send({ month: '2025-03', kwh: 200, cost: 20 });
    expect(dup.status).toBe(409);
    expect(dup.body.details.month).toBeTruthy();
    // the failed insert did not poison anything
    expect((await agent.get(url)).body.items).toHaveLength(1);
  });

  it('updates and deletes (delete is admin-only)', async () => {
    const { agent, url } = await setup();
    const rec = (await agent.post(url).send({ month: '2025-03', kwh: 100, cost: 10 })).body;
    const upd = await agent.patch(`${url}/${rec.id}`).send({ kwh: 150 });
    expect(upd.body).toMatchObject({ kwh: 150, cost: 10, month: '2025-03' });
    expect((await agent.delete(`${url}/${rec.id}`)).status).toBe(204);
    expect((await agent.delete(`${url}/${rec.id}`)).status).toBe(404);
  });
});

describe('CSV import', () => {
  it('validates rows, reports row numbers, imports nothing until confirmed, then imports only valid rows', async () => {
    const { agent, url } = await setup();
    await agent.post(url).send({ month: '2025-01', kwh: 1, cost: 1 }); // existing month
    const csv = [
      'month,kwh,cost',
      '2025-01,100,10',      // row 2: already recorded
      '2025-02,200,20',      // row 3: ok
      '2025-03,-5,10',       // row 4: negative
      'March,100,10',        // row 5: bad month
      '2025-04,abc,10',      // row 6: not numeric
      '2025-05,300,30',      // row 7: ok
      '2025-05,310,31',      // row 8: duplicate in file
    ].join('\n');

    const preview = await agent.post(`${url}/import`).send({ csv });
    expect(preview.status).toBe(200);
    expect(preview.body.confirmed).toBe(false);
    expect(preview.body.imported).toBe(0);
    expect(preview.body.valid.map((v) => v.row)).toEqual([3, 7]);
    expect(preview.body.errors.map((e) => e.row)).toEqual([2, 4, 5, 6, 8]);
    expect((await agent.get(url)).body.items).toHaveLength(1); // nothing imported yet

    const done = await agent.post(`${url}/import`).send({ csv, confirm: true });
    expect(done.body).toMatchObject({ confirmed: true, imported: 2 });
    expect((await agent.get(url)).body.items.map((r) => r.month)).toEqual(['2025-01', '2025-02', '2025-05']);
  });

  it('rejects a CSV without the required header', async () => {
    const { agent, url } = await setup();
    const res = await agent.post(`${url}/import`).send({ csv: 'date,usage\n2025-01,10' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/month,kwh,cost/);
    expect((await agent.post(`${url}/import`).send({ csv: '' })).status).toBe(400);
  });
});

describe('analysis', () => {
  it('computes annual totals, EUI and flags the high month', async () => {
    const { agent, b } = await setup();
    const values = Array(12).fill(1000); values[8] = 1800;
    await addYear(agent, b.id, { values, cost: 100 });
    const res = await agent.get(`/api/buildings/${b.id}/analysis`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toMatchObject({ kwh: 11 * 1000 + 1800, cost: 1200 });
    expect(res.body.eui.complete).toBe(true);
    expect(res.body.eui.value).toBeCloseTo(12800 / 500, 6); // 25.6
    expect(res.body.anomalies.map((a) => a.month)).toEqual(['2025-09']);
    expect(res.body.series.find((s) => s.month === '2025-09').anomaly).toBe(true);
  });

  it('labels EUI incomplete with fewer than 12 months', async () => {
    const { agent, b, url } = await setup();
    await agent.post(url).send({ month: '2025-01', kwh: 1000, cost: 100 });
    const res = await agent.get(`/api/buildings/${b.id}/analysis`);
    expect(res.body.eui.value).toBeNull();
    expect(res.body.eui.complete).toBe(false);
    expect(res.body.eui.label).toMatch(/incomplete/);
    expect(res.body.totals.kwh).toBe(1000);
  });

  it('compare warns when building types differ', async () => {
    const { agent } = await setup();
    const same = await agent.get('/api/analysis/compare');
    expect(same.body.warning).toBeNull();
    await makeBuilding(agent, { type: 'Hospital' });
    const diff = await agent.get('/api/analysis/compare');
    expect(diff.body.items).toHaveLength(2);
    expect(diff.body.typesDiffer).toBe(true);
    expect(diff.body.warning).toMatch(/not be fair/);
  });
});
