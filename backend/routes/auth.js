const express = require('express');
const router = express.Router();
const { generateToken, authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');

/**
 * POST /login
 * Expects: { code: string }
 * Code format: ELEVE-001 or PARENT-001
 * Code-based auth for MVP (no passwords)
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const codeUpper = code.toUpperCase().trim();

    let user = null;
    let role = null;
    let studentProfile = null;

    // Determine role from code prefix
    if (codeUpper.startsWith('ELEVE-')) {
      // Student code
      const student = await memory.getStudentByCode(codeUpper);

      if (!student) {
        return res.status(401).json({ error: 'Invalid student code' });
      }

      user = student;
      role = 'student';
      studentProfile = student.profile || student;
    } else if (codeUpper.startsWith('PARENT-')) {
      // Parent code
      const parent = await memory.getParentByCode(codeUpper);

      if (!parent) {
        return res.status(401).json({ error: 'Invalid parent code' });
      }

      // Resolve student from parent
      if (!parent.student_id) {
        return res.status(500).json({ error: 'Parent not linked to student' });
      }

      user = parent;
      role = 'parent';
      studentProfile = await memory.getStudentProfile(parent.student_id);
    } else {
      return res.status(400).json({ error: 'Code must start with ELEVE- or PARENT-' });
    }

    // Generate token with user ID and role
    const token = generateToken(user.id, role);

    res.json({
      token,
      user: {
        id: user.id,
        role,
        code: user.internal_code
      },
      studentProfile: studentProfile || null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /verify
 * Verify token validity and return user info
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    // Get student profile if we can
    let studentProfile = null;

    if (req.user.role === 'student') {
      try {
        studentProfile = await memory.getStudentProfile(req.user.userId);
      } catch (err) {
        // Student profile not found, continue without it
      }
    } else if (req.user.role === 'parent') {
      try {
        studentProfile = await memory.getStudentFromParent(req.user.userId);
      } catch (err) {
        // Student profile not found, continue without it
      }
    }

    res.json({
      valid: true,
      user: req.user,
      studentProfile: studentProfile || null
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
