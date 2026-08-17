// Shared UI constants mirroring the server-side grievance domain values.

export const LANGUAGES = [
  { code: 'en', label: 'English (English)' },
  { code: 'te', label: 'Telugu (\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41)' },
  { code: 'hi', label: 'Hindi (\u0939\u093f\u0902\u0926\u0940)' },
];

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'classified', label: 'Classified' },
  { value: 'routed', label: 'Routed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
