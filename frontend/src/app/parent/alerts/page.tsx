'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Alert {
  alertId: string;
  studentId: string;
  level: 1 | 2 | 3;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!user?.userId) return;

      try {
        const data = await api.getAlerts(user.userId);
        // Sort by date (newest first)
        const sorted = data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAlerts(sorted);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlerts();
  }, [user]);

  const handleMarkAsRead = async (alertId: string) => {
    setMarkingRead(alertId);
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.alertId === alertId ? { ...a, read: true } : a
        )
      );
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    } finally {
      setMarkingRead(null);
    }
  };

  const getAlertColor = (level: number) => {
    switch (level) {
      case 3:
        return 'bg-red-50 border-red-200';
      case 2:
        return 'bg-orange-50 border-orange-200';
      case 1:
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getAlertIcon = (level: number) => {
    switch (level) {
      case 3:
        return '🔴';
      case 2:
        return '🟠';
      case 1:
      default:
        return '🟡';
    }
  };

  const getAlertTextColor = (level: number) => {
    switch (level) {
      case 3:
        return 'text-red-900';
      case 2:
        return 'text-orange-900';
      case 1:
      default:
        return 'text-yellow-900';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 3:
        return 'Critique';
      case 2:
        return 'Important';
      case 1:
      default:
        return 'Conseil';
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.read);
  const readAlerts = alerts.filter((a) => a.read);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Alertes et notifications</h1>
        <p className="text-slate-600">Restez informé du progrès de votre enfant</p>
      </div>

      {/* Unread Alerts */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <p>Chargement des alertes...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-600">
          <p className="mb-2 text-lg">Aucune alerte pour le moment</p>
          <p className="text-sm text-slate-500">
            Tout semble aller bien ! Les alertes apparaîtront ici si besoin
          </p>
        </div>
      ) : (
        <>
          {unreadAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                À traiter ({unreadAlerts.length})
              </h2>
              <div className="space-y-3">
                {unreadAlerts.map((alert) => (
                  <div
                    key={alert.alertId}
                    className={`rounded-2xl border-2 p-4 ${getAlertColor(alert.level)}`}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 text-2xl">
                        {getAlertIcon(alert.level)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p
                            className={`font-bold text-sm ${getAlertTextColor(
                              alert.level
                            )}`}
                          >
                            {getLevelLabel(alert.level)}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <p className={`text-sm ${getAlertTextColor(alert.level)}`}>
                          {alert.message}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAsRead(alert.alertId)}
                        disabled={markingRead === alert.alertId}
                        className="flex-shrink-0 px-3 py-2 bg-white rounded-lg text-xs font-medium hover:shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingRead === alert.alertId ? 'Traitement...' : 'Marquer comme lu'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read Alerts */}
          {readAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Traitées ({readAlerts.length})
              </h2>
              <div className="space-y-3">
                {readAlerts.map((alert) => (
                  <div
                    key={alert.alertId}
                    className="rounded-2xl border border-slate-200 p-4 bg-white opacity-75 hover:opacity-100 transition"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 text-2xl">
                        {getAlertIcon(alert.level)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-sm text-slate-700">
                            {getLevelLabel(alert.level)}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <p className="text-sm text-slate-700">{alert.message}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs text-slate-600">✓ Lu</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
