const { Router } = require('express');
const Grievance = require('../models/Grievance');
const GrievanceCategory = require('../models/GrievanceCategory');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

const router = Router();
router.use(authenticateJWT);

// POST /grievances - Submit a verified grievance (after citizen review)
router.post('/', async (req, res) => {
  const {
    rawText,
    detectedLanguage,
    translatedText,
    generatedDraft,
    matchedCategoryId,
    assignedDepartment,
    priority,
    sources,
  } = req.body;

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: 'Grievance text is required.' });
  }

  try {
    let categoryId = matchedCategoryId;
    let assignedDept = assignedDepartment || null;
    let status = 'pending';

    if (categoryId) {
      const cat = await GrievanceCategory.findById(categoryId);
      if (cat) {
        assignedDept = assignedDept || cat.department;
        status = 'classified';
      }
    }

    const grievance = await Grievance.create({
      userId: req.user.id,
      rawText,
      detectedLanguage: detectedLanguage || 'en',
      translatedText: translatedText || null,
      generatedDraft: generatedDraft || null,
      matchedCategoryId: categoryId || null,
      assignedDepartment: assignedDept,
      priority: priority || 'medium',
      sources: Array.isArray(sources) ? sources : [],
      status,
    });

    const populated = await Grievance.findById(grievance._id)
      .populate('matchedCategoryId', 'categoryName department description')
      .populate('userId', 'email');

    // Emit real-time event to admins if Socket.IO is initialized
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('grievance:created', populated);
    }

    return res.status(201).json({
      message: 'Grievance submitted successfully.',
      grievance: populated,
    });
  } catch (err) {
    console.error('Submit grievance error:', err);
    return res.status(500).json({ error: 'Failed to submit grievance.' });
  }
});

// GET /grievances/me - Citizen lists their own grievances
router.get('/me', async (req, res) => {
  try {
    const grievances = await Grievance.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('matchedCategoryId', 'categoryName department description');
    return res.json({ grievances });
  } catch (err) {
    console.error('Get my grievances error:', err);
    return res.status(500).json({ error: 'Failed to fetch grievances.' });
  }
});

// DELETE /grievances/:id - Delete grievance (owner citizen or admin)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const grievance = await Grievance.findById(id);
    if (!grievance) return res.status(404).json({ error: 'Grievance not found.' });

    if (req.user.role !== 'admin' && grievance.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this grievance.' });
    }

    await Grievance.findByIdAndDelete(id);
    return res.json({ message: 'Grievance deleted successfully.' });
  } catch (err) {
    console.error('Delete grievance error:', err);
    return res.status(500).json({ error: 'Failed to delete grievance.' });
  }
});

// Admin-only endpoints below
// GET /grievances - Admin lists all grievances with stats and search
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ rawText: regex }, { adminNotes: regex }, { assignedDepartment: regex }];
    }

    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'email')
      .populate('matchedCategoryId', 'categoryName department description');

    const total = grievances.length;
    const pendingCount = grievances.filter((c) => c.status === 'pending' || c.status === 'classified').length;
    const inProgressCount = grievances.filter((c) => c.status === 'in_progress').length;
    const resolvedCount = grievances.filter((c) => c.status === 'resolved').length;

    return res.json({
      grievances,
      // Backward compatibility alias for complaints frontend
      complaints: grievances,
      stats: { total, pendingCount, inProgressCount, resolvedCount },
    });
  } catch (err) {
    console.error('Admin get grievances error:', err);
    return res.status(500).json({ error: 'Failed to fetch grievances.' });
  }
});

// PATCH /grievances/:id - Admin updates status, priority, department, admin notes
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

    const updated = await Grievance.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'email')
      .populate('matchedCategoryId', 'categoryName department description');

    if (!updated) return res.status(404).json({ error: 'Grievance not found.' });

    // Emit real-time event to the specific citizen and admins
    const io = req.app.get('io');
    if (io) {
      const citizenId = updated.userId?._id?.toString() || updated.userId?.toString();
      if (citizenId) {
        io.to(`user:${citizenId}`).emit('grievance:updated', updated);
      }
      io.to('admins').emit('grievance:updated', updated);
    }

    return res.json({
      message: 'Grievance updated successfully.',
      grievance: updated,
      complaint: updated, // backward compat
    });
  } catch (err) {
    console.error('Update grievance error:', err);
    return res.status(500).json({ error: 'Failed to update grievance.' });
  }
});

module.exports = router;
