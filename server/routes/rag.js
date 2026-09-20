const { Router } = require('express');
const { authenticateJWT } = require('../middleware/auth');
const GrievanceCategory = require('../models/GrievanceCategory');

const router = Router();
router.use(authenticateJWT);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /rag/generate - Generate grounded formal grievance draft via FastAPI RAG service
router.post('/generate', async (req, res) => {
  const { prompt, grievance, language } = req.body;
  const userGrievance = (prompt || grievance || '').trim();

  if (!userGrievance) {
    return res.status(400).json({ error: 'Grievance description is required.' });
  }

  try {
    // 1. Fetch available municipal categories from MongoDB to provide structured context
    const allCategories = await GrievanceCategory.find().lean();
    const categoriesPayload = allCategories.map((c) => ({
      id: c._id.toString(),
      name: c.categoryName,
      department: c.department,
      description: c.description,
    }));

    // 2. Call FastAPI RAG microservice
    const fastApiRes = await fetch(`${AI_SERVICE_URL}/rag/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grievance: userGrievance,
        language: language || 'en',
        categories: categoriesPayload,
      }),
    });

    if (!fastApiRes.ok) {
      const errData = await fastApiRes.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || `FastAPI RAG error: ${fastApiRes.statusText}`);
    }

    const aiData = await fastApiRes.json();

    // 3. Resolve matched category to MongoDB ObjectId
    const matchedCategory = allCategories.find(
      (c) => c.categoryName.toLowerCase() === (aiData.category || '').toLowerCase()
    ) || allCategories[0] || null;

    return res.status(200).json({
      message: 'Grounded grievance draft generated successfully.',
      draft: aiData.petition,
      category: aiData.category,
      department: aiData.department,
      priority: aiData.priority,
      sources: aiData.sources || [],
      // Backward compatibility fields
      topMatchCategory: matchedCategory,
      matchedCategoryId: matchedCategory ? matchedCategory._id : null,
      matchedKnowledge: (aiData.sources || []).map((s) => ({
        title: s.title,
        source: s.source,
        chunk_index: s.chunk_index,
      })),
    });
  } catch (err) {
    console.error('RAG generate route error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate grievance draft.' });
  }
});

module.exports = router;
