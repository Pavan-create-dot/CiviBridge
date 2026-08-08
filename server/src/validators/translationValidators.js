// Input validators for translation routes using Zod

const { z } = require('zod');
const { validate } = require('./authValidators');

const SUPPORTED_LANGUAGES = ['en', 'te', 'hi'];

// Schema for POST /translate
const translateSchema = z.object({
  text: z
    .string({ required_error: 'text is required.' })
    .min(1, 'text must not be empty.')
    .max(5000, 'text must not exceed 5000 characters.'),
  sourceLang: z
    .string({ required_error: 'sourceLang is required.' })
    .refine((val) => SUPPORTED_LANGUAGES.includes(val), {
      message: `sourceLang must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    }),
  targetLang: z
    .string({ required_error: 'targetLang is required.' })
    .refine((val) => SUPPORTED_LANGUAGES.includes(val), {
      message: `targetLang must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    }),
});

// Schema for POST /translate/detect
const detectLanguageSchema = z.object({
  text: z
    .string({ required_error: 'text is required.' })
    .min(1, 'text must not be empty.')
    .max(5000, 'text must not exceed 5000 characters.'),
});

module.exports = { translateSchema, detectLanguageSchema, validate };
