const fs = require('fs');
const path = require('path');
const { chat: llmChat, isProviderAvailable } = require('./llmProvider');

// Load language agent prompt from config file, with fallback
let LANGUAGE_AGENT_PROMPT;
try {
  const promptPath = path.join(__dirname, '../config/languageAgentPrompt.txt');
  LANGUAGE_AGENT_PROMPT = fs.readFileSync(promptPath, 'utf-8');
} catch (error) {
  console.warn('Warning: Could not load language agent prompt from config file:', error.message);
  // Fallback to inline default
  LANGUAGE_AGENT_PROMPT = `You are a linguistic analysis agent for a 13-year-old bilingual (EN/FR) student named Olivia. Your job is to analyze her text and return structured data. You do NOT interact with her — you only produce analysis.

Analyze the following text and return ONLY a JSON object with no additional text:

{
  "language_detected": "en" or "fr",
  "word_count": number,
  "sentence_count": number,
  "avg_words_per_sentence": number,
  "connectors_used": ["list of logical connectors found"],
  "connectors_new": ["connectors not in her known inventory — see below"],
  "complexity_score": 1-4,
  "justification_depth": 1-4,
  "fr_orthography_errors": [{"written": "what she wrote", "correct": "correct form", "type": "conjugation|spelling|agreement|accent"}],
  "notable_expression": "null or a quote of any particularly well-structured sentence"
}

SCORING GUIDE:
complexity_score: 1=fragments/single clause, 2=simple sentences, 3=compound sentences with subordination, 4=complex sentences with hypotheticals/conditionals
justification_depth: 1=no justification, 2=one reason ("because X"), 3=multiple reasons or layered argument, 4=reasons + anticipation of counterargument

KNOWN CONNECTOR INVENTORY (anything NOT in these lists counts as "new"):
EN: because, so, then, but, if, which, which means, since, given that
FR: parce que, alors, puis, ce qui, quand

TARGET CONNECTORS (flag if she uses any of these — they represent growth):
EN: therefore, however, although, nevertheless, in contrast, as a result, consequently
FR: donc, puisque, cependant, ce qui veut dire, en revanche, d'abord, ensuite, enfin, néanmoins, toutefois

FR ORTHOGRAPHY — KNOWN ERROR PATTERNS (flag if they recur OR if she gets them right):
- "je nais pas" → "je n'ai pas" (ne...pas + avoir conjugation)
- "soite" → "soit" (subjunctive)
- "j'ais voulus" → "j'ai voulu" (passé composé)
- "fesais" → "faisais" (imparfait of faire)
- Verb endings in imparfait (-ais/-ait/-aient)
- Missing accents on common words (à, où, là)`;
}

/**
 * Empty analysis result (used as fallback)
 */
function getEmptyAnalysis(language) {
  return {
    language_detected: language || 'en',
    word_count: 0,
    sentence_count: 0,
    avg_words_per_sentence: 0,
    connectors_used: [],
    connectors_new: [],
    complexity_score: 2,
    fr_orthography_errors: [],
    justification_depth: 2,
    notable_expression: null
  };
}

/**
 * Analyze student text using the language agent LLM.
 * Runs async, does not block.
 * Returns a promise.
 */
async function analyze(text, language) {
  return new Promise((resolve) => {
    setImmediate(async () => {
      try {
        if (!isProviderAvailable('language_agent')) {
          resolve(getEmptyAnalysis(language));
          return;
        }

        const messages = [
          {
            role: 'user',
            content: `Analyze this text: "${text}"`
          }
        ];

        // llmProvider already strips thinking blocks + code fences
        const raw = await llmChat('language_agent', LANGUAGE_AGENT_PROMPT, messages);

        let parsed = {};
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          console.warn('[LanguageAgent] Failed to parse JSON response:', e.message);
          // Graceful fallback: return basic word count from raw text
          resolve({
            language_detected: language || 'unknown',
            word_count: text.split(/\s+/).length,
            sentence_count: 0,
            avg_words_per_sentence: 0,
            connectors_used: [],
            connectors_new: [],
            complexity_score: 0,
            fr_orthography_errors: [],
            justification_depth: 0,
            notable_expression: null
          });
          return;
        }

        resolve({
          language_detected: parsed.language_detected || language || 'en',
          word_count: parsed.word_count || 0,
          sentence_count: parsed.sentence_count || 0,
          avg_words_per_sentence: parsed.avg_words_per_sentence || 0,
          connectors_used: parsed.connectors_used || [],
          connectors_new: parsed.connectors_new || [],
          complexity_score: Math.max(1, Math.min(4, parsed.complexity_score || 2)),
          fr_orthography_errors: parsed.fr_orthography_errors || [],
          justification_depth: Math.max(1, Math.min(4, parsed.justification_depth || 2)),
          notable_expression: parsed.notable_expression || null
        });
      } catch (error) {
        console.error('Language analysis error:', error);
        resolve(getEmptyAnalysis(language));
      }
    });
  });
}

module.exports = {
  analyze
};
