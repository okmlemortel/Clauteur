const supabase = require('./supabase');

/**
 * Select the next detective case for a student
 *
 * Priority:
 * 1. Get all case templates from Supabase
 * 2. Get student's skill map
 * 3. Filter: remove cases where ALL target skills are score >= 4
 * 4. Filter: remove cases where prerequisite skills are < 2
 * 5. Sort by: skills scored 1-2 first (fragile), then untested (0)
 * 6. Return top case, or null if none available
 */
async function selectNextCase(studentId) {
  try {
    // Get all case templates
    const { data: caseTemplates, error: casesError } = await supabase
      .from('case_templates')
      .select('*')
      .eq('status', 'active');

    if (casesError || !caseTemplates || caseTemplates.length === 0) {
      console.error('Error fetching case templates:', casesError);
      return null;
    }

    // Get student's skill map
    const { data: skillMap, error: skillError } = await supabase
      .from('student_skills')
      .select('skill_id, score')
      .eq('student_id', studentId);

    if (skillError) {
      console.error('Error fetching skill map:', skillError);
      return null;
    }

    const skillScores = {};
    if (skillMap) {
      skillMap.forEach(sk => {
        skillScores[sk.skill_id] = sk.score || 0;
      });
    }

    // Filter and rank cases
    const candidateCases = caseTemplates.filter(caseTemplate => {
      // Parse target skills and prerequisites
      const targetSkills = caseTemplate.target_skills || [];
      const prereqSkills = caseTemplate.prerequisite_skills || [];

      // Filter 1: Not all target skills at >= 4
      const allTargetSkillsAdvanced = targetSkills.every(skillId => {
        return (skillScores[skillId] || 0) >= 4;
      });
      if (allTargetSkillsAdvanced) {
        return false;
      }

      // Filter 2: All prerequisite skills must be >= 2
      const allPrereqsMet = prereqSkills.every(skillId => {
        return (skillScores[skillId] || 0) >= 2;
      });
      if (!allPrereqsMet) {
        return false;
      }

      return true;
    });

    if (candidateCases.length === 0) {
      return null;
    }

    // Sort: fragile skills first (1-2), then untested (0)
    candidateCases.sort((a, b) => {
      const getMinScore = (skillIds) => {
        if (!skillIds || skillIds.length === 0) return 0;
        return Math.min(...skillIds.map(id => skillScores[id] || 0));
      };

      const aMin = getMinScore(a.target_skills);
      const bMin = getMinScore(b.target_skills);

      // Prefer fragile (1-2) over untested (0)
      if ((aMin > 0 && aMin <= 2) && (bMin === 0 || bMin > 2)) return -1;
      if ((bMin > 0 && bMin <= 2) && (aMin === 0 || aMin > 2)) return 1;

      // Within same category, prefer lower score
      return aMin - bMin;
    });

    // Return the top case
    return candidateCases[0] || null;
  } catch (error) {
    console.error('Error in selectNextCase:', error);
    return null;
  }
}

module.exports = {
  selectNextCase
};
