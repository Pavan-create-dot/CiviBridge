// RAG Controller — endpoints for category search, complaint drafting assistant, and re-classification.

const prisma = require('../db/prismaClient');
const { findSimilarCategories } = require('../rag/vectorStore');
const { draftComplaintWithRAG, classifyComplaintText } = require('../rag/ragService');
const { roundScore, formatCategoryMatches } = require('../utils/categoryMatches');
const { sendServerError, parseIdParam, canAccessComplaint } = require('../utils/httpHelpers');

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
    return sendServerError(res, 'draftGrievance', err, 'Failed to generate complaint draft.');
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
      score: roundScore(m.score),
    }));

    return res.status(200).json({ query, results });
  } catch (err) {
    return sendServerError(res, 'searchCategories', err, 'Failed to search categories.');
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
  const id = parseIdParam(req, res);
  if (id === null) return;

  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (!canAccessComplaint(req.user, complaint)) {
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
      confidenceScore: roundScore(topMatch.score),
      allMatches: formatCategoryMatches(matches),
    });
  } catch (err) {
    return sendServerError(res, 'classifyComplaintById', err);
  }
}

module.exports = { draftGrievance, searchCategories, classifyComplaintById };
