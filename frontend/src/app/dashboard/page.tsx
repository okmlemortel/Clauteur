'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, SessionListItem } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [resumable, setResumable] = useState<SessionListItem[]>([]);
  const [completed, setCompleted] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load session list
  useEffect(() => {
    if (user && user.role === 'student') {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSessionList();
      setResumable(data.resumable || []);
      setCompleted(data.completed || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = (sessionId: string) => {
    router.push(`/session?resume=${sessionId}`);
  };

  const handleNewCase = async () => {
    if (resumable.length > 0) {
      const confirmed = window.confirm(
        'You have an unfinished case. Starting a new one will save your progress — you can return to it later. Continue?'
      );
      if (!confirmed) return;
    }

    setIsStarting(true);
    router.push('/session');
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatElapsed = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    return `${min} min`;
  };

  const phaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      warmup: 'Warmup',
      plan: 'Planning',
      solve: 'Solving',
      explain: 'Explaining',
    };
    return labels[phase] || phase;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const firstName = (user?.profile as Record<string, string>)?.first_name || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hey {firstName}</h1>
            <p className="text-sm text-slate-500 mt-1">Ready to solve some mysteries?</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Log out
          </button>
        </div>

        {/* Resumable session */}
        {resumable.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Continue</h2>
            {resumable.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl shadow-md p-5 mb-3 border-l-4 border-indigo-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {session.case_templates?.title || 'Case in progress'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Started {formatTimeAgo(session.started_at)}
                      {' · '}
                      {phaseLabel(session.current_phase)} phase
                      {' · '}
                      {formatElapsed(session.elapsed_seconds)} spent
                    </p>
                  </div>
                  <button
                    onClick={() => handleResume(session.id)}
                    className="ml-4 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition text-sm"
                  >
                    Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New case button */}
        <button
          onClick={handleNewCase}
          disabled={isStarting}
          className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 mb-8 text-lg"
        >
          {isStarting ? 'Loading...' : 'Start New Case'}
        </button>

        {/* Completed sessions */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Completed</h2>
            <div className="space-y-2">
              {completed.map((session) => (
                <div
                  key={session.id}
                  className="bg-white/60 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-teal-600 text-sm">&#10003;</span>
                    <span className="text-sm text-slate-700">
                      {session.case_templates?.title || 'Completed case'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatElapsed(session.elapsed_seconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {resumable.length === 0 && completed.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No sessions yet. Start your first case above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
