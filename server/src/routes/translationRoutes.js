// Translation routes — Phase 5: Multilingual Translation Service

const { Router } = require('express');
const { translate, detect } = require('../controllers/translationController');
const {
  translateSchema,
  detectLanguageSchema,
  validate,
} = require('../validators/translationValidators');
const authenticateJWT = require('../middleware/authenticateJWT');

const router = Router();

// All translation routes require a valid JWT
router.use(authenticateJWT);

// POST /translate — translate text between supported languages
router.post('/', validate(translateSchema), translate);

// POST /translate/detect — detect the language of submitted text
router.post('/detect', validate(detectLanguageSchema), detect);

module.exports = router;
