const supabase = require('./supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get student profile from database
 */
async function getStudentProfile(studentId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error) {
    console.error('Error fetching student profile:', error);
    throw { status: 404, message: 'Student not found' };
  }

  return data || {};
}

/**
 * Get the last N sessions for a student
 */
async function getLastSessions(studentId, limit = 5) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, started_at, duration_minutes, summary, cognitive_observations, parent_report')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get knowledge map (nodes and connections)
 */
async function getKnowledgeMap(studentId) {
  try {
    // Fetch knowledge nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('student_id', studentId);

    if (nodesError) {
      console.error('Error fetching knowledge nodes:', nodesError);
    }

    // Fetch knowledge connections
    const { data: connections, error: connectionsError } = await supabase
      .from('knowledge_connections')
      .select('*')
      .eq('student_id', studentId);

    if (connectionsError) {
      console.error('Error fetching knowledge connections:', connectionsError);
    }

    return {
      nodes: nodes || [],
      connections: connections || []
    };
  } catch (error) {
    console.error('Error getting knowledge map:', error);
    return { nodes: [], connections: [] };
  }
}

/**
 * Create a new session
 */
async function createSession(sessionData) {
  const id = uuidv4();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id,
      student_id: sessionData.student_id,
      started_at: new Date().toISOString(),
      mode: sessionData.mode || 'programme',
      alert_level: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw { status: 500, message: 'Failed to create session' };
  }

  return data;
}

/**
 * Update session with new data
 */
async function updateSession(sessionId, data) {
  const updateData = { ...data };

  // Calculate duration if we have ended_at
  if (data.ended_at && data.started_at) {
    const start = new Date(data.started_at);
    const end = new Date(data.ended_at);
    updateData.duration_minutes = Math.round((end - start) / 60000);
  }

  const { data: result, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    throw { status: 500, message: 'Failed to update session' };
  }

  return result;
}

/**
 * Add a cognitive marker
 */
async function addCognitiveMarker(markerData) {
  const id = uuidv4();

  const { data, error } = await supabase
    .from('cognitive_markers')
    .insert({
      id,
      student_id: markerData.student_id,
      session_id: markerData.session_id,
      marker_type: markerData.marker_type,
      value: markerData.value,
      stage_at_time: markerData.stage_at_time,
      noted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding cognitive marker:', error);
    // Don't throw, just log - markers are not critical
    return null;
  }

  return data;
}

/**
 * Get student by internal code (for login)
 */
async function getStudentByCode(internalCode) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('internal_code', internalCode)
    .single();

  if (error) {
    console.error('Error fetching student by code:', error);
    return null;
  }

  return data;
}

/**
 * Get session by ID
 */
async function getSessionById(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return data;
}

module.exports = {
  getStudentProfile,
  getLastSessions,
  getKnowledgeMap,
  createSession,
  updateSession,
  addCognitiveMarker,
  getStudentByCode,
  getSessionById
};
