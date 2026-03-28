const supabase = require('./supabase');

/**
 * Select the next detective case for a student
 * Based on Content Package v1 Priority Engine Rules
 */
async function selectNextCase(studentId) {
  try {
    // Get all case templates
    const { data: caseTemplates, error: casesError } = await supabase
      .from('case_templates')
      .select('*');

    if (casesError || !caseTemplates || caseTemplates.length === 0) {
      console.error('Error fetching case templates:', casesError);
      return null;
    }

    // Get student's skill map
    const { data: skillMapData, error: skillError } = await supabase
      .from('skill_map')
      .select('skill_id, score')
      .eq('student_id', studentId);

    if (skillError) {
      console.error('Error fetching skill map:', skillError);
      return null;
    }

    const skillScores = {};
    if (skillMapData) {
      skillMapData.forEach(sk => {
        skillScores[sk.skill_id] = sk.score || 0;
      });
    }

    // Get last 5 completed sessions to check recently used cases
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('case_template_id')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .limit(5);

    const recentCaseIds = new Set(
      (recentSessions || [])
        .map(s => s.case_template_id)
        .filter(Boolean)
    );

    // Get skills practiced in last 3 sessions
    const { data: last3Sessions } = await supabase
      .from('sessions')
      .select('case_template_id')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .limit(3);

    const recentlyPracticedSkills = new Set();
    if (last3Sessions) {
      for (const session of last3Sessions) {
        if (session.case_template_id) {
          const matchingCase = caseTemplates.find(c => c.id === session.case_template_id);
          if (matchingCase && matchingCase.target_skills) {
            matchingCase.target_skills.forEach(s => recentlyPracticedSkills.add(s));
          }
        }
      }
    }

    // Get student profile for best_anchor
    const { data: studentData } = await supabase
      .from('students')
      .select('profile')
      .eq('id', studentId)
      .single();

    const bestAnchor = studentData?.profile?.best_anchor || '';

    // FILTER 1: Remove cases completed in last 5 sessions
    let candidates = caseTemplates.filter(c => !recentCaseIds.has(c.id));

    // FILTER 2: Remove cases whose prerequisites aren't met (all prereqs must be >= 2)
    candidates = candidates.filter(c => {
      const prereqs = c.prerequisite_skills || [];
      return prereqs.every(skillId => (skillScores[skillId] || 0) >= 2);
    });

    if (candidates.length === 0) {
      // If no candidates after filtering, fall back to all templates minus recent
      candidates = caseTemplates.filter(c => !recentCaseIds.has(c.id));
      if (candidates.length === 0) {
        candidates = caseTemplates; // ultimate fallback
      }
    }

    // SCORE each remaining case
    const scoredCases = candidates.map(c => {
      let score = 0;
      const targetSkills = c.target_skills || [];

      // +10 if ANY target skill has score 1 (fragile — highest priority)
      if (targetSkills.some(s => skillScores[s] === 1)) {
        score += 10;
      }

      // +7 if ANY target skill has score 2 (developing — high priority)
      if (targetSkills.some(s => skillScores[s] === 2)) {
        score += 7;
      }

      // +5 if ANY target skill has score 0 AND all prereqs met (untested — probe it)
      if (targetSkills.some(s => (skillScores[s] || 0) === 0)) {
        const prereqs = c.prerequisite_skills || [];
        const allPrereqsMet = prereqs.every(p => (skillScores[p] || 0) >= 2);
        if (allPrereqsMet) {
          score += 5;
        }
      }

      // +3 if targeting skills not practiced in last 3 sessions (variety)
      if (targetSkills.some(s => !recentlyPracticedSkills.has(s))) {
        score += 3;
      }

      // +2 if anchor_type matches student's best_anchor
      if (c.anchor_type && bestAnchor.toLowerCase().includes(c.anchor_type.toLowerCase())) {
        score += 2;
      }

      // +1 if explain_language is FR (she needs more FR exposure)
      if (c.explain_language === 'fr') {
        score += 1;
      }

      // -5 if ALL target skills are score 3+ (too easy)
      if (targetSkills.length > 0 && targetSkills.every(s => (skillScores[s] || 0) >= 3)) {
        score -= 5;
      }

      return { case: c, score };
    });

    // SORT by score descending
    scoredCases.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      // TIE-BREAKING: prefer lower difficulty for untested skills, higher for developing
      const aHasUntested = (a.case.target_skills || []).some(s => (skillScores[s] || 0) === 0);
      const bHasUntested = (b.case.target_skills || []).some(s => (skillScores[s] || 0) === 0);

      if (aHasUntested && !bHasUntested) return -1;
      if (!aHasUntested && bHasUntested) return 1;

      if (aHasUntested && bHasUntested) {
        return (a.case.difficulty || 1) - (b.case.difficulty || 1); // prefer lower difficulty
      }

      return (b.case.difficulty || 1) - (a.case.difficulty || 1); // prefer higher difficulty for developing
    });

    return scoredCases[0]?.case || null;
  } catch (error) {
    console.error('Error in selectNextCase:', error);
    return null;
  }
}

module.exports = {
  selectNextCase
};
