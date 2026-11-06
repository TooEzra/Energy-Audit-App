export const map = (r) => r && ({
  id: r.id, buildingId: r.building_id, category: r.category, name: r.name, location: r.location,
  ratingW: r.rating_w, qty: r.qty, hoursDay: r.hours_day, daysYear: r.days_year, condition: r.condition,
});

export async function listForBuilding(db, buildingId) {
  const { rows } = await db.query('SELECT * FROM equipment WHERE building_id = $1 ORDER BY category, name, id', [buildingId]);
  return rows.map(map);
}
export async function listAll(db) {
  const { rows } = await db.query('SELECT * FROM equipment ORDER BY building_id, id');
  return rows.map(map);
}
export async function getById(db, buildingId, id) {
  const { rows } = await db.query('SELECT * FROM equipment WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return map(rows[0]);
}
export async function create(db, buildingId, e) {
  const { rows } = await db.query(
    `INSERT INTO equipment (institution_id, building_id, category, name, location, rating_w, qty, hours_day, days_year, condition)
     VALUES (app_institution_id(), $1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [buildingId, e.category, e.name, e.location || null, e.ratingW, e.qty, e.hoursDay, e.daysYear, e.condition || null]);
  return map(rows[0]);
}
export async function update(db, buildingId, id, e) {
  // location/condition may be cleared with '' or null, so they are handled with a "was provided" flag.
  const { rows } = await db.query(
    `UPDATE equipment SET category = COALESCE($3, category), name = COALESCE($4, name),
       location = CASE WHEN $5::boolean THEN $6 ELSE location END,
       rating_w = COALESCE($7, rating_w), qty = COALESCE($8, qty), hours_day = COALESCE($9, hours_day),
       days_year = COALESCE($10, days_year),
       condition = CASE WHEN $11::boolean THEN $12 ELSE condition END
     WHERE building_id = $1 AND id = $2 RETURNING *`,
    [buildingId, id, e.category ?? null, e.name ?? null, e.location !== undefined, e.location || null,
      e.ratingW ?? null, e.qty ?? null, e.hoursDay ?? null, e.daysYear ?? null, e.condition !== undefined, e.condition || null]);
  return map(rows[0]);
}
export async function remove(db, buildingId, id) {
  const { rowCount } = await db.query('DELETE FROM equipment WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return rowCount > 0;
}
