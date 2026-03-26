# Backend File Structure and Descriptions

## Core Entry Point
- **index.js** - Main Express server, sets up middleware, mounts routes, listens on PORT

## Services (Business Logic)

### supabase.js
- Singleton Supabase client initialization
- Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY env vars
- Exports: supabase client instance

### claude.js
- `buildSystemPrompt(studentId)` - Dynamically builds tutor system prompt from:
  - Student profile (age, languages, interests, cognitive stage, frustration threshold)
  - Last 3 sessions summary
  - Knowledge map active zones
  - Returns warm, age-appropriate system context
- `chat(systemPrompt, messages)` - Stub Claude API response
  - Returns one of 4 rotating responses (English + French variants)
  - Warm, encouraging language appropriate for 13-year-old
  - Auto-detects language from message content
- `generateParentReport(sessionData)` - Creates parent-facing report
  - Includes engagement level, frustration events, self-correction, question quality
  - Provides recommendations for next session
  - Alert level always 0 for stub (safety-level)

### memory.js
- `getStudentProfile(studentId)` - Fetch from student_profiles table
- `getLastSessions(studentId, limit)` - Fetch recent sessions with summary/observations
- `getKnowledgeMap(studentId)` - Fetch knowledge nodes + connections
- `createSession(sessionData)` - Create new session with generated UUID
- `updateSession(sessionId, data)` - Update session (calculates duration)
- `addCognitiveMarker(markerData)` - Insert cognitive marker
- `getStudentByCode(internalCode)` - Lookup student by internal_code (for login)
- `getSessionById(sessionId)` - Fetch session by ID

### alerts.js
- `CRITICAL_TRIGGERS` - Hardcoded, non-configurable level 3 triggers (French + English)
- `ALERT_LEVELS` - Mapping of level 0-3 to descriptions
- `checkForAlerts(message)` - Scan message against trigger patterns
  - Returns { level: 0-3, trigger: string|null }
  - Level 3: critical self-harm keywords (hardcoded)
  - Level 2: frustration patterns (configurable regex)
  - Level 0: no alert
- `createAlert(alertData)` - Insert alert into parent_alerts table
- `markAlertAsRead(alertId)` - Update alert with read_at timestamp
- `getUnreadAlerts(studentId)` - Fetch unread alerts for student

## Middleware

### auth.js
- `generateToken(userId, role)` - Create JWT with payload { userId, role }
  - Expires in 24 hours
  - Signed with JWT_SECRET env var
- `authenticateToken(req, res, next)` - Express middleware
  - Extracts Bearer token from Authorization header
  - Verifies signature and expiry
  - Attaches decoded user to req.user
  - Returns 401 if missing, 403 if invalid
- `requireRole(role)` - Middleware factory
  - Returns middleware that checks req.user.role
  - Allows role '*' to skip check
  - Returns 403 if insufficient permissions

## Routes

### auth.js
- `POST /login` - Code-based authentication
  - Accepts: { code: string, role: 'student'|'parent' }
  - Validates code against student_profiles.internal_code
  - Returns: JWT token + user info
  - Errors: 400 (missing params), 401 (invalid code)
- `POST /verify` - Token verification
  - Requires: authenticateToken middleware
  - Returns: { valid: true, user: req.user }

### session.js
- `POST /start` - Create new tutoring session
  - Creates session in DB
  - Builds dynamic system prompt
  - Initializes in-memory message store
  - Returns: { session_id, started_at, mode }
- `POST /:sessionId/message` - Send message, get response
  - Checks for alerts in user message
  - Returns level 3 alert response immediately (exits session)
  - Gets Claude response via stub
  - Creates level 2 alerts if needed
  - Maintains message history in memory (no DB storage)
  - Returns: { response, alert_level, trigger }
- `POST /:sessionId/end` - End session, save to DB
  - Generates parent report
  - Updates session with summary, observations, report
  - Cleans up in-memory messages
  - Returns: session summary + parent report
- `GET /:sessionId` - Get session details
  - Returns active session info or DB data
  - Enforces student ownership

### analysis.js
- `GET /student/:studentId/knowledge-map` - Knowledge map data
  - Returns: nodes array + connections array + summary stats
  - Access: student (own) or parent
- `GET /student/:studentId/cognitive-markers` - Cognitive markers
  - Returns: markers grouped by type + total count
  - Access: student (own) or parent

### reports.js
- `GET /student/:studentId/sessions` - List sessions with reports
  - Returns: array of sessions with summaries and parent reports
  - Access: student (own) or parent
- `GET /session/:sessionId/report` - Specific session report
  - Returns: full session data + cognitive observations + parent report
  - Access: student (own) or parent
- `GET /student/:studentId/alerts` - Get alerts (unread first)
  - Returns: { unread, read, total, alert_levels }
  - Access: parent only
- `PATCH /alert/:alertId/read` - Mark alert as read
  - Updates read_at timestamp
  - Returns: updated alert
  - Access: parent only

## Configuration Files

### package.json
- Dependencies: express, cors, dotenv, jsonwebtoken, bcryptjs, @supabase/supabase-js, uuid
- Scripts:
  - `npm start` - Run in production
  - `npm run dev` - Run with auto-reload

### .env.example
- Template for all required environment variables
- Copy to .env and fill in actual values

## Documentation

### README.md
- Setup instructions
- Running instructions
- Architecture overview
- Key implementation details
- Database schema reference

### API.md
- Complete API endpoint reference
- Request/response examples
- Error status codes
- CORS configuration
- Rate limiting notes (for future)

### FILES.md
- This file - describes each file's purpose and key functions

## Key Design Decisions

1. **No raw transcripts in DB** - Messages stored only in memory during active session
2. **Dynamic system prompts** - Built from student profile + recent sessions + knowledge map
3. **Code-based auth (MVP)** - Uses student internal_code, no passwords
4. **Stub Claude responses** - Warm, encouraging, appropriate for age
5. **Hardcoded level 3 triggers** - Cannot be disabled, non-configurable for safety
6. **In-memory session store** - Map keyed by session_id, cleaned on session end
7. **Graceful error handling** - All DB operations catch errors, return appropriate HTTP status
8. **CORS configured** - Accepts frontend URL from env + hardcoded localhost

## Data Flow

### Session Start
1. Frontend: POST /session/start
2. Backend: Create session in DB, build system prompt from student profile
3. Initialize in-memory message store (Map)
4. Return session_id to frontend

### Message Exchange
1. Frontend: POST /session/:id/message { message }
2. Backend: 
   - Check message for alerts (level 0-3)
   - If level 3: return support response, don't continue
   - Add user message to memory
   - Get Claude response (stub)
   - Add assistant message to memory
   - If level 2: create alert in DB
   - Return response to frontend
3. Continue conversation...

### Session End
1. Frontend: POST /session/:id/end
2. Backend:
   - Generate parent report from memory data
   - Update session in DB (summary, observations, report)
   - Delete from in-memory store
   - Return report to frontend
3. Messages never saved to DB - only summary + observations

### Alerts
- Level 0: No alert, normal response
- Level 1: Note in weekly report (future - not implemented)
- Level 2: Create alert in DB, continue session, notify parent in 24h
- Level 3: Return support message, exit session, notify parent immediately

## Security Considerations

1. JWT tokens: 24h expiry, signed with JWT_SECRET
2. Role-based access: Student can only access own data, Parent can access child data
3. Critical triggers: Hardcoded, cannot be modified, always trigger level 3
4. No sensitive data in URLs: All sensitive data in request body
5. CORS: Limited to configured frontend URL + localhost
6. No password storage: Code-based auth for MVP
