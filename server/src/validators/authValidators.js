// Input validators for auth routes using Zod
// Zod provides schema-based validation with clear, composable error messages.

const { z } = require('zod');

// Schema for POST /auth/register
// Role is intentionally excluded — public registration always creates citizens.
// Admin accounts must be provisioned server-side (Phase 8 admin-provisioning path).
const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.'),
});

// Schema for POST /auth/login
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure: responds 400 with a structured errors array.
 * On success: calls next().
 *
 * @param {z.ZodSchema} schema
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed.', errors });
    }
    // Replace req.body with the parsed (and default-filled) data
    req.body = result.data;
    next();
  };
}

module.exports = { registerSchema, loginSchema, validate };
