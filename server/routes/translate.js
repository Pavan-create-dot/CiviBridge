const { Router } = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateJWT } = require('../middleware/auth');

const router = Router();
router.use(authenticateJWT);

const LANGUAGE_NAMES = { en: 'English', te: 'Telugu', hi: 'Hindi' };

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
}

// POST /translate - Translate text between supported languages
router.post('/', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Text and targetLang are required.' });
  }

  if (sourceLang === targetLang) {
    return res.json({ originalText: text, translatedText: text, sourceLang, targetLang });
  }

  try {
    const sourceName = LANGUAGE_NAMES[sourceLang] || 'Auto-detect';
    const targetName = LANGUAGE_NAMES[targetLang] || 'English';

    const prompt = `Translate the following civic grievance document text from ${sourceName} to ${targetName}. Return ONLY the translated text without extra comments or markdown fences.\n\nText:\n${text}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    return res.json({ originalText: text, translatedText, sourceLang, targetLang });
  } catch (err) {
    console.error('Translation route error:', err);
    return res.status(500).json({ error: 'Translation failed.' });
  }
});

// POST /translate/detect - Detect language of text
router.post('/detect', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  try {
    const prompt = `Identify the language of the following text. Respond with ONLY a JSON object: {"detectedLanguage": "en" | "te" | "hi" | "unknown"}.\n\nText:\n${text}`;
    const model = getModel();
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().replace(/^```json/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(raw);
    return res.json({ text, detectedLanguage: parsed.detectedLanguage || 'unknown' });
  } catch (err) {
    console.error('Detect language error:', err);
    return res.json({ text, detectedLanguage: 'unknown' });
  }
});

module.exports = router;
