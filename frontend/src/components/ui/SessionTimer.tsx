'use client';

import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  startTime: Date;
  maxMinutes?: number;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  startTime,
  maxMinutes = 35,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const maxSeconds = maxMinutes * 60;
  const isWarning = elapsed >= maxSeconds * 0.85; // Warning at 85% (30min for 35min session)
  const percentage = Math.min((elapsed / maxSeconds) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Durée de la session</span>
        <span
          className={`text-sm font-mono font-semibold ${
            isWarning ? 'text-orange-600' : 'text-slate-700'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isWarning
              ? 'bg-gradient-to-r from-orange-400 to-orange-500'
              : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isWarning && (
        <p className="text-xs text-orange-600 font-medium">
          ⚠️ La session arrive bientôt à sa fin
        </p>
      )}
    </div>
  );
};
