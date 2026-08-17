// Triage routes — admin & department triage portal API endpoints.

const { Router } = require('express');
const {
  getTriageComplaints,
  getTriageStats,
  updateTriageComplaint,
  autoRouteComplaint,
  getDepartments,
} = require('../controllers/triageController');
const { triageQuerySchema, updateTriageSchema } = require('../validators/triageValidators');
const validate = require('../middleware/validate');
const authenticateJWT = require('../middleware/authenticateJWT');
const requireRole = require('../middleware/requireRole');

const router = Router();

// All triage endpoints require authentication and an 'admin' role
router.use(authenticateJWT);
router.use(requireRole('admin'));

// GET /triage/stats — summary statistics for triage dashboard
router.get('/stats', getTriageStats);

// GET /triage/departments — list of departments and grievance categories
router.get('/departments', getDepartments);

// GET /triage/complaints — paginated and filtered complaint listing
router.get('/complaints', validate(triageQuerySchema), getTriageComplaints);

// PATCH /triage/complaints/:id — update routing, priority, status, category, or notes
router.patch('/complaints/:id', validate(updateTriageSchema), updateTriageComplaint);

// POST /triage/complaints/:id/auto-route — auto-route complaint via vector embedding RAG
router.post('/complaints/:id/auto-route', autoRouteComplaint);

module.exports = router;
