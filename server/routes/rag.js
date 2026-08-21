const { Router } = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { generateGroundedComplaint } = require('../rag/ragService');
const { findSimilarCategories } = require('../rag/vectorStore');

const router = Router();
router.use(authenticateJWT);

// POST /rag/generate - Generate grounded formal complaint using RAG pipeline
router.post('/generate', async (req, res) => {
  const { prompt, language } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Problem description prompt is required.' });
  }

  try {
    const result = await generateGroundedComplaint({ prompt, language: language || 'en' });
    return res.status(200).json({
      message: 'Grounded complaint draft generated successfully.',
      ...result,
    });
  } catch (err) {
    console.error('RAG generate error:', err);
    return res.status(500).json({ error: 'Failed to generate grounded complaint draft.' });
  }
});

// POST /rag/categories/search - Semantic vector search for categories
router.post('/categories/search', async (req, res) => {
  const { query, topK } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required.' });

  try {
    const matches = await findSimilarCategories(query, topK || 3);
    return res.json({ query, matches });
  } catch (err) {
    console.error('Categories search error:', err);
    return res.status(500).json({ error: 'Failed to search categories.' });
  }
});

module.exports = router;
