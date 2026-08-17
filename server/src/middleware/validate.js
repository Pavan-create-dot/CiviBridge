// Middleware: validate
// Validates a request payload against a Zod schema before the controller runs.

/**
 * Express middleware factory that validates a request property against a Zod schema.
 * On failure: responds 400 with a structured errors array.
 * On success: replaces the request property with the parsed data and calls next().
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [property]
 * @returns {Function} Express middleware
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed.', errors });
    }
    req[property] = result.data;
    next();
  };
}

module.exports = validate;
