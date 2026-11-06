export const map = (r) => r && ({
  id: r.id, buildingId: r.building_id, area: r.area, problem: r.problem, locationSystem: r.location_system,
  suggestedImprovement: r.suggested_improvement, priority: r.priority, hasPhoto: !!r.photo_path, createdAt: r.created_at,
});

export async function listForBuilding(db, buildingId, area) {
  const { rows } = await db.query(
    `SELECT * FROM findings WHERE building_id = $1 AND ($2::text IS NULL OR area = $2) ORDER BY created_at DESC, id DESC`,
    [buildingId, area ?? null]);
  return rows.map(map);
}
export async function listAll(db) {
  const { rows } = await db.query('SELECT * FROM findings ORDER BY building_id, id');
  return rows.map(map);
}
export async function getById(db, buildingId, id) {
  const { rows } = await db.query('SELECT * FROM findings WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return map(rows[0]);
}
/** Internal: the stored relative photo path (never sent to the client). */
export async function getPhotoPath(db, buildingId, id) {
  const { rows } = await db.query('SELECT photo_path FROM findings WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return rows[0]?.photo_path ?? null;
}
export async function photoPathsForBuilding(db, buildingId) {
  const { rows } = await db.query('SELECT photo_path FROM findings WHERE building_id = $1 AND photo_path IS NOT NULL', [buildingId]);
  return rows.map((r) => r.photo_path);
}
export async function create(db, buildingId, f, photoPath) {
  const { rows } = await db.query(
    `INSERT INTO findings (institution_id, building_id, area, problem, location_system, suggested_improvement, priority, photo_path)
     VALUES (app_institution_id(), $1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [buildingId, f.area, f.problem, f.locationSystem || null, f.suggestedImprovement || null, f.priority, photoPath ?? null]);
  return map(rows[0]);
}
/** photoPath: undefined = keep, null = remove, string = replace. */
export async function update(db, buildingId, id, f, photoPath) {
  const { rows } = await db.query(
    `UPDATE findings SET area = COALESCE($3, area), problem = COALESCE($4, problem),
       location_system = CASE WHEN $5::boolean THEN $6 ELSE location_system END,
       suggested_improvement = CASE WHEN $7::boolean THEN $8 ELSE suggested_improvement END,
       priority = COALESCE($9, priority),
       photo_path = CASE WHEN $10::boolean THEN $11 ELSE photo_path END
     WHERE building_id = $1 AND id = $2 RETURNING *`,
    [buildingId, id, f.area ?? null, f.problem ?? null,
      f.locationSystem !== undefined, f.locationSystem || null,
      f.suggestedImprovement !== undefined, f.suggestedImprovement || null,
      f.priority ?? null, photoPath !== undefined, photoPath ?? null]);
  return map(rows[0]);
}
export async function remove(db, buildingId, id) {
  const { rowCount } = await db.query('DELETE FROM findings WHERE building_id = $1 AND id = $2', [buildingId, id]);
  return rowCount > 0;
}
