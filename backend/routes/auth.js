const express = require('express');
const router = express.Router();
const { generateToken, authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');

/**
 * POST /login
 * Expects: { code: string, role: 'student' | 'parent' }
 * Code-based auth for MVP (no passwords)
 */
router.post('/login', async (req, res) => {
  try {
    const { code, role } = req.body;

    if (!code || !role) {
      return res.status(400).json({ error: 'code and role are required' });
    }

    if (role !== 'student' && role !== 'parent') {
      return res.status(400).json({ error: 'role must be student or parent' });
    }

    // For MVP: validate code against student_profiles.internal_code
    const student = await memory.getStudentByCode(code);

    if (!student) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    // Generate token with student ID and role
    const token = generateToken(student.id, role);

    res.json({
      token,
      user: {
        id: student.id,
        role,
        code: student.internal_code,
        age: student.age
      }
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
router.post('/verify', authenticateToken, (req, res) => {
  try {
    res.json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
