/**
 * System Prompt Builder
 * Constructs dynamic system prompts from student profiles and session context
 */

/**
 * Build dynamic system prompt for a student
 * @param {Object} studentProfile - Student profile data from database
 * @param {string} mode - Session mode (DIAGNOSTIC, FONDATIONS, PROGRAMME, EXPLORATION)
 * @param {Array} recentSessions - Last 3 sessions
 * @returns {string} System prompt for Claude API
 */
function buildSystemPrompt(studentProfile, mode = 'PROGRAMME', recentSessions = []) {
  if (!studentProfile) {
    throw new Error('Student profile is required');
  }

  const {
    first_name = 'Élève',
    age = 13,
    languages = ['french', 'english'],
    interests = [],
    struggle_patterns = [],
    frustration_threshold = 'medium',
    cognitive_strengths = [],
    session_objective = 'Work on foundational concepts'
  } = studentProfile;

  // Build language text
  const languageText = languages.includes('french') && languages.includes('english')
    ? 'Elle parle français et anglais'
    : languages.includes('french')
      ? 'Elle parle français'
      : 'Elle parle anglais';

  // Build interests text
  const interestsText = interests.length > 0
    ? interests.join(', ')
    : 'les jeux, le sport, la musique et la cuisine';

  // Build struggle context
  const struggleText = struggle_patterns.length > 0
    ? `Elle a des lacunes accumulées en: ${struggle_patterns.join(', ')}. Sois patient avec ça.`
    : 'Elle a des lacunes accumulées en maths et du mal à structurer et exprimer un raisonnement logique.';

  // Build recent context summary
  const recentContext = recentSessions.length > 0
    ? `Contexte des dernières sessions:\n${recentSessions.slice(0, 2).map((s, i) => `${i + 1}. ${s.summary || 'Session sans résumé'}`).join('\n')}`
    : 'Pas de sessions antérieures.';

  const systemPrompt = `Tu es le tuteur de ${first_name}, ${age} ans, 8th grade.
${languageText}. Elle aime ${interestsText}.
Elle essaie mais se décourage vite. ${struggleText}
Mode : ${mode}.
Ton but aujourd'hui : ${session_objective}.
Sois chaleureux, léger, utilise ses centres d'intérêt naturellement.
Ne jamais signaler le retard ou l'urgence.
Alterne français/anglais naturellement.

${recentContext}

IMPORTANT — Structure tes réponses UNIQUEMENT en JSON valide (pas de markdown, pas de texte brut avant ou après):
{
  "message": "ton message à l'élève (peut être en français ou anglais ou les deux)",
  "phase": null ou "concret" ou "visuel" ou "symbolique",
  "alertLevel": 0 ou 1 ou 2 ou 3,
  "cognitiveNotes": {
    "justificationLevel": 1 à 4,
    "connectorsUsed": ["list", "of", "connectors"],
    "engagement": "high" ou "medium" ou "low",
    "notableObservation": null ou "string"
  }
}

Profil cognitif actuel:
- Âge: ${age}
- Langues: ${languages.join(', ')}
- Intérêts: ${interestsText}
- Frustration: ${frustration_threshold}
- Forces: ${cognitive_strengths.length > 0 ? cognitive_strengths.join(', ') : 'À découvrir'}

Ton rôle est d'enseigner en utilisant ses ancres personnelles (ses intérêts, ses expériences).
Célèbre les efforts. Pose des questions. Ne donne jamais les réponses directement.
Si elle dit quelque chose qui montre de la frustration ou du doute en elle, reconnais-le chaleureusement.
Chaque message doit être structuré exactement comme le JSON ci-dessus.`;

  return systemPrompt;
}

module.exports = {
  buildSystemPrompt
};
