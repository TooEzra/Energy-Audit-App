import { getDb } from '../db/mongo.js';
import { definedOnly } from '../db/tenantDb.js';

const map = (r) => r && ({
  id: r._id, name: r.name, email: r.email, role: r.role, mustChangePassword: r.mustChangePassword, createdAt: r.createdAt,
});

/** Login lookup BEFORE a tenant is known: the only read that spans institutions, by (unique) e-mail. */
export async function authLookup(email) {
  const d = getDb();
  const u = await d.collection('users').findOne({ email: String(email).trim().toLowerCase() });
  if (!u) return null;
  const i = await d.collection('institutions').findOne({ _id: u.institutionId });
  if (!i) return null;
  return {
    user: { id: u._id, institutionId: u.institutionId, name: u.name, email: u.email, role: u.role, mustChangePassword: u.mustChangePassword },
    passwordHash: u.passwordHash,
    institution: { id: i._id, name: i.name, currency: i.currency, maxBuildings: i.maxBuildings },
  };
}

export async function list(db) {
  return (await db.find('users', {}, { sort: { createdAt: 1, _id: 1 } })).map(map);
}
export async function getById(db, id) {
  return map(await db.findOne('users', { _id: id }));
}
export async function getHash(db, id) {
  return (await db.findOne('users', { _id: id }, { projection: { passwordHash: 1 } }))?.passwordHash;
}
export async function create(db, { name, email, passwordHash, role, mustChangePassword }) {
  return map(await db.insert('users', {
    name, email: email.trim().toLowerCase(), passwordHash, role, mustChangePassword: !!mustChangePassword, createdAt: new Date(),
  }));
}
export async function update(db, id, { name, role, passwordHash, mustChangePassword }) {
  const set = definedOnly({ name, role, passwordHash, mustChangePassword });
  if (!Object.keys(set).length) return getById(db, id);
  return map(await db.updateOne('users', { _id: id }, set));
}
export const remove = (db, id) => db.deleteOne('users', { _id: id });
export const countAdmins = (db) => db.count('users', { role: 'admin' });
