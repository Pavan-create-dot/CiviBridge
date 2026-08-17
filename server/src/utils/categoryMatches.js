// Formatting helpers for vector-similarity category matches returned by the RAG layer.

/**
 * Round a similarity score to 4 decimal places.
 *
 * @param {number} score
 * @returns {number}
 */
function roundScore(score) {
  return Number(score.toFixed(4));
}

/**
 * Flatten a { category, score } match into a client-facing summary object.
 *
 * @param {{ category: object, score: number }} match
 * @returns {{ id: number, categoryName: string, department: string, score: number }}
 */
function formatCategoryMatch({ category, score }) {
  return {
    id: category.id,
    categoryName: category.categoryName,
    department: category.department,
    score: roundScore(score),
  };
}

/**
 * Format a list of matches.
 *
 * @param {Array<{ category: object, score: number }>} matches
 * @returns {Array<object>}
 */
function formatCategoryMatches(matches) {
  return matches.map(formatCategoryMatch);
}

module.exports = { roundScore, formatCategoryMatch, formatCategoryMatches };
