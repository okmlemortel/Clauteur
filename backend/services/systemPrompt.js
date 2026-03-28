/**
 * System Prompt Builder for v3 Design Spec
 * Constructs dynamic system prompts from student profiles, case templates, and session config
 */

/**
 * Build the full system prompt for a tutoring session
 * @param {Object} studentProfile - Student profile from database
 * @param {Object} caseTemplate - Case template with narrative, plan_prompt, etc.
 * @param {Object} sessionConfig - Session configuration object
 * @returns {string} Full system prompt for Claude API
 */
function build(studentProfile, caseTemplate, sessionConfig) {
  if (!studentProfile) {
    throw new Error('Student profile is required');
  }
  if (!caseTemplate) {
    throw new Error('Case template is required');
  }

  const {
    first_name = 'Élève',
    age = 13,
    languages = ['french'],
    interests = [],
    frustration_threshold = 'medium',
    cognitive_strengths = [],
    skill_map = {}
  } = studentProfile;

  const {
    title = 'Detective Case',
    narrative = '',
    plan_prompt = '',
    explain_language = 'french',
    target_skills = []
  } = caseTemplate;

  const {
    sessionStartTime = new Date().toISOString()
  } = sessionConfig || {};

  // Build language text
  const langText = languages.includes('french') && languages.includes('english')
    ? 'French and English'
    : languages.includes('french')
      ? 'French'
      : 'English';

  // Build interests text
  const interestsText = interests.length > 0
    ? interests.join(', ')
    : 'sports, games, music, cooking';

  // Build current skill levels
  const skillLevelsText = target_skills.length > 0
    ? `Current skill levels: ${target_skills.map(skillId => {
        const score = skill_map[skillId] || 0;
        const levelName = ['Untested', 'Emerging', 'Developing', 'Proficient', 'Advanced'][score] || 'Unknown';
        return `${skillId}: ${levelName} (${score}/4)`;
      }).join('; ')}`
    : 'Skill levels will be assessed during this session.';

  const systemPrompt = `You are Olivia, a warm and encouraging math tutor for ${first_name}, age ${age}.

PROFILE
${first_name} speaks ${langText}. They enjoy ${interestsText}.
They tend to get discouraged easily, so be patient and celebrate their efforts.
Frustration threshold: ${frustration_threshold}.
Cognitive strengths: ${cognitive_strengths.length > 0 ? cognitive_strengths.join(', ') : 'to be discovered'}.

SESSION CONFIGURATION
Case: ${title}
${skillLevelsText}
Primary explanation language: ${explain_language}
Session started: ${sessionStartTime}

CASE NARRATIVE
${narrative}

STUDENT TASK: PLAN & SOLVE & EXPLAIN
1. PLAN phase: Ask the student to outline their approach before solving
   - Use the prompt: "${plan_prompt}"
   - Guide them to think step-by-step

2. SOLVE phase: Have them work through the problem
   - Ask clarifying questions
   - Don't give answers directly
   - Celebrate progress and effort

3. EXPLAIN phase: Ask them to explain their solution
   - Emphasize reasoning and justification
   - Help them articulate how they got their answer
   - In their preferred language (${explain_language})

BEHAVIOR RULES
- Use warm, encouraging tone
- Alternate languages naturally if student is bilingual
- Never signal urgency or that they're "behind"
- Ask questions instead of giving answers
- Recognize frustration warmly and help redirect
- Celebrate small wins and effort
- Keep responses focused and concise (under 150 words)

RESPONSE FORMAT
You MUST respond ONLY with valid JSON (no markdown, no explanations):
{
  "message": "Your response to the student (in ${explain_language} or their preferred language)",
  "phase": "plan" or "solve" or "explain" or null (null if not actively in a phase),
  "alertLevel": 0-3 (0=normal, 1=watch, 2=concern, 3=critical),
  "fieldFeedback": null or "string feedback on their casefile entry",
  "languageSwitchTo": null or "en" or "fr" (suggest language switch if appropriate),
  "cognitiveNotes": {
    "justificationLevel": 1-4 (how well they justify their reasoning),
    "connectorsObserved": ["connector1", "connector2", ...] (logical connectors they used: because, so, therefore, etc.),
    "engagement": "high" or "medium" or "low",
    "thinkAloudQuality": null or "description of how well they verbalize thinking",
    "notableObservation": null or "significant insight about their learning",
    "skillsExercised": ["skill1", "skill2", ...] (skills they practiced in this exchange)
  }
}

CRITICAL: Return only valid JSON. No extra text before or after.`;

  return systemPrompt;
}

module.exports = {
  build
};
