// Complaint routes — Phase 4: Core Grievance Management API

const { Router } = require('express');
const {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { classifyComplaintById } = require('../controllers/ragController');
const {
  submitComplaintSchema,
  updateStatusSchema,
  validate,
} = require('../validators/complaintValidators');
const authenticateJWT = require('../middleware/authenticateJWT');
const requireRole = require('../middleware/requireRole');

const router = Router();

// All complaint routes require a valid JWT
router.use(authenticateJWT);

// POST /complaints — citizen submits a new grievance
router.post('/', validate(submitComplaintSchema), submitComplaint);

// GET /complaints/me — citizen views their own complaints
// NOTE: this route must be defined before /:id to avoid "me" being parsed as an ID
router.get('/me', getMyComplaints);

// GET /complaints/:id — owner or admin views a single complaint
router.get('/:id', getComplaintById);

// POST /complaints/:id/classify — trigger RAG classification on complaint
router.post('/:id/classify', classifyComplaintById);

// PATCH /complaints/:id/status — admin updates processing status
router.patch(
  '/:id/status',
  requireRole('admin'),
  validate(updateStatusSchema),
  updateComplaintStatus
);

module.exports = router;
