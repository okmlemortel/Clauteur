'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api, SessionReport } from '@/lib/api';

export default function ReportsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionReport[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleExpandSession = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Session Reports</h1>
        <p className="text-slate-600">Details and observations from each session</p>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <p>Loading reports...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-600">
          <p className="mb-2 text-lg">No sessions yet</p>
          <p className="text-sm text-slate-500">
            Reports will appear here once your child completes a session
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedSession === session.session_id;

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
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(session.started_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      - Duration: {session.duration} minutes
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
                    <div className="space-y-6">
                      {/* Notable Moment */}
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Notable Moment
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {session.notable_moment}
                        </p>
                      </div>

                      {/* Skills Practiced */}
                      {session.skills_practiced.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-3">
                            Skills Practiced
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {session.skills_practiced.map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Engagement */}
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Engagement Level
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-300 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 transition-all"
                              style={{ width: `${session.engagement}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {session.engagement}%
                          </span>
                        </div>
                      </div>

                      {/* Plan Quality */}
                      {session.plan_quality > 0 && (
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">
                            Plan Quality
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${session.plan_quality}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {session.plan_quality}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Solution Correctness */}
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Solution
                        </h3>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                            session.solution_correct
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <span>{session.solution_correct ? '✓' : '○'}</span>
                          <span>{session.solution_correct ? 'Correct' : 'Needs Review'}</span>
                        </div>
                      </div>

                      {/* Explanation Quality */}
                      {session.explanation_quality > 0 && (
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">
                            Explanation Quality
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-600 transition-all"
                                style={{ width: `${session.explanation_quality}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {session.explanation_quality}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Language: {session.explanation_language === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
                          </p>
                        </div>
                      )}

                      {/* Cognitive Indicators */}
                      {session.think_aloud > 0 && (
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-2">
                            Think-Aloud Activity
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-600 transition-all"
                                style={{ width: `${session.think_aloud}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {session.think_aloud}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* New Connectors */}
                      {session.new_connectors.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-3">
                            New Connections Made
                          </h3>
                          <ul className="space-y-2">
                            {session.new_connectors.map((connector, idx) => (
                              <li
                                key={idx}
                                className="flex gap-3 text-sm text-slate-700"
                              >
                                <span className="text-indigo-600 font-bold flex-shrink-0">
                                  🔗
                                </span>
                                <span>{connector}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Next Session Target */}
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Next Session Target
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {session.next_session_target}
                        </p>
                      </div>

                      {/* Parent Action */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-900 mb-2">
                          Suggested Action for You
                        </h3>
                        <p className="text-amber-900 text-sm leading-relaxed">
                          {session.parent_action}
                        </p>
                      </div>

                      {/* Session Timing */}
                      <div className="pt-4 border-t border-slate-300">
                        <p className="text-xs text-slate-600">
                          <strong>Session:</strong> {formatDateTime(session.started_at)} to{' '}
                          {formatDateTime(session.ended_at)} ({session.duration} minutes)
                        </p>
                      </div>
                    </div>
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
