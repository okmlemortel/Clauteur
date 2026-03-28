'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api, SessionReport } from '@/lib/api';
import Link from 'next/link';

export default function OverviewPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionReport[]>([]);
  const [alerts, setAlerts] = useState<Array<{
    alertId: string;
    studentId: string;
    level: 1 | 2 | 3;
    message: string;
    createdAt: string;
    read: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.userId) return;

      try {
        const [sessionsData, alertsData] = await Promise.all([
          api.getStudentSessions(user.userId),
          api.getAlerts(user.userId),
        ]);

        setSessions(sessionsData.slice(0, 5));
        setAlerts(alertsData.filter((a) => !a.read));
      } catch (error) {
        console.error('Failed to load overview data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const lastSessionDate = sessions[0]?.started_at
    ? new Date(sessions[0].started_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No sessions yet';

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getAlertColor = (level: number) => {
    switch (level) {
      case 3:
        return 'bg-red-50 border-red-200 text-red-900';
      case 2:
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 1:
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    }
  };

  const getAlertBadgeColor = (level: number) => {
    switch (level) {
      case 3:
        return 'bg-red-200 text-red-800';
      case 2:
        return 'bg-orange-200 text-orange-800';
      case 1:
      default:
        return 'bg-yellow-200 text-yellow-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Overview</h1>
        <p className="text-slate-600">Track your child&apos;s progress</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Sessions Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Total Sessions</h3>
            <div className="text-2xl">📚</div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalSessions}</p>
          <p className="text-xs text-slate-500 mt-2">overall</p>
        </div>

        {/* Total Minutes Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Learning Time</h3>
            <div className="text-2xl">⏱️</div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatTime(totalMinutes)}</p>
          <p className="text-xs text-slate-500 mt-2">total study</p>
        </div>

        {/* Last Session Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Last Session</h3>
            <div className="text-2xl">📅</div>
          </div>
          <p className="text-lg font-semibold text-slate-900 truncate">{lastSessionDate}</p>
          <p className="text-xs text-slate-500 mt-2">most recent</p>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.alertId}
                className={`rounded-xl border p-4 flex items-start gap-3 ${getAlertColor(
                  alert.level
                )}`}
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${getAlertBadgeColor(
                    alert.level
                  )}`}
                >
                  Level {alert.level}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(alert.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {alerts.length > 3 && (
            <Link
              href="/parent/alerts"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all alerts →
            </Link>
          )}
        </div>
      )}

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Sessions</h2>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-600">
            <p className="mb-2">No sessions yet</p>
            <p className="text-sm text-slate-500">Sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(session.started_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {session.notable_moment && (
                      <p className="text-sm text-slate-600 mt-2">{session.notable_moment}</p>
                    )}
                    {session.skills_practiced.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {session.skills_practiced.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{session.duration}m</p>
                    <p className="text-xs text-slate-500">duration</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/parent/reports"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all reports →
        </Link>
      </div>
    </div>
  );
}
