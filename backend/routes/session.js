const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const memory = require('../services/memory');
const claude = require('../services/claude');
const { buildSystemPrompt } = require('../services/systemPrompt');
const { generateParentReport } = require('../services/reportGenerator');
const alerts = require('../services/alerts');

// In-memory session store
// Structure: { systemPrompt, studentId, studentProfile, startedAt, mode, messages: [{role, content, phase, alertLevel, cognitiveNotes}] }
const activeSessions = new Map();

const MAX_SESSION_DURATION_MINUTES = 40;

/**
 * POST /start
 * Create a new tutoring session
 * Returns: initial greeting from Claude
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.role === 'parent'
      ? (await memory.getStudentFromParent(req.user.userId))?.id
      : req.user.userId;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID could not be determined' });
    }

    const { mode = 'PROGRAMME' } = req.body;

    // Get student profile
    let studentProfile;
    try {
      studentProfile = await memory.getStudentProfile(studentId);
    } catch (error) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Create session in database
    const session = await memory.createSession({
      student_id: studentId,
      mode
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(studentProfile, mode, []);

    // Generate initial greeting
    let initialGreeting;
    try {
      initialGreeting = await claude.generateGreeting(studentProfile);
    } catch (error) {
      console.error('Error generating greeting:', error);
      initialGreeting = {
        message: `Hello! I'm your tutor. What would you like to learn about today?`,
        phase: null,
        alertLevel: 0,
        cognitiveNotes: {
          justificationLevel: 1,
          connectorsUsed: [],
          engagement: 'medium',
          notableObservation: null
        }
      };
    }

    // Initialize in-memory session
    activeSessions.set(session.id, {
      systemPrompt,
      studentId,
      studentProfile,
      startedAt: Date.now(),
      mode,
      messages: [
        {
          role: 'assistant',
          content: initialGreeting.message,
          phase: initialGreeting.phase,
          alertLevel: initialGreeting.alertLevel,
          cognitiveNotes: initialGreeting.cognitiveNotes
        }
      ]
    });

    res.status(201).json({
      session_id: session.id,
      started_at: session.started_at,
      mode: session.mode,
      greeting: initialGreeting.message,
      greeting_phase: initialGreeting.phase
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to start session' });
  }
});

/**
 * POST /:sessionId/message
 * Send a message in the session, get AI response
 */
router.post('/:sessionId/message', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

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
        response: 'I notice you might be going through something difficult. Please reach out to your parent or guardian. They care about you and want to help. I\'m here to support your learning, but right now it\'s important to talk to an adult you trust.',
        phase: null,
        alertLevel: 3,
        trigger,
        session_ended: true
      });
    }

    // Get Claude response
    let claudeResponse;
    try {
      claudeResponse = await claude.chat(sessionData.systemPrompt, sessionData.messages, sessionData.studentProfile);
    } catch (error) {
      console.error('Claude call error:', error);
      return res.status(500).json({ error: 'Failed to get response from tutor' });
    }

    // Add assistant message to session with full metadata
    const assistantMessage = {
      role: 'assistant',
      content: claudeResponse.message,
      phase: claudeResponse.phase,
      alertLevel: claudeResponse.alertLevel || 0,
      cognitiveNotes: claudeResponse.cognitiveNotes || {
        justificationLevel: 2,
        connectorsUsed: [],
        engagement: 'medium',
        notableObservation: null
      }
    };
    sessionData.messages.push(assistantMessage);

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

    // Check session duration - auto-end if exceeded
    const elapsedMinutes = (Date.now() - sessionData.startedAt) / 60000;
    const sessionEnded = elapsedMinutes > MAX_SESSION_DURATION_MINUTES;

    res.json({
      message: claudeResponse.message,
      phase: claudeResponse.phase,
      alertLevel: alertLevel || 0,
      trigger: alertLevel > 0 ? trigger : null,
      session_ended: sessionEnded,
      session_time_remaining: Math.max(0, MAX_SESSION_DURATION_MINUTES - elapsedMinutes)
    });

    // If session exceeded max duration, auto-end it
    if (sessionEnded) {
      await endSessionInternal(sessionId, sessionData);
    }
  } catch (error) {
    console.error('Message error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * Internal helper to end a session
 */
async function endSessionInternal(sessionId, sessionData) {
  try {
    const durationMinutes = Math.round((Date.now() - sessionData.startedAt) / 60000);

    // Generate parent report
    const parentReport = generateParentReport(
      { mode: sessionData.mode },
      sessionData.messages,
      durationMinutes
    );

    // Update session in database
    await memory.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      summary: `Session focused on ${sessionData.mode}. ${parentReport.observations.strengths[0] || 'Session completed.'}`,
      report: parentReport,
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
 * End session, generate parent report, save to database
 */
router.post('/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get active session
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const durationMinutes = Math.round((Date.now() - sessionData.startedAt) / 60000);

    // Generate parent report
    const parentReport = generateParentReport(
      { mode: sessionData.mode },
      sessionData.messages,
      durationMinutes
    );

    // Update session in database
    const updatedSession = await memory.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      summary: `Session focused on ${sessionData.mode}. ${parentReport.observations.strengths[0] || 'Session completed.'}`,
      report: parentReport,
      max_alert_level: sessionData.maxAlertLevel || 0
    });

    // Clean up active session
    activeSessions.delete(sessionId);

    res.json({
      session_id: sessionId,
      ended_at: updatedSession.ended_at,
      duration_minutes: updatedSession.duration_minutes,
      report: parentReport
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
        time_remaining: Math.max(0, MAX_SESSION_DURATION_MINUTES - elapsedMinutes)
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
      summary: dbSession.summary,
      report: dbSession.report
    });
  } catch (error) {
    console.error('Session get error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get session' });
  }
});

module.exports = router;
