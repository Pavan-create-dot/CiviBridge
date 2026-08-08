// Translation Service — uses Gemini to translate and detect language for civic grievance text.
// Supports English (en), Telugu (te), and Hindi (hi).

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Human-readable names used in prompts so Gemini understands the target
const LANGUAGE_NAMES = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

// Lazily initialised — avoids crashing at startup if the key is missing;
// the calling code decides how to handle a missing key.
let _genAI = null;
let _model = null;

function getModel() {
  if (_model) return _model;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  _model = _genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
  return _model;
}

/**
 * Translate text from one supported language to another.
 *
 * @param {string} text          - The text to translate.
 * @param {string} sourceLang    - ISO code of the source language (en | te | hi).
 * @param {string} targetLang    - ISO code of the target language (en | te | hi).
 * @returns {Promise<string>}    - The translated text.
 */
async function translateText(text, sourceLang, targetLang) {
  const sourceName = LANGUAGE_NAMES[sourceLang];
  const targetName = LANGUAGE_NAMES[targetLang];

  if (!sourceName || !targetName) {
    throw new Error(
      `Unsupported language code. Supported codes: ${Object.keys(LANGUAGE_NAMES).join(', ')}.`
    );
  }

  if (sourceLang === targetLang) {
    return text; // no-op
  }

  const model = getModel();

  const prompt = [
    `You are a precise translation assistant for civic grievance documents.`,
    `Translate the following text from ${sourceName} to ${targetName}.`,
    `Return ONLY the translated text. Do not add explanations, notes, or greetings.`,
    ``,
    `Text to translate:`,
    text,
  ].join('\n');

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Detect the language of a given text.
 * Returns the ISO code (en | te | hi) or 'unknown' if it cannot be determined.
 *
 * @param {string} text          - Text to analyse.
 * @returns {Promise<{ detectedLanguage: string, confidence: string }>}
 */
async function detectLanguage(text) {
  const model = getModel();

  const supportedList = Object.entries(LANGUAGE_NAMES)
    .map(([code, name]) => `"${code}" for ${name}`)
    .join(', ');

  const prompt = [
    `You are a language detection assistant.`,
    `Identify the language of the text below.`,
    `Respond with a JSON object containing exactly two fields:`,
    `  "detectedLanguage": one of ${supportedList}, or "unknown" if none match,`,
    `  "confidence": "high", "medium", or "low".`,
    `Return ONLY the JSON object — no markdown, no code fences, no extra text.`,
    ``,
    `Text:`,
    text,
  ].join('\n');

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    // Strip potential markdown code fences defensively
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      detectedLanguage: parsed.detectedLanguage || 'unknown',
      confidence: parsed.confidence || 'low',
    };
  } catch {
    // If Gemini returns plain text instead of JSON, try to extract the code
    const match = raw.match(/\b(en|te|hi)\b/i);
    return {
      detectedLanguage: match ? match[1].toLowerCase() : 'unknown',
      confidence: 'low',
    };
  }
}

/**
 * Translate a grievance to English for internal processing.
 * Returns null (without throwing) if translation fails — callers should
 * save the complaint anyway with translatedText = null.
 *
 * @param {string} rawText        - Original complaint text.
 * @param {string} sourceLang     - Detected language of the complaint.
 * @returns {Promise<string|null>} - English translation, or null on failure.
 */
async function translateGrievanceToEnglish(rawText, sourceLang) {
  if (sourceLang === 'en') return rawText; // already English

  try {
    return await translateText(rawText, sourceLang, 'en');
  } catch (err) {
    console.error('translateGrievanceToEnglish failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = { translateText, detectLanguage, translateGrievanceToEnglish };
