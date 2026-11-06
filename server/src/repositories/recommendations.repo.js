export const map = (r) => r && ({
  id: r.id, buildingId: r.building_id, findingId: r.finding_id, measureId: r.measure_id, title: r.title,
  estimatedCost: r.estimated_cost, estimatedAnnualSaving: r.estimated_annual_saving, status: r.status,
  isEstimate: r.is_estimate, createdAt: r.created_at,
});

export async function listForBuilding(db, buildingId) {
  const { rows } = await db.query('SELECT * FROM recommendations WHERE building_id = $1 ORDER BY created_at DESC, id DESC', [buildingId]);
  return rows.map(map);
}
export async function listAll(db) {
  const { rows } = await db.query('SELECT * FROM recommendations ORDER BY building_id, id');
  return rows.map(map);
}
export async function getById(db, buildingId, id) {
  const { rows } = await db.query('SELECT * FROM recommendations WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return map(rows[0]);
}
export async function create(db, buildingId, r) {
  const { rows } = await db.query(
    `INSERT INTO recommendations (institution_id, building_id, finding_id, measure_id, title, estimated_cost, estimated_annual_saving, status)
     VALUES (app_institution_id(), $1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [buildingId, r.findingId ?? null, r.measureId ?? null, r.title, r.estimatedCost, r.estimatedAnnualSaving, r.status]);
  return map(rows[0]);
}
export async function update(db, buildingId, id, r) {
  const { rows } = await db.query(
    `UPDATE recommendations SET title = COALESCE($3, title), estimated_cost = COALESCE($4, estimated_cost),
       estimated_annual_saving = COALESCE($5, estimated_annual_saving), status = COALESCE($6, status),
       finding_id = CASE WHEN $7::boolean THEN $8 ELSE finding_id END
     WHERE building_id = $1 AND id = $2 RETURNING *`,
    [buildingId, id, r.title ?? null, r.estimatedCost ?? null, r.estimatedAnnualSaving ?? null, r.status ?? null,
      r.findingId !== undefined, r.findingId ?? null]);
  return map(rows[0]);
}
export async function remove(db, buildingId, id) {
  const { rowCount } = await db.query('DELETE FROM recommendations WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return rowCount > 0;
}
