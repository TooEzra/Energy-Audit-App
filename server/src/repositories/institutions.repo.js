// `db` is always the tenant-scoped handle: it can only ever see the caller's own institution document.
import { getDb, nextId } from '../db/mongo.js';
import { definedOnly } from '../db/tenantDb.js';

const map = (r) => r && ({ id: r._id, name: r.name, currency: r.currency, maxBuildings: r.maxBuildings, createdAt: r.createdAt });

export async function getOwn(db) {
  return map(await db.findOne('institutions', {}));
}

export async function updateOwn(db, { name, currency, maxBuildings }) {
  const set = definedOnly({ name, currency, maxBuildings });
  if (!Object.keys(set).length) return getOwn(db);
  return map(await db.updateOne('institutions', {}, set));
}

/**
 * Sign-up runs before a tenant exists, so it uses the raw database. Two inserts, no transaction: if the admin user
 * cannot be created (e.g. duplicate e-mail) the institution is removed again, so nothing half-created is left behind.
 */
export async function register({ institutionName, currency, adminName, email, passwordHash }) {
  const d = getDb();
  const institutionId = await nextId('institutions');
  await d.collection('institutions').insertOne({
    _id: institutionId, name: institutionName.trim(), currency: currency.toUpperCase(), maxBuildings: 100, createdAt: new Date(),
  });
  try {
    const userId = await nextId('users');
    await d.collection('users').insertOne({
      _id: userId, institutionId, name: adminName.trim(), email: email.trim().toLowerCase(), passwordHash,
      role: 'admin', mustChangePassword: false, createdAt: new Date(),
    });
    return { institutionId, userId };
  } catch (err) {
    await d.collection('institutions').deleteOne({ _id: institutionId }).catch(() => {});
    throw err;
  }
}
