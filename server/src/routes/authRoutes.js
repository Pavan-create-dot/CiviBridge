// Auth routes — Phase 3
// Mounts register and login endpoints under /auth.

const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const { registerSchema, loginSchema, validate } = require('../validators/authValidators');

const router = Router();

// POST /auth/register — create a new citizen or admin account
router.post('/register', validate(registerSchema), register);

// POST /auth/login — authenticate and receive a JWT
router.post('/login', validate(loginSchema), login);

module.exports = router;
