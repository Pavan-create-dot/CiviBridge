// Middleware: authenticateJWT
// Verifies the Bearer token from the Authorization header and attaches the
// decoded payload to req.user so downstream handlers know who is calling.

const jwt = require('jsonwebtoken');

/**
 * Requires a valid JWT in the Authorization header.
 * On success: attaches { id, email, role } to req.user and calls next().
 * On failure: responds with 401 Unauthorized.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Expected format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach only the fields the application needs; never forward the raw token
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authenticateJWT;
