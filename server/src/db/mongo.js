// MongoDB connection (one shared client for the whole process) + index setup + numeric id counters.
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

let client = null;
let db = null;
let connecting = null;

/** Connect once (idempotent). Safe to call from server start-up and from tests. */
export function connect() {
  if (db) return Promise.resolve(db);
  if (!connecting) {
    connecting = (async () => {
      const c = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      await c.connect();
      client = c;
      db = c.db(env.mongoDb);
      return db;
    })().catch((err) => { connecting = null; throw err; });
  }
  return connecting;
}

/** The connected database. Repositories and the tenant facade use this; connect() must have run first. */
export function getDb() {
  if (!db) throw new Error('MongoDB is not connected yet (connect() must run before the first query)');
  return db;
}

export async function closeMongo() {
  const c = client;
  client = null; db = null; connecting = null;
  if (c) await c.close();
}

/** Next auto-increment number for a collection (keeps the numeric ids the client already uses). */
export async function nextId(name) {
  const doc = await getDb().collection('counters').findOneAndUpdate(
    { _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return doc.seq;
}

/**
 * Unique indexes replace the old SQL UNIQUE constraints; the other indexes keep tenant-scoped queries fast.
 * Idempotent: createIndex is a no-op when the index already exists.
 */
export async function ensureIndexes() {
  const d = getDb();
  await Promise.all([
    d.collection('institutions').createIndex({ name: 1 }, { unique: true, name: 'institutions_name_key' }),
    d.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
    d.collection('users').createIndex({ institutionId: 1 }, { name: 'users_institution_idx' }),
    d.collection('buildings').createIndex({ institutionId: 1, name: 1 }, { unique: true, name: 'buildings_inst_name_key' }),
    d.collection('energy_records').createIndex({ buildingId: 1, month: 1 }, { unique: true, name: 'energy_building_month_key' }),
    d.collection('energy_records').createIndex({ institutionId: 1, buildingId: 1 }, { name: 'energy_inst_idx' }),
    d.collection('equipment').createIndex({ institutionId: 1, buildingId: 1 }, { name: 'equipment_inst_idx' }),
    d.collection('findings').createIndex({ institutionId: 1, buildingId: 1 }, { name: 'findings_inst_idx' }),
    d.collection('recommendations').createIndex({ institutionId: 1, buildingId: 1 }, { name: 'rec_inst_idx' }),
    d.collection('measures_library').createIndex({ institutionId: 1 }, { name: 'measures_inst_idx' }),
  ]);
}
