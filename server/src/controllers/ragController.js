// RAG Controller — Phase 7
// Endpoints for RAG category search, complaint drafting assistant, and manual complaint re-classification.

const prisma = require('../db/prismaClient');
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
        id: m.category.id,
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
 * Automatically finds the most similar GrievanceCategory and updates matchedCategoryId and status.
 *
 * Returns: 200 OK with updated complaint and matched category details.
 */
async function classifyComplaintById(req, res) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Citizens can only classify their own complaints; admins can classify any.
    if (req.user.role !== 'admin' && complaint.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: access denied.' });
    }

    const textToClassify = complaint.translatedText || complaint.rawText;
    const { topMatch, matches } = await classifyComplaintText(textToClassify, 3);

    if (!topMatch) {
      return res.status(422).json({ error: 'Unable to match complaint to any seeded category.' });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        matchedCategoryId: topMatch.category.id,
        status: 'classified',
      },
      include: {
        matchedCategory: {
          select: { id: true, categoryName: true, department: true },
        },
      },
    });

    return res.status(200).json({
      message: 'Complaint successfully classified using RAG.',
      complaint: updatedComplaint,
      confidenceScore: Number(topMatch.score.toFixed(4)),
      allMatches: matches.map((m) => ({
        id: m.category.id,
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
