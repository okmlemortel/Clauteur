/**
 * Report Generator
 * Creates parent reports from session data and cognitive notes
 */

/**
 * Aggregate cognitive notes from all messages in a session
 * @param {Array} messages - Messages array with cognitiveNotes attached
 * @returns {Object} Aggregated cognitive data
 */
function aggregateCognitiveNotes(messages) {
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

  const justificationLevels = assistantMessages.map(m => m.cognitiveNotes.justificationLevel || 2);
  const avgJustificationLevel = Math.round(justificationLevels.reduce((a, b) => a + b, 0) / justificationLevels.length);

  const allConnectors = [];
  assistantMessages.forEach(m => {
    if (m.cognitiveNotes.connectorsUsed && Array.isArray(m.cognitiveNotes.connectorsUsed)) {
      allConnectors.push(...m.cognitiveNotes.connectorsUsed);
    }
  });
  const uniqueConnectors = [...new Set(allConnectors)];

  // Determine engagement trend (most common)
  const engagements = assistantMessages.map(m => m.cognitiveNotes.engagement || 'medium');
  const engagementCounts = {};
  engagements.forEach(e => {
    engagementCounts[e] = (engagementCounts[e] || 0) + 1;
  });
  const engagementTrend = Object.keys(engagementCounts).reduce((a, b) =>
    engagementCounts[a] > engagementCounts[b] ? a : b
  );

  // Collect observations
  const observations = assistantMessages
    .filter(m => m.cognitiveNotes.notableObservation)
    .map(m => m.cognitiveNotes.notableObservation);

  // Collect phases
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
 * Generate a parent report
 * @param {Object} sessionData - Session data from database
 * @param {Array} messages - All messages from the session (with cognitiveNotes)
 * @param {number} durationMinutes - Session duration
 * @returns {Object} Parent report in specified format
 */
function generateParentReport(sessionData, messages = [], durationMinutes = 0) {
  const cognitive = aggregateCognitiveNotes(messages);

  // Extract subject from messages (rough heuristic)
  let subject = 'General Learning Session';
  if (messages && messages.length > 0) {
    const firstUserMessage = messages.find(m => m.role === 'user')?.content;
    if (firstUserMessage && firstUserMessage.length < 100) {
      subject = firstUserMessage.substring(0, 50);
    }
  }

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

  // Build strengths
  const strengths = [];
  if (engagement === 'high') {
    strengths.push('Shows strong engagement and focus');
  }
  if (cognitive.avgJustificationLevel >= 3) {
    strengths.push('Demonstrates logical reasoning and justification');
  }
  if (cognitive.allConnectors.length > 0) {
    strengths.push(`Uses multiple learning connectors: ${cognitive.allConnectors.slice(0, 3).join(', ')}`);
  }
  if (strengths.length === 0) {
    strengths.push('Made effort to learn');
  }

  // Build blockers (inferred)
  const blockers = [];
  if (engagement === 'low') {
    blockers.push('Engagement is lower than usual - may need a break or topic shift');
  }
  if (cognitive.avgJustificationLevel <= 2) {
    blockers.push('May benefit from more structured logical scaffolding');
  }
  if (blockers.length === 0) {
    blockers.push('No major blockers observed');
  }

  // Cognitive signals
  const cognitiveSignals = [];
  if (cognitive.phases.length > 0) {
    cognitiveSignals.push(`Learning phases observed: ${[...new Set(cognitive.phases)].join(', ')}`);
  }
  if (cognitive.avgJustificationLevel >= 1 && cognitive.avgJustificationLevel <= 4) {
    const phaseNames = ['', 'Very basic', 'Developing', 'Proficient', 'Advanced'];
    cognitiveSignals.push(`Justification level: ${phaseNames[cognitive.avgJustificationLevel]}`);
  }
  if (cognitive.allConnectors.length > 0) {
    cognitiveSignals.push(`Evidence of connector usage: ${cognitive.allConnectors.length} unique strategies used`);
  }

  // Next session recommendation
  let nextConcept = 'Continue reinforcing current concepts';
  let nextAnchor = 'Use student\'s interests as anchor';

  if (cognitive.avgJustificationLevel < 2) {
    nextConcept = 'Build foundational understanding with more concrete examples';
    nextAnchor = 'Use everyday examples and real objects';
  } else if (cognitive.avgJustificationLevel >= 3) {
    nextConcept = 'Introduce more abstract or complex concepts';
    nextAnchor = 'Use visual diagrams and symbolic representations';
  }

  // Parent action suggestion
  let parentAction = 'Reinforce what was learned today by asking your child to explain a concept to you.';
  if (engagement === 'low') {
    parentAction = 'Check in on whether the topic was interesting or if something else is on their mind.';
  } else if (engagement === 'high') {
    parentAction = 'Take advantage of high engagement! Ask them to explore related topics in their free time.';
  }

  return {
    date: new Date().toISOString().split('T')[0],
    duration_minutes: durationMinutes,
    subject: subject,
    engagement: engagement,
    notable_moment: notableMoment,
    observations: {
      strengths: strengths,
      blockers: blockers,
      cognitive_signals: cognitiveSignals
    },
    next_session: {
      concept: nextConcept,
      anchor: nextAnchor
    },
    parent_action: parentAction,
    cognitive_metrics: {
      avg_justification_level: cognitive.avgJustificationLevel,
      connectors_used_count: cognitive.allConnectors.length,
      unique_connectors: cognitive.allConnectors,
      learning_phases_observed: [...new Set(cognitive.phases)]
    }
  };
}

module.exports = {
  generateParentReport,
  aggregateCognitiveNotes
};
