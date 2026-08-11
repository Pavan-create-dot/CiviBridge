// RAG Controller — endpoints for category search, complaint drafting assistant, and re-classification using MongoDB / Mongoose

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { findSimilarCategories } = require('../rag/vectorStore');
const { draftComplaintWithRAG, classifyComplaintText } = require('../rag/ragService');

/**
 * POST /rag/draft
 * Authenticated user requests a formal grievance draft generated using RAG context.
 *
 * Body: { prompt: string, language?: 'en'|'te'|'hi' }
 * Returns: 200 OK with { draft, matchedCategories }
 */
async function draftGrievance(req, res) {
  const { prompt, language } = req.body;

  try {
    const result = await draftComplaintWithRAG({ prompt, language });
    return res.status(200).json({
      message: 'Complaint draft generated successfully.',
      ...result,
    });
  } catch (err) {
    console.error('draftGrievance error:', err);
    return res.status(500).json({ error: 'Failed to generate complaint draft.' });
  }
}

/**
 * POST /rag/categories/search
 * Authenticated user searches civic categories by semantic query.
 *
 * Body: { query: string, topK?: number }
 * Returns: 200 OK with array of matching categories and scores
 */
async function searchCategories(req, res) {
  const { query, topK } = req.body;

  try {
    const matches = await findSimilarCategories(query, topK || 3);
    const results = matches.map((m) => ({
      category: {
        id: m.category.id || m.category._id?.toString(),
        categoryName: m.category.categoryName,
        department: m.category.department,
        description: m.category.description,
      },
      score: Number(m.score.toFixed(4)),
    }));

    return res.status(200).json({ query, results });
  } catch (err) {
    console.error('searchCategories error:', err);
    return res.status(500).json({ error: 'Failed to search categories.' });
  }
}

/**
 * POST /complaints/:id/classify
 * Triggers RAG vector classification for an existing complaint.
 */
async function classifyComplaintById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Citizens can only classify their own complaints; admins can classify any.
    const complaintUserId = complaint.userId?.id || complaint.userId?._id?.toString() || complaint.userId?.toString();
    if (req.user.role !== 'admin' && complaintUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: access denied.' });
    }

    const textToClassify = complaint.translatedText || complaint.rawText;
    const { topMatch, matches } = await classifyComplaintText(textToClassify, 3);

    if (!topMatch) {
      return res.status(422).json({ error: 'Unable to match complaint to any seeded category.' });
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      {
        matchedCategoryId: topMatch.category.id || topMatch.category._id,
        status: 'classified',
      },
      { new: true }
    )
      .populate('userId', 'id email')
      .populate('matchedCategoryId', 'id categoryName department description');

    return res.status(200).json({
      message: 'Complaint successfully classified using RAG.',
      complaint: updatedComplaint,
      confidenceScore: Number(topMatch.score.toFixed(4)),
      allMatches: matches.map((m) => ({
        id: m.category.id || m.category._id?.toString(),
        categoryName: m.category.categoryName,
        department: m.category.department,
        score: Number(m.score.toFixed(4)),
      })),
    });
  } catch (err) {
    console.error('classifyComplaintById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { draftGrievance, searchCategories, classifyComplaintById };
