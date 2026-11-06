import { ValidationError } from '../utils/errors.js';

/** Parse req[source] with a Zod schema; the parsed value is stored on req.valid[source]. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!details[key]) details[key] = issue.message;
    }
    return next(new ValidationError('Validation failed', details));
  }
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  next();
};

/** Route param ids: non-numeric ids behave like "does not exist". */
export function idParam(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
