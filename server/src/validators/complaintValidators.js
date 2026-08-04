// Input validators for complaint routes using Zod

const { z } = require('zod');
const { validate } = require('./authValidators');

// Supported language codes for submitted complaints
const SUPPORTED_LANGUAGES = ['en', 'te', 'hi'];

// Schema for POST /complaints
const submitComplaintSchema = z.object({
  rawText: z
    .string({ required_error: 'rawText is required.' })
    .min(10, 'Complaint text must be at least 10 characters.')
    .max(5000, 'Complaint text must not exceed 5000 characters.'),
  detectedLanguage: z
    .string({ required_error: 'detectedLanguage is required.' })
    .refine((val) => SUPPORTED_LANGUAGES.includes(val), {
      message: `detectedLanguage must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    }),
});

// Schema for PATCH /complaints/:id/status
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'classified', 'routed', 'in_progress', 'resolved', 'rejected'], {
    required_error: 'status is required.',
    message: 'status must be one of: pending, classified, routed, in_progress, resolved, rejected.',
  }),
});

module.exports = { submitComplaintSchema, updateStatusSchema, validate };
