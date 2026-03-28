/**
 * Report Generator for v3 Design Spec
 * Creates parent reports from session data
 */

/**
 * Generate a parent report from session data
 * @param {Object} sessionData - Session data from database
 * @param {Array} messages - All messages from the session (with cognitiveNotes)
 * @param {Object} caseTemplate - The case template used
 * @param {Object} languageAnalysis - Language analysis data (if any)
 * @param {number} durationMinutes - Session duration in minutes
 * @returns {Object} Parent report in specified format
 */
function generateReport(sessionData, messages = [], caseTemplate = {}, languageAnalysis = {}, durationMinutes = 0) {
  const cognitive = aggregateCognitiveData(messages);
  const langData = aggregateLanguageData(languageAnalysis);

  const caseTitle = caseTemplate.title || 'Detective Case';

  // Determine engagement level
  const engagementMap = {
    high: 'high',
    medium: 'medium',
    low: 'low'
  };
  const engagement = engagementMap[cognitive.engagementTrend] || 'medium';

  // Build notable moment
  let notableMoment = 'Student engaged with learning material.';
  if (cognitive.observations && cognitive.observations.length > 0) {
    notableMoment = cognitive.observations[0];
  }

  // Determine plan, solution, and explanation quality
  const planPhaseMessages = messages.filter(m => m.phase === 'plan');
  const solvePhaseMessages = messages.filter(m => m.phase === 'solve');
  const explainPhaseMessages = messages.filter(m => m.phase === 'explain');

  const planQuality = planPhaseMessages.length > 0
    ? Math.min(4, Math.ceil(cognitive.avgJustificationLevel * 1.1))
    : null;
  const solutionCorrect = solvePhaseMessages.length > 0 ? 'attempted' : null;
  const explanationQuality = explainPhaseMessages.length > 0
    ? Math.min(4, cognitive.avgJustificationLevel)
    : null;

  // Extract explanation language used
  const explanationLanguage = langData.language_detected || caseTemplate.explain_language || 'french';

  // New connectors learned
  const newConnectors = langData.new_connectors || [];

  // Think-aloud quality
  const thinkAloudQualities = messages
    .filter(m => m.cognitiveNotes && m.cognitiveNotes.thinkAloudQuality)
    .map(m => m.cognitiveNotes.thinkAloudQuality);
  const thinkAloudSummary = thinkAloudQualities.length > 0
    ? thinkAloudQualities[0]
    : null;

  // Next session target (based on skill gaps)
  const skillsExercised = new Set();
  messages.forEach(m => {
    if (m.cognitiveNotes && m.cognitiveNotes.skillsExercised) {
      m.cognitiveNotes.skillsExercised.forEach(s => skillsExercised.add(s));
    }
  });

  let nextSessionTarget = 'Continue building on current skills';
  if (cognitive.avgJustificationLevel < 2) {
    nextSessionTarget = 'Build foundational understanding with more concrete examples';
  } else if (cognitive.avgJustificationLevel >= 3) {
    nextSessionTarget = 'Move toward more abstract problem-solving';
  }

  // Parent action suggestion
  let parentAction = 'Reinforce today\'s learning by asking your child to explain the concept to you.';
  if (engagement === 'low') {
    parentAction = 'Check in on whether the topic was interesting or if something else is on their mind.';
  } else if (engagement === 'high') {
    parentAction = 'Take advantage of high engagement! Encourage exploration of related topics in free time.';
  }

  return {
    date: new Date().toISOString().split('T')[0],
    case: caseTitle,
    duration_minutes: durationMinutes,
    skills_practiced: Array.from(skillsExercised),
    engagement: engagement,
    notable_moment: notableMoment,
    plan_quality: planQuality,
    solution_correct: solutionCorrect,
    explanation_language: explanationLanguage,
    explanation_quality: explanationQuality,
    new_connectors: newConnectors,
    think_aloud: thinkAloudSummary,
    next_session_target: nextSessionTarget,
    parent_action: parentAction,
    cognitive_metrics: {
      avg_justification_level: cognitive.avgJustificationLevel,
      connectors_used_count: cognitive.allConnectors.length,
      unique_connectors: cognitive.allConnectors,
      learning_phases_observed: [...new Set(cognitive.phases)]
    }
  };
}

/**
 * Aggregate cognitive notes from all messages
 */
function aggregateCognitiveData(messages) {
  if (!messages || messages.length === 0) {
    return {
      avgJustificationLevel: 2,
      allConnectors: [],
      engagementTrend: 'medium',
      observations: [],
      phases: []
    };
  }

  const assistantMessages = messages.filter(m => m.cognitiveNotes);

  if (assistantMessages.length === 0) {
    return {
      avgJustificationLevel: 2,
      allConnectors: [],
      engagementTrend: 'medium',
      observations: [],
      phases: []
    };
  }

  // Average justification level
  const justificationLevels = assistantMessages.map(m => m.cognitiveNotes.justificationLevel || 2);
  const avgJustificationLevel = Math.round(
    justificationLevels.reduce((a, b) => a + b, 0) / justificationLevels.length
  );

  // Unique connectors
  const allConnectors = [];
  assistantMessages.forEach(m => {
    if (m.cognitiveNotes.connectorsObserved && Array.isArray(m.cognitiveNotes.connectorsObserved)) {
      allConnectors.push(...m.cognitiveNotes.connectorsObserved);
    }
  });
  const uniqueConnectors = [...new Set(allConnectors)];

  // Engagement trend
  const engagements = assistantMessages.map(m => m.cognitiveNotes.engagement || 'medium');
  const engagementCounts = {};
  engagements.forEach(e => {
    engagementCounts[e] = (engagementCounts[e] || 0) + 1;
  });
  const engagementTrend = Object.keys(engagementCounts).reduce((a, b) =>
    engagementCounts[a] > engagementCounts[b] ? a : b
  );

  // Observations
  const observations = assistantMessages
    .filter(m => m.cognitiveNotes.notableObservation)
    .map(m => m.cognitiveNotes.notableObservation);

  // Phases
  const phases = assistantMessages
    .filter(m => m.phase)
    .map(m => m.phase);

  return {
    avgJustificationLevel,
    allConnectors: uniqueConnectors,
    engagementTrend,
    observations,
    phases
  };
}

/**
 * Aggregate language analysis data
 */
function aggregateLanguageData(languageAnalysis) {
  if (!languageAnalysis || typeof languageAnalysis !== 'object') {
    return {
      language_detected: 'french',
      new_connectors: []
    };
  }

  return {
    language_detected: languageAnalysis.language_detected || 'french',
    new_connectors: languageAnalysis.new_connectors || []
  };
}

module.exports = {
  generateReport,
  aggregateCognitiveData,
  aggregateLanguageData
};
