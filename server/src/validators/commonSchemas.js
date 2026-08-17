// Shared Zod field builders used across route validators.

const { z } = require('zod');
const { SUPPORTED_LANGUAGES } = require('../constants');

/**
 * Email field with a consistent required/format message.
 */
function emailField() {
  return z.string({ required_error: 'Email is required.' }).email('Must be a valid email address.');
}

/**
 * Password field.
 *
 * @param {number} minLength - minimum accepted length
 */
function passwordField(minLength = 8) {
  const message =
    minLength > 1 ? `Password must be at least ${minLength} characters.` : 'Password is required.';
  return z.string({ required_error: 'Password is required.' }).min(minLength, message);
}

/**
 * Required language-code field restricted to the supported languages.
 *
 * @param {string} fieldName - name used in the error message
 */
function languageField(fieldName) {
  return z
    .string({ required_error: `${fieldName} is required.` })
    .refine((val) => SUPPORTED_LANGUAGES.includes(val), {
      message: `${fieldName} must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    });
}

/**
 * Free text field with shared required/length messages.
 *
 * @param {string} fieldName - name used in the required message
 * @param {{ min?: number, max?: number, label?: string }} options - bounds and the
 *   human-readable label used in the length messages (defaults to fieldName)
 */
function textField(fieldName, { min = 1, max = 5000, label = fieldName } = {}) {
  const minMessage =
    min > 1 ? `${label} must be at least ${min} characters.` : `${label} must not be empty.`;
  return z
    .string({ required_error: `${fieldName} is required.` })
    .min(min, minMessage)
    .max(max, `${label} must not exceed ${max} characters.`);
}

module.exports = { emailField, passwordField, languageField, textField };
