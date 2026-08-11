// Input validators for RAG routes using Zod

const { z } = require('zod');
const { validate } = require('./authValidators');

const SUPPORTED_LANGUAGES = ['en', 'te', 'hi'];

// Schema for POST /rag/draft
const draftSchema = z.object({
  prompt: z
    .string({ required_error: 'prompt is required.' })
    .min(5, 'Prompt must be at least 5 characters.')
    .max(2000, 'Prompt must not exceed 2000 characters.'),
  language: z
    .string()
    .optional()
    .default('en')
    .refine((val) => SUPPORTED_LANGUAGES.includes(val), {
      message: `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    }),
});

// Schema for POST /rag/categories/search
const searchCategoriesSchema = z.object({
  query: z
    .string({ required_error: 'query is required.' })
    .min(3, 'Query must be at least 3 characters.')
    .max(500, 'Query must not exceed 500 characters.'),
  topK: z.number().int().min(1).max(10).optional().default(3),
});

module.exports = { draftSchema, searchCategoriesSchema, validate };
