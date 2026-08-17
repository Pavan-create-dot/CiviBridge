// Embedding utility — generates text embeddings via Gemini for semantic similarity search.

const { getModel, EMBEDDING_MODEL } = require('./geminiClient');

/**
 * Generate a text embedding vector for the given content.
 *
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
async function embedText(text) {
  const result = await getModel(EMBEDDING_MODEL).embedContent(text);
  return result.embedding.values;
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

module.exports = { embedText, cosineSimilarity };
