const memory = require('./memory');

// Stub responses for simulating Claude API
const STUB_RESPONSES = [
  {
    en: "That's an interesting question! Let me break it down for you. Think about it this way: if you have 3/4 of a pizza and your friend has 1/4, how much pizza do you have together? Right! So when we add fractions, we need the same denominator. Do you want to try another example?",
    fr: "C'est une bonne question! Je vois que tu as trouvé un pattern intéressant. Peux-tu me montrer comment tu as pensé ça? J'aime quand on raisonne ensemble plutôt que de juste donner la réponse. Qu'est-ce que tu penses du prochain problème?"
  },
  {
    en: "Great effort! I noticed you're working through this really carefully. Sometimes math is about trying different approaches. Let's think about what didn't work here and why. Can you see where the logic breaks down? Then we can build it back up together.",
    fr: "Excellent! Tu es sur la bonne piste. Je vois que tu comprends le concept même si tu n'as pas mis tous les détails. Maintenant essayons de te montrer une autre façon de penser ce problème. Crois-tu que ça marchera mieux?"
  },
  {
    en: "I love that you're thinking about the big picture! Before we jump to the answer, let's pause. What information do we already have? What are we trying to find? Sometimes organizing what we know helps us see the path forward. What do you think?",
    fr: "Je remarque que tu as utilisé un exemple de la cuisine pour expliquer ça — c'est vraiment intelligent! Tes ancres personnelles sont tes meilleurs outils pour apprendre. Voyons si on peut continuer avec ce qu'on connaît."
  },
  {
    en: "You're thinking like a mathematician now! You questioned the problem before jumping in. That's exactly what experts do. Let's keep that energy going — what would happen if we changed one thing in the problem?",
    fr: "C'est intéressant qu'tu voies ça de cette façon. Les erreurs sont nos meilleures prof. Qu'est-ce que tu apprends de ce que tu viens de faire? Comment pourrais-tu l'appliquer ailleurs?"
  }
];

/**
 * Build dynamic system prompt for a student
 */
async function buildSystemPrompt(studentId) {
  try {
    const profile = await memory.getStudentProfile(studentId);
    const sessions = await memory.getLastSessions(studentId, 3);
    const knowledge = await memory.getKnowledgeMap(studentId);

    const recentSummary = sessions.length > 0
      ? sessions.map(s => s.summary || 'Session without summary').join('\n')
      : 'No previous sessions yet.';

    const activeZones = knowledge.nodes && knowledge.nodes.length > 0
      ? knowledge.nodes.map(n => `${n.concept} (mastery: ${n.mastery_level})`).join(', ')
      : 'No knowledge zones yet';

    return `You are the AI tutor for a 13-year-old student.

COGNITIVE PROFILE:
- Age: ${profile.age || 13} years old
- Languages: ${(profile.languages || ['english']).join(', ')}
- Learning stage: ${profile.cognitive_stage || 1}/4
- Best anchor for learning: ${profile.best_anchor || 'examples'}
- Frustration threshold: ${profile.frustration_threshold || 3} minutes
- Interests: ${(profile.interests || []).join(', ') || 'various topics'}

ACTIVE KNOWLEDGE ZONES:
${activeZones}

RECENT SESSION CONTEXT:
${recentSummary}

YOUR ROLE:
- Be warm, encouraging, and patient
- Use the student's interests (${profile.best_anchor || 'personal anchors'}) to explain concepts
- Ask questions to help them think through problems
- Never point out delays or compare to grade level
- Always identify yourself as an AI tutor
- Keep explanations clear and age-appropriate
- Celebrate effort and curiosity
- Max session duration: 35 minutes

SAFETY PROTOCOL:
- If student expresses self-harm, immediately pause tutoring
- Respond with support and escalate to parent
- Do not continue normal tutoring after level 3 alert

Remember: Your goal is not just to teach content, but to help this student develop confidence in their thinking.`;
  } catch (error) {
    console.error('Error building system prompt:', error);
    // Return a basic fallback prompt
    return `You are an AI tutor for a 13-year-old student. Be warm, encouraging, and patient. Use examples they relate to. Ask questions to help them think through problems. Never point out delays or compare to grade level.`;
  }
}

/**
 * Simulate Claude API response for stubbed responses
 * In production, this would call the actual Anthropic API
 */
function chat(systemPrompt, messages) {
  // For now, return a random stub response from our collection
  const randomIndex = Math.floor(Math.random() * STUB_RESPONSES.length);
  const stub = STUB_RESPONSES[randomIndex];

  // Simple language detection from messages
  let response = stub.en;
  if (messages && messages.length > 0) {
    const lastMessage = messages[messages.length - 1].content || '';
    const frenchPatterns = /\b(je|tu|il|elle|nous|vous|pour|avec|pourquoi|comment|comment|oui|non)\b/i;
    if (frenchPatterns.test(lastMessage)) {
      response = stub.fr;
    }
  }

  return {
    content: response,
    role: 'assistant'
  };
}

/**
 * Generate a parent report from session data
 */
function generateParentReport(sessionData) {
  const cognitiveObservations = {
    engagement_level: Math.random() > 0.5 ? 'high' : 'moderate',
    frustration_events: Math.floor(Math.random() * 3),
    self_correction: Math.random() > 0.4,
    question_quality: ['surface', 'moderate', 'deep'][Math.floor(Math.random() * 3)],
    connection_making: Math.random() > 0.5
  };

  const recommendations = [
    'Continue building on their strengths with practical examples',
    'Encourage more self-questioning before jumping to answers',
    'Use more visual/interactive explanations when they seem stuck',
    'Celebrate small wins to build confidence'
  ];

  return {
    summary: `Session focused on ${sessionData.mode || 'learning new concepts'}. Student showed ${cognitiveObservations.engagement_level} engagement.`,
    cognitive_observations: cognitiveObservations,
    duration_minutes: sessionData.duration || 0,
    concepts_touched: sessionData.concepts || [],
    recommendations: recommendations,
    next_focus: 'Continue reinforcing foundational concepts',
    alert_level: 0
  };
}

module.exports = {
  buildSystemPrompt,
  chat,
  generateParentReport
};
