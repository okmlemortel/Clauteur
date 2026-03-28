const Anthropic = require('@anthropic-ai/sdk');
const { build } = require('./systemPrompt');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_REAL_API = !!ANTHROPIC_API_KEY;

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
 * Call Claude Sonnet API with structured JSON response requirement
 */
async function callClaudeAPI(client, systemPrompt, messages) {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    const content = response.content[0]?.text || '';

    // Parse the response as JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', content);
      throw new Error('Claude did not return valid JSON');
    }

    // Validate and normalize response
    return normalizeResponse(parsed);
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Normalize and validate Claude response
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
 * Chat with Claude Sonnet
 * sessionContext: { systemPrompt, messages, caseFile, currentPhase, studentProfile }
 * Returns structured response with message, phase, alertLevel, fieldFeedback, etc.
 */
async function chat(sessionContext) {
  try {
    // If no API key, use fallback mode
    if (!USE_REAL_API) {
      console.log('No ANTHROPIC_API_KEY detected. Using fallback response.');
      return getFallbackResponse();
    }

    // Use real Claude API
    const client = getClient();
    if (!client) {
      return getFallbackResponse();
    }

    const response = await callClaudeAPI(client, sessionContext.systemPrompt, sessionContext.messages);
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
  // Minimal system prompt for greeting
  const greetingSystemPrompt = `You are a warm, encouraging math tutor for a student named ${studentProfile.first_name || 'Élève'}.
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
    if (!USE_REAL_API) {
      return getFallbackResponse();
    }

    const client = getClient();
    if (!client) {
      return getFallbackResponse();
    }

    const response = await callClaudeAPI(client, greetingSystemPrompt, messages);
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
