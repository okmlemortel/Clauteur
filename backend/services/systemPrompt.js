/**
 * System Prompt Builder for v3 Design Spec
 * Constructs dynamic system prompts from student profiles, case templates, and session config
 */

const fs = require('fs');
const path = require('path');

// Load system prompt template from config file, with fallback
let TUTOR_SYSTEM_PROMPT_TEMPLATE;
try {
  const promptPath = path.join(__dirname, '../config/tutorSystemPrompt.txt');
  TUTOR_SYSTEM_PROMPT_TEMPLATE = fs.readFileSync(promptPath, 'utf-8');
} catch (error) {
  console.warn('Warning: Could not load tutor system prompt template from config file:', error.message);
  // Fallback to inline default
  TUTOR_SYSTEM_PROMPT_TEMPLATE = `You are Olivia, a warm and encouraging math tutor for {FIRST_NAME}, age {AGE}.

PROFILE
{FIRST_NAME} speaks {LANGUAGES}. They enjoy {INTERESTS}.
They tend to get discouraged easily, so be patient and celebrate their efforts.
Frustration threshold: {FRUSTRATION_THRESHOLD}.
Cognitive strengths: {COGNITIVE_STRENGTHS}.

SESSION CONFIGURATION
Case: {CASE_TITLE}
{SKILL_LEVELS}
Primary explanation language: {EXPLAIN_LANGUAGE}
Session started: {SESSION_START_TIME}

CASE NARRATIVE
{NARRATIVE}

STUDENT TASK: PLAN & SOLVE & EXPLAIN
1. PLAN phase: Ask the student to outline their approach before solving
   - Use the prompt: "{PLAN_PROMPT}"
   - Guide them to think step-by-step

2. SOLVE phase: Have them work through the problem
   - Ask clarifying questions
   - Don't give answers directly
   - Celebrate progress and effort

3. EXPLAIN phase: Ask them to explain their solution
   - Emphasize reasoning and justification
   - Help them articulate how they got their answer
   - In their preferred language ({EXPLAIN_LANGUAGE})

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
  "message": "Your response to the student (in {EXPLAIN_LANGUAGE} or their preferred language)",
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
}

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

  // Handle both flat and nested profile shapes
  const first_name = studentProfile.first_name || studentProfile.name || 'Élève';
  const age = studentProfile.age || 13;
  const interests = Array.isArray(studentProfile.interests) ? studentProfile.interests : [];
  const frustration_threshold = studentProfile.frustration_threshold || 'medium';
  const cognitive_strengths = Array.isArray(studentProfile.cognitive_strengths) ? studentProfile.cognitive_strengths : [];
  const skill_map = studentProfile.skill_map || {};

  // Languages can be an array ['french','english'] or an object {dominant:'en', fr_comfort:2, ...}
  const rawLangs = studentProfile.languages;
  let langText;
  if (Array.isArray(rawLangs)) {
    langText = rawLangs.includes('french') && rawLangs.includes('english')
      ? 'French and English'
      : rawLangs.includes('french') ? 'French' : 'English';
  } else if (rawLangs && typeof rawLangs === 'object') {
    // Object format from profile JSONB: {dominant, en_comfort, fr_comfort, code_switching}
    const hasFr = rawLangs.fr_comfort > 0 || rawLangs.dominant === 'fr';
    const hasEn = rawLangs.en_comfort > 0 || rawLangs.dominant === 'en';
    langText = (hasFr && hasEn) ? 'French and English' : hasFr ? 'French' : 'English';
  } else {
    langText = 'French and English';
  }

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

  // Replace template placeholders with actual values
  const systemPrompt = TUTOR_SYSTEM_PROMPT_TEMPLATE
    .replace(/{FIRST_NAME}/g, first_name)
    .replace(/{AGE}/g, age)
    .replace(/{LANGUAGES}/g, langText)
    .replace(/{INTERESTS}/g, interestsText)
    .replace(/{FRUSTRATION_THRESHOLD}/g, frustration_threshold)
    .replace(/{COGNITIVE_STRENGTHS}/g, cognitive_strengths.length > 0 ? cognitive_strengths.join(', ') : 'to be discovered')
    .replace(/{CASE_TITLE}/g, title)
    .replace(/{SKILL_LEVELS}/g, skillLevelsText)
    .replace(/{EXPLAIN_LANGUAGE}/g, explain_language)
    .replace(/{SESSION_START_TIME}/g, sessionStartTime)
    .replace(/{NARRATIVE}/g, narrative)
    .replace(/{PLAN_PROMPT}/g, plan_prompt);

  return systemPrompt;
}

module.exports = {
  build
};
