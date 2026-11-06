export const map = (r) => r && ({ id: r.id, buildingId: r.building_id, month: String(r.month).slice(0, 7), kwh: r.kwh, cost: r.cost });

export async function listForBuilding(db, buildingId) {
  const { rows } = await db.query('SELECT * FROM energy_records WHERE building_id = $1 ORDER BY month', [buildingId]);
  return rows.map(map);
}
export async function listAll(db) {
  const { rows } = await db.query('SELECT * FROM energy_records ORDER BY building_id, month');
  return rows.map(map);
}
export async function getById(db, buildingId, id) {
  const { rows } = await db.query('SELECT * FROM energy_records WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return map(rows[0]);
}
export async function existingMonths(db, buildingId) {
  const { rows } = await db.query('SELECT month FROM energy_records WHERE building_id = $1', [buildingId]);
  return new Set(rows.map((r) => String(r.month).slice(0, 7)));
}
export async function create(db, buildingId, { month, kwh, cost }) {
  const { rows } = await db.query(
    `INSERT INTO energy_records (institution_id, building_id, month, kwh, cost)
     VALUES (app_institution_id(), $1, $2, $3, $4) RETURNING *`,
    [buildingId, `${month}-01`, kwh, cost]);
  return map(rows[0]);
}
export async function update(db, buildingId, id, { month, kwh, cost }) {
  const { rows } = await db.query(
    `UPDATE energy_records SET month = COALESCE($3, month), kwh = COALESCE($4, kwh), cost = COALESCE($5, cost)
     WHERE building_id = $1 AND id = $2 RETURNING *`,
    [buildingId, id, month ? `${month}-01` : null, kwh ?? null, cost ?? null]);
  return map(rows[0]);
}
export async function remove(db, buildingId, id) {
  const { rowCount } = await db.query('DELETE FROM energy_records WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return rowCount > 0;
}
