// Input validators for auth routes using Zod
// Zod provides schema-based validation with clear, composable error messages.

const { z } = require('zod');
const { emailField, passwordField } = require('./commonSchemas');

// Schema for POST /auth/register
// Role is intentionally excluded — public registration always creates citizens.
// Admin accounts must be provisioned server-side via the admin-provisioning endpoint.
const registerSchema = z.object({
  email: emailField(),
  password: passwordField(),
});

// Schema for POST /auth/login
const loginSchema = z.object({
  email: emailField(),
  password: passwordField(1),
});

// Schema for POST /auth/register-admin (admin provisioning)
const registerAdminSchema = registerSchema.extend({
  adminSecret: z.string().optional(),
});

module.exports = { registerSchema, loginSchema, registerAdminSchema };
