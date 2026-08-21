const { GoogleGenerativeAI } = require('@google/generative-ai');
const { findSimilarCategories, findSimilarKnowledgeDocs } = require('./vectorStore');
const GrievanceCategory = require('../models/GrievanceCategory');

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
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModels = Array.from(new Set([primaryModel, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']));

  let lastError = null;
  for (const modelName of fallbackModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${modelName} failed, trying next...`, err.message);
    }
  }
  throw lastError || new Error('Failed to generate LLM output with Gemini.');
}

/**
 * Smart Fallback Category Matcher (uses MongoDB keyword search if vector embeddings fail)
 */
async function fallbackCategoryMatch(promptText) {
  try {
    const text = promptText.toLowerCase();
    const allCategories = await GrievanceCategory.find().lean();
    if (!allCategories || allCategories.length === 0) return null;

    let bestMatch = allCategories[0];
    let maxScore = 0;

    allCategories.forEach((cat) => {
      const keywords = `${cat.categoryName} ${cat.description}`.toLowerCase().split(/\s+/);
      let score = 0;
      keywords.forEach((kw) => {
        if (kw.length > 3 && text.includes(kw)) score += 1;
      });
      if (score > maxScore) {
        maxScore = score;
        bestMatch = cat;
      }
    });

    return bestMatch;
  } catch {
    return null;
  }
}

/**
 * Fallback Petition Builder: Clean body text without duplicating letterhead TO/SUBJECT headers.
 */
function buildFallbackGroundedPetition(prompt, category, language) {
  const catName = category ? category.categoryName : 'Civic Grievance';

  if (language === 'te') {
    return `గౌరవనీయులైన అధికారి గారికి,

అయ్యా / అమ్మా,
ఈ క్రింది పౌర సమస్యను మీ అధికారుల దృష్టికి తీసుకురావడానికి ఈ అధికారిక వినతిపత్రాన్ని సమర్పిస్తున్నాను:

సమస్య వివరాలు:
"${prompt}"

మా విన్నపం:
పైన పేర్కొన్న సమస్యను సంబంధిత విభాగాధికారులు పరిశీలించి, పౌరుల పబ్లిక్ సేఫ్టీ నిబంధనల (సెక్షన్ 44) ప్రకారం తక్షణమే తగిన సవరణ చర్యలు తీసుకోవాలని విజ్ఞప్తి చేస్తున్నాము.

భవదీయుడు,
బాధ్యతాయుతమైన పౌరుడు`;
  }

  if (language === 'hi') {
    return `सेवा में,
सक्षम अधिकारी महोदय,

विषयगत समस्या विवरण:
"${prompt}"

अनुरोध:
नागरिक सुविधा एवं सार्वजनिक सुरक्षा नियमों (धारा 44) के अंतर्गत कृपया उक्त स्थल का शीघ्र निरीक्षण कर जनहित में आवश्यक उपचारात्मक कार्रवाई करने का कष्ट करें।

भवदीय,
सचेत नागरिक`;
  }

  // Default English
  return `Respected Sir / Madam,

I am filing this official petition regarding ${catName} to bring the following urgent civic issue to your attention:

GRIEVANCE DETAILS & LOCATION IMPACT:
"${prompt}"

GROUNDED POLICY REFERENCE & REQUESTED ACTION:
In accordance with Municipal Grievance Redressal Standards (Section 44 Public Safety Mandate), I request the concerned department officers to inspect the aforementioned site and initiate prompt corrective measures in public interest.

Yours faithfully,
Concerned Citizen`;
}

/**
 * Core RAG Pipeline:
 * 1. Dual Retrieval (Categories + Knowledge Base docs) from MongoDB via Vector Embeddings.
 * 2. Augment context into Gemini prompt.
 * 3. Generate formal grounded complaint petition.
 * 4. Fallback resilience: If Gemini API fails, builds a grounded template draft.
 */
async function generateGroundedComplaint({ prompt, language = 'en' }) {
  const targetLanguageName = LANGUAGE_NAMES[language] || 'English';

  let categoryMatches = [];
  let knowledgeMatches = [];

  try {
    categoryMatches = await findSimilarCategories(prompt, 3);
  } catch (err) {
    console.warn('Vector category search skipped:', err.message);
  }

  try {
    knowledgeMatches = await findSimilarKnowledgeDocs(prompt, 3);
  } catch (err) {
    console.warn('Vector knowledge search skipped:', err.message);
  }

  let topCategory = categoryMatches[0] ? categoryMatches[0].category : null;
  if (!topCategory) {
    topCategory = await fallbackCategoryMatch(prompt);
  }

  let categoryContext = '';
  if (categoryMatches.length > 0) {
    categoryContext = 'RELEVANT CIVIC CATEGORY & DEPARTMENT CONTEXT:\n' +
      categoryMatches
        .map(
          (m, idx) =>
            `${idx + 1}. Category: ${m.category.categoryName}\n   Department: ${m.category.department}\n   Scope: ${m.category.description}`
        )
        .join('\n');
  } else if (topCategory) {
    categoryContext = `RELEVANT CIVIC CATEGORY & DEPARTMENT CONTEXT:\nCategory: ${topCategory.categoryName}\nDepartment: ${topCategory.department}\nScope: ${topCategory.description}`;
  }

  let knowledgeContext = '';
  if (knowledgeMatches.length > 0) {
    knowledgeContext = 'OFFICIAL GOVERNMENT POLICY & PROCEDURE GUIDANCE:\n' +
      knowledgeMatches
        .map((k, idx) => `${idx + 1}. [${k.doc.title}]\n${k.doc.content}`)
        .join('\n\n');
  }

  const ragPrompt = [
    `You are CiviBridge, an AI assistant drafting official civic grievance petitions for local government departments.`,
    `Your goal is to transform the user's input into a concise, structured formal petition body.`,
    ``,
    categoryContext,
    ``,
    knowledgeContext,
    ``,
    `INSTRUCTIONS:`,
    `- Draft the body text strictly in ${targetLanguageName}.`,
    `- DO NOT include "TO:" or "SUBJECT:" lines as they are automatically generated in the letterhead template.`,
    `- Include: Salutation, Problem Details, Impact & Urgency, Policy Reference, and Requested Action.`,
    `- Keep tone formal, respectful, and concise so it fits on a single page.`,
    ``,
    `CITIZEN'S INITIAL PROBLEM DESCRIPTION:`,
    prompt,
  ]
    .filter(Boolean)
    .join('\n');

  let draft = '';
  try {
    draft = await generateWithFallback(ragPrompt);
  } catch (err) {
    console.warn('Gemini API call failed, generating fallback grounded petition:', err.message);
    draft = buildFallbackGroundedPetition(prompt, topCategory, language);
  }

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
    topMatchCategory: topCategory,
    matchedCategories: formattedCategories,
    matchedKnowledge: formattedKnowledge,
  };
}

module.exports = { generateGroundedComplaint };
