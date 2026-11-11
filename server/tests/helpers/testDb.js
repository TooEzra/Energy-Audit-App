import { env } from '../../src/config/env.js';
import { connect, getDb, closeMongo, ensureIndexes, nextId } from '../../src/db/mongo.js';

if (!/_test$/.test(env.mongoDb)) throw new Error('Tests must use a database whose name ends in _test');

/** Empty every collection (and the id counters) of the TEST database, keeping the indexes. */
export async function resetDb() {
  const db = await connect();
  await ensureIndexes();
  for (const c of await db.collections()) await c.deleteMany({});
}

/** Insert a system measure preset (institutionId null), bypassing the tenant facade. */
export async function addSystemMeasure(over = {}) {
  await connect();
  const m = { name: 'LED retrofit', category: 'lighting', pct: 50, cost: 100000, ...over };
  const _id = await nextId('measures_library');
  await getDb().collection('measures_library').insertOne({
    _id, institutionId: null, name: m.name, category: m.category, typicalSavingPct: m.pct, typicalCost: m.cost, description: null,
  });
  return _id;
}

export { getDb };
export const closeAll = closeMongo;
