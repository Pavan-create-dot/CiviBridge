// Vector store — stores GrievanceCategory embeddings in MongoDB and queries them
// by cosine similarity. Option 1: Zero extra Atlas UI setup required.

const GrievanceCategory = require('../models/GrievanceCategory');
const { embedText, cosineSimilarity } = require('../utils/embeddings');

/**
 * Embed a GrievanceCategory description and persist it.
 * Call this when seeding or adding new categories.
 *
 * @param {string} categoryId
 * @param {string} text - text to embed (typically categoryName + description)
 * @returns {Promise<void>}
 */
async function upsertCategoryEmbedding(categoryId, text) {
  const embedding = await embedText(text);
  await GrievanceCategory.findByIdAndUpdate(categoryId, { embedding });
}

/**
 * Find the top-k GrievanceCategories most similar to the query text.
 *
 * @param {string} queryText - the complaint text to match
 * @param {number} topK - number of results to return (default 3)
 * @returns {Promise<Array<{ category: object, score: number }>>}
 */
async function findSimilarCategories(queryText, topK = 3) {
  const queryEmbedding = await embedText(queryText);

  // Load all categories that have been embedded
  const categories = await GrievanceCategory.find({
    embedding: { $exists: true, $not: { $size: 0 } },
  }).lean({ virtuals: true });

  if (categories.length === 0) return [];

  // Normalize id property if needed
  const normalizedCategories = categories.map((cat) => ({
    ...cat,
    id: cat.id || cat._id.toString(),
  }));

  // Score each category by cosine similarity and return top-k
  return normalizedCategories
    .map((cat) => ({ category: cat, score: cosineSimilarity(queryEmbedding, cat.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { upsertCategoryEmbedding, findSimilarCategories };
