// Auth controller — handles register and login business logic
// All database operations go through the Prisma client singleton.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const { sendServerError } = require('../utils/httpHelpers');

// Number of bcrypt salt rounds — 12 is a good balance of security and speed
const SALT_ROUNDS = 12;

// Fields that are safe to return to clients — never includes passwordHash
const PUBLIC_USER_SELECT = { id: true, email: true, role: true, createdAt: true };

/**
 * Create a user with the given role, rejecting duplicate emails.
 *
 * @param {import('express').Response} res
 * @param {{ email: string, password: string, role: string, message: string }} params
 * @returns {Promise<import('express').Response>}
 */
async function createUserAccount(res, { email, password, role, message }) {
  // Check for duplicate email before attempting to insert
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  // Hash the password; the plain-text value is not stored anywhere
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, role },
    select: PUBLIC_USER_SELECT,
  });

  return res.status(201).json({ message, user });
}

/**
 * POST /auth/register
 * Creates a new user account with a hashed password.
 *
 * Expects req.body: { email, password }
 * Returns: 201 Created with the new user's public fields (no password hash).
 */
async function register(req, res) {
  // Destructure only the validated fields; role is never accepted from the client.
  // All public registrations are citizens — admin provisioning is a separate,
  // protected flow requiring the admin provisioning secret.
  const { email, password } = req.body;

  try {
    return await createUserAccount(res, {
      email,
      password,
      role: 'citizen',
      message: 'Account created successfully.',
    });
  } catch (err) {
    return sendServerError(res, 'register', err);
  }
}

/**
 * POST /auth/login
 * Validates credentials and returns a signed JWT on success.
 *
 * Expects req.body: { email, password }
 * Returns: 200 OK with { token, user: { id, email, role } }
 */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison even in the "not found" branch to avoid
    // leaking whether the email exists via timing differences
    if (!user) {
      await bcrypt.hash(password, SALT_ROUNDS); // dummy work
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Sign a JWT containing only non-sensitive identity claims
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    return sendServerError(res, 'login', err);
  }
}

/**
 * Determine whether the request comes from an authenticated admin, either via
 * req.user (set by authenticateJWT) or a Bearer token on the request itself.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isAdminRequest(req) {
  if (req.user && req.user.role === 'admin') return true;

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    return Boolean(decoded && decoded.role === 'admin');
  } catch {
    // invalid token ignored, fallback to secret check
    return false;
  }
}

/**
 * POST /auth/register-admin
 * Provision a new admin account.
 * Requires either an active admin session (req.user.role === 'admin') OR a valid admin secret
 * matching ADMIN_PROVISION_SECRET or header 'x-admin-secret'.
 *
 * Expects req.body: { email, password, adminSecret? }
 * Returns: 201 Created with new admin user data.
 */
async function registerAdmin(req, res) {
  const { email, password, adminSecret } = req.body;
  const providedSecret = adminSecret || req.headers['x-admin-secret'];
  // Require an explicit ADMIN_PROVISION_SECRET in production. Allow the test/dev
  // fallback only when not running in a production environment so test suites
  // that supply the known default continue to work locally/CI.
  const expectedSecret =
    process.env.ADMIN_PROVISION_SECRET ||
    (process.env.NODE_ENV === 'production' ? null : 'civibridge-admin-secret-2026');

  const hasValidSecret = providedSecret && expectedSecret && providedSecret === expectedSecret;

  if (!isAdminRequest(req) && !hasValidSecret) {
    return res
      .status(403)
      .json({ error: 'Forbidden: invalid admin provision secret or unauthorized.' });
  }

  try {
    return await createUserAccount(res, {
      email,
      password,
      role: 'admin',
      message: 'Admin account provisioned successfully.',
    });
  } catch (err) {
    return sendServerError(res, 'registerAdmin', err);
  }
}

module.exports = { register, login, registerAdmin };
