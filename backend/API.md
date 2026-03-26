# Clauteur Backend API Reference

## Authentication

All endpoints except `/api/auth/login` require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Auth Endpoints

### POST /api/auth/login
Code-based login for students and parents.

**Request:**
```json
{
  "code": "student-internal-code",
  "role": "student" | "parent"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "role": "student",
    "code": "ABC123",
    "age": 13
  }
}
```

**Errors:**
- 400: Missing code or role
- 401: Invalid code

---

### POST /api/auth/verify
Verify token validity.

**Request:**
```
Headers: Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "userId": "uuid",
    "role": "student"
  }
}
```

---

## Session Endpoints

### POST /api/session/start
Create a new tutoring session.

**Request:**
```json
{
  "mode": "programme" | "fondations" | "exploration" (optional)
}
```

**Response (201):**
```json
{
  "session_id": "uuid",
  "started_at": "2026-03-26T12:00:00Z",
  "mode": "programme"
}
```

---

### POST /api/session/:sessionId/message
Send a message and get AI response.

**Request:**
```json
{
  "message": "What is a fraction?"
}
```

**Response (200):**
```json
{
  "response": "That's a great question...",
  "alert_level": 0,
  "trigger": null
}
```

**Alert Responses:**
- `alert_level: 0` - Normal response
- `alert_level: 1` - Note (continues session)
- `alert_level: 2` - Caution (continues session, alert created)
- `alert_level: 3` - Critical (exits session, returns support message)

**Response (level 3 alert):**
```json
{
  "response": "I notice you might be going through something difficult...",
  "alert_level": 3,
  "trigger": "hurt myself",
  "session_ended": true
}
```

---

### POST /api/session/:sessionId/end
End session and generate parent report.

**Response (200):**
```json
{
  "session_id": "uuid",
  "ended_at": "2026-03-26T12:30:00Z",
  "duration_minutes": 30,
  "parent_report": {
    "summary": "Session focused on learning new concepts...",
    "cognitive_observations": {
      "engagement_level": "high",
      "frustration_events": 0,
      "self_correction": true,
      "question_quality": "deep",
      "connection_making": true
    },
    "recommendations": ["..."],
    "alert_level": 0
  }
}
```

---

### GET /api/session/:sessionId
Get session details (active or ended).

**Response (200):**
```json
{
  "id": "uuid",
  "status": "active" | "ended",
  "started_at": "2026-03-26T12:00:00Z",
  "duration_minutes": 30,
  "summary": "Session summary...",
  "parent_report": {...}
}
```

---

## Analysis Endpoints

### GET /api/analysis/student/:studentId/knowledge-map
Get student's knowledge map (nodes and connections).

**Response (200):**
```json
{
  "nodes": [
    {
      "id": "uuid",
      "domain": "mathematics",
      "concept": "fractions",
      "mastery_level": 0.65,
      "last_visited": "2026-03-26T10:00:00Z",
      "anchor_used": "pizza"
    }
  ],
  "connections": [
    {
      "id": "uuid",
      "concept_a": "fractions",
      "concept_b": "division",
      "strength": 0.75,
      "first_observed": "2026-03-20T14:30:00Z"
    }
  ],
  "summary": {
    "total_nodes": 12,
    "total_connections": 8,
    "avg_mastery": "0.58"
  }
}
```

---

### GET /api/analysis/student/:studentId/cognitive-markers
Get cognitive markers (justification, uncertainty, connections, identity).

**Query Parameters:**
- `from` (optional): ISO date string for start range
- `to` (optional): ISO date string for end range

**Response (200):**
```json
{
  "markers": [
    {
      "id": "uuid",
      "marker_type": "justification",
      "value": "Student explained reasoning clearly",
      "stage_at_time": 2,
      "noted_at": "2026-03-26T12:15:00Z"
    }
  ],
  "by_type": {
    "justification": [...],
    "uncertainty": [...],
    "connexion": [...]
  },
  "total_count": 24
}
```

---

## Report Endpoints

### GET /api/reports/student/:studentId/sessions
List all sessions with parent reports.

**Query Parameters:**
- `limit` (optional): Default 50

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "started_at": "2026-03-26T12:00:00Z",
      "duration_minutes": 30,
      "summary": "...",
      "parent_report": {...},
      "alert_level": 0
    }
  ]
}
```

---

### GET /api/reports/session/:sessionId/report
Get detailed report for a specific session.

**Response (200):**
```json
{
  "session_id": "uuid",
  "started_at": "2026-03-26T12:00:00Z",
  "duration_minutes": 30,
  "summary": "...",
  "cognitive_observations": {...},
  "parent_report": {...},
  "alert_level": 0
}
```

---

### GET /api/reports/student/:studentId/alerts
Get all alerts for a student (parent only).

**Response (200):**
```json
{
  "unread": [
    {
      "id": "uuid",
      "level": 2,
      "type": "caution",
      "message": "Concern detected: 'too hard'",
      "created_at": "2026-03-26T12:15:00Z",
      "read_at": null
    }
  ],
  "read": [...],
  "total": 5,
  "alert_levels": {
    "0": "rien",
    "1": "noter",
    "2": "alerter_24h",
    "3": "urgent"
  }
}
```

---

### PATCH /api/reports/alert/:alertId/read
Mark an alert as read (parent only).

**Response (200):**
```json
{
  "id": "uuid",
  "level": 2,
  "type": "caution",
  "message": "...",
  "created_at": "2026-03-26T12:15:00Z",
  "read_at": "2026-03-26T13:00:00Z"
}
```

---

## Error Responses

All endpoints follow standard HTTP status codes:

```json
{
  "error": "Description of the error",
  "status": 400
}
```

**Common Status Codes:**
- 200 - OK
- 201 - Created
- 400 - Bad Request (missing/invalid parameters)
- 401 - Unauthorized (missing token or invalid code)
- 403 - Forbidden (insufficient permissions)
- 404 - Not Found (session/student not found)
- 500 - Internal Server Error

---

## CORS Configuration

The backend accepts requests from:
- `FRONTEND_URL` environment variable (default: http://localhost:3000)
- `http://localhost:3000` (hardcoded for development)

Add credentials flag when making requests:
```javascript
fetch('/api/...', {
  credentials: 'include',
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

---

## Rate Limiting

Not implemented in MVP. Consider for production:
- Login: 5 requests per minute per IP
- API endpoints: 100 requests per minute per user
