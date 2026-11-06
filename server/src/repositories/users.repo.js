const map = (r) => r && ({
  id: r.id, name: r.name, email: r.email, role: r.role,
  mustChangePassword: r.must_change_password, createdAt: r.created_at,
});

/** Login lookup before a tenant is known: SECURITY DEFINER function, not a table read. */
export async function authLookup(client, email) {
  const { rows } = await client.query('SELECT * FROM auth_lookup($1)', [email]);
  const r = rows[0];
  return r && {
    user: { id: r.user_id, institutionId: r.institution_id, name: r.name, email: r.email, role: r.role, mustChangePassword: r.must_change_password },
    passwordHash: r.password_hash,
    institution: { id: r.institution_id, name: r.institution_name, currency: r.currency, maxBuildings: r.max_buildings },
  };
}

export async function list(db) {
  const { rows } = await db.query('SELECT * FROM users ORDER BY created_at, id');
  return rows.map(map);
}
export async function getById(db, id) {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return map(rows[0]);
}
export async function getHash(db, id) {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0]?.password_hash;
}
export async function create(db, { name, email, passwordHash, role, mustChangePassword }) {
  const { rows } = await db.query(
    `INSERT INTO users (institution_id, name, email, password_hash, role, must_change_password)
     VALUES (app_institution_id(), $1, lower($2), $3, $4, $5) RETURNING *`,
    [name, email, passwordHash, role, mustChangePassword]);
  return map(rows[0]);
}
export async function update(db, id, { name, role, passwordHash, mustChangePassword }) {
  const { rows } = await db.query(
    `UPDATE users SET name = COALESCE($2, name), role = COALESCE($3, role),
       password_hash = COALESCE($4, password_hash), must_change_password = COALESCE($5, must_change_password)
     WHERE id = $1 RETURNING *`,
    [id, name ?? null, role ?? null, passwordHash ?? null, mustChangePassword ?? null]);
  return map(rows[0]);
}
export async function remove(db, id) {
  const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}
export async function countAdmins(db) {
  const { rows } = await db.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin'");
  return rows[0].n;
}
