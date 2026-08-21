const { Router } = require('express');
const Complaint = require('../models/Complaint');
const GrievanceCategory = require('../models/GrievanceCategory');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { findSimilarCategories } = require('../rag/vectorStore');

const router = Router();
router.use(authenticateJWT);

// POST /complaints - Submit a grievance (auto-saves draft if provided)
router.post('/', async (req, res) => {
  const { rawText, detectedLanguage, translatedText, generatedDraft, matchedCategoryId } = req.body;

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  try {
    let categoryId = matchedCategoryId;
    let assignedDept = null;
    let status = 'pending';

    // If category is not explicitly passed, try vector matching
    if (!categoryId) {
      try {
        const matches = await findSimilarCategories(translatedText || rawText, 1);
        if (matches.length > 0) {
          categoryId = matches[0].category._id;
          assignedDept = matches[0].category.department;
          status = 'classified';
        }
      } catch (err) {
        console.warn('Auto classification on submit skipped:', err.message);
      }
    } else {
      const cat = await GrievanceCategory.findById(categoryId);
      if (cat) assignedDept = cat.department;
      status = 'classified';
    }

    const complaint = await Complaint.create({
      userId: req.user.id,
      rawText,
      detectedLanguage: detectedLanguage || 'en',
      translatedText: translatedText || null,
      generatedDraft: generatedDraft || null,
      matchedCategoryId: categoryId || null,
      assignedDepartment: assignedDept,
      status,
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('matchedCategoryId', 'categoryName department description')
      .populate('userId', 'email');

    return res.status(201).json({
      message: 'Grievance submitted successfully.',
      complaint: populated,
    });
  } catch (err) {
    console.error('Submit complaint error:', err);
    return res.status(500).json({ error: 'Failed to submit grievance.' });
  }
});

// GET /complaints/me - Citizen lists their own complaints
router.get('/me', async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('matchedCategoryId', 'categoryName department description');
    return res.json({ complaints });
  } catch (err) {
    console.error('Get my complaints error:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// DELETE /complaints/:id - Delete complaint (owner citizen or admin)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (req.user.role !== 'admin' && complaint.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this complaint.' });
    }

    await Complaint.findByIdAndDelete(id);
    return res.json({ message: 'Complaint deleted successfully.' });
  } catch (err) {
    console.error('Delete complaint error:', err);
    return res.status(500).json({ error: 'Failed to delete complaint.' });
  }
});

// Admin-only endpoints below
// GET /complaints - Admin lists all complaints
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ rawText: regex }, { adminNotes: regex }];
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'email')
      .populate('matchedCategoryId', 'categoryName department description');

    const total = complaints.length;
    const pendingCount = complaints.filter(c => c.status === 'pending' || c.status === 'classified').length;
    const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
    const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

    return res.json({
      complaints,
      stats: { total, pendingCount, inProgressCount, resolvedCount },
    });
  } catch (err) {
    console.error('Admin get complaints error:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// PATCH /complaints/:id - Admin updates status, priority, department, admin notes
router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, priority, assignedDepartment, adminNotes, matchedCategoryId } = req.body;

  try {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedDepartment !== undefined) updateData.assignedDepartment = assignedDepartment;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (matchedCategoryId !== undefined) updateData.matchedCategoryId = matchedCategoryId;

    const updated = await Complaint.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'email')
      .populate('matchedCategoryId', 'categoryName department description');

    if (!updated) return res.status(404).json({ error: 'Complaint not found.' });

    return res.json({ message: 'Complaint updated successfully.', complaint: updated });
  } catch (err) {
    console.error('Update complaint error:', err);
    return res.status(500).json({ error: 'Failed to update complaint.' });
  }
});

// POST /complaints/:id/auto-route - Admin triggers vector auto-routing
router.post('/:id/auto-route', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const matches = await findSimilarCategories(complaint.translatedText || complaint.rawText, 1);
    if (matches.length === 0) {
      return res.status(422).json({ error: 'No matching category found for auto-routing.' });
    }

    const topCat = matches[0].category;
    complaint.matchedCategoryId = topCat._id;
    complaint.assignedDepartment = topCat.department;
    if (complaint.status === 'pending' || complaint.status === 'classified') {
      complaint.status = 'routed';
    }
    await complaint.save();

    const populated = await Complaint.findById(id)
      .populate('userId', 'email')
      .populate('matchedCategoryId', 'categoryName department description');

    return res.json({
      message: `Auto-routed to ${topCat.department}`,
      complaint: populated,
      matchScore: Number(matches[0].score.toFixed(4)),
    });
  } catch (err) {
    console.error('Auto route error:', err);
    return res.status(500).json({ error: 'Auto-routing failed.' });
  }
});

module.exports = router;
