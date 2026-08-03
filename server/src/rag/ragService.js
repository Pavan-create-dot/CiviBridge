// RAG Service — Phase 7
// Integrates vector retrieval from PostgreSQL with Gemini LLM generation.
// Provides complaint auto-classification and context-augmented drafting.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { findSimilarCategories } = require('./vectorStore');

const LANGUAGE_NAMES = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

let _genAI = null;
let _model = null;

function getModel() {
  if (_model) return _model;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  _model = _genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  return _model;
}

/**
 * Classify complaint text by finding top matching GrievanceCategory via vector similarity.
 *
 * @param {string} text - Complaint text (preferably in English, or translatedText).
 * @param {number} topK - Number of top matching categories to inspect (default 3).
 * @returns {Promise<{ topMatch: { category: object, score: number } | null, matches: Array<{ category: object, score: number }> }>}
 */
async function classifyComplaintText(text, topK = 3) {
  if (!text || text.trim().length === 0) {
    return { topMatch: null, matches: [] };
  }

  try {
    const matches = await findSimilarCategories(text, topK);
    const topMatch = matches.length > 0 ? matches[0] : null;
    return { topMatch, matches };
  } catch (err) {
    console.error('classifyComplaintText error:', err.message);
    return { topMatch: null, matches: [] };
  }
}

/**
 * Draft a formal civic grievance complaint using RAG (Retrieval-Augmented Generation).
 * Retrieves relevant category context using vector search, then passes context + user prompt to Gemini.
 *
 * @param {object} params
 * @param {string} params.prompt - Brief description/notes provided by the user.
 * @param {string} params.language - Target output language ISO code ('en', 'te', 'hi').
 * @returns {Promise<{ draft: string, matchedCategories: Array<{ id: number, categoryName: string, department: string, score: number }> }>}
 */
async function draftComplaintWithRAG({ prompt, language = 'en' }) {
  const targetLanguageName = LANGUAGE_NAMES[language] || 'English';

  // 1. Retrieve top context categories via vector similarity
  let matches = [];
  try {
    matches = await findSimilarCategories(prompt, 3);
  } catch (err) {
    console.warn('RAG retrieval warning (proceeding without vector context):', err.message);
  }

  // 2. Format category context for prompt augmentation
  let contextBlock = '';
  if (matches.length > 0) {
    const categoryDescriptions = matches
      .map(
        (m, idx) =>
          `Category ${idx + 1}: ${m.category.categoryName}\nDepartment: ${m.category.department}\nScope: ${m.category.description}`
      )
      .join('\n\n');

    contextBlock = [
      `RELEVANT CIVIC CATEGORY CONTEXT:`,
      categoryDescriptions,
      ``,
    ].join('\n');
  }

  // 3. Construct Gemini RAG prompt
  const ragPrompt = [
    `You are CiviBridge, an expert AI assistant for drafting formal civic grievance complaints for government departments.`,
    `Your goal is to transform the user's brief notes into a clear, detailed, respectful, and structured formal complaint petition.`,
    ``,
    contextBlock,
    `INSTRUCTIONS:`,
    `- Draft the complaint petition strictly in ${targetLanguageName}.`,
    `- Address it to the relevant Municipal/Government Department based on the context above.`,
    `- Include clear headings (e.g., Subject, Complaint Details, Location/Impact, Requested Action).`,
    `- Keep the tone formal, polite, and actionable.`,
    `- Do not include place-holder tags like [Insert Name]; leave space clean and natural.`,
    ``,
    `USER'S INITIAL NOTES:`,
    prompt,
  ].filter(Boolean).join('\n');

  // 4. Generate content with Gemini
  const model = getModel();
  const result = await model.generateContent(ragPrompt);
  const draft = result.response.text().trim();

  const formattedCategories = matches.map((m) => ({
    id: m.category.id,
    categoryName: m.category.categoryName,
    department: m.category.department,
    score: Number(m.score.toFixed(4)),
  }));

  return {
    draft,
    matchedCategories: formattedCategories,
  };
}

module.exports = {
  classifyComplaintText,
  draftComplaintWithRAG,
};
