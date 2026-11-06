import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { resetDb, closeAll } from '../helpers/testDb.js';
import { makeInstitution, makeAuditor, PASSWORD } from '../helpers/factories.js';

beforeEach(resetDb);
afterAll(closeAll);

describe('auth', () => {
  it('registers an institution with its first admin and sets an httpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/register-institution')
      .send({ institutionName: 'Acme College', adminName: 'Ann', email: 'Ann@Acme.test', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'admin', email: 'ann@acme.test', mustChangePassword: false });
    expect(res.body.institution).toMatchObject({ name: 'Acme College', currency: 'KES' });
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('validates sign-up input (password >= 8 chars, e-mail format)', async () => {
    const res = await request(app).post('/api/auth/register-institution')
      .send({ institutionName: 'X College', adminName: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(res.body.details.password).toMatch(/at least 8/);
    expect(res.body.details.email).toBeTruthy();
  });

  it('rejects duplicate institution names and duplicate e-mails with 409', async () => {
    const a = await makeInstitution();
    const dupName = await request(app).post('/api/auth/register-institution')
      .send({ institutionName: a.body.institutionName, adminName: 'B', email: 'other@test.example', password: PASSWORD });
    expect(dupName.status).toBe(409);
    const dupEmail = await request(app).post('/api/auth/register-institution')
      .send({ institutionName: 'Another One', adminName: 'B', email: a.body.email, password: PASSWORD });
    expect(dupEmail.status).toBe(409);
  });

  it('logs in, rejects bad credentials, and logs out', async () => {
    const a = await makeInstitution();
    const bad = await request(app).post('/api/auth/login').send({ email: a.body.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@test.example', password: PASSWORD });
    expect(unknown.status).toBe(401);

    const agent = request.agent(app);
    const ok = await agent.post('/api/auth/login').send({ email: a.body.email, password: PASSWORD });
    expect(ok.status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user.email).toBe(a.body.email);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('blocks every protected route without a session', async () => {
    for (const [method, url] of [['get', '/api/buildings'], ['get', '/api/institution'], ['get', '/api/users'], ['get', '/api/measures'],
      ['get', '/api/analysis/compare'], ['get', '/api/export'], ['get', '/api/buildings/1/energy'], ['get', '/api/buildings/1/report']]) {
      const res = await request(app)[method](url);
      expect(res.status, `${method} ${url}`).toBe(401);
      expect(res.body).toHaveProperty('error');
    }
  });

  it('forces a temporary password to be changed before anything else works', async () => {
    const admin = await makeInstitution();
    const created = await admin.agent.post('/api/users').send({ name: 'Aud', email: 'aud@test.example', role: 'auditor' });
    expect(created.status).toBe(201);
    expect(created.body.mustChangePassword).toBe(true);
    expect(created.body.temporaryPassword).toBeTruthy();
    expect(created.body.passwordHash).toBeUndefined();

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'aud@test.example', password: created.body.temporaryPassword });
    const blocked = await agent.get('/api/buildings');
    expect(blocked.status).toBe(403);
    expect(blocked.body.details.code).toBe('MUST_CHANGE_PASSWORD');

    const wrong = await agent.post('/api/auth/change-password').send({ currentPassword: 'nope-nope', newPassword: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    const short = await agent.post('/api/auth/change-password').send({ currentPassword: created.body.temporaryPassword, newPassword: 'short' });
    expect(short.status).toBe(400);
    const ok = await agent.post('/api/auth/change-password').send({ currentPassword: created.body.temporaryPassword, newPassword: 'brand-new-pass' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.mustChangePassword).toBe(false);
    expect((await agent.get('/api/buildings')).status).toBe(200);

    // old temporary password no longer works, new one does
    expect((await request(app).post('/api/auth/login').send({ email: 'aud@test.example', password: created.body.temporaryPassword })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'aud@test.example', password: 'brand-new-pass' })).status).toBe(200);
  });

  it('auditor helper works end to end', async () => {
    const admin = await makeInstitution();
    const aud = await makeAuditor(admin);
    expect((await aud.agent.get('/api/buildings')).status).toBe(200);
  });
});
