// Complaint controller — handles submit, retrieve, and status-update operations on complaints.

const prisma = require('../db/prismaClient');
const { CATEGORY_SUMMARY_INCLUDE } = require('../db/complaintIncludes');
const { translateGrievanceToEnglish } = require('../services/translationService');
const { classifyComplaintText } = require('../rag/ragService');
const { sendServerError, parseIdParam, canAccessComplaint } = require('../utils/httpHelpers');

/**
 * POST /complaints
 * Authenticated citizen submits a new grievance.
 *
 * Expects req.body: { rawText, detectedLanguage }
 * Returns: 201 Created with the new complaint record.
 */
async function submitComplaint(req, res) {
  const { rawText, detectedLanguage } = req.body;

  try {
    // Auto-translate non-English complaints to English for internal processing.
    // translateGrievanceToEnglish returns null on failure — the complaint is always saved.
    const translatedText = await translateGrievanceToEnglish(rawText, detectedLanguage);

    // RAG Auto-classification via vector embedding similarity search
    const textToClassify = translatedText || rawText;
    let matchedCategoryId = null;
    let status = 'pending';

    try {
      const { topMatch } = await classifyComplaintText(textToClassify);
      if (topMatch && topMatch.category) {
        matchedCategoryId = topMatch.category.id;
        status = 'classified';
      }
    } catch (ragErr) {
      console.warn('Auto RAG classification skipped:', ragErr.message);
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId: req.user.id,
        rawText,
        detectedLanguage,
        translatedText,
        matchedCategoryId,
        status,
      },
      include: CATEGORY_SUMMARY_INCLUDE,
    });

    return res.status(201).json({ message: 'Complaint submitted successfully.', complaint });
  } catch (err) {
    return sendServerError(res, 'submitComplaint', err);
  }
}

/**
 * GET /complaints/me
 * Returns all complaints filed by the authenticated citizen, newest first.
 *
 * Returns: 200 OK with an array of complaint records.
 */
async function getMyComplaints(req, res) {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: CATEGORY_SUMMARY_INCLUDE,
    });

    return res.status(200).json({ complaints });
  } catch (err) {
    return sendServerError(res, 'getMyComplaints', err);
  }
}

/**
 * GET /complaints/:id
 * Fetches a single complaint by ID.
 * Citizens may only view their own complaints; admins may view any.
 *
 * Returns: 200 OK with the complaint, 403 if forbidden, 404 if not found.
 */
async function getComplaintById(req, res) {
  const id = parseIdParam(req, res);
  if (id === null) return;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: CATEGORY_SUMMARY_INCLUDE,
    });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    if (!canAccessComplaint(req.user, complaint)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: you do not have access to this complaint.' });
    }

    return res.status(200).json({ complaint });
  } catch (err) {
    return sendServerError(res, 'getComplaintById', err);
  }
}

/**
 * PATCH /complaints/:id/status
 * Admin-only: updates the processing status of a complaint.
 *
 * Expects req.body: { status } — one of: pending | classified | routed | in_progress | resolved | rejected
 * Returns: 200 OK with the updated complaint.
 */
async function updateComplaintStatus(req, res) {
  const id = parseIdParam(req, res);
  if (id === null) return;

  const { status } = req.body;

  try {
    // Confirm the complaint exists before updating
    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: { status },
    });

    return res.status(200).json({ message: 'Status updated successfully.', complaint });
  } catch (err) {
    return sendServerError(res, 'updateComplaintStatus', err);
  }
}

module.exports = { submitComplaint, getMyComplaints, getComplaintById, updateComplaintStatus };
