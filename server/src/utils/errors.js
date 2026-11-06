export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export class ValidationError extends AppError { constructor(message = 'Validation failed', details) { super(400, message, details); } }
export class UnauthorizedError extends AppError { constructor(message = 'Authentication required', details) { super(401, message, details); } }
export class ForbiddenError extends AppError { constructor(message = 'You do not have permission to do this', details) { super(403, message, details); } }
export class NotFoundError extends AppError { constructor(message = 'Not found', details) { super(404, message, details); } }
export class ConflictError extends AppError { constructor(message = 'Conflict', details) { super(409, message, details); } }
