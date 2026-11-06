export const map = (r) => r && ({
  id: r.id, name: r.name, category: r.category, typicalSavingPct: r.typical_saving_pct,
  typicalCost: r.typical_cost, description: r.description, isSystem: r.institution_id === null,
});

// RLS lets the tenant read system presets (institution_id IS NULL) plus its own measures.
export async function list(db) {
  const { rows } = await db.query('SELECT * FROM measures_library ORDER BY (institution_id IS NULL) DESC, name');
  return rows.map(map);
}
export async function getById(db, id) {
  const { rows } = await db.query('SELECT * FROM measures_library WHERE id = $1', [id]);
  return map(rows[0]);
}
export async function create(db, m) {
  const { rows } = await db.query(
    `INSERT INTO measures_library (institution_id, name, category, typical_saving_pct, typical_cost, description)
     VALUES (app_institution_id(), $1,$2,$3,$4,$5) RETURNING *`,
    [m.name, m.category, m.typicalSavingPct, m.typicalCost, m.description || null]);
  return map(rows[0]);
}
