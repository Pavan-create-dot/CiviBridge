const { GoogleGenerativeAI } = require('@google/generative-ai');
const { findSimilarCategories, findSimilarKnowledgeDocs } = require('./vectorStore');

const LANGUAGE_NAMES = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Generate LLM text with fallback model names for robustness
 */
async function generateWithFallback(prompt) {
  const client = getClient();
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const fallbackModels = [primaryModel, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];

  let lastError = null;
  for (const modelName of fallbackModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${modelName} failed, trying fallback...`, err.message);
    }
  }
  throw lastError || new Error('Failed to generate LLM output with Gemini.');
}

/**
 * Core RAG Pipeline:
 * 1. Dual Retrieval (Categories + Knowledge Base docs) from MongoDB.
 * 2. Augment context into Gemini prompt.
 * 3. Generate formal grounded complaint petition.
 */
async function generateGroundedComplaint({ prompt, language = 'en' }) {
  const targetLanguageName = LANGUAGE_NAMES[language] || 'English';

  // 1. Dual Retrieval via Vector Embeddings
  let categoryMatches = [];
  let knowledgeMatches = [];

  try {
    categoryMatches = await findSimilarCategories(prompt, 3);
  } catch (err) {
    console.warn('Category retrieval warning:', err.message);
  }

  try {
    knowledgeMatches = await findSimilarKnowledgeDocs(prompt, 3);
  } catch (err) {
    console.warn('Knowledge doc retrieval warning:', err.message);
  }

  // 2. Build Category Context Block
  let categoryContext = '';
  if (categoryMatches.length > 0) {
    categoryContext = 'RELEVANT CIVIC CATEGORY & DEPARTMENT CONTEXT:\n' +
      categoryMatches
        .map(
          (m, idx) =>
            `${idx + 1}. Category: ${m.category.categoryName}\n   Department: ${m.category.department}\n   Scope: ${m.category.description}`
        )
        .join('\n');
  }

  // 3. Build Knowledge Base Policy Context Block
  let knowledgeContext = '';
  if (knowledgeMatches.length > 0) {
    knowledgeContext = 'OFFICIAL GOVERNMENT POLICY & PROCEDURE GUIDANCE:\n' +
      knowledgeMatches
        .map((k, idx) => `${idx + 1}. [${k.doc.title}]\n${k.doc.content}`)
        .join('\n\n');
  }

  // 4. Construct Grounded RAG Prompt
  const ragPrompt = [
    `You are CiviBridge, an AI assistant drafting official civic grievance petitions for local government departments.`,
    `Your goal is to transform the user's input into a structured, formal, and respectful grievance petition.`,
    ``,
    categoryContext,
    ``,
    knowledgeContext,
    ``,
    `INSTRUCTIONS:`,
    `- Draft the formal petition strictly in ${targetLanguageName}.`,
    `- Address the petition to the appropriate Municipal Department identified in the context.`,
    `- Follow standard government petition structure: Subject Line, Addressee, Problem Details, Impact & Urgency, and Requested Action.`,
    `- Ground the petition terms and structure in the provided government policy guidelines above.`,
    `- Keep tone formal, concise, respectful, and actionable.`,
    ``,
    `CITIZEN'S INITIAL PROBLEM DESCRIPTION:`,
    prompt,
  ]
    .filter(Boolean)
    .join('\n');

  // 5. Generate content with Gemini (with automatic fallback)
  const draft = await generateWithFallback(ragPrompt);

  const formattedCategories = categoryMatches.map((m) => ({
    id: m.category._id ? m.category._id.toString() : m.category.id,
    categoryName: m.category.categoryName,
    department: m.category.department,
    score: Number(m.score.toFixed(4)),
  }));

  const formattedKnowledge = knowledgeMatches.map((k) => ({
    id: k.doc._id ? k.doc._id.toString() : k.doc.id,
    title: k.doc.title,
    score: Number(k.score.toFixed(4)),
  }));

  return {
    draft,
    topMatchCategory: categoryMatches[0] ? categoryMatches[0].category : null,
    matchedCategories: formattedCategories,
    matchedKnowledge: formattedKnowledge,
  };
}

module.exports = { generateGroundedComplaint };
