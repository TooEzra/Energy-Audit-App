export const map = (r) => r && ({
  id: r._id, name: r.name, category: r.category, typicalSavingPct: r.typicalSavingPct,
  typicalCost: r.typicalCost, description: r.description ?? null, isSystem: r.institutionId === null,
});

// The tenant handle returns system presets (institutionId null) plus the caller's own measures; presets come first.
export async function list(db) {
  const rows = (await db.find('measures_library', {})).map(map);
  return rows.sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name));
}
export async function getById(db, id) {
  return map(await db.findOne('measures_library', { _id: id }));
}
export async function create(db, m) {
  return map(await db.insert('measures_library', {
    name: m.name, category: m.category, typicalSavingPct: m.typicalSavingPct, typicalCost: m.typicalCost, description: m.description || null,
  }));
}
