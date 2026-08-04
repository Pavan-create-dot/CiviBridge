// Triage controller — Phase 8: Admin & Department Triage Portal API
// Provides department admins with complaint listing, stats, triage updating, and auto-routing.

const prisma = require('../db/prismaClient');
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

    // Construct Prisma dynamic where filter
    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (language) {
      where.detectedLanguage = language;
    }

    if (department) {
      where.OR = [
        { assignedDepartment: { contains: department, mode: 'insensitive' } },
        { matchedCategory: { department: { contains: department, mode: 'insensitive' } } },
      ];
    }

    if (search) {
      const searchCondition = [
        { rawText: { contains: search, mode: 'insensitive' } },
        { translatedText: { contains: search, mode: 'insensitive' } },
        { adminNotes: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        // Combine department and search filters if both are present
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, email: true },
          },
          matchedCategory: {
            select: { id: true, categoryName: true, department: true },
          },
        },
      }),
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
    const totalComplaints = await prisma.complaint.count();

    // Status aggregation
    const statusGroups = await prisma.complaint.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusCounts = {
      pending: 0,
      classified: 0,
      routed: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };

    statusGroups.forEach((g) => {
      statusCounts[g.status] = g._count.status;
    });

    // Priority aggregation
    const priorityGroups = await prisma.complaint.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    priorityGroups.forEach((g) => {
      priorityCounts[g.priority] = g._count.priority;
    });

    // Department aggregation
    const complaintsWithCategory = await prisma.complaint.findMany({
      select: {
        assignedDepartment: true,
        matchedCategory: {
          select: { department: true },
        },
      },
    });

    const departmentCounts = {};
    complaintsWithCategory.forEach((c) => {
      const dept = c.assignedDepartment || c.matchedCategory?.department || 'Unassigned';
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
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  const { assignedDepartment, priority, status, matchedCategoryId, adminNotes } = req.body;

  try {
    const existing = await prisma.complaint.findUnique({ where: { id } });
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
      if (matchedCategoryId === null) {
        updateData.matchedCategoryId = null;
      } else {
        const category = await prisma.grievanceCategory.findUnique({
          where: { id: matchedCategoryId },
        });
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

    const complaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true },
        },
        matchedCategory: {
          select: { id: true, categoryName: true, department: true },
        },
      },
    });

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
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
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
      matchedCategoryId: topMatch.category.id,
      assignedDepartment: topMatch.category.department,
    };

    if (complaint.status === 'pending' || complaint.status === 'classified') {
      updateData.status = 'routed';
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true },
        },
        matchedCategory: {
          select: { id: true, categoryName: true, department: true },
        },
      },
    });

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
    const categories = await prisma.grievanceCategory.findMany({
      select: {
        id: true,
        categoryName: true,
        department: true,
      },
      orderBy: { department: 'asc' },
    });

    const departmentSet = new Set(categories.map((c) => c.department));

    // Also include any custom assigned departments from complaints
    const assignedDepts = await prisma.complaint.findMany({
      where: { assignedDepartment: { not: null } },
      select: { assignedDepartment: true },
      distinct: ['assignedDepartment'],
    });

    assignedDepts.forEach((c) => {
      if (c.assignedDepartment) {
        departmentSet.add(c.assignedDepartment);
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
