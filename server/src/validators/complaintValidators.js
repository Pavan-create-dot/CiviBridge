// Input validators for complaint routes using Zod

const { z } = require('zod');
const { languageField, textField } = require('./commonSchemas');
const { COMPLAINT_STATUSES } = require('../constants');

// Schema for POST /complaints
const submitComplaintSchema = z.object({
  rawText: textField('rawText', { min: 10, max: 5000, label: 'Complaint text' }),
  detectedLanguage: languageField('detectedLanguage'),
});

// Schema for PATCH /complaints/:id/status
const updateStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES, {
    required_error: 'status is required.',
    message: `status must be one of: ${COMPLAINT_STATUSES.join(', ')}.`,
  }),
});

module.exports = { submitComplaintSchema, updateStatusSchema };
