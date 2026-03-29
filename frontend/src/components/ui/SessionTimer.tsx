'use client';

import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  startTime: Date;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ startTime }) => {
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

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Session time</span>
      <span className="text-sm font-mono font-semibold text-slate-700">
        {minutes} min
      </span>
    </div>
  );
};
