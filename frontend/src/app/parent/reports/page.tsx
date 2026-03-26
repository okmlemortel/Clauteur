'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Session {
  session_id: string;
  started_at: string;
  ended_at: string;
  duration: number;
  engagement: number;
  notable_moment: string;
  observations: {
    strengths: string[];
    blockers: string[];
    cognitive_signals: string[];
  };
  next_session: string;
  parent_action: string;
}

interface Report {
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
      if (user?.userId) {
        const report = await api.getSingleSessionReport(user.userId, sessionId);
        setReports((prev) => ({ ...prev, [sessionId]: report }));
        setExpandedSession(sessionId);
      }
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
            Les rapports s&apos;afficheront ici une fois que votre enfant aura terminé une session
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedSession === session.session_id;
            const report = reports[session.session_id];
            const isLoading = loadingReport === session.session_id;

            return (
              <div
                key={session.session_id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Session Header */}
                <button
                  onClick={() => handleExpandSession(session.session_id)}
                  className="w-full p-4 hover:bg-slate-50 transition flex items-start justify-between"
                >
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900">
                      {new Date(session.started_at).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(session.started_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      - Durée: {session.duration} minutes
                    </p>
                    {session.notable_moment && (
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                        {session.notable_moment}
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
                        {/* Notable Moment */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">Moment notable</h3>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {report.notable_moment}
                          </p>
                        </div>

                        {/* Engagement */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">Engagement</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 transition-all"
                                style={{ width: `${report.engagement}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {report.engagement}%
                            </span>
                          </div>
                        </div>

                        {/* Observations - Strengths */}
                        {report.observations.strengths.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-slate-900 mb-3">Forces</h3>
                            <ul className="space-y-2">
                              {report.observations.strengths.map((strength, idx) => (
                                <li
                                  key={idx}
                                  className="flex gap-3 text-sm text-slate-700"
                                >
                                  <span className="text-green-600 font-bold flex-shrink-0">
                                    ✓
                                  </span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Observations - Blockers */}
                        {report.observations.blockers.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-slate-900 mb-3">
                              Défis identifiés
                            </h3>
                            <ul className="space-y-2">
                              {report.observations.blockers.map((blocker, idx) => (
                                <li
                                  key={idx}
                                  className="flex gap-3 text-sm text-slate-700"
                                >
                                  <span className="text-orange-600 font-bold flex-shrink-0">
                                    ⚡
                                  </span>
                                  <span>{blocker}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Observations - Cognitive Signals */}
                        {report.observations.cognitive_signals.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-slate-900 mb-3">
                              Signaux cognitifs
                            </h3>
                            <ul className="space-y-2">
                              {report.observations.cognitive_signals.map((signal, idx) => (
                                <li
                                  key={idx}
                                  className="flex gap-3 text-sm text-slate-700"
                                >
                                  <span className="text-blue-600 font-bold flex-shrink-0">
                                    🧠
                                  </span>
                                  <span>{signal}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Next Session */}
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">
                            Prochaine session
                          </h3>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {report.next_session}
                          </p>
                        </div>

                        {/* Parent Action */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h3 className="font-semibold text-amber-900 mb-2">
                            Action suggérée pour vous
                          </h3>
                          <p className="text-amber-900 text-sm leading-relaxed">
                            {report.parent_action}
                          </p>
                        </div>

                        {/* Session Duration */}
                        <div className="pt-4 border-t border-slate-300">
                          <p className="text-xs text-slate-600">
                            <strong>Session:</strong> {formatDateTime(report.started_at)} à{' '}
                            {formatDateTime(report.ended_at)} ({report.duration} minutes)
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
