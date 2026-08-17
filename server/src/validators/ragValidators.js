// Input validators for RAG routes using Zod

const { z } = require('zod');
const { textField } = require('./commonSchemas');
const { SUPPORTED_LANGUAGES } = require('../constants');

// Schema for POST /rag/draft
const draftSchema = z.object({
  prompt: textField('prompt', { min: 5, max: 2000, label: 'Prompt' }),
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
  query: textField('query', { min: 3, max: 500, label: 'Query' }),
  topK: z.number().int().min(1).max(10).optional().default(3),
});

module.exports = { draftSchema, searchCategoriesSchema };
