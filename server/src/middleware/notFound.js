import { NotFoundError } from '../utils/errors.js';
export const notFound = (req, res, next) => next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
