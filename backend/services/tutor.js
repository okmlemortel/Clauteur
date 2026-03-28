const { chat: llmChat, isProviderAvailable } = require('./llmProvider');
const { build } = require('./systemPrompt');

/**
 * Call the tutor LLM and parse the structured JSON response.
 */
async function callTutorLLM(systemPrompt, messages) {
  try {
    const raw = await llmChat('tutor', systemPrompt, messages);

    // Parse the response as JSON (llmProvider already strips thinking + code fences)
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // If JSON parse fails, return raw text as message with safe defaults
      console.warn('[Tutor] Failed to parse JSON response, returning raw:', e.message);
      return {
        message: raw,
        phase: null,
        alertLevel: 0,
        fieldFeedback: null,
        languageSwitchTo: null,
        cognitiveNotes: {
          justificationLevel: 0,
          connectorsObserved: [],
          engagement: 'medium',
          thinkAloudQuality: null,
          notableObservation: null,
          skillsExercised: []
        }
      };
    }

    // Validate and normalize response
    return normalizeResponse(parsed);
  } catch (error) {
    console.error('Tutor LLM error:', error);
    throw error;
  }
}

/**
 * Normalize and validate tutor response
 */
function normalizeResponse(response) {
  // Ensure message exists
  if (!response.message) {
    throw new Error('Response missing "message" field');
  }

  // Ensure alertLevel is 0-3
  if (response.alertLevel === undefined) {
    response.alertLevel = 0;
  } else if (typeof response.alertLevel !== 'number') {
    response.alertLevel = parseInt(response.alertLevel, 10) || 0;
  }
  response.alertLevel = Math.max(0, Math.min(3, response.alertLevel));

  // Ensure phase is valid or null
  if (response.phase && !['plan', 'solve', 'explain'].includes(response.phase)) {
    response.phase = null;
  }

  // fieldFeedback can be string or null
  if (response.fieldFeedback && typeof response.fieldFeedback !== 'string') {
    response.fieldFeedback = null;
  }

  // languageSwitchTo can be 'en', 'fr', or null
  if (response.languageSwitchTo && !['en', 'fr'].includes(response.languageSwitchTo)) {
    response.languageSwitchTo = null;
  }

  // Ensure cognitiveNotes structure
  if (!response.cognitiveNotes) {
    response.cognitiveNotes = {
      justificationLevel: 2,
      connectorsObserved: [],
      engagement: 'medium',
      thinkAloudQuality: null,
      notableObservation: null,
      skillsExercised: []
    };
  } else {
    response.cognitiveNotes = {
      justificationLevel: Math.max(1, Math.min(4, response.cognitiveNotes.justificationLevel || 2)),
      connectorsObserved: Array.isArray(response.cognitiveNotes.connectorsObserved) ? response.cognitiveNotes.connectorsObserved : [],
      engagement: ['high', 'medium', 'low'].includes(response.cognitiveNotes.engagement) ? response.cognitiveNotes.engagement : 'medium',
      thinkAloudQuality: response.cognitiveNotes.thinkAloudQuality || null,
      notableObservation: response.cognitiveNotes.notableObservation || null,
      skillsExercised: Array.isArray(response.cognitiveNotes.skillsExercised) ? response.cognitiveNotes.skillsExercised : []
    };
  }

  return response;
}

/**
 * Generate a safe fallback response
 */
function getFallbackResponse() {
  return {
    message: "Let's work through this together. What do you think about this problem?",
    phase: null,
    alertLevel: 0,
    fieldFeedback: null,
    languageSwitchTo: null,
    cognitiveNotes: {
      justificationLevel: 2,
      connectorsObserved: [],
      engagement: 'medium',
      thinkAloudQuality: null,
      notableObservation: null,
      skillsExercised: []
    }
  };
}

/**
 * Chat with the tutor LLM
 * sessionContext: { systemPrompt, messages, caseFile, currentPhase, studentProfile }
 * Returns structured response with message, phase, alertLevel, fieldFeedback, etc.
 */
async function chat(sessionContext) {
  try {
    if (!isProviderAvailable('tutor')) {
      console.log('[Tutor] No provider available. Using fallback response.');
      return getFallbackResponse();
    }

    const response = await callTutorLLM(sessionContext.systemPrompt, sessionContext.messages);
    return response;
  } catch (error) {
    console.error('Chat error, using fallback:', error.message);
    return getFallbackResponse();
  }
}

/**
 * Generate a warm greeting for session start
 */
async function generateGreeting(studentProfile) {
  const name = studentProfile?.profile?.name || studentProfile?.name || studentProfile?.first_name || 'Élève';

  const greetingSystemPrompt = `You are a warm, encouraging math tutor for a student named ${name}.
Generate a brief, friendly greeting that welcomes them to a tutoring session.
Respond ONLY with valid JSON in this format:
{
  "message": "Your greeting here",
  "phase": null,
  "alertLevel": 0,
  "fieldFeedback": null,
  "languageSwitchTo": null,
  "cognitiveNotes": {
    "justificationLevel": 1,
    "connectorsObserved": [],
    "engagement": "medium",
    "thinkAloudQuality": null,
    "notableObservation": null,
    "skillsExercised": []
  }
}`;

  const messages = [
    {
      role: 'user',
      content: 'Say hello and ask what we should work on today. Keep it brief and warm.'
    }
  ];

  try {
    if (!isProviderAvailable('tutor')) {
      return getFallbackResponse();
    }

    const response = await callTutorLLM(greetingSystemPrompt, messages);
    return response;
  } catch (error) {
    console.error('Greeting generation error:', error);
    return getFallbackResponse();
  }
}

module.exports = {
  chat,
  generateGreeting
};
