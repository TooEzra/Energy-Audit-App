// Covers the rest of the audit path: equipment, reconciliation, findings (+photo), recommendations, report, export.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../src/config/env.js';
import { resetDb, closeAll, addSystemMeasure } from '../helpers/testDb.js';
import { makeInstitution, makeBuilding, addYear } from '../helpers/factories.js';

beforeEach(resetDb);
afterAll(closeAll);

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('equipment and reconciliation', () => {
  it('validates equipment, computes annual kWh/share and reconciles against billed kWh', async () => {
    const { agent } = await makeInstitution();
    const b = await makeBuilding(agent);
    const base = `/api/buildings/${b.id}`;

    const bad = await agent.post(`${base}/equipment`).send({ category: 'lighting', name: 'X', ratingW: 0, qty: 0, hoursDay: 25, daysYear: 400 });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.details)).toEqual(expect.arrayContaining(['ratingW', 'qty', 'hoursDay', 'daysYear']));
    expect((await agent.post(`${base}/equipment`).send({ category: 'toaster', name: 'X', ratingW: 1, qty: 1, hoursDay: 1, daysYear: 1 })).status).toBe(400);

    // 100 W x 10 x 10 h x 300 d / 1000 = 3000 kWh (lighting); 200 W x 5 x 10 h x 100 d / 1000 = 1000 kWh (ict)
    await agent.post(`${base}/equipment`).send({ category: 'lighting', name: 'LED', ratingW: 100, qty: 10, hoursDay: 10, daysYear: 300 });
    await agent.post(`${base}/equipment`).send({ category: 'ict', name: 'PCs', ratingW: 200, qty: 5, hoursDay: 10, daysYear: 100 });
    const list = await agent.get(`${base}/equipment`);
    expect(list.body.totalKwh).toBe(4000);
    expect(list.body.items.find((e) => e.name === 'LED')).toMatchObject({ annualKwh: 3000, sharePct: 75 });
    expect(list.body.endUse.find((c) => c.category === 'ict').sharePct).toBe(25);

    await addYear(agent, b.id, { kwh: 1000 }); // billed 12000 kWh -> gap (12000-4000)/12000 = 66.7%
    const rec = await agent.get(`${base}/reconciliation`);
    expect(rec.body.billedKwh).toBe(12000);
    expect(rec.body.inventoryKwh).toBe(4000);
    expect(rec.body.gapPct).toBeCloseTo(66.667, 2);
    expect(rec.body.warning).toBe(true);
  });
});

describe('findings with photo upload', () => {
  it('creates findings (JSON and multipart), serves the photo only through the authenticated route, removes it on delete', async () => {
    const { agent } = await makeInstitution();
    const b = await makeBuilding(agent);
    const base = `/api/buildings/${b.id}/findings`;

    expect((await agent.post(base).send({ area: 'nope', problem: 'x', priority: 'High' })).status).toBe(400);
    expect((await agent.post(base).send({ area: 'lighting', problem: '', priority: 'High' })).status).toBe(400);
    expect((await agent.post(base).send({ area: 'lighting', problem: 'x', priority: 'Urgent' })).status).toBe(400);

    const plain = await agent.post(base).send({ area: 'practices', problem: 'Computers left on', priority: 'Low' });
    expect(plain.status).toBe(201);
    expect(plain.body.hasPhoto).toBe(false);
    expect((await agent.get(`${base}/${plain.body.id}/photo`)).status).toBe(404);

    const withPhoto = await agent.post(base)
      .field('area', 'lighting').field('problem', 'Old tubes').field('priority', 'High').field('locationSystem', 'Hall')
      .attach('photo', PNG, { filename: 'tube.png', contentType: 'image/png' });
    expect(withPhoto.status).toBe(201);
    expect(withPhoto.body.hasPhoto).toBe(true);
    expect(withPhoto.body.photoPath).toBeUndefined(); // storage path is never exposed

    const img = await agent.get(`${base}/${withPhoto.body.id}/photo`);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toMatch(/image\/png/);

    const dir = path.join(env.uploadDir, String((await agent.get('/api/institution')).body.id));
    expect(fs.readdirSync(dir).length).toBeGreaterThan(0);

    const filtered = await agent.get(`${base}?area=lighting`);
    expect(filtered.body.items).toHaveLength(1);

    expect((await agent.delete(`${base}/${withPhoto.body.id}`)).status).toBe(204);
    expect(fs.readdirSync(dir).length).toBe(0);
  });

  it('rejects non-image uploads and fake images', async () => {
    const { agent } = await makeInstitution();
    const b = await makeBuilding(agent);
    const base = `/api/buildings/${b.id}/findings`;
    const txt = await agent.post(base).field('area', 'lighting').field('problem', 'x').field('priority', 'Low')
      .attach('photo', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(txt.status).toBe(400);
    const fake = await agent.post(base).field('area', 'lighting').field('problem', 'x').field('priority', 'Low')
      .attach('photo', Buffer.from('not really a png'), { filename: 'a.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    expect((await agent.get(base)).body.items).toHaveLength(0);
  });
});

describe('recommendations, measures library, report and export', () => {
  it('pre-fills from a measure, computes payback, labels estimates', async () => {
    const { agent } = await makeInstitution();
    const measureId = await addSystemMeasure({ name: 'LED retrofit', category: 'lighting', pct: 50, cost: 100000 });
    const b = await makeBuilding(agent);
    const base = `/api/buildings/${b.id}`;
    await addYear(agent, b.id, { kwh: 1000, cost: 1000 }); // annual cost 12000
    await agent.post(`${base}/equipment`).send({ category: 'lighting', name: 'T8', ratingW: 100, qty: 1, hoursDay: 10, daysYear: 100 });
    await agent.post(`${base}/equipment`).send({ category: 'ict', name: 'PC', ratingW: 100, qty: 3, hoursDay: 10, daysYear: 100 });

    const measures = await agent.get('/api/measures');
    expect(measures.body.items.some((m) => m.id === measureId && m.isSystem)).toBe(true);

    // lighting is 25% of the inventory -> baseline 3000 -> 50% = 1500 estimated saving
    const pre = await agent.get(`${base}/recommendations/prefill?measureId=${measureId}`);
    expect(pre.status).toBe(200);
    expect(pre.body).toMatchObject({ title: 'LED retrofit', estimatedCost: 100000, estimatedAnnualSaving: 1500, isEstimate: true });

    const fromMeasure = await agent.post(`${base}/recommendations`).send({ measureId });
    expect(fromMeasure.status).toBe(201);
    expect(fromMeasure.body).toMatchObject({ title: 'LED retrofit', estimatedAnnualSaving: 1500, status: 'Proposed', isEstimate: true });
    expect(fromMeasure.body.payback.label).toBe('66.7 years');

    const manual = await agent.post(`${base}/recommendations`).send({ title: 'Switch off at night', estimatedCost: 0, estimatedAnnualSaving: 2000, status: 'Accepted' });
    expect(manual.body.payback.label).toBe('Immediate');
    const none = await agent.post(`${base}/recommendations`).send({ title: 'Awareness', estimatedCost: 500, estimatedAnnualSaving: 0 });
    expect(none.body.payback.label).toBe('Not applicable');

    // validation
    expect((await agent.post(`${base}/recommendations`).send({ title: 'x', estimatedCost: -1, estimatedAnnualSaving: 1 })).status).toBe(400);
    expect((await agent.post(`${base}/recommendations`).send({ title: 'x', estimatedCost: 1, estimatedAnnualSaving: 1, status: 'Done' })).status).toBe(400);
    expect((await agent.post(`${base}/recommendations`).send({ title: 'x' })).status).toBe(400);
    expect((await agent.post(`${base}/recommendations`).send({ measureId: 999999 })).status).toBe(404);

    const upd = await agent.patch(`${base}/recommendations/${manual.body.id}`).send({ status: 'Implemented', estimatedCost: 1000 });
    expect(upd.body.status).toBe('Implemented');
    expect(upd.body.payback.label).toBe('0.5 years');

    const list = await agent.get(`${base}/recommendations`);
    expect(list.body.items).toHaveLength(3);

    // institution's own measures are created and listed alongside system presets
    const own = await agent.post('/api/measures').send({ name: 'Solar film', category: 'other', typicalSavingPct: 8, typicalCost: 5000 });
    expect(own.status).toBe(201);
    expect(own.body.isSystem).toBe(false);
    expect((await agent.post('/api/measures').send({ name: 'Bad', category: 'other', typicalSavingPct: 150, typicalCost: 1 })).status).toBe(400);
  });

  it('builds the report data, the editable conclusion, PDF (or a clear 501), and exports', async () => {
    const { agent } = await makeInstitution();
    const b = await makeBuilding(agent);
    const base = `/api/buildings/${b.id}`;
    await addYear(agent, b.id);
    await agent.post(`${base}/findings`).send({ area: 'lighting', problem: 'Old tubes <b>x</b>', priority: 'High' });
    await agent.post(`${base}/recommendations`).send({ title: 'LED', estimatedCost: 1000, estimatedAnnualSaving: 500 });

    const rep = await agent.get(`${base}/report`);
    expect(rep.status).toBe(200);
    expect(rep.body.building.id).toBe(b.id);
    expect(rep.body.analysis.eui.complete).toBe(true);
    expect(rep.body.findings).toHaveLength(1);
    expect(rep.body.recommendations[0].payback.label).toBe('2.0 years');
    expect(rep.body.recommendationTotals.estimatedAnnualSaving).toBe(500);
    expect(rep.body.conclusion).toMatch(/estimate/i);

    const custom = await agent.get(`${base}/report`).query({ conclusion: 'My own conclusion.' });
    expect(custom.body.conclusion).toBe('My own conclusion.');
    expect((await agent.get(`${base}/report`).query({ conclusion: 'x'.repeat(2001) })).status).toBe(400);

    const pdf = await agent.get(`${base}/report`).query({ format: 'pdf' }).buffer(true).parse((res, cb) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    if (pdf.status === 200) {
      expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
      expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    } else {
      expect(pdf.status).toBe(501); // Puppeteer/Chromium not available on this machine: the print page is the fallback
    }

    const json = await agent.get('/api/export');
    expect(json.status).toBe(200);
    expect(json.body.buildings).toHaveLength(1);
    expect(json.body.energyRecords).toHaveLength(12);
    const csv = await agent.get('/api/export?format=csv');
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toMatch(/# buildings/);
    expect((await agent.get('/api/export?format=xml')).status).toBe(400);
  });
});
