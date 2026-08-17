// Input validators for translation routes using Zod

const { z } = require('zod');
const { languageField, textField } = require('./commonSchemas');

// Schema for POST /translate
const translateSchema = z.object({
  text: textField('text'),
  sourceLang: languageField('sourceLang'),
  targetLang: languageField('targetLang'),
});

// Schema for POST /translate/detect
const detectLanguageSchema = z.object({
  text: textField('text'),
});

module.exports = { translateSchema, detectLanguageSchema };
