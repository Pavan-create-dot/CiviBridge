// Triage controller — provides department admins with complaint listing, stats, triage updating, and auto-routing using MongoDB / Mongoose

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const GrievanceCategory = require('../models/GrievanceCategory');
const { classifyComplaintText } = require('../rag/ragService');

/**
 * GET /triage/complaints
 * Lists all complaints with support for filtering, keyword search, pagination, and sorting.
 * Admin role required.
 */
async function getTriageComplaints(req, res) {
  try {
    const {
      status,
      priority,
      department,
      language,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (language) {
      query.detectedLanguage = language;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { rawText: searchRegex },
        { translatedText: searchRegex },
        { adminNotes: searchRegex },
      ];
    }

    // If department filter is requested, find matching category IDs first
    if (department) {
      const deptRegex = new RegExp(department, 'i');
      const matchingCats = await GrievanceCategory.find({ department: deptRegex }).select('_id');
      const catIds = matchingCats.map((c) => c._id);

      const deptCondition = [
        { assignedDepartment: deptRegex },
        { matchedCategoryId: { $in: catIds } },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: deptCondition }];
        delete query.$or;
      } else {
        query.$or = deptCondition;
      }
    }

    const sortOption = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'id email')
        .populate('matchedCategoryId', 'id categoryName department description'),
    ]);

    return res.status(200).json({
      complaints,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('getTriageComplaints error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /triage/stats
 * Aggregates summary statistics for the admin triage dashboard.
 * Admin role required.
 */
async function getTriageStats(req, res) {
  try {
    const totalComplaints = await Complaint.countDocuments();

    // Status aggregation
    const statusAgg = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      pending: 0,
      classified: 0,
      routed: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    statusAgg.forEach((g) => {
      if (statusCounts[g._id] !== undefined) {
        statusCounts[g._id] = g.count;
      }
    });

    // Priority aggregation
    const priorityAgg = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    priorityAgg.forEach((g) => {
      if (priorityCounts[g._id] !== undefined) {
        priorityCounts[g._id] = g.count;
      }
    });

    // Department aggregation
    const complaintsWithCat = await Complaint.find()
      .select('assignedDepartment matchedCategoryId')
      .populate('matchedCategoryId', 'department');

    const departmentCounts = {};
    complaintsWithCat.forEach((c) => {
      const dept =
        c.assignedDepartment ||
        (c.matchedCategoryId && c.matchedCategoryId.department) ||
        'Unassigned';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    const resolutionRate =
      totalComplaints > 0
        ? Number(((statusCounts.resolved / totalComplaints) * 100).toFixed(1))
        : 0;

    return res.status(200).json({
      stats: {
        totalComplaints,
        statusCounts,
        priorityCounts,
        departmentCounts,
        resolutionRate,
      },
    });
  } catch (err) {
    console.error('getTriageStats error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /triage/complaints/:id
 * Single endpoint to triage a complaint — update status, assigned department, priority,
 * matched category, or admin notes.
 * Admin role required.
 */
async function updateTriageComplaint(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  const { assignedDepartment, priority, status, matchedCategoryId, adminNotes } = req.body;

  try {
    const existing = await Complaint.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const updateData = {};

    if (assignedDepartment !== undefined) {
      updateData.assignedDepartment = assignedDepartment;
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (matchedCategoryId !== undefined) {
      if (matchedCategoryId === null || matchedCategoryId === '') {
        updateData.matchedCategoryId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(matchedCategoryId)) {
          return res
            .status(400)
            .json({ error: 'Invalid matchedCategoryId: category does not exist.' });
        }
        const category = await GrievanceCategory.findById(matchedCategoryId);
        if (!category) {
          return res
            .status(400)
            .json({ error: 'Invalid matchedCategoryId: category does not exist.' });
        }
        updateData.matchedCategoryId = matchedCategoryId;
        // Auto-populate assignedDepartment if not explicitly provided
        if (assignedDepartment === undefined && !existing.assignedDepartment) {
          updateData.assignedDepartment = category.department;
        }
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'id email')
      .populate('matchedCategoryId', 'id categoryName department description');

    return res.status(200).json({
      message: 'Complaint triaged successfully.',
      complaint,
    });
  } catch (err) {
    console.error('updateTriageComplaint error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /triage/complaints/:id/auto-route
 * Runs/re-runs RAG classification on a complaint and routes it to the corresponding department.
 * Admin role required.
 */
async function autoRouteComplaint(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const textToClassify = complaint.translatedText || complaint.rawText;
    const { topMatch, matches } = await classifyComplaintText(textToClassify);

    if (!topMatch || !topMatch.category) {
      return res.status(422).json({
        error: 'Auto-routing failed: no suitable category match found.',
        matches,
      });
    }

    const updateData = {
      matchedCategoryId: topMatch.category.id || topMatch.category._id,
      assignedDepartment: topMatch.category.department,
    };

    if (complaint.status === 'pending' || complaint.status === 'classified') {
      updateData.status = 'routed';
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'id email')
      .populate('matchedCategoryId', 'id categoryName department description');

    return res.status(200).json({
      message: 'Complaint auto-routed successfully.',
      topMatch,
      complaint: updatedComplaint,
    });
  } catch (err) {
    console.error('autoRouteComplaint error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /triage/departments
 * Lists distinct departments and active categories for admin dropdowns and filters.
 * Admin role required.
 */
async function getDepartments(req, res) {
  try {
    const categories = await GrievanceCategory.find({})
      .select('categoryName department description')
      .sort({ department: 1 });

    const departmentSet = new Set(categories.map((c) => c.department));

    // Also include any custom assigned departments from complaints
    const assignedDepts = await Complaint.distinct('assignedDepartment', {
      assignedDepartment: { $ne: null },
    });

    assignedDepts.forEach((dept) => {
      if (dept) {
        departmentSet.add(dept);
      }
    });

    return res.status(200).json({
      departments: Array.from(departmentSet).sort(),
      categories,
    });
  } catch (err) {
    console.error('getDepartments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  getTriageComplaints,
  getTriageStats,
  updateTriageComplaint,
  autoRouteComplaint,
  getDepartments,
};
