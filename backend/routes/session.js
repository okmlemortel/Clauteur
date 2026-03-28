const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');
const tutor = require('../services/tutor');
const caseSelector = require('../services/caseSelector');
const languageAgent = require('../services/languageAgent');
const { build: buildSystemPrompt } = require('../services/systemPrompt');
const { generateReport } = require('../services/reportGenerator');
const alerts = require('../services/alerts');

// In-memory session store
// Structure: { systemPrompt, studentId, studentProfile, caseTemplate, startedAt, messages: [...], casefile: {}, ... }
const activeSessions = new Map();

const MAX_SESSION_DURATION_MINUTES = 20;

/**
 * POST /start
 * Create a new tutoring session
 * Calls caseSelector to pick next case, builds system prompt, generates greeting
 * Returns: { session_id, case, greeting }
 */
router.post('/start', authenticateToken, async (req, res) => {
  let lastStep = 0;
  try {
    lastStep = 1;
    console.log('[session/start] Step 1: User from token:', JSON.stringify(req.user));

    const studentId = req.user.role === 'parent'
      ? (await memory.getStudentFromParent(req.user.userId))?.id
      : req.user.userId;

    lastStep = 2;
    console.log('[session/start] Step 2: studentId resolved:', studentId);

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID could not be determined' });
    }

    // Get student profile
    let studentProfile;
    try {
      studentProfile = await memory.getStudentProfile(studentId);
      lastStep = 3;
      console.log('[session/start] Step 3: profile loaded:', studentProfile?.id);
    } catch (error) {
      console.error('[session/start] Step 3 FAIL: profile error:', error);
      return res.status(404).json({ error: 'Student profile not found', step: 3, detail: error?.message });
    }

    // Get skill map for the student
    const skillMap = await memory.getSkillMap(studentId);
    studentProfile.skill_map = skillMap;
    lastStep = 4;
    console.log('[session/start] Step 4: skillMap loaded, keys:', Object.keys(skillMap).length);

    // Select next case using caseSelector
    const caseTemplate = await caseSelector.selectNextCase(studentId);
    lastStep = 5;
    console.log('[session/start] Step 5: case selected:', caseTemplate?.id, caseTemplate?.title);
    if (!caseTemplate) {
      return res.status(400).json({ error: 'No suitable case available for this student', step: 5 });
    }

    // Create session in database
    lastStep = 6;
    console.log('[session/start] Step 6: creating session...');
    const sessionData = await memory.createSession({
      student_id: studentId,
      case_template_id: caseTemplate.id,
      casefile: {
        given: null,
        problem: null,
        solution: null,
        explanation: null
      },
      edit_log: [],
      voice_transcripts: [],
      cognitive_summary: {},
      language_analysis: {}
    });

    lastStep = 7;
    console.log('[session/start] Step 7: session created:', sessionData.id);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(studentProfile, caseTemplate, {
      sessionStartTime: sessionData.started_at
    });

    lastStep = 8;
    console.log('[session/start] Step 8: system prompt built, length:', systemPrompt.length);

    // Generate initial greeting
    let initialGreeting;
    try {
      initialGreeting = await tutor.generateGreeting(studentProfile);
    } catch (error) {
      console.error('Error generating greeting:', error);
      initialGreeting = {
        message: 'Hello! I\'m here to help. What would you like to work on today?',
        phase: null,
        alertLevel: 0,
        fieldFeedback: null,
        languageSwitchTo: null,
        cognitiveNotes: {
          justificationLevel: 1,
          connectorsObserved: [],
          engagement: 'medium',
          thinkAloudQuality: null,
          notableObservation: null,
          skillsExercised: []
        }
      };
    }

    // Initialize in-memory session
    activeSessions.set(sessionData.id, {
      systemPrompt,
      studentId,
      studentProfile,
      caseTemplate,
      startedAt: Date.now(),
      mode: 'detective',
      messages: [
        {
          role: 'assistant',
          content: initialGreeting.message,
          phase: initialGreeting.phase,
          alertLevel: initialGreeting.alertLevel,
          cognitiveNotes: initialGreeting.cognitiveNotes
        }
      ],
      casefile: {
        given: null,
        problem: null,
        solution: null,
        explanation: null
      },
      languageAnalysisData: {}
    });

    res.status(201).json({
      session_id: sessionData.id,
      case: {
        id: caseTemplate.id,
        title: caseTemplate.title,
        narrative: caseTemplate.narrative,
        plan_prompt: caseTemplate.plan_prompt,
        explain_language: caseTemplate.explain_language
      },
      greeting: initialGreeting.message
    });
  } catch (error) {
    console.error('[session/start] CRASH at step', lastStep, ':', error?.message || error, error?.stack || '');
    res.status(error.status || 500).json({
      error: error.message || 'Failed to start session',
      failedAtStep: lastStep,
      detail: error?.stack?.split('\n')[0] || null
    });
  }
});

/**
 * POST /:sessionId/message
 * Send a message in the session, get AI response
 * Body: { message, source: 'chat'|'voice'|'casefile', field?: string }
 */
router.post('/:sessionId/message', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, source = 'chat', field } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Get active session
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Check for alerts in user message
    const { level: alertLevel, trigger } = alerts.checkForAlerts(message);

    // Add user message to session
    sessionData.messages.push({
      role: 'user',
      content: message,
      source,
      field: field || null,
      phase: null,
      alertLevel: 0,
      cognitiveNotes: null
    });

    // If level 3 alert, end session immediately
    if (alertLevel === 3) {
      await alerts.createAlert({
        student_id: sessionData.studentId,
        session_id: sessionId,
        level: 3,
        type: 'critical',
        message: `Critical trigger detected: "${trigger}"`
      });

      // Update session in DB with alert level
      await memory.updateSession(sessionId, {
        ended_at: new Date().toISOString(),
        max_alert_level: 3
      });

      activeSessions.delete(sessionId);

      return res.status(200).json({
        message: 'I notice you might be going through something difficult. Please reach out to your parent or guardian. They care about you and want to help.',
        phase: null,
        alertLevel: 3,
        fieldFeedback: null,
        languageSwitchTo: null,
        session_ended: true,
        session_time_remaining: 0
      });
    }

    // Call tutor with full context
    let claudeResponse;
    try {
      claudeResponse = await tutor.chat({
        systemPrompt: sessionData.systemPrompt,
        messages: sessionData.messages,
        caseFile: sessionData.casefile,
        currentPhase: null,
        studentProfile: sessionData.studentProfile
      });
    } catch (error) {
      console.error('Tutor call error:', error);
      return res.status(500).json({ error: 'Failed to get response from tutor' });
    }

    // Add assistant message to session
    const assistantMessage = {
      role: 'assistant',
      content: claudeResponse.message,
      phase: claudeResponse.phase,
      alertLevel: claudeResponse.alertLevel || 0,
      fieldFeedback: claudeResponse.fieldFeedback || null,
      languageSwitchTo: claudeResponse.languageSwitchTo || null,
      cognitiveNotes: claudeResponse.cognitiveNotes || {
        justificationLevel: 2,
        connectorsObserved: [],
        engagement: 'medium',
        thinkAloudQuality: null,
        notableObservation: null,
        skillsExercised: []
      }
    };
    sessionData.messages.push(assistantMessage);

    // Fire async language analysis (don't await in response path)
    languageAgent.analyze(message, sessionData.studentProfile.languages?.[0] || 'en').then(analysis => {
      if (analysis) {
        sessionData.languageAnalysisData = analysis;
      }
    }).catch(err => {
      console.error('Language analysis failed:', err);
    });

    // If level 2 alert, create it but continue session
    if (alertLevel === 2) {
      await alerts.createAlert({
        student_id: sessionData.studentId,
        session_id: sessionId,
        level: 2,
        type: 'caution',
        message: `Concern detected: "${trigger}"`
      });
    }

    // Check session duration
    const elapsedMinutes = (Date.now() - sessionData.startedAt) / 60000;
    const sessionEnded = elapsedMinutes > MAX_SESSION_DURATION_MINUTES;

    res.json({
      message: claudeResponse.message,
      phase: claudeResponse.phase,
      alertLevel: alertLevel || 0,
      fieldFeedback: claudeResponse.fieldFeedback || null,
      languageSwitchTo: claudeResponse.languageSwitchTo || null,
      session_ended: sessionEnded,
      session_time_remaining: Math.max(0, MAX_SESSION_DURATION_MINUTES - elapsedMinutes)
    });

    // Auto-end if exceeded max duration
    if (sessionEnded) {
      await endSessionInternal(sessionId, sessionData);
    }
  } catch (error) {
    console.error('Message error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * POST /:sessionId/casefile
 * Save field content and get evaluation
 * Body: { field: 'given'|'problem'|'solution'|'explanation', content: string }
 */
router.post('/:sessionId/casefile', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { field, content } = req.body;

    if (!field || !['given', 'problem', 'solution', 'explanation'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    // Get active session
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Save to casefile
    sessionData.casefile[field] = content;

    // Send to tutor for evaluation
    let feedback;
    try {
      const response = await tutor.chat({
        systemPrompt: sessionData.systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Student submitted their ${field}: "${content}". Provide brief feedback.`
          }
        ],
        caseFile: sessionData.casefile,
        currentPhase: null,
        studentProfile: sessionData.studentProfile
      });

      feedback = response.fieldFeedback || response.message;
    } catch (error) {
      console.error('Casefile feedback error:', error);
      feedback = 'Thank you for submitting your work.';
    }

    // Determine if phase is complete (simplified)
    const phaseComplete = content && content.length > 20;

    res.json({
      feedback,
      phaseComplete
    });
  } catch (error) {
    console.error('Casefile error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to save casefile' });
  }
});

/**
 * Internal helper to end a session
 */
async function endSessionInternal(sessionId, sessionData) {
  try {
    const durationMinutes = Math.round((Date.now() - sessionData.startedAt) / 60000);

    // Generate parent report
    const report = generateReport(
      { mode: sessionData.mode },
      sessionData.messages,
      sessionData.caseTemplate,
      sessionData.languageAnalysisData,
      durationMinutes
    );

    // Update session in database
    await memory.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      casefile: sessionData.casefile,
      language_analysis: sessionData.languageAnalysisData,
      cognitive_summary: report,
      report,
      max_alert_level: sessionData.maxAlertLevel || 0
    });

    // Clean up active session
    activeSessions.delete(sessionId);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

/**
 * POST /:sessionId/end
 * End session, generate parent report
 * Body: { editLog: EditEvent[] }
 */
router.post('/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { editLog } = req.body;

    // Get active session
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const durationMinutes = Math.round((Date.now() - sessionData.startedAt) / 60000);

    // Generate parent report
    const report = generateReport(
      { mode: sessionData.mode },
      sessionData.messages,
      sessionData.caseTemplate,
      sessionData.languageAnalysisData,
      durationMinutes
    );

    // Update session in database
    const updatedSession = await memory.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      casefile: sessionData.casefile,
      edit_log: editLog || [],
      voice_transcripts: sessionData.voice_transcripts || [],
      language_analysis: sessionData.languageAnalysisData,
      cognitive_summary: report,
      report,
      max_alert_level: sessionData.maxAlertLevel || 0
    });

    // Clean up active session
    activeSessions.delete(sessionId);

    res.json({
      session_id: sessionId,
      ended_at: updatedSession.ended_at,
      duration_minutes: updatedSession.duration_minutes,
      report
    });
  } catch (error) {
    console.error('Session end error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to end session' });
  }
});

/**
 * GET /:sessionId
 * Get session details
 */
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session is active
    const activeSession = activeSessions.get(sessionId);
    if (activeSession) {
      const elapsedMinutes = (Date.now() - activeSession.startedAt) / 60000;
      return res.json({
        id: sessionId,
        status: 'active',
        mode: activeSession.mode,
        message_count: activeSession.messages.length,
        started_at: new Date(activeSession.startedAt).toISOString(),
        elapsed_minutes: Math.round(elapsedMinutes),
        time_remaining: Math.max(0, MAX_SESSION_DURATION_MINUTES - elapsedMinutes),
        case: activeSession.caseTemplate
      });
    }

    // Get from database
    const dbSession = await memory.getSessionById(sessionId);
    if (!dbSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      id: dbSession.id,
      status: 'ended',
      started_at: dbSession.started_at,
      ended_at: dbSession.ended_at,
      duration_minutes: dbSession.duration_minutes,
      mode: dbSession.mode,
      case: dbSession.case_template_id,
      casefile: dbSession.casefile,
      report: dbSession.report
    });
  } catch (error) {
    console.error('Session get error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get session' });
  }
});

module.exports = router;
