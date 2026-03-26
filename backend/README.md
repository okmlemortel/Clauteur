# Clauteur Backend

Express.js backend for the Clauteur AI tutoring platform.

## Setup

1. Install dependencies (already done):
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Fill in required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `JWT_SECRET` - A random secret for JWT signing
- `FRONTEND_URL` - Frontend application URL (default: http://localhost:3000)

## Running

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The server will listen on `PORT` (default 3001).

## Architecture

### Services
- **supabase.js** - Supabase client singleton
- **claude.js** - Claude API integration (stubbed for MVP)
  - Dynamic system prompt building from student profile
  - Stub responses that vary between English/French
  - Parent report generation
- **memory.js** - Supabase data access layer
  - Student profiles, sessions, knowledge maps
  - Cognitive markers, session updates
- **alerts.js** - Alert system with hardcoded critical triggers
  - Level 3 (critical) triggers are non-configurable

### Middleware
- **auth.js** - JWT token generation and verification
  - Role-based access control (student/parent)
  - 24-hour token expiry

### Routes
- **POST /api/auth/login** - Code-based authentication
- **POST /api/auth/verify** - Verify token validity
- **POST /api/session/start** - Create new tutoring session
- **POST /api/session/:sessionId/message** - Send message, get response
- **POST /api/session/:sessionId/end** - End session, generate report
- **GET /api/session/:sessionId** - Get session details
- **GET /api/analysis/student/:studentId/knowledge-map** - Knowledge nodes + connections
- **GET /api/analysis/student/:studentId/cognitive-markers** - Cognitive markers
- **GET /api/reports/student/:studentId/sessions** - List sessions with reports
- **GET /api/reports/session/:sessionId/report** - Get specific report
- **GET /api/reports/student/:studentId/alerts** - Get parent alerts
- **PATCH /api/reports/alert/:alertId/read** - Mark alert as read

## Session Management

- **Active sessions stored in memory** (Map) - no raw transcripts in database
- Messages are kept only during active session
- Session summary/observations saved to database on end
- 35-minute max session duration (enforced by frontend)

## Authentication

Uses JWT with role-based access control:
- `student` - Can access own sessions and progress
- `parent` - Can view child's reports and alerts

**Login flow:**
1. User provides internal `code` (from student_profiles)
2. Backend validates against database
3. Returns JWT token with user ID and role

## Alert System

Three-level alert system with safety-critical hardcoded triggers:

- **Level 0** - No alert (normal report only)
- **Level 1** - Note (discrete mention in weekly report)
- **Level 2** - Caution (24-hour notification to parent)
- **Level 3** - Critical (immediate escalation, exit tutoring mode)

**Critical Triggers (HARDCODED):**
- French: "me faire du mal", "mourir", "plus envie de", "en finir", "personne s'en fout", "inutile", "disparaître"
- English: "hurt myself", "kill myself", "end it", "nobody cares", "want to disappear", "worthless"

These cannot be disabled or modified by any user/agent.

## Environment Variables

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-key
JWT_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-...
N8N_WEBHOOK_URL=https://webhook.url
NODE_ENV=development
```

## Key Implementation Details

1. **No raw transcripts stored** - Only summaries and cognitive observations
2. **Dynamic system prompts** - Built from student profile, recent sessions, knowledge map
3. **Session messages in-memory** - Keeps privacy while maintaining context
4. **Code-based auth for MVP** - No passwords, uses internal_code from student_profiles
5. **Stub Claude responses** - Warm, encouraging, appropriate for 13-year-old
6. **CORS configured** - Frontend URL configurable via environment

## Database Schema

See CONTEXT.md for full Supabase schema:
- student_profiles
- sessions
- knowledge_nodes
- knowledge_connections
- cognitive_markers
- parent_alerts

## Integration Notes

- Stub responses in claude.js should be replaced with real Anthropic API calls in production
- Parent-student relationships need full validation (MVP uses basic checks)
- Session timeout enforcement should be added to frontend
- n8n webhook integration pending for post-session analysis
