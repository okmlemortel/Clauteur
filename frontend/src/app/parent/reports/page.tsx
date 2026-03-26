'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Session {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  summary?: string;
}

interface Report {
  sessionId: string;
  summary: string;
  observations: string[];
  recommendations: string[];
  duration: number;
  startedAt: string;
  endedAt: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.userId) return;

      try {
        const data = await api.getStudentSessions(user.userId);
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  const handleExpandSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    if (reports[sessionId]) {
      setExpandedSession(sessionId);
      return;
    }

    setLoadingReport(sessionId);
    try {
      const report = await api.getSessionReport(sessionId);
      setReports((prev) => ({ ...prev, [sessionId]: report }));
      setExpandedSession(sessionId);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoadingReport(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Rapports de session</h1>
        <p className="text-slate-600">Détails et observations de chaque session</p>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <p>Chargement des rapports...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-600">
          <p className="mb-2 text-lg">Aucune session pour le moment</p>
          <p className="text-sm text-slate-500">
            Les rapports s'afficheront ici une fois que votre enfant aura terminé une session
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedSession === session.sessionId;
            const report = reports[session.sessionId];
            const isLoading = loadingReport === session.sessionId;

            return (
              <div
                key={session.sessionId}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Session Header */}
                <button
                  onClick={() => handleExpandSession(session.sessionId)}
                  className="w-full p-4 hover:bg-slate-50 transition flex items-start justify-between"
                >
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900">
                      {new Date(session.startedAt).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(session.startedAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      - Durée: {session.duration} minutes
                    </p>
                    {session.summary && (
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                        {session.summary}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-block transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </button>

                {/* Expanded Report */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    {isLoading ? (
                      <p className="text-slate-600 text-center py-4">
                        Chargement du rapport...
                      </p>
                    ) : report ? (
                      <div className="space-y-6">
                        {/* Summary */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">Résumé</h3>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {report.summary}
                          </p>
                        </div>

                        {/* Observations */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-3">Observations</h3>
                          <ul className="space-y-2">
                            {report.observations.map((obs, idx) => (
                              <li
                                key={idx}
                                className="flex gap-3 text-sm text-slate-700"
                              >
                                <span className="text-indigo-600 font-bold flex-shrink-0">
                                  •
                                </span>
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-3">
                            Recommandations
                          </h3>
                          <ul className="space-y-2">
                            {report.recommendations.map((rec, idx) => (
                              <li
                                key={idx}
                                className="flex gap-3 text-sm text-slate-700"
                              >
                                <span className="text-amber-600 font-bold flex-shrink-0">
                                  💡
                                </span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Session Duration */}
                        <div className="pt-4 border-t border-slate-300">
                          <p className="text-xs text-slate-600">
                            <strong>Session:</strong> {formatDateTime(report.startedAt)} à{' '}
                            {formatDateTime(report.endedAt)} ({report.duration} minutes)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600 text-center py-4">
                        Impossible de charger le rapport
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
