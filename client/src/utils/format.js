// Shared formatting helpers for complaint data.

/**
 * Format an ISO timestamp as a locale date string.
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString();
}

/**
 * Format a 0–1 similarity score as a whole-number percentage.
 *
 * @param {number} score
 * @returns {string}
 */
export function formatScorePercent(score) {
  return `${(score * 100).toFixed(0)}%`;
}

/**
 * Department shown for a complaint: the explicit assignment wins over the
 * RAG-matched category department.
 *
 * @param {object} complaint
 * @param {string} [fallback]
 * @returns {string}
 */
export function complaintDepartment(complaint, fallback = '') {
  return complaint.assignedDepartment || complaint.matchedCategory?.department || fallback;
}
