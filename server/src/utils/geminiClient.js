// Gemini client factory — lazily creates and caches one GoogleGenerativeAI client
// and one model instance per model name, so a missing API key only fails at call time.

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GENERATION_MODEL = 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

let client = null;
const models = new Map();

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

/**
 * Get a cached Gemini model instance.
 *
 * @param {string} modelName
 * @returns {object} Gemini generative model
 */
function getModel(modelName = GENERATION_MODEL) {
  const cached = models.get(modelName);
  if (cached) return cached;

  const model = getClient().getGenerativeModel({ model: modelName });
  models.set(modelName, model);
  return model;
}

/**
 * Send a prompt to the generation model and return the trimmed text response.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateText(prompt) {
  const result = await getModel(GENERATION_MODEL).generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { getModel, generateText, GENERATION_MODEL, EMBEDDING_MODEL };
