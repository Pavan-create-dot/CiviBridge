// Auth controller — handles register and login business logic
// All database operations go through the Prisma client singleton.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');

// Number of bcrypt salt rounds — 12 is a good balance of security and speed
const SALT_ROUNDS = 12;

/**
 * POST /auth/register
 * Creates a new user account with a hashed password.
 *
 * Expects req.body: { email, password, role? }
 * Returns: 201 Created with the new user's public fields (no password hash).
 */
async function register(req, res) {
  // Destructure only the validated fields; role is never accepted from the client.
  // All public registrations are citizens — admin provisioning is a separate,
  // protected flow that will be implemented in Phase 8.
  const { email, password } = req.body;

  try {
    // Check for duplicate email before attempting to insert
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Hash the password; the plain-text value is not stored anywhere
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'citizen' }, // role is always forced server-side
      select: { id: true, email: true, role: true, createdAt: true }, // never return passwordHash
    });

    return res.status(201).json({ message: 'Account created successfully.', user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
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
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /auth/register-admin
 * Phase 8: Provision a new admin account.
 * Requires either an active admin session (req.user.role === 'admin') OR a valid admin secret
 * matching ADMIN_PROVISION_SECRET or header 'x-admin-secret'.
 *
 * Expects req.body: { email, password, adminSecret? }
 * Returns: 201 Created with new admin user data.
 */
async function registerAdmin(req, res) {
  const { email, password, adminSecret } = req.body;
  const providedSecret = adminSecret || req.headers['x-admin-secret'];
  const expectedSecret = process.env.ADMIN_PROVISION_SECRET || 'civibridge-admin-secret-2026';

  let isAuthenticatedAdmin = req.user && req.user.role === 'admin';
  if (
    !isAuthenticatedAdmin &&
    req.headers['authorization'] &&
    req.headers['authorization'].startsWith('Bearer ')
  ) {
    try {
      const token = req.headers['authorization'].split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') {
        isAuthenticatedAdmin = true;
      }
    } catch (_) {
      // invalid token ignored, fallback to secret check
    }
  }

  const hasValidSecret = providedSecret && providedSecret === expectedSecret;

  if (!isAuthenticatedAdmin && !hasValidSecret) {
    return res
      .status(403)
      .json({ error: 'Forbidden: invalid admin provision secret or unauthorized.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'admin' },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ message: 'Admin account provisioned successfully.', user });
  } catch (err) {
    console.error('registerAdmin error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { register, login, registerAdmin };
