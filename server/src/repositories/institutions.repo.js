// ONLY place with SQL for institutions. `db` is always the tenant-scoped client (RLS applies).
const map = (r) => r && ({ id: r.id, name: r.name, currency: r.currency, maxBuildings: r.max_buildings, createdAt: r.created_at });

export async function getOwn(db, { lock = false } = {}) {
  const { rows } = await db.query(`SELECT * FROM institutions WHERE id = app_institution_id() ${lock ? 'FOR UPDATE' : ''}`);
  return map(rows[0]);
}

export async function updateOwn(db, { name, currency, maxBuildings }) {
  const { rows } = await db.query(
    `UPDATE institutions SET name = COALESCE($1, name), currency = COALESCE($2, currency),
       max_buildings = COALESCE($3, max_buildings) WHERE id = app_institution_id() RETURNING *`,
    [name ?? null, currency ?? null, maxBuildings ?? null]);
  return map(rows[0]);
}

/** Sign-up runs before a tenant exists: uses the SECURITY DEFINER function (needs the plain pool client). */
export async function register(client, { institutionName, currency, adminName, email, passwordHash }) {
  const { rows } = await client.query('SELECT * FROM register_institution($1,$2,$3,$4,$5)',
    [institutionName, currency, adminName, email, passwordHash]);
  return { institutionId: rows[0].institution_id, userId: rows[0].user_id };
}
