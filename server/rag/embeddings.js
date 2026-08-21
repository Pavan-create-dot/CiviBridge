const { GoogleGenerativeAI } = require('@google/generative-ai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _client;
}

// Generate embedding vector using Gemini
async function embedText(text) {
  const client = getClient();
  const models = ['text-embedding-004'];
  let lastErr = null;

  for (const m of models) {
    try {
      const model = client.getGenerativeModel({ model: m });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Embedding failed.');
}

// Cosine similarity formula: (A . B) / (||A|| * ||B||)
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

module.exports = { embedText, cosineSimilarity };
