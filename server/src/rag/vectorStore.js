// Vector store — stores GrievanceCategory embeddings in PostgreSQL and queries them
// by cosine similarity. No external vector DB required.

const prisma = require('../db/prismaClient');
const { embedText, cosineSimilarity } = require('../utils/embeddings');

/**
 * Embed a GrievanceCategory description and persist it.
 * Call this when seeding or adding new categories.
 *
 * @param {number} categoryId
 * @param {string} text - text to embed (typically categoryName + description)
 * @returns {Promise<void>}
 */
async function upsertCategoryEmbedding(categoryId, text) {
  const embedding = await embedText(text);
  await prisma.grievanceCategory.update({
    where: { id: categoryId },
    data: { embedding },
  });
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
  const categories = await prisma.grievanceCategory.findMany({
    where: { embedding: { isEmpty: false } },
  });

  if (categories.length === 0) return [];

  // Score each category by cosine similarity and return top-k
  return categories
    .map((cat) => ({ category: cat, score: cosineSimilarity(queryEmbedding, cat.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { upsertCategoryEmbedding, findSimilarCategories };
