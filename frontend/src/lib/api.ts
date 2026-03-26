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

export interface SessionMessage {
  id: string;
  content: string;
  sender: 'student' | 'tutor';
  timestamp: string;
}

export interface SessionResponse {
  message: string;
  phase: 'concret' | 'visuel' | 'symbolique' | null;
  alertLevel?: number;
}

export interface SessionStartResponse {
  session_id: string;
  started_at: string;
  mode?: string;
  greeting: string;
}

export interface SessionReport {
  session_id: string;
  engagement: number;
  notable_moment: string;
  observations: {
    strengths: string[];
    blockers: string[];
    cognitive_signals: string[];
  };
  next_session: string;
  parent_action: string;
  duration: number;
  started_at: string;
  ended_at: string;
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

  // Sessions
  startSession: async (mode: 'devoir' | 'session' | 'explorer') => {
    const data = await makeRequest<SessionStartResponse>('/session/start', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    return data;
  },

  sendMessage: async (sessionId: string, message: string): Promise<SessionResponse> => {
    const data = await makeRequest<SessionResponse>(
      `/session/${sessionId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    );
    return data;
  },

  endSession: async (sessionId: string) => {
    const data = await makeRequest<{
      session_id: string;
      report: SessionReport;
    }>(`/session/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({}),
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
    const data = await makeRequest<
      Array<{
        alertId: string;
        studentId: string;
        level: 1 | 2 | 3;
        message: string;
        createdAt: string;
        read: boolean;
      }>
    >(`/students/${studentId}/alerts`);
    return data;
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
