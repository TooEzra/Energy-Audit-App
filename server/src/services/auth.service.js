import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import * as institutionsRepo from '../repositories/institutions.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors.js';

const ROUNDS = 10;
// A real bcrypt hash of a random string: compared against when the e-mail is unknown so response time doesn't leak it.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.2c9m2a7i3yZ8Qv0zYQ2sT1Z8uQ6W';

export const hashPassword = (pw) => bcrypt.hash(pw, ROUNDS);

/** Sign-up: creates the institution and its first admin in ONE transaction (inside the SECURITY DEFINER function). */
export async function registerInstitution(data) {
  const passwordHash = await hashPassword(data.password);
  const { institutionId, userId } = await institutionsRepo.register(pool, { ...data, passwordHash });
  return {
    user: { id: userId, institutionId, name: data.adminName, email: data.email, role: 'admin', mustChangePassword: false },
    institution: { id: institutionId, name: data.institutionName, currency: data.currency, maxBuildings: 5 },
  };
}

export async function login(email, password) {
  const found = await usersRepo.authLookup(pool, email);
  const ok = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !ok) throw new UnauthorizedError('Invalid e-mail or password');
  return { user: found.user, institution: found.institution };
}

/** Current session profile, read through the tenant-scoped client. */
export async function me(db, userId) {
  const user = await usersRepo.getById(db, userId);
  if (!user) throw new UnauthorizedError('Account no longer exists');
  const institution = await institutionsRepo.getOwn(db);
  return { user, institution };
}

export async function changePassword(db, userId, currentPassword, newPassword) {
  const hash = await usersRepo.getHash(db, userId);
  if (!hash) throw new NotFoundError('User not found');
  if (!(await bcrypt.compare(currentPassword, hash))) throw new ValidationError('Current password is incorrect', { currentPassword: 'Current password is incorrect' });
  if (currentPassword === newPassword) throw new ValidationError('New password must be different', { newPassword: 'Choose a different password' });
  return usersRepo.update(db, userId, { passwordHash: await hashPassword(newPassword), mustChangePassword: false });
}
