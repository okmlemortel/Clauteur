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

export const api = {
  // Auth
  login: async (code: string, role: 'student' | 'parent') => {
    const data = await makeRequest<{
      userId: string;
      token: string;
      role: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code, role }),
    });
    return data;
  },

  // Sessions
  startSession: async () => {
    const data = await makeRequest<{
      sessionId: string;
      startedAt: string;
    }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return data;
  },

  sendMessage: async (sessionId: string, message: string) => {
    const data = await makeRequest<{
      messageId: string;
      tutorResponse: string;
      timestamp: string;
    }>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return data;
  },

  endSession: async (sessionId: string) => {
    const data = await makeRequest<{
      sessionId: string;
      endedAt: string;
      duration: number;
    }>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return data;
  },

  getSessionReport: async (sessionId: string) => {
    const data = await makeRequest<{
      sessionId: string;
      summary: string;
      observations: string[];
      recommendations: string[];
      duration: number;
      startedAt: string;
      endedAt: string;
    }>(`/sessions/${sessionId}/report`);
    return data;
  },

  // Student
  getStudentSessions: async (studentId: string) => {
    const data = await makeRequest<
      Array<{
        sessionId: string;
        startedAt: string;
        endedAt: string;
        duration: number;
        summary?: string;
      }>
    >(`/students/${studentId}/sessions`);
    return data;
  },

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
