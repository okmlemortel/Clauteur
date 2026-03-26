'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Session {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  summary?: string;
}

interface Alert {
  alertId: string;
  studentId: string;
  level: 1 | 2 | 3;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.userId) return;

      try {
        const [sessionsData, alertsData] = await Promise.all([
          api.getStudentSessions(user.userId),
          api.getAlerts(user.userId),
        ]);

        setSessions(sessionsData.slice(0, 5)); // Last 5 sessions
        setAlerts(alertsData.filter((a) => !a.read)); // Only unread alerts
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
  const lastSessionDate = sessions[0]?.startedAt
    ? new Date(sessions[0].startedAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Aucune session';

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Vue générale</h1>
        <p className="text-slate-600">Suivi du progrès de votre enfant</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Sessions Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Sessions totales</h3>
            <div className="text-2xl">📚</div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalSessions}</p>
          <p className="text-xs text-slate-500 mt-2">depuis le début</p>
        </div>

        {/* Total Minutes Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Temps d'apprentissage</h3>
            <div className="text-2xl">⏱️</div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatTime(totalMinutes)}</p>
          <p className="text-xs text-slate-500 mt-2">total d'étude</p>
        </div>

        {/* Last Session Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Dernière session</h3>
            <div className="text-2xl">📅</div>
          </div>
          <p className="text-lg font-semibold text-slate-900 truncate">{lastSessionDate}</p>
          <p className="text-xs text-slate-500 mt-2">dernier apprentissage</p>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Alertes actives</h2>
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
                  Niveau {alert.level}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
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
              Voir toutes les alertes →
            </Link>
          )}
        </div>
      )}

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Sessions récentes</h2>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-600">
            <p className="mb-2">Aucune session pour le moment</p>
            <p className="text-sm text-slate-500">Les sessions apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {new Date(session.startedAt).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      à{' '}
                      {new Date(session.startedAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {session.summary && (
                      <p className="text-sm text-slate-600 mt-2">{session.summary}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{session.duration}m</p>
                    <p className="text-xs text-slate-500">durée</p>
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
          Voir tous les rapports →
        </Link>
      </div>
    </div>
  );
}
