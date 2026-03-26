const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const memory = require('../services/memory');
const claude = require('../services/claude');
const alerts = require('../services/alerts');

// In-memory session store (per CONTEXT.md: no raw transcripts stored in DB)
const activeSessions = new Map();

/**
 * POST /start
 * Create a new tutoring session
 * Requires: auth
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { mode = 'programme' } = req.body;

    // Create session in database
    const session = await memory.createSession({
      student_id: studentId,
      mode
    });

    // Build dynamic system prompt
    const systemPrompt = await claude.buildSystemPrompt(studentId);

    // Initialize in-memory message store
    activeSessions.set(session.id, {
      messages: [],
      systemPrompt,
      studentId,
      startedAt: Date.now(),
      mode
    });

    res.status(201).json({
      session_id: session.id,
      started_at: session.started_at,
      mode: session.mode
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to start session' });
  }
});

/**
 * POST /:sessionId/message
 * Send a message in the session, get AI response
 * Requires: auth
 */
router.post('/:sessionId/message', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const studentId = req.user.userId;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Get active session
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check for alerts in the message
    const { level, trigger } = alerts.checkForAlerts(message);

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message
    });

    // If level 3 alert, return immediately without continuing
    if (level === 3) {
      // Create alert in database
      await alerts.createAlert({
        student_id: studentId,
        session_id: sessionId,
        level: 3,
        type: 'critical',
        message: `Critical trigger detected: "${trigger}"`
      });

      return res.status(200).json({
        response: 'I notice you might be going through something difficult. Please reach out to your parent or guardian. They care about you and want to help. I\'m here to support your learning, but right now it\'s important to talk to an adult you trust.',
        alert_level: 3,
        trigger,
        session_ended: true
      });
    }

    // Get Claude response
    const claudeResponse = claude.chat(session.systemPrompt, session.messages);

    // Add assistant message to session
    session.messages.push(claudeResponse);

    // If level 2 alert, create it but continue session
    if (level === 2) {
      await alerts.createAlert({
        student_id: studentId,
        session_id: sessionId,
        level: 2,
        type: 'caution',
        message: `Concern detected: "${trigger}"`
      });
    }

    res.json({
      response: claudeResponse.content,
      alert_level: level,
      trigger: level > 0 ? trigger : null
    });
  } catch (error) {
    console.error('Message error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * POST /:sessionId/end
 * End session, generate parent report, save to database
 * Requires: auth
 */
router.post('/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.userId;

    // Get active session
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Generate parent report
    const parentReport = claude.generateParentReport({
      mode: session.mode,
      duration: Math.round((Date.now() - session.startedAt) / 60000),
      messageCount: session.messages.length,
      concepts: []
    });

    // Update session in database
    const updatedSession = await memory.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      summary: parentReport.summary,
      cognitive_observations: parentReport.cognitive_observations,
      parent_report: parentReport,
      alert_level: parentReport.alert_level
    });

    // Clean up active session
    activeSessions.delete(sessionId);

    res.json({
      session_id: sessionId,
      ended_at: updatedSession.ended_at,
      duration_minutes: updatedSession.duration_minutes,
      parent_report: parentReport
    });
  } catch (error) {
    console.error('Session end error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to end session' });
  }
});

/**
 * GET /:sessionId
 * Get session details
 * Requires: auth
 */
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.userId;

    // Check if session is active
    const activeSession = activeSessions.get(sessionId);
    if (activeSession && activeSession.studentId === studentId) {
      return res.json({
        id: sessionId,
        status: 'active',
        mode: activeSession.mode,
        message_count: activeSession.messages.length,
        started_at: new Date(activeSession.startedAt).toISOString()
      });
    }

    // Get from database
    const dbSession = await memory.getSessionById(sessionId);
    if (!dbSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (dbSession.student_id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      id: dbSession.id,
      status: 'ended',
      started_at: dbSession.started_at,
      duration_minutes: dbSession.duration_minutes,
      summary: dbSession.summary,
      parent_report: dbSession.parent_report
    });
  } catch (error) {
    console.error('Session get error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get session' });
  }
});

module.exports = router;
