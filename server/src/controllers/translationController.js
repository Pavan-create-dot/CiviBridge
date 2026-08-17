// Translation controller — exposes Gemini-backed translation and language detection to authenticated clients.

const { translateText, detectLanguage } = require('../services/translationService');

/**
 * Map a Gemini service failure onto an HTTP response.
 * Configuration problems surface as 503, bad input as 400, everything else as 502.
 *
 * @param {import('express').Response} res
 * @param {string} context - handler name used as the log prefix
 * @param {Error} err
 * @param {string} fallbackMessage - client-facing message for unexpected upstream failures
 */
function sendGeminiError(res, context, err, fallbackMessage) {
  console.error(`${context} error:`, err);

  if (err.message.includes('GEMINI_API_KEY')) {
    return res.status(503).json({ error: 'Translation service is not configured.' });
  }
  if (err.message.includes('Unsupported language')) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(502).json({ error: fallbackMessage });
}

/**
 * POST /translate
 * Translates submitted text between supported languages.
 *
 * Expects req.body: { text, sourceLang, targetLang }
 * Returns: 200 OK with { originalText, translatedText, sourceLang, targetLang }
 */
async function translate(req, res) {
  const { text, sourceLang, targetLang } = req.body;

  try {
    const translatedText = await translateText(text, sourceLang, targetLang);

    return res.status(200).json({
      originalText: text,
      translatedText,
      sourceLang,
      targetLang,
    });
  } catch (err) {
    return sendGeminiError(
      res,
      'translate',
      err,
      'Translation service encountered an error. Please try again.'
    );
  }
}

/**
 * POST /translate/detect
 * Detects the language of submitted text.
 *
 * Expects req.body: { text }
 * Returns: 200 OK with { text, detectedLanguage, confidence }
 */
async function detect(req, res) {
  const { text } = req.body;

  try {
    const { detectedLanguage, confidence } = await detectLanguage(text);

    return res.status(200).json({ text, detectedLanguage, confidence });
  } catch (err) {
    return sendGeminiError(
      res,
      'detect',
      err,
      'Language detection encountered an error. Please try again.'
    );
  }
}

module.exports = { translate, detect };
