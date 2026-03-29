const supabase = require('./supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get student profile from database
 * Updated schema: students table has id, internal_code, profile (JSONB)
 */
async function getStudentProfile(studentId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error) {
    console.error('Error fetching student profile:', error);
    throw { status: 404, message: 'Student not found' };
  }

  if (!data) {
    throw { status: 404, message: 'Student not found' };
  }

  // Return the profile JSONB field, or entire data object if no profile field
  return data.profile || data;
}

/**
 * Get the last N sessions for a student
 */
async function getLastSessions(studentId, limit = 5) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
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
 * Uses knowledge_map table
 */
async function getKnowledgeMap(studentId) {
  try {
    // Fetch knowledge nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('knowledge_map')
      .select('*')
      .eq('student_id', studentId);

    if (nodesError) {
      console.error('Error fetching knowledge nodes:', nodesError);
      return { nodes: [], connections: [] };
    }

    // For now, connections are derived from nodes
    // In a full implementation, there would be a separate connections table
    const connections = [];
    if (nodes && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        connections.push({
          from_concept_id: nodes[i].concept_id,
          to_concept_id: nodes[i + 1].concept_id,
          relationship_type: 'prerequisite'
        });
      }
    }

    return {
      nodes: nodes || [],
      connections: connections
    };
  } catch (error) {
    console.error('Error getting knowledge map:', error);
    return { nodes: [], connections: [] };
  }
}

/**
 * Get skill map for a student
 */
async function getSkillMap(studentId) {
  const { data, error } = await supabase
    .from('skill_map')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching skill map:', error);
    return {};
  }

  const skillMap = {};
  if (data) {
    data.forEach(sk => {
      skillMap[sk.skill_id] = sk.score || 0;
    });
  }

  return skillMap;
}

/**
 * Update skill score for a student
 */
async function updateSkillScore(studentId, skillId, score) {
  const { data, error } = await supabase
    .from('skill_map')
    .upsert({
      student_id: studentId,
      skill_id: skillId,
      score: Math.max(0, Math.min(4, score))
    }, { onConflict: 'student_id,skill_id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating skill score:', error);
    throw { status: 500, message: 'Failed to update skill' };
  }

  return data;
}

/**
 * Get case templates (all or filtered)
 */
async function getCaseTemplates(filters = {}) {
  let query = supabase
    .from('case_templates')
    .select('*');

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.anchor_type) {
    query = query.eq('anchor_type', filters.anchor_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching case templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single case template by ID
 */
async function getCaseTemplate(caseId) {
  const { data, error } = await supabase
    .from('case_templates')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error) {
    console.error('Error fetching case template:', error);
    throw { status: 404, message: 'Case template not found' };
  }

  return data;
}

/**
 * Create a new session
 */
async function createSession(sessionData) {
  const id = uuidv4();

  const casefile = sessionData.casefile || {};

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id,
      student_id: sessionData.student_id,
      started_at: new Date().toISOString(),
      case_template_id: sessionData.case_template_id || null,
      max_alert_level: 0,
      casefile_given: casefile.given || null,
      casefile_problem: casefile.problem || null,
      casefile_solution: casefile.solution || null,
      casefile_explanation: casefile.explanation || null,
      edit_log: sessionData.edit_log || [],
      voice_transcripts: sessionData.voice_transcripts || [],
      cognitive_summary: sessionData.cognitive_summary || {},
      language_analysis: sessionData.language_analysis || {}
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
async function updateSession(sessionId, updateInput) {
  const updateData = {};

  // Map fields to actual DB column names
  if (updateInput.ended_at) updateData.ended_at = updateInput.ended_at;
  if (updateInput.max_alert_level !== undefined) updateData.max_alert_level = updateInput.max_alert_level;

  // Casefile: map from JSONB object to individual columns
  if (updateInput.casefile) {
    const cf = updateInput.casefile;
    if (cf.given !== undefined) updateData.casefile_given = cf.given;
    if (cf.problem !== undefined) updateData.casefile_problem = cf.problem;
    if (cf.solution !== undefined) updateData.casefile_solution = cf.solution;
    if (cf.explanation !== undefined) updateData.casefile_explanation = cf.explanation;
  }

  // JSONB columns that exist in the schema
  if (updateInput.edit_log) updateData.edit_log = updateInput.edit_log;
  if (updateInput.voice_transcripts) updateData.voice_transcripts = updateInput.voice_transcripts;
  if (updateInput.cognitive_summary) updateData.cognitive_summary = updateInput.cognitive_summary;
  if (updateInput.language_analysis) updateData.language_analysis = updateInput.language_analysis;

  // Report goes to parent_report column
  if (updateInput.report) updateData.parent_report = updateInput.report;

  // Phases completed
  if (updateInput.phases_completed) updateData.phases_completed = updateInput.phases_completed;

  // Calculate duration if we have ended_at
  if (updateInput.ended_at) {
    // Fetch the session's started_at to calculate duration
    const { data: existing } = await supabase
      .from('sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    if (existing?.started_at) {
      const start = new Date(existing.started_at);
      const end = new Date(updateInput.ended_at);
      updateData.duration_minutes = Math.round((end - start) / 60000);
    }
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
    .from('students')
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
 * Get parent by internal code (for login)
 */
async function getParentByCode(internalCode) {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('internal_code', internalCode)
    .single();

  if (error) {
    console.error('Error fetching parent by code:', error);
    return null;
  }

  return data;
}

/**
 * Resolve student from parent
 * Get the student associated with a parent
 */
async function getStudentFromParent(parentId) {
  const { data, error } = await supabase
    .from('parents')
    .select('student_id')
    .eq('id', parentId)
    .single();

  if (error) {
    console.error('Error fetching parent:', error);
    return null;
  }

  if (!data || !data.student_id) {
    return null;
  }

  return getStudentProfile(data.student_id);
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

/**
 * Save a single message to session_messages table
 */
async function saveMessage(sessionId, role, content, source = 'chat', phase = null) {
  const { error } = await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      source,
      phase
    });

  if (error) {
    console.error('Error saving message:', error);
    // Don't throw — message save failure shouldn't break the session
  }
}

/**
 * Get all messages for a session (ordered by created_at)
 */
async function getSessionMessages(sessionId) {
  const { data, error } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching session messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Get active or paused sessions for a student
 */
async function getResumableSessions(studentId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, case_templates(id, title, narrative, plan_prompt, explain_language)')
    .eq('student_id', studentId)
    .in('status', ['active', 'paused'])
    .order('last_active_at', { ascending: false });

  if (error) {
    console.error('Error fetching resumable sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get completed sessions for a student
 */
async function getCompletedSessions(studentId, limit = 10) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, case_templates(id, title)')
    .eq('student_id', studentId)
    .in('status', ['completed', 'abandoned'])
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching completed sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Update session status (pause, resume, etc.)
 */
async function updateSessionStatus(sessionId, status, extraFields = {}) {
  const updateData = { status, ...extraFields };
  if (status === 'active') {
    updateData.last_active_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session status:', error);
    throw { status: 500, message: 'Failed to update session status' };
  }

  return data;
}

/**
 * Auto-abandon sessions paused for >24 hours
 */
async function abandonStaleSessions(studentId) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('status', 'paused')
    .lt('last_active_at', cutoff)
    .select();

  if (error) {
    console.error('Error abandoning stale sessions:', error);
  }

  return data || [];
}

module.exports = {
  getStudentProfile,
  getLastSessions,
  getKnowledgeMap,
  createSession,
  updateSession,
  addCognitiveMarker,
  getStudentByCode,
  getParentByCode,
  getStudentFromParent,
  getSessionById,
  getSkillMap,
  updateSkillScore,
  getCaseTemplates,
  getCaseTemplate,
  saveMessage,
  getSessionMessages,
  getResumableSessions,
  getCompletedSessions,
  updateSessionStatus,
  abandonStaleSessions
};
