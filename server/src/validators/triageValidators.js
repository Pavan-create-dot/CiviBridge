// Input validators for admin triage routes using Zod.

const { z } = require('zod');
const { COMPLAINT_STATUSES, COMPLAINT_PRIORITIES, SUPPORTED_LANGUAGES } = require('../constants');

const TRIAGE_UPDATE_FIELDS = [
  'assignedDepartment',
  'priority',
  'status',
  'matchedCategoryId',
  'adminNotes',
];

// Schema for GET /triage/complaints query parameters
const triageQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  department: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for PATCH /triage/complaints/:id
const updateTriageSchema = z
  .object({
    assignedDepartment: z.string().nullable().optional(),
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    matchedCategoryId: z.number().nullable().optional(),
    adminNotes: z.string().nullable().optional(),
  })
  .refine((data) => TRIAGE_UPDATE_FIELDS.some((field) => data[field] !== undefined), {
    message: 'At least one field must be provided to update the complaint triage status.',
  });

module.exports = {
  triageQuerySchema,
  updateTriageSchema,
};
