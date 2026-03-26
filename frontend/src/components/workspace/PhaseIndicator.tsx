'use client';

import React from 'react';

type Phase = 'concret' | 'visuel' | 'symbolique' | null;

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ currentPhase }) => {
  const phases: Array<{ id: Phase; label: string }> = [
    { id: 'concret', label: 'concret' },
    { id: 'visuel', label: 'visuel' },
    { id: 'symbolique', label: 'symbolique' },
  ];

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4 border-t border-slate-200">
      {/* Phase Dots */}
      <div className="flex items-center gap-4">
        {phases.map((phase) => (
          <div key={phase.id} className="flex flex-col items-center gap-2">
            <button
              className={`w-3 h-3 rounded-full transition-all ${
                phase.id === currentPhase
                  ? 'bg-indigo-600 scale-125'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              disabled
            />
            <span className="text-xs font-medium text-slate-600">
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
