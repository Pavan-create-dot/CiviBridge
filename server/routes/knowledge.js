const { Router } = require('express');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { embedText } = require('../rag/embeddings');

const router = Router();
router.use(authenticateJWT);

// GET /knowledge - List all knowledge docs (public to auth users)
router.get('/', async (req, res) => {
  try {
    const docs = await KnowledgeDoc.find().sort({ updatedAt: -1 }).select('-embedding');
    return res.json({ docs });
  } catch (err) {
    console.error('Get knowledge docs error:', err);
    return res.status(500).json({ error: 'Failed to fetch knowledge base docs.' });
  }
});

// Admin-only endpoints below
router.use(requireAdmin);

// POST /knowledge - Create new knowledge document with auto-embedding
router.post('/', async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  try {
    let embedding = [];
    try {
      embedding = await embedText(`${title}: ${content}`);
    } catch (embedErr) {
      console.warn('Embedding warning on knowledge doc create:', embedErr.message);
    }

    const doc = await KnowledgeDoc.create({
      title,
      content,
      category: category || 'policy',
      embedding,
    });

    return res.status(201).json({ message: 'Knowledge document created and embedded.', doc });
  } catch (err) {
    console.error('Create knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to create knowledge document.' });
  }
});

// PUT /knowledge/:id - Update knowledge document and re-embed
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body;

  try {
    const existing = await KnowledgeDoc.findById(id);
    if (!existing) return res.status(404).json({ error: 'Knowledge document not found.' });

    const newTitle = title || existing.title;
    const newContent = content || existing.content;

    let embedding = existing.embedding;
    if (content || title) {
      try {
        embedding = await embedText(`${newTitle}: ${newContent}`);
      } catch (embedErr) {
        console.warn('Re-embedding warning on update:', embedErr.message);
      }
    }

    const updated = await KnowledgeDoc.findByIdAndUpdate(
      id,
      { title: newTitle, content: newContent, category: category || existing.category, embedding },
      { new: true }
    ).select('-embedding');

    return res.json({ message: 'Knowledge document updated.', doc: updated });
  } catch (err) {
    console.error('Update knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to update knowledge document.' });
  }
});

// DELETE /knowledge/:id - Delete knowledge document
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await KnowledgeDoc.findByIdAndDelete(id);
    return res.json({ message: 'Knowledge document deleted.' });
  } catch (err) {
    console.error('Delete knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to delete knowledge document.' });
  }
});

module.exports = router;
