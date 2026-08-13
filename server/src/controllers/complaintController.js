// Complaint controller — handles submit, retrieve, and status-update operations on complaints using MongoDB / Mongoose

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { translateGrievanceToEnglish } = require('../services/translationService');
const { classifyComplaintText } = require('../rag/ragService');

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
    const translatedText = await translateGrievanceToEnglish(rawText, detectedLanguage);

    // RAG Auto-classification via vector embedding similarity search
    const textToClassify = translatedText || rawText;
    let matchedCategoryId = null;
    let status = 'pending';

    try {
      const { topMatch } = await classifyComplaintText(textToClassify);
      if (topMatch && topMatch.category) {
        matchedCategoryId = topMatch.category.id || topMatch.category._id;
        status = 'classified';
      }
    } catch (ragErr) {
      console.warn('Auto RAG classification skipped:', ragErr.message);
    }

    const complaint = await Complaint.create({
      userId: req.user.id,
      rawText,
      detectedLanguage,
      translatedText,
      matchedCategoryId,
      status,
    });

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('matchedCategoryId', 'categoryName department description')
      .populate('userId', 'id email');

    return res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint: populatedComplaint,
    });
  } catch (err) {
    console.error('submitComplaint error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
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
    const complaints = await Complaint.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('matchedCategoryId', 'categoryName department description');

    return res.status(200).json({ complaints });
  } catch (err) {
    console.error('getMyComplaints error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /complaints/:id
 * Fetches a single complaint by ID.
 * Citizens may only view their own complaints; admins may view any.
 */
async function getComplaintById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await Complaint.findById(id)
      .populate('matchedCategoryId', 'categoryName department description')
      .populate('userId', 'id email');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Citizens can only see their own complaints
    const complaintUserId = complaint.userId?.id || complaint.userId?._id?.toString() || complaint.userId?.toString();
    if (req.user.role !== 'admin' && complaintUserId !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Forbidden: you do not have access to this complaint.' });
    }

    return res.status(200).json({ complaint });
  } catch (err) {
    console.error('getComplaintById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /complaints/:id/status
 * Admin-only: updates the processing status of a complaint.
 */
async function updateComplaintStatus(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  const { status } = req.body;

  try {
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('matchedCategoryId', 'categoryName department description')
      .populate('userId', 'id email');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    return res.status(200).json({ message: 'Status updated successfully.', complaint });
  } catch (err) {
    console.error('updateComplaintStatus error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { submitComplaint, getMyComplaints, getComplaintById, updateComplaintStatus };
