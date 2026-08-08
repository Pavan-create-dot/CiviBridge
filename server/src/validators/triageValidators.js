// Input validators for admin triage routes using Zod.

const { z } = require('zod');
const { validate } = require('./authValidators');

// Schema for GET /triage/complaints query parameters
const triageQuerySchema = z.object({
  status: z
    .enum(['pending', 'classified', 'routed', 'in_progress', 'resolved', 'rejected'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  department: z.string().optional(),
  language: z.enum(['en', 'te', 'hi']).optional(),
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
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z
      .enum(['pending', 'classified', 'routed', 'in_progress', 'resolved', 'rejected'])
      .optional(),
    matchedCategoryId: z.number().nullable().optional(),
    adminNotes: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.assignedDepartment !== undefined ||
      data.priority !== undefined ||
      data.status !== undefined ||
      data.matchedCategoryId !== undefined ||
      data.adminNotes !== undefined,
    { message: 'At least one field must be provided to update the complaint triage status.' }
  );

module.exports = {
  triageQuerySchema,
  updateTriageSchema,
  validate,
};
