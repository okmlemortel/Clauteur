'use client';

import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  startTime: Date;
  maxMinutes?: number;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  startTime,
  maxMinutes = 20,
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
  const isWarning = elapsed >= maxSeconds * 0.75; // Warning at 75% (15min for 20min session)
  const isExpired = elapsed >= maxSeconds;
  const percentage = Math.min((elapsed / maxSeconds) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">Time remaining</span>
        <span
          className={`text-sm font-mono font-semibold ${
            isExpired
              ? 'text-red-600'
              : isWarning
                ? 'text-orange-600'
                : 'text-slate-700'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isExpired
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : isWarning
                ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                : 'bg-gradient-to-r from-teal-500 to-teal-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isExpired && (
        <p className="text-xs text-red-600 font-medium">Session expired</p>
      )}
      {isWarning && !isExpired && (
        <p className="text-xs text-orange-600 font-medium">Time running low</p>
      )}
    </div>
  );
};
