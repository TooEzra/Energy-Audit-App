import crypto from 'node:crypto';
import * as usersRepo from '../repositories/users.repo.js';
import * as institutionsRepo from '../repositories/institutions.repo.js';
import * as buildingsRepo from '../repositories/buildings.repo.js';
import { hashPassword } from './auth.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

const generateTempPassword = () => crypto.randomBytes(9).toString('base64url'); // 12 URL-safe chars

export const list = (db) => usersRepo.list(db).then((items) => ({ items }));

export async function create(db, data) {
  const temporaryPassword = data.temporaryPassword || generateTempPassword();
  const user = await usersRepo.create(db, {
    name: data.name, email: data.email, role: data.role,
    passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true,
  });
  return { ...user, temporaryPassword }; // shown once; the user must change it at first login
}

export async function update(db, actor, id, data) {
  const target = await usersRepo.getById(db, id);
  if (!target) throw new NotFoundError('User not found');
  if (data.role && data.role !== target.role && target.role === 'admin' && (await usersRepo.countAdmins(db)) <= 1) {
    throw new ConflictError('The institution needs at least one admin', { role: 'Cannot demote the last admin' });
  }
  const passwordHash = data.temporaryPassword ? await hashPassword(data.temporaryPassword) : undefined;
  const user = await usersRepo.update(db, id, {
    name: data.name, role: data.role, passwordHash, mustChangePassword: data.temporaryPassword ? true : undefined,
  });
  return user;
}

export async function remove(db, actor, id) {
  const target = await usersRepo.getById(db, id);
  if (!target) throw new NotFoundError('User not found');
  if (target.id === actor.id) throw new ValidationError('You cannot delete your own account');
  if (target.role === 'admin' && (await usersRepo.countAdmins(db)) <= 1) throw new ConflictError('The institution needs at least one admin');
  await usersRepo.remove(db, id);
}

export const getInstitution = (db) => institutionsRepo.getOwn(db);
export async function updateInstitution(db, data) {
  if (data.maxBuildings !== undefined) {
    // Lower the limit only if it is not below the buildings that already exist.
    const n = await buildingsRepo.count(db);
    if (data.maxBuildings < n) throw new ValidationError(`The institution already has ${n} buildings`, { maxBuildings: `Cannot be lower than the current number of buildings (${n})` });
  }
  return institutionsRepo.updateOwn(db, data);
}
