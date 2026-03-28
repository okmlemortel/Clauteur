const Anthropic = require('@anthropic-ai/sdk');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_REAL_API = !!ANTHROPIC_API_KEY;

const LANGUAGE_AGENT_PROMPT = `You are a linguistic analysis agent. Analyze the student's text and return ONLY valid JSON with no other text:
{
  "language_detected": "en" or "fr",
  "connectors_used": ["because", "so", ...],
  "sentence_count": number,
  "avg_sentence_length": number (words),
  "complexity_score": 1-4,
  "fr_orthography_errors": ["fesais→faisais", ...] (only if French),
  "justification_depth": 1-4,
  "new_connectors": ["which means", ...] (connectors not commonly seen)
}`;

/**
 * Initialize Anthropic client (only if API key present)
 */
function getClient() {
  if (!USE_REAL_API) {
    return null;
  }
  return new Anthropic({
    apiKey: ANTHROPIC_API_KEY
  });
}

/**
 * Analyze student text using Claude Haiku
 * Runs async, does not block
 * Returns a promise
 */
async function analyze(text, language) {
  // Fire async analysis without blocking
  return new Promise((resolve) => {
    // Queue the analysis to run in background
    setImmediate(async () => {
      try {
        if (!USE_REAL_API) {
          // Return empty analysis in stub mode
          resolve({
            language_detected: language || 'en',
            connectors_used: [],
            sentence_count: 0,
            avg_sentence_length: 0,
            complexity_score: 2,
            fr_orthography_errors: [],
            justification_depth: 2,
            new_connectors: []
          });
          return;
        }

        const client = getClient();
        if (!client) {
          resolve({
            language_detected: language || 'en',
            connectors_used: [],
            sentence_count: 0,
            avg_sentence_length: 0,
            complexity_score: 2,
            fr_orthography_errors: [],
            justification_depth: 2,
            new_connectors: []
          });
          return;
        }

        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: LANGUAGE_AGENT_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Analyze this text: "${text}"`
            }
          ]
        });

        const content = response.content[0]?.text || '{}';
        let parsed = {};
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          console.error('Failed to parse language analysis:', e);
        }

        resolve({
          language_detected: parsed.language_detected || language || 'en',
          connectors_used: parsed.connectors_used || [],
          sentence_count: parsed.sentence_count || 0,
          avg_sentence_length: parsed.avg_sentence_length || 0,
          complexity_score: Math.max(1, Math.min(4, parsed.complexity_score || 2)),
          fr_orthography_errors: parsed.fr_orthography_errors || [],
          justification_depth: Math.max(1, Math.min(4, parsed.justification_depth || 2)),
          new_connectors: parsed.new_connectors || []
        });
      } catch (error) {
        console.error('Language analysis error:', error);
        resolve({
          language_detected: language || 'en',
          connectors_used: [],
          sentence_count: 0,
          avg_sentence_length: 0,
          complexity_score: 2,
          fr_orthography_errors: [],
          justification_depth: 2,
          new_connectors: []
        });
      }
    });
  });
}

module.exports = {
  analyze
};
