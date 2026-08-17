// Auth routes — mounts register, login, and admin provisioning endpoints under /auth.

const { Router } = require('express');
const { register, login, registerAdmin } = require('../controllers/authController');
const {
  registerSchema,
  loginSchema,
  registerAdminSchema,
} = require('../validators/authValidators');
const validate = require('../middleware/validate');

const router = Router();

// POST /auth/register — create a new citizen account
router.post('/register', validate(registerSchema), register);

// POST /auth/register-admin — provision a new department admin account
router.post('/register-admin', validate(registerAdminSchema), registerAdmin);

// POST /auth/login — authenticate and receive a JWT
router.post('/login', validate(loginSchema), login);

module.exports = router;
