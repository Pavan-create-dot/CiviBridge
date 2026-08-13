// Complaint routes — grievance submission, retrieval, and status management.

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

router.use(authenticateJWT);

router.post('/', validate(submitComplaintSchema), submitComplaint);

router.get('/me', getMyComplaints);

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
