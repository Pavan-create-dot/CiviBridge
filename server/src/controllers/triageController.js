// Triage controller — provides department admins with complaint listing, stats, triage updating, and auto-routing.

const prisma = require('../db/prismaClient');
const { TRIAGE_INCLUDE } = require('../db/complaintIncludes');
const { classifyComplaintText } = require('../rag/ragService');
const { sendServerError, parseIdParam } = require('../utils/httpHelpers');
const { COMPLAINT_STATUSES, COMPLAINT_PRIORITIES } = require('../constants');

/**
 * Build a zero-filled counter map and populate it from a Prisma groupBy result.
 *
 * @param {string[]} keys - all expected keys, so absent groups report 0
 * @param {Array<object>} groups - groupBy rows
 * @param {string} field - the grouped field name
 * @returns {Record<string, number>}
 */
function countsByField(keys, groups, field) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  groups.forEach((group) => {
    counts[group[field]] = group._count[field];
  });
  return counts;
}

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
      const searchCondition = ['rawText', 'translatedText', 'adminNotes'].map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));

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
        include: TRIAGE_INCLUDE,
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
    return sendServerError(res, 'getTriageComplaints', err);
  }
}

/**
 * GET /triage/stats
 * Aggregates summary statistics for the admin triage dashboard.
 * Admin role required.
 */
async function getTriageStats(req, res) {
  try {
    const [totalComplaints, statusGroups, priorityGroups, complaintsWithCategory] =
      await Promise.all([
        prisma.complaint.count(),
        prisma.complaint.groupBy({ by: ['status'], _count: { status: true } }),
        prisma.complaint.groupBy({ by: ['priority'], _count: { priority: true } }),
        prisma.complaint.findMany({
          select: {
            assignedDepartment: true,
            matchedCategory: { select: { department: true } },
          },
        }),
      ]);

    const statusCounts = countsByField(COMPLAINT_STATUSES, statusGroups, 'status');
    const priorityCounts = countsByField(COMPLAINT_PRIORITIES, priorityGroups, 'priority');

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
    return sendServerError(res, 'getTriageStats', err);
  }
}

/**
 * PATCH /triage/complaints/:id
 * Single endpoint to triage a complaint — update status, assigned department, priority,
 * matched category, or admin notes.
 * Admin role required.
 */
async function updateTriageComplaint(req, res) {
  const id = parseIdParam(req, res);
  if (id === null) return;

  const { assignedDepartment, priority, status, matchedCategoryId, adminNotes } = req.body;

  try {
    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const updateData = {};

    // Only fields explicitly present in the payload are updated
    Object.entries({ assignedDepartment, priority, status, adminNotes }).forEach(
      ([field, value]) => {
        if (value !== undefined) {
          updateData[field] = value;
        }
      }
    );

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
      include: TRIAGE_INCLUDE,
    });

    return res.status(200).json({
      message: 'Complaint triaged successfully.',
      complaint,
    });
  } catch (err) {
    return sendServerError(res, 'updateTriageComplaint', err);
  }
}

/**
 * POST /triage/complaints/:id/auto-route
 * Runs/re-runs RAG classification on a complaint and routes it to the corresponding department.
 * Admin role required.
 */
async function autoRouteComplaint(req, res) {
  const id = parseIdParam(req, res);
  if (id === null) return;

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
      include: TRIAGE_INCLUDE,
    });

    return res.status(200).json({
      message: 'Complaint auto-routed successfully.',
      topMatch,
      complaint: updatedComplaint,
    });
  } catch (err) {
    return sendServerError(res, 'autoRouteComplaint', err);
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
    return sendServerError(res, 'getDepartments', err);
  }
}

module.exports = {
  getTriageComplaints,
  getTriageStats,
  updateTriageComplaint,
  autoRouteComplaint,
  getDepartments,
};
