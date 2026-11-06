import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetDb, closeAll } from '../helpers/testDb.js';
import { makeInstitution, makeAuditor, makeBuilding } from '../helpers/factories.js';

beforeEach(resetDb);
afterAll(closeAll);

describe('role restrictions', () => {
  it('auditors cannot manage users or institution settings', async () => {
    const admin = await makeInstitution();
    const aud = await makeAuditor(admin);
    expect((await aud.agent.get('/api/users')).status).toBe(403);
    expect((await aud.agent.post('/api/users').send({ name: 'X', email: 'x@test.example' })).status).toBe(403);
    expect((await aud.agent.patch(`/api/users/${admin.user.id}`).send({ role: 'auditor' })).status).toBe(403);
    expect((await aud.agent.delete(`/api/users/${admin.user.id}`)).status).toBe(403);
    expect((await aud.agent.patch('/api/institution').send({ name: 'Hacked' })).status).toBe(403);
    // but they can read the institution (name/currency/limit are shown in the UI)
    expect((await aud.agent.get('/api/institution')).status).toBe(200);
  });

  it('auditors can work on buildings, records, equipment, findings and recommendations but not delete', async () => {
    const admin = await makeInstitution();
    const aud = await makeAuditor(admin);
    const b = await makeBuilding(aud.agent);
    const base = `/api/buildings/${b.id}`;
    const eq = await aud.agent.post(`${base}/equipment`).send({ category: 'lighting', name: 'LED', ratingW: 10, qty: 5, hoursDay: 8, daysYear: 300 });
    expect(eq.status).toBe(201);
    const f = await aud.agent.post(`${base}/findings`).send({ area: 'lighting', problem: 'Lights on', priority: 'High' });
    expect(f.status).toBe(201);
    const r = await aud.agent.post(`${base}/recommendations`).send({ title: 'Switch off', estimatedCost: 0, estimatedAnnualSaving: 100 });
    expect(r.status).toBe(201);
    const en = await aud.agent.post(`${base}/energy`).send({ month: '2025-01', kwh: 1, cost: 1 });
    expect(en.status).toBe(201);

    expect((await aud.agent.delete(`${base}/equipment/${eq.body.id}`)).status).toBe(403);
    expect((await aud.agent.delete(`${base}/findings/${f.body.id}`)).status).toBe(403);
    expect((await aud.agent.delete(`${base}/recommendations/${r.body.id}`)).status).toBe(403);
    expect((await aud.agent.delete(`${base}/energy/${en.body.id}`)).status).toBe(403);
    expect((await admin.agent.delete(`${base}/equipment/${eq.body.id}`)).status).toBe(204);
  });

  it('admin manages users: update role, protect the last admin, cannot delete self', async () => {
    const admin = await makeInstitution();
    const aud = await makeAuditor(admin);
    const list = await admin.agent.get('/api/users');
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items.every((u) => u.passwordHash === undefined && u.password_hash === undefined)).toBe(true);

    expect((await admin.agent.delete(`/api/users/${admin.user.id}`)).status).toBe(400);
    const demote = await admin.agent.patch(`/api/users/${admin.user.id}`).send({ role: 'auditor' });
    expect(demote.status).toBe(409); // last admin

    const promote = await admin.agent.patch(`/api/users/${aud.user.id}`).send({ role: 'admin' });
    expect(promote.body.role).toBe('admin');
    expect((await admin.agent.patch(`/api/users/${admin.user.id}`).send({ role: 'auditor' })).status).toBe(200);

    const reset = await aud.agent.patch(`/api/users/${admin.user.id}`).send({ temporaryPassword: 'TempPass123' });
    expect(reset.status).toBe(403); // aud's token still says "auditor" until next login; new role needs a new session
  });

  it('duplicate user e-mail is rejected', async () => {
    const admin = await makeInstitution();
    const res = await admin.agent.post('/api/users').send({ name: 'Dup', email: admin.body.email });
    expect(res.status).toBe(409);
  });
});
