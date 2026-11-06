import request from 'supertest';
import app from '../../src/app.js';

let n = 0;
export const PASSWORD = 'password123';

/** Register a new institution; returns an agent that is logged in as its admin (cookie kept). */
export async function makeInstitution(over = {}) {
  n += 1;
  const body = {
    institutionName: `Test Institution ${n}`, currency: 'KES', adminName: `Admin ${n}`,
    email: `admin${n}@test.example`, password: PASSWORD, ...over,
  };
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register-institution').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, body, user: res.body.user, institution: res.body.institution };
}

/** Admin creates an auditor; the auditor logs in and changes the temporary password. Returns the auditor's agent. */
export async function makeAuditor(admin) {
  n += 1;
  const email = `auditor${n}@test.example`;
  const created = await admin.agent.post('/api/users').send({ name: `Auditor ${n}`, email, role: 'auditor' });
  if (created.status !== 201) throw new Error(`create auditor failed: ${JSON.stringify(created.body)}`);
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email, password: created.body.temporaryPassword });
  if (login.status !== 200) throw new Error('auditor login failed');
  const change = await agent.post('/api/auth/change-password').send({ currentPassword: created.body.temporaryPassword, newPassword: PASSWORD });
  if (change.status !== 200) throw new Error(`change password failed: ${JSON.stringify(change.body)}`);
  return { agent, email, user: created.body };
}

export async function makeBuilding(agent, over = {}) {
  n += 1;
  const res = await agent.post('/api/buildings').send({ name: `Block ${n}`, type: 'Education', floorAreaM2: 1000, operatingHours: 10, ...over });
  if (res.status !== 201) throw new Error(`building failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export const months2025 = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`);

/** Add 12 months (2025-01..2025-12) of data; `values` can override the kWh for each month. */
export async function addYear(agent, buildingId, { kwh = 1000, cost = 150, values } = {}) {
  for (let i = 0; i < 12; i++) {
    const res = await agent.post(`/api/buildings/${buildingId}/energy`).send({ month: months2025[i], kwh: values ? values[i] : kwh, cost });
    if (res.status !== 201) throw new Error(`energy failed: ${JSON.stringify(res.body)}`);
  }
}
