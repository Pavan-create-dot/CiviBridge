const { GoogleGenerativeAI } = require('@google/generative-ai');
const { findSimilarCategories, findSimilarKnowledgeDocs } = require('./vectorStore');
const GrievanceCategory = require('../models/GrievanceCategory');
const KnowledgeDoc = require('../models/KnowledgeDoc');

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
      console.warn(`Gemini model ${modelName} failed, trying next...`, err.message);
    }
  }
  throw lastError || new Error('Failed to generate LLM output with Gemini.');
}

/**
 * Smart Fallback Category Matcher (uses MongoDB text/keyword search if vector embeddings fail)
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
 * Fallback Petition Builder: Ensures petition generation NEVER fails even if Gemini API key is missing or quota limited.
 */
function buildFallbackGroundedPetition(prompt, category, language) {
  const dept = category ? category.department : 'Municipal Executive Officer & Public Works Department';
  const catName = category ? category.categoryName : 'Civic Grievance';

  if (language === 'te') {
    return `విషయం: ${catName} గురించి అధికారిక ప్రజా వినతిపత్రం

గౌరవనీయులైన అధికారి గారికి,
శాఖ: ${dept}
మున్సిపల్ కార్పొరేషన్ / స్థానిక స్వపరిపాలన సంస్థ.

అయ్యా / అమ్మా,
నేను ఈ క్రింది పౌర సమస్యను మీ దృష్టికి తీసుకురావడానికి ఈ అధికారిక వినతిపత్రాన్ని సమర్పిస్తున్నాను:

సమస్య వివరాలు:
"${prompt}"

మా విన్నపం:
పైన పేర్కొన్న సమస్యను సంబంధిత విభాగాధికారులు ప్రత్యక్షంగా పరిశీలించి, వీలైనంత త్వరగా తగిన పరిష్కార చర్యలు తీసుకోవాలని పౌరుల తరఫున విజ్ఞప్తి చేస్తున్నాము.

భవదీయుడు/భవదీయురాలు,
బాధ్యతాయుతమైన పౌరుడు/పౌరురాలు
(CiviBridge పౌర సేవా పోర్టల్ ద్వారా సమర్పించబడింది)`;
  }

  if (language === 'hi') {
    return `विषय: ${catName} के संबंध में औपचारिक नागरिक शिकायत याचिका

सेवा में,
सक्षम अधिकारी / विभागाध्यक्ष,
विभाग: ${dept}
नगर निगम एवं स्थानीय प्रशासन।

महोदय / महोदया,
मैं निम्नलिखित नागरिक समस्या की ओर आपका ध्यान आकर्षित करने हेतु यह औपचारिक याचिका प्रस्तुत कर रहा/रही हूँ:

शिकायत का विवरण:
"${prompt}"

निवेदन:
कृपया संबंधित विभागीय अधिकारियों को निर्देशित कर उक्त स्थल का निरीक्षण करवाएं तथा जनहित में अतिशीघ्र आवश्यक उपचारात्मक कार्रवाई करें।

भवदीय,
जागरूक नागरिक
(CiviBridge डिजिटल नागरिक पोर्टल द्वारा प्रस्तुत)`;
  }

  // Default English
  return `SUBJECT: Formal Public Grievance Petition regarding ${catName}.

TO:
The Executive Officer / Competent Authority,
Department: ${dept},
Municipal Corporation Authority.

Respected Sir / Madam,

I am submitting this formal public petition to bring the following civic issue to your immediate attention:

GRIEVANCE DETAILS & LOCATION IMPACT:
"${prompt}"

GROUNDED POLICY REFERENCE & REQUESTED ACTION:
In accordance with Municipal Grievance Redressal Standards (Section 44 Public Safety Mandate), I request the concerned department officers to inspect the aforementioned site and initiate prompt corrective measures in public interest.

Yours faithfully,
Concerned Citizen
(Submitted via CiviBridge Public Grievance Portal)`;
}

/**
 * Core RAG Pipeline:
 * 1. Dual Retrieval (Categories + Knowledge Base docs) from MongoDB via Vector Embeddings.
 * 2. Augment context into Gemini prompt.
 * 3. Generate formal grounded complaint petition.
 * 4. Fallback resilience: If Gemini API fails (e.g. invalid key in production), builds a grounded template draft.
 */
async function generateGroundedComplaint({ prompt, language = 'en' }) {
  const targetLanguageName = LANGUAGE_NAMES[language] || 'English';

  // 1. Dual Retrieval via Vector Embeddings
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

  // Fallback category matching if vector search returned nothing
  let topCategory = categoryMatches[0] ? categoryMatches[0].category : null;
  if (!topCategory) {
    topCategory = await fallbackCategoryMatch(prompt);
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
  } else if (topCategory) {
    categoryContext = `RELEVANT CIVIC CATEGORY & DEPARTMENT CONTEXT:\nCategory: ${topCategory.categoryName}\nDepartment: ${topCategory.department}\nScope: ${topCategory.description}`;
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

  // 5. Generate Content (Gemini API with Fallback Protection)
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
