const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');
const caseSelector = require('../services/caseSelector');

/**
 * GET /next/:studentId
 * Get the next recommended case for a student
 */
router.get('/next/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify the user has permission to get this student's case
    const userStudentId = req.user.role === 'parent'
      ? (await memory.getStudentFromParent(req.user.userId))?.id
      : req.user.userId;

    if (userStudentId !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to access this student' });
    }

    // Get next case using caseSelector
    const nextCase = await caseSelector.selectNextCase(studentId);

    if (!nextCase) {
      return res.status(404).json({ error: 'No suitable case available' });
    }

    res.json({
      id: nextCase.id,
      title: nextCase.title,
      narrative: nextCase.narrative,
      plan_prompt: nextCase.plan_prompt,
      explain_language: nextCase.explain_language,
      target_skills: nextCase.target_skills,
      prerequisite_skills: nextCase.prerequisite_skills
    });
  } catch (error) {
    console.error('Get next case error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get next case' });
  }
});

/**
 * GET /:caseId
 * Get a specific case template by ID
 */
router.get('/:caseId', authenticateToken, async (req, res) => {
  try {
    const { caseId } = req.params;

    // Get the case template
    const caseTemplate = await memory.getCaseTemplate(caseId);

    res.json({
      id: caseTemplate.id,
      title: caseTemplate.title,
      narrative: caseTemplate.narrative,
      plan_prompt: caseTemplate.plan_prompt,
      explain_language: caseTemplate.explain_language,
      target_skills: caseTemplate.target_skills,
      prerequisite_skills: caseTemplate.prerequisite_skills,
      status: caseTemplate.status,
      created_at: caseTemplate.created_at
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get case' });
  }
});

module.exports = router;
