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

// Diagnostic: test Supabase connection
app.get('/api/diag', async (req, res) => {
  try {
    const supabase = require('./services/supabase');
    const { data: students, error: studentsErr } = await supabase.from('students').select('id, internal_code').limit(3);
    const { data: cases, error: casesErr } = await supabase.from('case_templates').select('id, title').limit(3);
    const { data: skills, error: skillsErr } = await supabase.from('skill_map').select('skill_id, score').limit(3);
    res.json({
      supabase: 'connected',
      students: studentsErr ? { error: studentsErr.message } : students,
      cases: casesErr ? { error: casesErr.message } : { count: cases?.length },
      skills: skillsErr ? { error: skillsErr.message } : { count: skills?.length },
      env: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasDeepgramKey: !!process.env.DEEPGRAM_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        corsOrigin: CORS_ORIGIN
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnostic: test Claude API directly
app.get('/api/diag/claude', async (req, res) => {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return res.json({ error: 'ANTHROPIC_API_KEY not set', keyLength: 0 });
    }
    res.json({ keyPrefix: key.substring(0, 10) + '...', keyLength: key.length, testing: true });
    // Don't actually call the API in the response — just test the client creation
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/diag/claude-test', async (req, res) => {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return res.json({ error: 'No API key' });
    }
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello in one word.' }]
    });
    res.json({ success: true, response: response.content[0]?.text });
  } catch (e) {
    res.status(500).json({ error: e.message, type: e.constructor?.name, status: e.status });
  }
});

// Diagnostic: LLM provider status
app.get('/api/diag/llm', async (req, res) => {
  try {
    const { checkProvider, ROLE_PROVIDER, getProviderInfo } = require('./services/llmProvider');
    const tutorStatus = await checkProvider('tutor');
    const languageStatus = await checkProvider('language_agent');
    res.json({
      config: ROLE_PROVIDER,
      info: getProviderInfo(),
      tutor: tutorStatus,
      language_agent: languageStatus
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnostic: raw Ollama connectivity test
app.get('/api/diag/ollama-raw', async (req, res) => {
  const url = process.env.OLLAMA_URL || 'http://model_dock.railway.internal:11434';
  const results = {};

  // Test 1: DNS resolution
  try {
    const dns = require('dns');
    const hostname = new URL(url).hostname;
    results.hostname = hostname;
    const addresses = await new Promise((resolve, reject) => {
      dns.lookup(hostname, { all: true }, (err, addrs) => err ? reject(err) : resolve(addrs));
    });
    results.dns = { status: 'ok', addresses };
  } catch (e) {
    results.dns = { status: 'error', error: e.message, code: e.code };
  }

  // Test 2: fetch /api/tags
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${url}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    results.api_tags = { status: 'ok', http_status: resp.status, models: data.models?.map(m => m.name) || [] };
  } catch (e) {
    results.api_tags = { status: 'error', error: e.message, cause: e.cause?.message || null, code: e.cause?.code || null };
  }

  // Test 3: fetch / (root)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await resp.text();
    results.root = { status: 'ok', http_status: resp.status, body: text.substring(0, 100) };
  } catch (e) {
    results.root = { status: 'error', error: e.message, cause: e.cause?.message || null };
  }

  results.ollama_url_env = url;
  res.json(results);
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
