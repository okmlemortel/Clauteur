const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

const makeRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// ===== NEW TYPES FOR V3 =====

export interface CaseTemplate {
  id: string;
  title: string;
  narrative: string;
  plan_prompt: string;
  explain_language: 'en' | 'fr';
  target_skills: string[];
  visual_component?: 'rate_timeline' | 'fractions' | null;
}

export interface SessionStartResponse {
  session_id: string;
  case: CaseTemplate;
  greeting: string;
}

export interface SessionResponse {
  message: string;
  phase: 'plan' | 'solve' | 'explain' | null;
  alertLevel: number;
  fieldFeedback?: string;
  languageSwitchTo?: 'en' | 'fr';
  session_ended?: boolean;
  session_time_remaining?: number;
}

export interface CaseFileResponse {
  feedback?: string;
  phaseComplete: boolean;
}

export interface EditEvent {
  field: 'given' | 'problem' | 'solution' | 'explanation';
  event: 'keystroke' | 'pause' | 'delete' | 'focus' | 'blur';
  timestamp: number;
  charCount?: number;
  pauseDuration?: number;
}

export interface SessionReport {
  session_id: string;
  skills_practiced: string[];
  engagement: number;
  notable_moment: string;
  plan_quality: number;
  solution_correct: boolean;
  explanation_quality: number;
  explanation_language: 'en' | 'fr';
  new_connectors: string[];
  think_aloud: number;
  next_session_target: string;
  parent_action: string;
  duration: number;
  started_at: string;
  ended_at: string;
}

// Legacy types for backward compatibility
export interface SessionMessage {
  id: string;
  content: string;
  sender: 'student' | 'tutor';
  timestamp: string;
}

export const api = {
  // Auth
  login: async (code: string) => {
    const data = await makeRequest<{
      user_id: string;
      token: string;
      role: 'student' | 'parent';
      profile?: Record<string, unknown>;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return data;
  },

  // Sessions - V3 new endpoints
  startSession: async (mode?: string) => {
    const data = await makeRequest<SessionStartResponse>('/session/start', {
      method: 'POST',
      body: JSON.stringify(mode ? { mode } : {}),
    });
    return data;
  },

  sendMessage: async (
    sessionId: string,
    message: string,
    source?: 'text' | 'voice',
    field?: 'given' | 'problem' | 'solution' | 'explanation'
  ): Promise<SessionResponse> => {
    const data = await makeRequest<SessionResponse>(
      `/session/${sessionId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({ message, source, field }),
      }
    );
    return data;
  },

  submitCaseFile: async (
    sessionId: string,
    field: 'given' | 'problem' | 'solution' | 'explanation',
    content: string
  ): Promise<CaseFileResponse> => {
    const data = await makeRequest<CaseFileResponse>(
      `/session/${sessionId}/casefile`,
      {
        method: 'POST',
        body: JSON.stringify({ field, content }),
      }
    );
    return data;
  },

  endSession: async (sessionId: string, editLog: EditEvent[]) => {
    const data = await makeRequest<{
      session_id: string;
      report: SessionReport;
    }>(`/session/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ editLog }),
    });
    return data;
  },

  getSessionReport: async (sessionId: string) => {
    const data = await makeRequest<SessionReport>(`/reports/${sessionId}`);
    return data;
  },

  // Reports (parent)
  getStudentSessions: async (studentId: string) => {
    const data = await makeRequest<SessionReport[]>(
      `/reports/${studentId}/sessions`
    );
    return data;
  },

  getSingleSessionReport: async (studentId: string, sessionId: string) => {
    const data = await makeRequest<SessionReport>(
      `/reports/${studentId}/sessions/${sessionId}`
    );
    return data;
  },

  // Student
  getKnowledgeMap: async (studentId: string) => {
    const data = await makeRequest<{
      studentId: string;
      topics: Array<{
        name: string;
        proficiency: number;
        lastUpdated: string;
      }>;
    }>(`/students/${studentId}/knowledge-map`);
    return data;
  },

  // Alerts
  getAlerts: async (studentId: string) => {
    const data = await makeRequest<{
      unread: Array<{
        id: string;
        student_id: string;
        level: number;
        message: string;
        created_at: string;
        read_at: string | null;
      }>;
      read: Array<{
        id: string;
        student_id: string;
        level: number;
        message: string;
        created_at: string;
        read_at: string;
      }>;
      total: number;
    }>(`/reports/student/${studentId}/alerts`);
    // Normalize to the format the overview page expects
    const allAlerts = [
      ...(data.unread || []).map(a => ({
        alertId: a.id,
        studentId: a.student_id,
        level: a.level as 1 | 2 | 3,
        message: a.message,
        createdAt: a.created_at,
        read: false,
      })),
      ...(data.read || []).map(a => ({
        alertId: a.id,
        studentId: a.student_id,
        level: a.level as 1 | 2 | 3,
        message: a.message,
        createdAt: a.created_at,
        read: true,
      })),
    ];
    return allAlerts;
  },

  markAlertRead: async (alertId: string) => {
    const data = await makeRequest<{
      alertId: string;
      read: boolean;
    }>(`/alerts/${alertId}/read`, {
      method: 'POST',
      body: JSON.stringify({ read: true }),
    });
    return data;
  },
};
