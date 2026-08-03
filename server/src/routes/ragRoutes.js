// RAG routes — Phase 7: RAG Pipeline & Gemini Engine Integration

const { Router } = require('express');
const { draftGrievance, searchCategories } = require('../controllers/ragController');
const { draftSchema, searchCategoriesSchema, validate } = require('../validators/ragValidators');
const authenticateJWT = require('../middleware/authenticateJWT');

const router = Router();

// All RAG routes require authentication
router.use(authenticateJWT);

// POST /rag/draft — Generate formal grievance draft using RAG context
router.post('/draft', validate(draftSchema), draftGrievance);

// POST /rag/categories/search — Semantic vector search for grievance categories
router.post('/categories/search', validate(searchCategoriesSchema), searchCategories);

module.exports = router;
