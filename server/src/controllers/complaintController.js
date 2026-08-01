// Complaint controller — Phase 4: Core Grievance Management API
// Handles submit, retrieve, and status-update operations on complaints.

const prisma = require('../db/prismaClient');

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
    const complaint = await prisma.complaint.create({
      data: {
        userId: req.user.id,
        rawText,
        detectedLanguage,
        // translatedText and matchedCategoryId remain null until Phase 5 / Phase 7
        status: 'pending',
      },
    });

    return res.status(201).json({ message: 'Complaint submitted successfully.', complaint });
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
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      // Include the matched category name if one has been assigned (Phase 7+)
      include: {
        matchedCategory: {
          select: { categoryName: true, department: true },
        },
      },
    });

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
 *
 * Returns: 200 OK with the complaint, 403 if forbidden, 404 if not found.
 */
async function getComplaintById(req, res) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        matchedCategory: {
          select: { categoryName: true, department: true },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Citizens can only see their own complaints
    if (req.user.role !== 'admin' && complaint.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not have access to this complaint.' });
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
 *
 * Expects req.body: { status } — one of: pending | classified | routed
 * Returns: 200 OK with the updated complaint.
 */
async function updateComplaintStatus(req, res) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

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
    console.error('updateComplaintStatus error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { submitComplaint, getMyComplaints, getComplaintById, updateComplaintStatus };
