const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');
const alerts = require('../services/alerts');
const supabase = require('../services/supabase');

/**
 * Helper: resolve student ID from user context.
 * If the user is a parent, look up their linked student_id.
 * If the user is a student, use the provided ID directly.
 */
async function resolveStudentId(userId, role) {
  if (role === 'parent') {
    // Look up the parent's linked student
    const { data: parent, error } = await supabase
      .from('parents')
      .select('student_id')
      .eq('id', userId)
      .single();

    if (error || !parent) {
      console.error('Parent lookup error:', error);
      return null;
    }
    return parent.student_id;
  }
  return userId;
}

/**
 * Helper: format raw DB session into SessionReport shape the frontend expects.
 */
function formatSessionReport(s) {
  const report = s.parent_report || {};
  return {
    session_id: s.id,
    started_at: s.started_at,
    duration: s.duration_minutes || 0,
    skills_practiced: report.skills_practiced || [],
    engagement: report.engagement || 'medium',
    notable_moment: report.notable_moment || null,
    plan_quality: report.plan_quality || null,
    solution_correct: report.solution_correct ?? null,
    explanation_quality: report.explanation_quality || null,
    new_connectors: report.new_connectors || [],
    think_aloud: report.think_aloud || null,
    next_session_target: report.next_session_target || null,
    parent_action: report.parent_action || null,
    alert_level: s.alert_level || 0,
  };
}

/**
 * GET /:userId/sessions
 * List sessions with parent reports.
 * Accepts either a student ID or a parent ID — resolves automatically.
 * Returns a flat array of SessionReport objects (frontend expects this).
 * Requires: auth (parent or student)
 */
router.get('/:userId/sessions', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Resolve to student ID (handles parent → student lookup)
    const studentId = await resolveStudentId(userId, req.user.role);
    if (!studentId) {
      return res.status(404).json({ error: 'Student not found for this user' });
    }

    const sessions = await memory.getLastSessions(studentId, 50);

    // Return flat array — frontend expects SessionReport[]
    res.json(sessions.map(formatSessionReport));
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to list sessions' });
  }
});

// Keep legacy route as alias
router.get('/student/:studentId/sessions', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const sessions = await memory.getLastSessions(studentId, 50);
    res.json(sessions.map(formatSessionReport));
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to list sessions' });
  }
});

/**
 * GET /:sessionId (single session report)
 * Frontend calls: api.getSessionReport(sessionId) → GET /reports/{sessionId}
 * Requires: auth
 */
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Skip if sessionId looks like a route keyword (avoid conflicts)
    if (sessionId === 'student') {
      return res.status(404).json({ error: 'Not found' });
    }

    // Get session
    const session = await memory.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Access control
    if (session.student_id !== req.user.userId && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(formatSessionReport(session));
  } catch (error) {
    console.error('Report error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get report' });
  }
});

/**
 * GET /student/:userId/alerts
 * Get alerts for a student (unread first).
 * Accepts parent ID or student ID — resolves automatically.
 * Requires: auth (parent only)
 */
router.get('/student/:userId/alerts', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only parents can view alerts
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can view alerts' });
    }

    // Resolve to student ID (handles parent → student lookup)
    const studentId = await resolveStudentId(userId, req.user.role);
    if (!studentId) {
      return res.json({ unread: [], read: [], total: 0 });
    }

    const { data: allAlerts, error } = await supabase
      .from('parent_alerts')
      .select('*')
      .eq('student_id', studentId)
      .order('read_at', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return res.json({ unread: [], read: [], total: 0 });
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
