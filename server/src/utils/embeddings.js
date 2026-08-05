// Embedding utility — Phase 6
// Generates text embeddings via Gemini for semantic similarity search.

const { GoogleGenerativeAI } = require('@google/generative-ai');

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
  _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _client;
}

/**
 * Generate a text embedding vector for the given content.
 * Uses Gemini text-embedding-004 (768 dimensions).
 *
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
async function embedText(text) {
  // gemini-embedding-001 is the confirmed available embedding model for this API key
  const model = getClient().getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
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
