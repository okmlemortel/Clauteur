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
    .from('student_skills')
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
    .from('student_skills')
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

  if (filters.status) {
    query = query.eq('status', filters.status);
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

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id,
      student_id: sessionData.student_id,
      started_at: new Date().toISOString(),
      case_template_id: sessionData.case_template_id || null,
      mode: sessionData.mode || 'PROGRAMME',
      max_alert_level: 0,
      casefile: sessionData.casefile || {},
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
async function updateSession(sessionId, data) {
  const updateData = { ...data };

  // Calculate duration if we have ended_at
  if (data.ended_at && data.started_at) {
    const start = new Date(data.started_at);
    const end = new Date(data.ended_at);
    updateData.duration_minutes = Math.round((end - start) / 60000);
  }

  // Preserve arrays/objects if provided
  if (data.casefile) {
    updateData.casefile = data.casefile;
  }
  if (data.edit_log) {
    updateData.edit_log = data.edit_log;
  }
  if (data.voice_transcripts) {
    updateData.voice_transcripts = data.voice_transcripts;
  }
  if (data.cognitive_summary) {
    updateData.cognitive_summary = data.cognitive_summary;
  }
  if (data.language_analysis) {
    updateData.language_analysis = data.language_analysis;
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
  getCaseTemplate
};
