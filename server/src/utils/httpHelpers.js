// HTTP helpers shared by controllers — consistent error payloads, id parsing,
// and complaint ownership checks.

/**
 * Log an unexpected controller error and respond with a 500.
 *
 * @param {import('express').Response} res
 * @param {string} context - name of the handler, used as the log prefix
 * @param {Error} err
 * @param {string} [message] - client-facing error message
 */
function sendServerError(res, context, err, message = 'Internal server error.') {
  console.error(`${context} error:`, err);
  return res.status(500).json({ error: message });
}

/**
 * Parse a numeric :id route param, responding 400 when it is not a number.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} [paramName]
 * @returns {number|null} the parsed id, or null when a 400 response was sent
 */
function parseIdParam(req, res, paramName = 'id') {
  const id = parseInt(req.params[paramName], 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid complaint ID.' });
    return null;
  }

  return id;
}

/**
 * Citizens may only act on their own complaints; admins may act on any.
 *
 * @param {{ id: number, role: string }} user
 * @param {{ userId: number }} complaint
 * @returns {boolean}
 */
function canAccessComplaint(user, complaint) {
  return user.role === 'admin' || complaint.userId === user.id;
}

module.exports = { sendServerError, parseIdParam, canAccessComplaint };
