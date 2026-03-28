# Clauteur Deployment Guide

This guide walks through deploying Clauteur across Supabase (database), Railway (backend), and Vercel (frontend).

**Stack Overview:**
- **Supabase**: Hosted PostgreSQL database
- **Railway**: Express.js backend server + future n8n integration
- **Vercel**: Next.js 14 frontend application

---

## 1. Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Create a new project
   - Name: `clauteur`
   - Region: Choose closest to your location
   - Database password: Save securely
4. Wait for project initialization (~2 min)

### 1.2 Run Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query for each migration file in order:

**Migration 1: Initial Schema**
- File: `supabase/migrations/001_initial_schema.sql`
- Copy entire file content into SQL Editor
- Click **Run** and verify success

**Migration 2: Content Package**
- File: `supabase/migrations/002_content_package_v1.sql`
- Copy entire file content into SQL Editor
- Click **Run** and verify success
- This adds 10 case templates

**Migration 3: Visual Component**
- File: `supabase/migrations/003_visual_component.sql`
- Copy entire file content into SQL Editor
- Click **Run** and verify success

### 1.3 Verification
1. Run query: `SELECT COUNT(*) FROM case_templates;`
   - Expected result: **12 rows**
2. Run query: `SELECT COUNT(*) FROM skill_map;`
   - Expected result: **rows with skill mappings**
3. Run query: `SELECT email FROM students WHERE name = 'Olivia';`
   - Expected result: **Olivia's profile record exists**

### 1.4 Note Credentials
Go to **Settings > API**
- Copy **Project URL** → save as `SUPABASE_URL`
- Copy **Service Role Key** → save as `SUPABASE_SERVICE_KEY` (keep secret)
- Store both securely (use environment variable manager or secure notes)

---

## 2. Railway Setup

### 2.1 Create Project
1. Go to [railway.app](https://railway.app)
2. Sign in or create account
3. Create a new project
   - Click **Create New Project** → **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub account

### 2.2 Add Backend Service
1. Connect your Clauteur repository
2. Select the entire repository (not a specific branch)
3. Click **Deploy Now**
4. Once service is created, go to **Settings**
   - Set **Root Directory** to `/backend`
5. Let the initial deploy complete (may fail due to missing env vars—this is normal)

### 2.3 Set Environment Variables
In Railway **Variables** section, add each variable:

| Key | Value | Notes |
|-----|-------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | From Anthropic console |
| `DEEPGRAM_API_KEY` | Deepgram API key | From Deepgram console |
| `SUPABASE_URL` | From Supabase Settings > API | Full https URL |
| `SUPABASE_SERVICE_KEY` | From Supabase Settings > API | Keep secret |
| `JWT_SECRET` | `openssl rand -hex 32` | Generate locally, then paste |
| `PORT` | `3001` | Backend default port |
| `NODE_ENV` | `production` | For production environment |
| `CORS_ORIGIN` | *TBD—set after Vercel deploy* | Will be Vercel URL |

**Generate JWT_SECRET locally:**
```bash
openssl rand -hex 32
```
Copy output and paste into Railway `JWT_SECRET` variable.

### 2.4 Deploy Backend
1. All env vars set? Click **Redeploy**
2. Wait for build and deploy to complete (~3–5 min)
3. Once live, go to **Deployments** → click active deployment
4. Note the Railway URL (e.g., `https://clauteur-backend-production.up.railway.app`)
   - Save as `RAILWAY_URL` (no trailing slash)

### 2.5 Health Check
Test the backend is running:
```bash
curl https://<RAILWAY_URL>/api/health
```

Expected response: `{"status":"ok"}` or similar success message.

If connection fails:
- Check `NODE_ENV` and `PORT` are set
- Verify all env vars (especially `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`)
- Check Railway **Logs** tab for errors

---

## 3. Vercel Setup

### 3.1 Import Repository
1. Go to [vercel.com](https://vercel.com)
2. Sign in or create account
3. Click **Add New** → **Project**
4. Select your Clauteur GitHub repository
5. Click **Import**

### 3.2 Configure Frontend
1. **Project Name**: `clauteur-frontend` (or preferred name)
2. **Root Directory**: `/frontend`
3. **Framework Preset**: Next.js
4. Click **Continue**

### 3.3 Set Environment Variables
Add these variables in the Vercel dashboard:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://<RAILWAY_URL>/api` | Include `/api` suffix |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase Settings > API | Only if client-side Supabase needed |

**Example `NEXT_PUBLIC_API_URL`:**
```
https://clauteur-backend-production.up.railway.app/api
```

### 3.4 Deploy
1. Click **Deploy**
2. Wait for build and deployment to complete (~2–3 min)
3. Once live, visit **Vercel dashboard** → your project
4. Copy the deployment URL (e.g., `https://clauteur-frontend.vercel.app`)
   - Save as `VERCEL_URL`

### 3.5 Update Backend CORS
1. Go back to **Railway dashboard**
2. Select your Clauteur backend project
3. Go to **Variables**
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   https://clauteur-frontend.vercel.app
   ```
   ⚠️ **No trailing slash**
5. Click **Redeploy** to apply changes

---

## 4. Post-Deploy Verification (22-Step Checklist)

### 4.1 Student Login & Case Loading
1. ✓ Open Vercel URL (`https://clauteur-frontend.vercel.app`)
2. ✓ Login page loads with student ID input
3. ✓ Enter `ELEVE-001` and submit
4. ✓ Student session initializes (Olivia or test student loaded)
5. ✓ Case data loads from Supabase (see case name/problem statement)

### 4.2 Chat & Tutor Response
6. ✓ Greeting message appears in chat (e.g., "Bonjour Olivia...")
7. ✓ Type a test message (e.g., "Hello") in chat input
8. ✓ Message sends and appears in chat history
9. ✓ Claude tutor responds within 3–5 seconds
10. ✓ Response text appears in chat window

### 4.3 Phase Management
11. ✓ Phase indicator shows "**plan**" (first phase)
12. ✓ **Given** field is editable (blue text input)
13. ✓ **Problem** field is editable (blue text input)
14. ✓ **Solution** field is **locked** with lock icon displayed
15. ✓ Type text in **Given** field → edit tracking captures each keystroke

### 4.4 Phase Transition: Plan → Solve
16. ✓ Click **Submit Plan** button
17. ✓ Phase indicator transitions to "**solve**"
18. ✓ **Solution** field unlocks and becomes editable
19. ✓ **Given** and **Problem** fields lock (show readable content, not editable)

### 4.5 Solution & Explanation
20. ✓ Type text in **Solution** field (editable in solve phase)
21. ✓ Click **Submit Solution** button
22. ✓ Phase indicator transitions to "**explain**"
23. ✓ **Explanation** field activates (language-specific, editable)

### 4.6 Voice & Timer
24. ✓ Click **Voice** button
25. ✓ Microphone access prompt appears (browser permission)
26. ✓ Allow microphone access
27. ✓ Voice recording starts, timer counts up from 0:00
28. ✓ At 15 minutes, warning appears ("Time limit approaching")
29. ✓ Stop recording, text appears in explanation field

### 4.7 Session End
30. ✓ Click **End Session** button
31. ✓ Session report generates and displays
32. ✓ Report shows: student name, case name, phases completed, tutor feedback

### 4.8 Parent Dashboard
33. ✓ Log out (click logout button)
34. ✓ Login page returns
35. ✓ Enter `PARENT-001` and submit
36. ✓ Parent dashboard loads with session history
37. ✓ Session report from previous student session is visible
38. ✓ **Alerts** section displays (if any alerts configured)

### 4.9 Visual Components
39. ✓ Login as student with a rate-conversion case (if configured)
40. ✓ Visual component (rate visualization) loads in right panel
41. ✓ Login as student with a fraction case (if configured)
42. ✓ Visual component (fraction diagram) loads in right panel

---

## 5. Troubleshooting

### CORS Errors
**Symptom:** Browser console shows `CORS policy blocked request`

**Fix:**
1. Check Railway backend `CORS_ORIGIN` matches Vercel URL exactly
   - Correct: `https://clauteur-frontend.vercel.app`
   - Wrong: `https://clauteur-frontend.vercel.app/` (trailing slash)
   - Wrong: `http://localhost:3000` (only for local dev)
2. Redeploy backend after updating
3. Hard refresh Vercel URL (Ctrl+Shift+R or Cmd+Shift+R)

### WebSocket Connection (Voice)
**Symptom:** Voice recording fails, microphone button unresponsive

**Fix:**
1. Verify Railway URL uses `wss://` protocol (secure WebSocket)
2. Check browser console for WebSocket errors
3. Ensure `CORS_ORIGIN` includes Vercel URL (WebSocket also uses CORS)
4. Verify microphone permissions in browser settings

### Claude API Errors
**Symptom:** Chat responds with error message or blank response

**Fix:**
1. Verify `ANTHROPIC_API_KEY` starts with `sk-ant-`
2. Check API key is valid in Anthropic console
3. Check API key has quota available
4. Verify Railway logs for API call errors: `curl https://<RAILWAY_URL>/api/health` should pass first

### Database Connection Errors
**Symptom:** Backend logs show "cannot connect to database" or timeout

**Fix:**
1. Verify `SUPABASE_URL` includes full `https://` URL (not partial URL)
2. Verify `SUPABASE_SERVICE_KEY` is from **Settings > API**, not other keys
3. Test Supabase connection locally:
   ```bash
   psql postgresql://[user]:[password]@[host]/postgres
   ```
4. Check Supabase project status (green light) in dashboard
5. Redeploy Railway backend after verifying env vars

### JWT Errors
**Symptom:** Login fails with "Invalid JWT" or "JWT signature verification failed"

**Fix:**
1. Verify `JWT_SECRET` is set on Railway backend
2. Ensure `JWT_SECRET` is the same hexadecimal string in both:
   - Railway environment variables
   - Backend code (if hard-coded as fallback)
3. Regenerate if unsure:
   ```bash
   openssl rand -hex 32
   ```
4. Update Railway variable and redeploy

### Build Failures
**Symptom:** Vercel or Railway build fails

**Fix:**
1. Check **Logs** tab for specific error
2. Common causes:
   - Missing environment variables → add all vars and redeploy
   - Node version mismatch → check `.nvmrc` or `package.json` engines
   - Missing dependencies → run `npm install` locally to verify
3. Redeploy after fixes

---

## 6. Local Testing (Optional)

To test locally before deploying:

```bash
# Backend
cd backend
npm install
export SUPABASE_URL=<your-url>
export SUPABASE_SERVICE_KEY=<your-key>
export ANTHROPIC_API_KEY=<your-key>
export DEEPGRAM_API_KEY=<your-key>
npm start  # Runs on http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev  # Runs on http://localhost:3000
```

Visit `http://localhost:3000` and test login/cases using local backend.

---

## 7. Next Steps

- Monitor Railway **Logs** for errors in production
- Set up Supabase **Backups** (Settings > Backups)
- Configure monitoring/alerts if needed
- Plan n8n integration for future automation workflows
- Document any custom environment configurations

---

**Deployment Summary:**
- Supabase: Database ready with 3 migrations ✓
- Railway: Backend running with env vars ✓
- Vercel: Frontend deployed with API URL ✓
- 22-step verification: All checks passing ✓

Ready for Olivier to use!
