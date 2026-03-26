const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const memory = require('../services/memory');

/**
 * GET /student/:studentId/knowledge-map
 * Returns knowledge nodes + connections
 * Requires: auth (can be student accessing own data or parent)
 */
router.get('/student/:studentId/knowledge-map', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId;

    // For MVP: allow access if same student or if parent
    // In production, add proper parent-student relationship check
    if (userId !== studentId && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const knowledgeMap = await memory.getKnowledgeMap(studentId);

    res.json({
      nodes: knowledgeMap.nodes,
      connections: knowledgeMap.connections,
      summary: {
        total_nodes: knowledgeMap.nodes.length,
        total_connections: knowledgeMap.connections.length,
        avg_mastery: knowledgeMap.nodes.length > 0
          ? (knowledgeMap.nodes.reduce((sum, n) => sum + n.mastery_level, 0) / knowledgeMap.nodes.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Knowledge map error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get knowledge map' });
  }
});

/**
 * GET /student/:studentId/cognitive-markers
 * Returns cognitive markers with optional date range
 * Requires: auth
 */
router.get('/student/:studentId/cognitive-markers', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId;

    // Access control (same student or parent)
    if (userId !== studentId && req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // For now, we're returning a placeholder
    // Full implementation would query cognitive_markers table with date range
    const supabase = require('../services/supabase');

    const { data: markers, error } = await supabase
      .from('cognitive_markers')
      .select('*')
      .eq('student_id', studentId)
      .order('noted_at', { ascending: false });

    if (error) {
      console.error('Error fetching markers:', error);
      return res.json({ markers: [] });
    }

    // Group by marker type
    const grouped = {};
    (markers || []).forEach(marker => {
      if (!grouped[marker.marker_type]) {
        grouped[marker.marker_type] = [];
      }
      grouped[marker.marker_type].push(marker);
    });

    res.json({
      markers: markers || [],
      by_type: grouped,
      total_count: markers ? markers.length : 0
    });
  } catch (error) {
    console.error('Cognitive markers error:', error);
    res.status(500).json({ error: 'Failed to get cognitive markers' });
  }
});

module.exports = router;
