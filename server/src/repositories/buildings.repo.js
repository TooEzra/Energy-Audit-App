export const map = (r) => r && ({ id: r.id, name: r.name, type: r.type, floorAreaM2: r.floor_area_m2, operatingHours: r.operating_hours });

export async function list(db) {
  const { rows } = await db.query('SELECT * FROM buildings ORDER BY name');
  return rows.map(map);
}
export async function getById(db, id) {
  const { rows } = await db.query('SELECT * FROM buildings WHERE id = $1', [id]);
  return map(rows[0]);
}
export async function count(db) {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM buildings');
  return rows[0].n;
}
export async function create(db, { name, type, floorAreaM2, operatingHours }) {
  const { rows } = await db.query(
    `INSERT INTO buildings (institution_id, name, type, floor_area_m2, operating_hours)
     VALUES (app_institution_id(), $1, $2, $3, $4) RETURNING *`,
    [name, type, floorAreaM2, operatingHours]);
  return map(rows[0]);
}
export async function update(db, id, { name, type, floorAreaM2, operatingHours }) {
  const { rows } = await db.query(
    `UPDATE buildings SET name = COALESCE($2, name), type = COALESCE($3, type),
       floor_area_m2 = COALESCE($4, floor_area_m2), operating_hours = COALESCE($5, operating_hours)
     WHERE id = $1 RETURNING *`,
    [id, name ?? null, type ?? null, floorAreaM2 ?? null, operatingHours ?? null]);
  return map(rows[0]);
}
export async function remove(db, id) {
  const { rowCount } = await db.query('DELETE FROM buildings WHERE id = $1', [id]);
  return rowCount > 0;
}
