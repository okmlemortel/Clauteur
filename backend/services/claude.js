const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('./systemPrompt');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_REAL_API = !!ANTHROPIC_API_KEY;

// Structured stub responses for fallback mode (when no API key)
const STUB_RESPONSES = [
  {
    message: "That's an interesting question! Think about it this way: if you have 3/4 of a pizza and your friend has 1/4, how much pizza do you have together? Right! So when we add fractions, we need the same denominator. You want to try another example?",
    phase: "concret",
    alertLevel: 0,
    cognitiveNotes: {
      justificationLevel: 2,
      connectorsUsed: ["analogy", "everyday_example"],
      engagement: "high",
      notableObservation: "Student is engaged with concrete examples"
    }
  },
  {
    message: "Great effort! I noticed you're working through this really carefully. Sometimes math is about trying different approaches. Let's think about what didn't work here and why. Can you see where the logic breaks down?",
    phase: "visuel",
    alertLevel: 0,
    cognitiveNotes: {
      justificationLevel: 2,
      connectorsUsed: ["visual_breakdown", "reflection"],
      engagement: "medium",
      notableObservation: "Student shows self-correction ability"
    }
  },
  {
    message: "I love that you're thinking about the big picture! Before we jump to the answer, let's pause. What information do we already have? What are we trying to find? Sometimes organizing what we know helps us see the path forward. What do you think?",
    phase: "symbolique",
    alertLevel: 0,
    cognitiveNotes: {
      justificationLevel: 3,
      connectorsUsed: ["logic", "structure"],
      engagement: "high",
      notableObservation: "Student demonstrates systems thinking"
    }
  },
  {
    message: "You're thinking like a mathematician now! You questioned the problem before jumping in. That's exactly what experts do. Let's keep that energy going — what would happen if we changed one thing in the problem?",
    phase: null,
    alertLevel: 0,
    cognitiveNotes: {
      justificationLevel: 3,
      connectorsUsed: ["hypothesis", "variation"],
      engagement: "high",
      notableObservation: "Student shows metacognitive awareness"
    }
  }
];

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
 * Call Claude API with structured JSON response requirement
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

    // Validate required fields
    if (!parsed.message) {
      throw new Error('Claude response missing "message" field');
    }

    // Ensure alertLevel is 0-3
    if (parsed.alertLevel === undefined) {
      parsed.alertLevel = 0;
    } else if (typeof parsed.alertLevel !== 'number') {
      parsed.alertLevel = parseInt(parsed.alertLevel, 10) || 0;
    }
    parsed.alertLevel = Math.max(0, Math.min(3, parsed.alertLevel));

    // Ensure phase is valid
    if (parsed.phase && !['concret', 'visuel', 'symbolique'].includes(parsed.phase)) {
      parsed.phase = null;
    }

    // Ensure cognitiveNotes structure
    if (!parsed.cognitiveNotes) {
      parsed.cognitiveNotes = {
        justificationLevel: 2,
        connectorsUsed: [],
        engagement: 'medium',
        notableObservation: null
      };
    } else {
      parsed.cognitiveNotes = {
        justificationLevel: Math.max(1, Math.min(4, parsed.cognitiveNotes.justificationLevel || 2)),
        connectorsUsed: Array.isArray(parsed.cognitiveNotes.connectorsUsed) ? parsed.cognitiveNotes.connectorsUsed : [],
        engagement: ['high', 'medium', 'low'].includes(parsed.cognitiveNotes.engagement) ? parsed.cognitiveNotes.engagement : 'medium',
        notableObservation: parsed.cognitiveNotes.notableObservation || null
      };
    }

    return parsed;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Generate a stub response (for local development without API key)
 */
function generateStubResponse() {
  const randomIndex = Math.floor(Math.random() * STUB_RESPONSES.length);
  return { ...STUB_RESPONSES[randomIndex] };
}

/**
 * Chat with Claude (or fallback to stub)
 * Returns structured response with message, phase, alertLevel, cognitiveNotes
 */
async function chat(systemPrompt, messages, studentProfile = null) {
  try {
    // If no API key, use stub mode
    if (!USE_REAL_API) {
      console.log('No ANTHROPIC_API_KEY detected. Using stub responses.');
      return generateStubResponse();
    }

    // Use real Claude API
    const client = getClient();
    if (!client) {
      return generateStubResponse();
    }

    const response = await callClaudeAPI(client, systemPrompt, messages);
    return response;
  } catch (error) {
    console.error('Chat error, falling back to stub:', error.message);
    return generateStubResponse();
  }
}

/**
 * Generate a warm-up greeting for session start
 */
async function generateGreeting(studentProfile) {
  const systemPrompt = buildSystemPrompt(studentProfile, 'PROGRAMME', []);

  const messages = [
    {
      role: 'user',
      content: 'Say hello and ask what I would like to learn about today. Keep it brief and warm.'
    }
  ];

  return chat(systemPrompt, messages, studentProfile);
}

module.exports = {
  chat,
  generateGreeting,
  buildSystemPrompt
};
