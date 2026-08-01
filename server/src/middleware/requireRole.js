// Middleware: requireRole
// Restricts a route to users with a specific role (e.g. 'admin').
// Must be used AFTER authenticateJWT so that req.user is populated.

/**
 * Factory that returns a middleware enforcing the given role.
 * Usage: router.get('/admin-only', authenticateJWT, requireRole('admin'), handler)
 *
 * @param {string} role - The role string that is allowed ('citizen' | 'admin').
 * @returns {Function} Express middleware
 */
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) {
      // Defensive check — should never reach here without authenticateJWT first
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }

    next();
  };
}

module.exports = requireRole;
