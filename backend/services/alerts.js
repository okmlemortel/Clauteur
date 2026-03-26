const supabase = require('./supabase');
const { v4: uuidv4 } = require('uuid');

// CRITICAL TRIGGERS — HARDCODED, NON-CONFIGURABLE
// These are safety-critical and cannot be modified
const CRITICAL_TRIGGERS = [
  // French
  'me faire du mal',
  'mourir',
  'plus envie de',
  'en finir',
  'personne s\'en fout',
  'inutile',
  'disparaître',
  // English
  'hurt myself',
  'kill myself',
  'end it',
  'nobody cares',
  'want to disappear',
  'worthless'
];

// Alert levels mapping
const ALERT_LEVELS = {
  0: 'rien',
  1: 'noter',
  2: 'alerter_24h',
  3: 'urgent'
};

/**
 * Check message for alert triggers
 * Returns { level: 0-3, trigger: string|null }
 */
function checkForAlerts(message) {
  if (!message || typeof message !== 'string') {
    return { level: 0, trigger: null };
  }

  const lowerMessage = message.toLowerCase();

  // Check critical triggers (level 3)
  for (const trigger of CRITICAL_TRIGGERS) {
    if (lowerMessage.includes(trigger.toLowerCase())) {
      return { level: 3, trigger };
    }
  }

  // Check for other warning signs (level 2)
  const level2Patterns = [
    /can't.*anymore/i,
    /too hard/i,
    /never.*understand/i,
    /stupid/i,
    /can't do/i,
    /je ne peux pas/i,
    /c'est trop dur/i,
    /nul/i,
    /débile/i
  ];

  for (const pattern of level2Patterns) {
    if (pattern.test(message)) {
      return { level: 2, trigger: pattern.source };
    }
  }

  // No alerts
  return { level: 0, trigger: null };
}

/**
 * Create an alert in the database
 */
async function createAlert(alertData) {
  const id = uuidv4();

  const { data, error } = await supabase
    .from('parent_alerts')
    .insert({
      id,
      student_id: alertData.student_id,
      session_id: alertData.session_id,
      level: alertData.level,
      type: alertData.type || 'cognitive',
      message: alertData.message,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating alert:', error);
    // Don't throw - alerts shouldn't break the session
    return null;
  }

  return data;
}

/**
 * Mark an alert as read
 */
async function markAlertAsRead(alertId) {
  const { data, error } = await supabase
    .from('parent_alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    console.error('Error marking alert as read:', error);
    return null;
  }

  return data;
}

/**
 * Get unread alerts for a student
 */
async function getUnreadAlerts(studentId) {
  const { data, error } = await supabase
    .from('parent_alerts')
    .select('*')
    .eq('student_id', studentId)
    .is('read_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching unread alerts:', error);
    return [];
  }

  return data || [];
}

module.exports = {
  CRITICAL_TRIGGERS,
  ALERT_LEVELS,
  checkForAlerts,
  createAlert,
  markAlertAsRead,
  getUnreadAlerts
};
