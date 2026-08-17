// Shared domain constants used by validators, services, and controllers.

// Supported grievance languages: ISO code -> human-readable name used in LLM prompts.
const LANGUAGE_NAMES = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_NAMES);

const COMPLAINT_STATUSES = [
  'pending',
  'classified',
  'routed',
  'in_progress',
  'resolved',
  'rejected',
];

const COMPLAINT_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

module.exports = {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
};
