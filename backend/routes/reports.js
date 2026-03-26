const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');
const alerts = require('../services/alerts');
const supabase = require('../services/supabase');

/**
 * GET /student/:studentId/sessions
 * List sessions with parent reports
 * Requires: auth (parent or student)
 */
router.get('/student/:studentId/sessions', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId;

    // Access control
    if (userId !== studentId && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const sessions = await memory.getLastSessions(studentId, 50);

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        started_at: s.started_at,
        duration_minutes: s.duration_minutes,
        summary: s.summary,
        parent_report: s.parent_report,
        alert_level: s.alert_level || 0
      }))
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to list sessions' });
  }
});

/**
 * GET /session/:sessionId/report
 * Get specific session report
 * Requires: auth
 */
router.get('/session/:sessionId/report', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Get session
    const session = await memory.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Access control
    if (session.student_id !== userId && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      session_id: session.id,
      started_at: session.started_at,
      duration_minutes: session.duration_minutes,
      summary: session.summary,
      cognitive_observations: session.cognitive_observations,
      parent_report: session.parent_report,
      alert_level: session.alert_level || 0
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get report' });
  }
});

/**
 * GET /student/:studentId/alerts
 * Get alerts for a student (unread first)
 * Requires: auth (parent only)
 */
router.get('/student/:studentId/alerts', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId;

    // Only parents can view alerts
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can view alerts' });
    }

    // In full app, verify parent-student relationship
    // For MVP, just return alerts

    const { data: allAlerts, error } = await supabase
      .from('parent_alerts')
      .select('*')
      .eq('student_id', studentId)
      .order('read_at', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return res.json({ alerts: [] });
    }

    // Separate unread and read
    const unread = (allAlerts || []).filter(a => !a.read_at);
    const read = (allAlerts || []).filter(a => a.read_at);

    res.json({
      unread,
      read,
      total: allAlerts ? allAlerts.length : 0,
      alert_levels: alerts.ALERT_LEVELS
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * PATCH /alert/:alertId/read
 * Mark an alert as read
 * Requires: auth (parent)
 */
router.patch('/alert/:alertId/read', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Only parents can mark alerts as read
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can mark alerts as read' });
    }

    const updatedAlert = await alerts.markAlertAsRead(alertId);

    if (!updatedAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(updatedAlert);
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

module.exports = router;
