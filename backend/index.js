const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const casesRoutes = require('./routes/cases');
const analysisRoutes = require('./routes/analysis');
const reportsRoutes = require('./routes/reports');
const { setupVoiceWebSocket } = require('./routes/voice');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', reportsRoutes);

// Health check (both paths for convenience)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket for voice
setupVoiceWebSocket(server);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

server.listen(PORT, () => {
  console.log(`Clauteur backend listening on port ${PORT}`);
  console.log(`CORS configured for: ${CORS_ORIGIN}`);
  console.log(`WebSocket voice transcription available at ws://localhost:${PORT}/api/voice`);
});
