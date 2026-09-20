const { Router } = require('express');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

const router = Router();
router.use(authenticateJWT);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /knowledge - List all knowledge docs
router.get('/', async (req, res) => {
  try {
    const docs = await KnowledgeDoc.find().sort({ updatedAt: -1 });
    return res.json({ docs });
  } catch (err) {
    console.error('Get knowledge docs error:', err);
    return res.status(500).json({ error: 'Failed to fetch knowledge base docs.' });
  }
});

// Admin-only endpoints below
router.use(requireAdmin);

// POST /knowledge - Create new knowledge document and trigger FastAPI chunking/indexing
router.post('/', async (req, res) => {
  const { title, content, source, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  try {
    const doc = await KnowledgeDoc.create({
      title,
      content,
      source: source || '',
      category: category || 'policy',
    });

    // Notify FastAPI service to chunk and embed into document_chunks
    try {
      await fetch(`${AI_SERVICE_URL}/knowledge/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc._id.toString(),
          title: doc.title,
          content: doc.content,
          source: doc.source,
          category: doc.category,
        }),
      });
    } catch (aiErr) {
      console.warn('FastAPI indexing notification warning:', aiErr.message);
    }

    return res.status(201).json({ message: 'Knowledge document created successfully.', doc });
  } catch (err) {
    console.error('Create knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to create knowledge document.' });
  }
});

// PUT /knowledge/:id - Update knowledge document and re-index
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, source, category } = req.body;

  try {
    const existing = await KnowledgeDoc.findById(id);
    if (!existing) return res.status(404).json({ error: 'Knowledge document not found.' });

    const newTitle = title !== undefined ? title : existing.title;
    const newContent = content !== undefined ? content : existing.content;
    const newSource = source !== undefined ? source : existing.source;
    const newCategory = category !== undefined ? category : existing.category;

    const updated = await KnowledgeDoc.findByIdAndUpdate(
      id,
      { title: newTitle, content: newContent, source: newSource, category: newCategory },
      { new: true }
    );

    // Trigger re-indexing in FastAPI
    try {
      await fetch(`${AI_SERVICE_URL}/knowledge/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: updated._id.toString(),
          title: updated.title,
          content: updated.content,
          source: updated.source,
          category: updated.category,
        }),
      });
    } catch (aiErr) {
      console.warn('FastAPI re-indexing notification warning:', aiErr.message);
    }

    return res.json({ message: 'Knowledge document updated.', doc: updated });
  } catch (err) {
    console.error('Update knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to update knowledge document.' });
  }
});

// DELETE /knowledge/:id - Vector-first deletion: Clean FastAPI chunks before dropping Mongoose record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await KnowledgeDoc.findById(id);
    if (!doc) return res.status(404).json({ error: 'Knowledge document not found.' });

    // 1. Call FastAPI to delete all document_chunks first
    try {
      const fastApiRes = await fetch(`${AI_SERVICE_URL}/knowledge/${id}`, {
        method: 'DELETE',
      });
      if (!fastApiRes.ok && fastApiRes.status !== 404) {
        console.warn(`FastAPI delete returned status ${fastApiRes.status}`);
      }
    } catch (aiErr) {
      console.warn('FastAPI chunk deletion warning:', aiErr.message);
    }

    // 2. Delete Mongoose document record
    await KnowledgeDoc.findByIdAndDelete(id);
    return res.json({ message: 'Knowledge document and associated vectors deleted.' });
  } catch (err) {
    console.error('Delete knowledge doc error:', err);
    return res.status(500).json({ error: 'Failed to delete knowledge document.' });
  }
});

module.exports = router;
