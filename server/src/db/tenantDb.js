import { getDb, nextId } from './mongo.js';

/**
 * Tenant-scoped database handle (what the old "RLS client" was). Every repository receives one as `db`.
 *
 *  - The institution id is fixed when the handle is created (from the JWT, in tenantContext) and is merged into
 *    EVERY filter LAST, so a caller-supplied `institutionId` can never override it.
 *  - Inserts always stamp `institutionId` onto the document.
 *  - `measures_library` is the one shared collection: reads also see the system presets (institutionId null);
 *    writes stay strictly scoped, so a tenant can never edit or delete a preset.
 *  - `institutions` has no institutionId field; its scope is `_id = institutionId`.
 *
 * MongoDB has no row-level security, so this facade (and the rule "only repositories touch the database") is
 * the isolation boundary. tests/isolation verifies it.
 */
export function tenantDb(institutionId) {
  if (!Number.isInteger(institutionId)) throw new Error('tenantDb needs a numeric institution id');
  const col = (name) => getDb().collection(name);

  const scope = (name, filter = {}) =>
    name === 'institutions' ? { ...filter, _id: institutionId } : { ...filter, institutionId };
  const readScope = (name, filter = {}) =>
    name === 'measures_library' ? { ...filter, institutionId: { $in: [institutionId, null] } } : scope(name, filter);

  return {
    institutionId,
    find: (name, filter, options) => col(name).find(readScope(name, filter), options).toArray(),
    findOne: (name, filter, options) => col(name).findOne(readScope(name, filter), options),
    count: (name, filter) => col(name).countDocuments(scope(name, filter)),
    async insert(name, doc) {
      const _id = await nextId(name);
      const full = { _id, ...doc, institutionId };
      await col(name).insertOne(full);
      return full;
    },
    /** $set the given fields and $unset nothing; returns the updated document or null (not found in this tenant). */
    updateOne: (name, filter, set) =>
      col(name).findOneAndUpdate(scope(name, filter), { $set: set }, { returnDocument: 'after' }),
    updateMany: (name, filter, set) => col(name).updateMany(scope(name, filter), { $set: set }),
    async deleteOne(name, filter) { return (await col(name).deleteOne(scope(name, filter))).deletedCount > 0; },
    async deleteMany(name, filter) { return (await col(name).deleteMany(scope(name, filter))).deletedCount; },
  };
}

/** Drop undefined/null keys: the MongoDB equivalent of SQL `COALESCE($n, column)` for partial updates. */
export const definedOnly = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
