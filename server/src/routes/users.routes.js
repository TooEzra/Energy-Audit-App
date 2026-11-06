import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, idParam } from '../middleware/validate.js';
import { adminGuard } from '../middleware/tenantContext.js';
import { createUserSchema, updateUserSchema } from '../validators/user.schema.js';
import { NotFoundError } from '../utils/errors.js';
import * as users from '../services/users.service.js';

const router = Router();
const id = (req) => idParam(req.params.id) ?? (() => { throw new NotFoundError('User not found'); })();

router.get('/', ...adminGuard, asyncHandler(async (req, res) => res.json(await users.list(req.db))));
router.post('/', ...adminGuard, validate(createUserSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await users.create(req.db, req.valid.body));
}));
router.patch('/:id', ...adminGuard, validate(updateUserSchema), asyncHandler(async (req, res) => {
  res.json(await users.update(req.db, req.user, id(req), req.valid.body));
}));
router.delete('/:id', ...adminGuard, asyncHandler(async (req, res) => {
  await users.remove(req.db, req.user, id(req));
  res.status(204).end();
}));
export default router;
